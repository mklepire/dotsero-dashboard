import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

// Map QB invoice export columns to our schema
function mapQBRow(row) {
  // QB Online invoice list export uses these headers:
  // "Num", "Customer", "Date", "Due Date", "Amount", "Open Balance", "Status"
  // Some exports use slightly different names — we handle both

  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k]?.toString().trim();
      if (val) return val;
    }
    return null;
  };

  const parseAmount = (val) => {
    if (!val) return null;
    return parseFloat(val.replace(/[$,\s]/g, '')) || null;
  };

  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  const invoiceNum = get('Num', 'Invoice No', 'Invoice Number', 'Number', 'DocNumber');
  const customer   = get('Customer', 'Customer Name', 'Client', 'Name');
  const date       = parseDate(get('Date', 'Invoice Date', 'TxnDate'));
  const dueDate    = parseDate(get('Due Date', 'DueDate', 'Payment Due'));
  const amount     = parseAmount(get('Amount', 'Total', 'TotalAmt', 'Invoice Amount'));
  const balance    = parseAmount(get('Open Balance', 'Balance', 'Amount Due', 'Balance Due'));
  const qbStatus   = get('Status', 'Invoice Status', 'Payment Status');

  if (!customer) return null;

  // Determine status
  const amountPaid = amount != null && balance != null ? amount - balance : null;
  let status = 'unpaid';
  const today = new Date().toISOString().split('T')[0];

  if (qbStatus) {
    const s = qbStatus.toLowerCase();
    if (s === 'paid') status = 'paid';
    else if (s === 'partial' || s === 'partially paid') status = 'partial';
    else if (dueDate && dueDate < today && balance > 0) status = 'overdue';
    else status = 'unpaid';
  } else {
    if (balance === 0) status = 'paid';
    else if (amountPaid > 0 && balance > 0) status = 'partial';
    else if (dueDate && dueDate < today) status = 'overdue';
    else status = 'unpaid';
  }

  return {
    invoice_number: invoiceNum,
    _customer_name: customer,
    invoice_date:   date,
    due_date:       dueDate,
    amount:         amount,
    amount_paid:    amountPaid,
    balance_due:    balance,
    status:         status,
    qb_invoice_id:  invoiceNum ? `QB-${invoiceNum}` : null,
  };
}

function ResultRow({ item }) {
  const isError = !!item.error;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: '1px solid var(--border)',
      fontSize: 12.5,
    }}>
      {isError
        ? <AlertTriangle size={13} style={{ color: 'var(--clay)', flexShrink: 0 }} />
        : <CheckCircle size={13} style={{ color: 'var(--sage)', flexShrink: 0 }} />
      }
      <span style={{ flex: 1, color: 'var(--slate)' }}>
        <strong>{item._customer_name}</strong>
        {item.invoice_number ? ` · ${item.invoice_number}` : ''}
      </span>
      {!isError && (
        <>
          <span style={{ color: 'var(--slate-light)' }}>{fmtMoney(item.amount)}</span>
          <span className={`badge badge-${item.status === 'paid' ? 'active' : item.status === 'overdue' ? 'overdue' : 'pending'}`}>
            {item.status}
          </span>
        </>
      )}
      {isError && (
        <span style={{ color: 'var(--clay)', fontSize: 11 }}>{item.error}</span>
      )}
    </div>
  );
}

