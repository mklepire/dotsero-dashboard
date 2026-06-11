import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, FileText, Receipt, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVATARS = ['#E8F0EB','#FDF3E3','#E3EEF9','#F9EDE5','#F0EDE8'];
const avatarColor = (name) => AVATARS[(name?.charCodeAt(0) || 0) % AVATARS.length];
const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

function AiBar() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse('');
    // Placeholder — will wire to n8n webhook when ready
    await new Promise(r => setTimeout(r, 900));
    setResponse(`Got it — I'll take care of "${input}". (AI execution will be live once n8n is connected.)`);
    setLoading(false);
  };

  return (
    <div className="ai-bar">
      <div className="ai-bar-label">
        <div className="ai-bar-label-dot" />
        Tell me what to do
      </div>
      <div className="ai-bar-row">
        <input
          className="ai-input"
          placeholder='e.g. "Remind Covenant Towing their invoice is 2 weeks overdue"'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
        />
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? <div className="spinner" style={{width:14,height:14,borderWidth:2}} /> : <><Sparkles size={14} /> Run</>}
        </button>
      </div>
      {response && <div className="ai-response">{response}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [tenants, setTenants]     = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [comms, setComms]         = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: statsData }, { data: tenantData }, { data: invoiceData }, { data: commData }] = await Promise.all([
        supabase.from('dashboard_stats').select('*').single(),
        supabase.from('tenants').select('*').eq('status','active').order('company_name').limit(5),
        supabase.from('invoices').select('*, tenants(company_name)').in('status',['unpaid','overdue','partial']).order('due_date').limit(5),
        supabase.from('communications').select('*, tenants(company_name)').order('created_at', { ascending: false }).limit(6),
      ]);
      setStats(statsData);
      setTenants(tenantData || []);
      setInvoices(invoiceData || []);
      setComms(commData || []);
      setLoading(false);
    }
    load();
  }, []);

  const daysOverdue = (d) => {
    if (!d) return 0;
    return Math.floor((Date.now() - new Date(d)) / 86400000);
  };

  const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—';

  const activityIcon = (type) => {
    if (type === 'email' || type === 'sms') return { cls: 'email', Icon: Mail };
    if (type === 'lease') return { cls: 'lease', Icon: FileText };
    if (type === 'invoice') return { cls: 'invoice', Icon: Receipt };
    return { cls: 'system', Icon: Sparkles };
  };

  const timeAgo = (d) => {
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  };

  return (
    <div className="page-content">
      <AiBar />

      <div className="metrics">
        <div className="metric">
          <div className="metric-label">Active tenants</div>
          <div className="metric-value">{loading ? '—' : (stats?.active_tenants ?? 0)}</div>
          <div className="metric-sub">{loading ? '' : `${stats?.vacant_parcels ?? 0} lots vacant`}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Monthly rent</div>
          <div className="metric-value">{loading ? '—' : fmtMoney(stats?.total_monthly_rent)}</div>
          <div className="metric-sub">Across active leases</div>
        </div>
        <div className="metric">
          <div className="metric-label">Overdue invoices</div>
          <div className={`metric-value ${(stats?.overdue_invoice_count > 0) ? 'alert' : ''}`}>
            {loading ? '—' : (stats?.overdue_invoice_count ?? 0)}
          </div>
          <div className="metric-sub">{loading ? '' : `${fmtMoney(stats?.overdue_total)} outstanding`}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Leases expiring</div>
          <div className={`metric-value ${(stats?.leases_expiring_soon > 0) ? 'warn' : ''}`}>
            {loading ? '—' : (stats?.leases_expiring_soon ?? 0)}
          </div>
          <div className="metric-sub">Within 90 days</div>
        </div>
      </div>

      <div className="grid-2" style={{marginBottom:'1rem'}}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Active tenants</div>
            <span className="card-link" onClick={() => navigate('/tenants')}>View all <ArrowRight size={11} style={{display:'inline'}}/></span>
          </div>
          <div className="row-list">
            {loading && <div className="loading-row"><div className="spinner"/></div>}
            {!loading && tenants.length === 0 && <div className="empty-state"><div className="empty-state-title">No active tenants yet</div></div>}
            {tenants.map(t => (
              <div key={t.id} className="row-item" style={{cursor:'pointer'}} onClick={() => navigate(`/tenants/${t.id}`)}>
                <div className="avatar" style={{background: avatarColor(t.company_name), color: 'var(--slate)'}}>{initials(t.company_name)}</div>
                <div>
                  <div className="row-primary">{t.company_name}</div>
                  <div className="row-secondary">{t.contact_name || t.email || 'No contact info'}</div>
                </div>
                <div className="row-actions">
                  <span className="badge badge-active">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Open invoices</div>
            <span className="card-link" onClick={() => navigate('/invoices')}>View all <ArrowRight size={11} style={{display:'inline'}}/></span>
          </div>
          <div className="row-list">
            {loading && <div className="loading-row"><div className="spinner"/></div>}
            {!loading && invoices.length === 0 && <div className="empty-state"><div className="empty-state-title">No open invoices</div><div className="empty-state-sub">All caught up</div></div>}
            {invoices.map(inv => {
              const overdue = daysOverdue(inv.due_date);
              const isOverdue = overdue > 0;
              return (
                <div key={inv.id} className="row-item">
                  <div>
                    <div className="row-primary">{inv.tenants?.company_name || '—'}</div>
                    <div className="row-secondary">{inv.invoice_number} · {isOverdue ? `${overdue}d overdue` : `Due ${new Date(inv.due_date).toLocaleDateString()}`}</div>
                  </div>
                  <div className="row-right">
                    <div className="row-amount">{fmtMoney(inv.balance_due ?? inv.amount)}</div>
                    <span className={`badge ${isOverdue ? 'badge-overdue' : 'badge-pending'}`}>{isOverdue ? 'Overdue' : 'Due soon'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent activity</div>
          <span className="card-link" onClick={() => navigate('/communications')}>View all</span>
        </div>
        {loading && <div className="loading-row"><div className="spinner"/></div>}
        {!loading && comms.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-sub">Actions you take will appear here</div>
          </div>
        )}
        {comms.map(c => {
          const { cls, Icon } = activityIcon(c.type);
          return (
            <div key={c.id} className="activity-item">
              <div className={`activity-icon ${cls}`}><Icon size={13}/></div>
              <div className="activity-text">
                <strong>{c.subject || c.type}</strong>
                {c.tenants?.company_name ? ` — ${c.tenants.company_name}` : ''}
                {c.body ? `: ${c.body.slice(0,80)}${c.body.length > 80 ? '…' : ''}` : ''}
              </div>
              <div className="activity-time">{timeAgo(c.created_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
