import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Send } from 'lucide-react';

const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—';
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('open');

  useEffect(() => {
    async function load() {
      let q = supabase.from('invoices').select('*, tenants(id, company_name)').order('due_date');
      if (tab === 'open')    q = q.in('status',['unpaid','overdue','partial']);
      if (tab === 'overdue') q = q.eq('status','overdue');
      if (tab === 'paid')    q = q.eq('status','paid');
      const { data } = await q;
      setInvoices(data || []);
      setLoading(false);
    }
    load();
  }, [tab]);

  const filtered = invoices.filter(i =>
    !search ||
    i.tenants?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  const daysOverdue = (d) => Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000));

  return (
    <div className="page-content">
      <div className="filter-bar">
        <div style={{position:'relative',flex:1,maxWidth:320}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--slate-light)'}}/>
          <input
            className="search-input"
            style={{paddingLeft:32,maxWidth:'100%',width:'100%'}}
            placeholder="Search by tenant or invoice #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tabs">
        {[['open','Open'],['overdue','Overdue'],['paid','Paid'],['all','All']].map(([val,label]) => (
          <div key={val} className={`tab ${tab===val?'active':''}`} onClick={()=>{setTab(val);setLoading(true);}}>
            {label}
          </div>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Invoice #</th>
              <th>Amount</th>
              <th>Balance due</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Follow-ups</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8}><div className="loading-row"><div className="spinner"/></div></td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-title">No invoices found</div></div></td></tr>
            )}
            {filtered.map(inv => {
              const overdue = daysOverdue(inv.due_date);
              const isOverdue = inv.status === 'overdue' || (inv.status !== 'paid' && overdue > 0);
              return (
                <tr key={inv.id}>
                  <td>
                    <span
                      className="td-primary"
                      style={{cursor:'pointer',color:'var(--sage)'}}
                      onClick={() => navigate(`/tenants/${inv.tenants?.id}`)}
                    >
                      {inv.tenants?.company_name || '—'}
                    </span>
                  </td>
                  <td className="td-muted">{inv.invoice_number || '—'}</td>
                  <td>{fmtMoney(inv.amount)}</td>
                  <td style={{fontWeight: isOverdue ? 600 : 400, color: isOverdue ? 'var(--red-text)' : undefined}}>
                    {fmtMoney(inv.balance_due)}
                  </td>
                  <td className="td-muted">
                    {fmtDate(inv.due_date)}
                    {isOverdue && overdue > 0 && <div style={{fontSize:11,color:'var(--red-text)'}}>{overdue}d overdue</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${inv.status==='paid'?'active':isOverdue?'overdue':'pending'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="td-muted">{inv.followup_count || 0}</td>
                  <td>
                    {inv.status !== 'paid' && (
                      <button className="btn btn-sm" title="Send reminder">
                        <Send size={12}/> Remind
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:'var(--slate-light)',marginTop:8}}>
        {filtered.length} invoice{filtered.length!==1?'s':''}
        {tab==='open' && filtered.length > 0 && (
          <span> · {fmtMoney(filtered.reduce((s,i)=>s+Number(i.balance_due||i.amount||0),0))} total outstanding</span>
        )}
      </div>
    </div>
  );
}