export default function InvoiceSync() {
  const [stage,    setStage]    = useState('idle');   // idle | preview | importing | done
  const [rows,     setRows]     = useState([]);
  const [results,  setResults]  = useState([]);
  const [tenants,  setTenants]  = useState([]);
  const [dragging, setDragging] = useState(false);
  const [stats,    setStats]    = useState(null);

  const processFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: ({ data }) => {
        const mapped = data
          .map(mapQBRow)
          .filter(Boolean);
        setRows(mapped);
        setStage('preview');
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      processFile(file);
    }
  };

  const handleFile = (e) => {
    processFile(e.target.files[0]);
  };

  const runImport = async () => {
    setStage('importing');

    // Fetch tenants once for matching
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, company_name, qb_customer_id');

    setTenants(tenantData || []);

    const resultList = [];
    let imported = 0, skipped = 0;

    for (const row of rows) {
      // Match tenant by name
      const nameLower = row._customer_name.toLowerCase().trim();
      const tenant = (tenantData || []).find(t =>
        t.company_name?.toLowerCase().trim() === nameLower ||
        t.qb_customer_id?.toLowerCase().trim() === nameLower
      );

      const record = {
        qb_invoice_id:  row.qb_invoice_id,
        invoice_number: row.invoice_number,
        tenant_id:      tenant?.id || null,
        invoice_date:   row.invoice_date,
        due_date:       row.due_date,
        amount:         row.amount,
        amount_paid:    row.amount_paid,
        balance_due:    row.balance_due,
        status:         row.status,
      };

      const { error } = await supabase
        .from('invoices')
        .upsert(record, {
          onConflict: 'qb_invoice_id',
          ignoreDuplicates: false,
        });

      if (error) {
        resultList.push({ ...row, error: error.message });
        skipped++;
      } else {
        resultList.push({ ...row, tenant_matched: !!tenant });
        imported++;
      }
    }

    // Mark overdue
    await supabase.rpc('mark_overdue_invoices');

    setResults(resultList);
    setStats({ imported, skipped });
    setStage('done');
  };

  const reset = () => {
    setStage('idle');
    setRows([]);
    setResults([]);
    setStats(null);
  };

  return (
    <div className="page-content">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Instructions */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>How to export from QuickBooks</div>
          <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--slate-mid)', lineHeight: 2 }}>
            <li>In QuickBooks Online go to <strong>Sales → Invoices</strong></li>
            <li>Click the <strong>export icon</strong> (top right of the invoice list) → <strong>Export to Excel</strong></li>
            <li>Open the file, <strong>Save As → CSV</strong></li>
            <li>Upload it below</li>
          </ol>
          <div style={{ fontSize: 12, color: 'var(--slate-light)', marginTop: 8 }}>
            The sync matches invoices to tenants by company name. Run this as often as you like — it's safe to re-upload.
          </div>
        </div>

        {/* Upload zone */}
        {stage === 'idle' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--sage)' : 'var(--border-mid)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 2rem',
              textAlign: 'center',
              background: dragging ? 'var(--sage-light)' : 'var(--white)',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('csv-input').click()}
          >
            <Upload size={28} style={{ color: 'var(--slate-light)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>
              Drop your QB invoice CSV here
            </div>
            <div style={{ fontSize: 13, color: 'var(--slate-light)' }}>
              or click to browse
            </div>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Preview — {rows.length} invoice{rows.length !== 1 ? 's' : ''} found</div>
              <button className="btn btn-sm" onClick={reset}>Start over</button>
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: '1rem' }}>
              {rows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                }}>
                  <FileText size={13} style={{ color: 'var(--slate-light)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{row._customer_name}</span>
                  {row.invoice_number && <span style={{ color: 'var(--slate-light)' }}>{row.invoice_number}</span>}
                  <span>{fmtMoney(row.amount)}</span>
                  <span className={`badge badge-${row.status === 'paid' ? 'active' : row.status === 'overdue' ? 'overdue' : 'pending'}`}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={reset}>Cancel</button>
              <button className="btn btn-primary" onClick={runImport}>
                <Upload size={13} /> Import {rows.length} invoices
              </button>
            </div>
          </div>
        )}

        {/* Importing */}
        {stage === 'importing' && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 1rem' }} />
            <div style={{ fontSize: 14, color: 'var(--slate)' }}>Importing invoices...</div>
            <div style={{ fontSize: 12, color: 'var(--slate-light)', marginTop: 6 }}>Matching to tenants and syncing to Supabase</div>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Import complete</div>
              <button className="btn btn-sm" onClick={reset}>
                <RefreshCw size={12} /> Import another
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
              <div className="metric" style={{ flex: 1 }}>
                <div className="metric-label">Imported</div>
                <div className="metric-value" style={{ color: 'var(--sage)' }}>{stats?.imported}</div>
              </div>
              <div className="metric" style={{ flex: 1 }}>
                <div className="metric-label">Skipped / errors</div>
                <div className="metric-value" style={{ color: stats?.skipped > 0 ? 'var(--clay)' : undefined }}>
                  {stats?.skipped}
                </div>
              </div>
              <div className="metric" style={{ flex: 1 }}>
                <div className="metric-label">Unmatched tenants</div>
                <div className="metric-value" style={{ color: 'var(--amber-text)' }}>
                  {results.filter(r => !r.error && !r.tenant_matched).length}
                </div>
              </div>
            </div>

            {results.filter(r => !r.tenant_matched && !r.error).length > 0 && (
              <div style={{
                background: 'var(--amber-bg)', border: '1px solid #F5D78A',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                fontSize: 12.5, color: 'var(--amber-text)', marginBottom: '1rem',
              }}>
                Some invoices couldn't be matched to a tenant by name. They were still imported — go to the Invoices page to assign them manually, or make sure the customer name in QB matches exactly.
              </div>
            )}

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map((r, i) => <ResultRow key={i} item={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
