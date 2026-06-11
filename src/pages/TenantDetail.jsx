import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Phone, Send, FileText, Receipt } from 'lucide-react';

const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—';
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant,   setTenant]   = useState(null);
  const [leases,   setLeases]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [comms,    setComms]    = useState([]);
  const [tab,      setTab]      = useState('overview');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: l }, { data: inv }, { data: c }] = await Promise.all([
        supabase.from('tenants').select('*').eq('id',id).single(),
        supabase.from('leases').select('*, parcels(name,lot_number)').eq('tenant_id',id).order('created_at',{ascending:false}),
        supabase.from('invoices').select('*').eq('tenant_id',id).order('due_date',{ascending:false}).limit(10),
        supabase.from('communications').select('*').eq('tenant_id',id).order('created_at',{ascending:false}).limit(20),
      ]);
      setTenant(t);
      setLeases(l || []);
      setInvoices(inv || []);
      setComms(c || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="page-content"><div className="loading-row"><div className="spinner"/></div></div>;
  if (!tenant) return <div className="page-content"><p>Tenant not found.</p></div>;

  const activeLeases = leases.filter(l => l.status === 'active');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue' || (i.status !== 'paid' && new Date(i.due_date) < new Date()));

  return (
    <div className="page-content">
      {/* Back + header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div>
          <button className="btn btn-sm" style={{marginBottom:10}} onClick={() => navigate('/tenants')}>
            <ArrowLeft size={12}/> Tenants
          </button>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:26,color:'var(--slate)',lineHeight:1.2}}>{tenant.company_name}</h1>
          <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
            <span className={`badge badge-${tenant.status}`}>{tenant.status}</span>
            {tenant.contact_name && <span style={{fontSize:13,color:'var(--slate-light)'}}>{tenant.contact_name}</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {tenant.email && (
            <a href={`mailto:${tenant.email}`} className="btn btn-sm">
              <Mail size={12}/> Email
            </a>
          )}
          {tenant.phone && (
            <a href={`tel:${tenant.phone}`} className="btn btn-sm">
              <Phone size={12}/> Call
            </a>
          )}
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/tenants/${id}/send-form`)}>
            <Send size={12}/> Send intake form
          </button>
          <button className="btn btn-sm" onClick={() => navigate(`/leases/new?tenant=${id}`)}>
            <FileText size={12}/> New lease
          </button>
        </div>
      </div>

      {/* Alert bar for overdue invoices */}
      {overdueInvoices.length > 0 && (
        <div style={{background:'var(--red-bg)',border:'1px solid #F5C6C6',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:'1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:'var(--red-text)'}}>
            <strong>{overdueInvoices.length} overdue invoice{overdueInvoices.length>1?'s':''}</strong> — {fmtMoney(overdueInvoices.reduce((s,i)=>s+Number(i.balance_due||i.amount||0),0))} outstanding
          </span>
          <button className="btn btn-sm" style={{borderColor:'#F5C6C6',color:'var(--red-text)'}} onClick={() => setTab('invoices')}>
            View invoices
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview','leases','invoices','communications'].map(t => (
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==='invoices' && overdueInvoices.length > 0 && (
              <span style={{marginLeft:5,background:'var(--red-text)',color:'white',borderRadius:10,padding:'0 5px',fontSize:10}}>{overdueInvoices.length}</span>
            )}
          </div>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title" style={{marginBottom:'1rem'}}>Contact info</div>
            <div className="detail-grid">
              <div><div className="detail-label">Company</div><div className="detail-value">{tenant.company_name}</div></div>
              <div><div className="detail-label">Contact</div><div className="detail-value">{tenant.contact_name || '—'}</div></div>
              <div><div className="detail-label">Email</div><div className="detail-value">{tenant.email || '—'}</div></div>
              <div><div className="detail-label">Phone</div><div className="detail-value">{tenant.phone || '—'}</div></div>
              <div style={{gridColumn:'1/-1'}}><div className="detail-label">Mailing address</div><div className="detail-value">{tenant.mailing_address || '—'}</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{marginBottom:'1rem'}}>Active leases</div>
            {activeLeases.length === 0 && <div className="empty-state"><div className="empty-state-title">No active leases</div></div>}
            {activeLeases.map(l => (
              <div key={l.id} className="row-item">
                <div>
                  <div className="row-primary">{l.parcels?.name || `Lot ${l.parcels?.lot_number}` || 'Unknown lot'}</div>
                  <div className="row-secondary">{fmtDate(l.commencement_date)} → {fmtDate(l.expiration_date)}</div>
                </div>
                <div className="row-right">
                  <div className="row-amount">{fmtMoney(l.monthly_rent)}/mo</div>
                  <span className="badge badge-active">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leases */}
      {tab === 'leases' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="data-table">
            <thead><tr><th>Lot</th><th>Status</th><th>Start</th><th>End</th><th>Monthly rent</th><th>Security deposit</th></tr></thead>
            <tbody>
              {leases.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No leases on record</div></div></td></tr>}
              {leases.map(l => (
                <tr key={l.id}>
                  <td className="td-primary">{l.parcels?.name || '—'}</td>
                  <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                  <td className="td-muted">{fmtDate(l.commencement_date)}</td>
                  <td className="td-muted">{fmtDate(l.expiration_date)}</td>
                  <td>{fmtMoney(l.monthly_rent)}</td>
                  <td className="td-muted">{fmtMoney(l.security_deposit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="data-table">
            <thead><tr><th>Invoice #</th><th>Amount</th><th>Balance due</th><th>Due date</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">No invoices found</div></div></td></tr>}
              {invoices.map(i => (
                <tr key={i.id}>
                  <td className="td-primary">{i.invoice_number || '—'}</td>
                  <td>{fmtMoney(i.amount)}</td>
                  <td>{fmtMoney(i.balance_due)}</td>
                  <td className="td-muted">{fmtDate(i.due_date)}</td>
                  <td><span className={`badge badge-${i.status==='paid'?'active':i.status==='overdue'?'overdue':'pending'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Communications */}
      {tab === 'communications' && (
        <div className="card">
          {comms.length === 0 && <div className="empty-state"><div className="empty-state-title">No communications logged</div></div>}
          {comms.map(c => (
            <div key={c.id} className="activity-item">
              <div className={`activity-icon ${c.type==='email'||c.type==='sms'?'email':'system'}`}>
                {c.type==='email'||c.type==='sms' ? <Mail size={13}/> : <Receipt size={13}/>}
              </div>
              <div className="activity-text">
                <strong>{c.subject || c.type}</strong>
                {c.body ? ` — ${c.body.slice(0,100)}${c.body.length>100?'…':''}` : ''}
              </div>
              <div className="activity-time">{new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
