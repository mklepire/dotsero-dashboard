import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, AlertTriangle } from 'lucide-react';

const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—';
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

export default function Leases() {
  const navigate = useNavigate();
  const [leases,  setLeases]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('active');

  useEffect(() => {
    async function load() {
      let q = supabase.from('leases').select('*, tenants(id,company_name), parcels(name,lot_number)').order('expiration_date');
      if (tab !== 'all') q = q.eq('status', tab);
      const { data } = await q;
      setLeases(data || []);
      setLoading(false);
    }
    load();
  }, [tab]);

  const daysUntilExpiry = (d) => d ? Math.floor((new Date(d) - Date.now()) / 86400000) : null;

  return (
    <div className="page-content">
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1rem'}}>
        <button className="btn btn-primary" onClick={() => navigate('/leases/new')}>
          <Plus size={14}/> New lease
        </button>
      </div>

      <div className="tabs">
        {[['active','Active'],['draft','Drafts'],['pending_signature','Pending signature'],['expired','Expired'],['all','All']].map(([val,label]) => (
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
              <th>Lot</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Monthly rent</th>
              <th>Security deposit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8}><div className="loading-row"><div className="spinner"/></div></td></tr>}
            {!loading && leases.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state">
                <div className="empty-state-title">No leases found</div>
                <div className="empty-state-sub">Once you create leases they'll appear here</div>
              </div></td></tr>
            )}
            {leases.map(l => {
              const days = daysUntilExpiry(l.expiration_date);
              const expiringSoon = days !== null && days <= 90 && days >= 0 && l.status === 'active';
              return (
                <tr key={l.id}>
                  <td>
                    <span
                      className="td-primary"
                      style={{cursor:'pointer',color:'var(--sage)'}}
                      onClick={() => navigate(`/tenants/${l.tenants?.id}`)}
                    >
                      {l.tenants?.company_name || '—'}
                    </span>
                  </td>
                  <td className="td-muted">{l.parcels?.name || l.parcels?.lot_number || '—'}</td>
                  <td><span className={`badge badge-${l.status==='active'?'active':l.status==='draft'?'draft':'pending'}`}>{l.status.replace('_',' ')}</span></td>
                  <td className="td-muted">{fmtDate(l.commencement_date)}</td>
                  <td>
                    <span className="td-muted">{fmtDate(l.expiration_date)}</span>
                    {expiringSoon && (
                      <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--clay)',marginTop:2}}>
                        <AlertTriangle size={10}/> {days}d left
                      </div>
                    )}
                  </td>
                  <td>{fmtMoney(l.monthly_rent)}</td>
                  <td className="td-muted">{fmtMoney(l.security_deposit)}</td>
                  <td>
                    <button className="btn btn-sm">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
