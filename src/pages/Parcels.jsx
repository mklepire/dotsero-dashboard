import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—';

export default function Parcels() {
  const [parcels,  setParcels]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase.from('parcels').select('*, tenants(company_name)').order('lot_number').then(({ data }) => {
      setParcels(data || []);
      setLoading(false);
    });
  }, []);

  const vacant   = parcels.filter(p => p.status === 'vacant').length;
  const occupied = parcels.filter(p => p.status === 'occupied').length;

  return (
    <div className="page-content">
      <div style={{display:'flex',gap:12,marginBottom:'1.25rem'}}>
        <div className="metric" style={{flex:1}}>
          <div className="metric-label">Total lots</div>
          <div className="metric-value">{parcels.length}</div>
        </div>
        <div className="metric" style={{flex:1}}>
          <div className="metric-label">Occupied</div>
          <div className="metric-value">{occupied}</div>
        </div>
        <div className="metric" style={{flex:1}}>
          <div className="metric-label">Vacant</div>
          <div className="metric-value" style={{color: vacant > 0 ? 'var(--sage)' : undefined}}>{vacant}</div>
          <div className="metric-sub">{vacant > 0 ? 'Available to lease' : 'All occupied'}</div>
        </div>
        <div className="metric" style={{flex:1}}>
          <div className="metric-label">Monthly revenue</div>
          <div className="metric-value">{fmtMoney(parcels.filter(p=>p.status==='occupied').reduce((s,p)=>s+Number(p.monthly_rate||0),0))}</div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1rem'}}>
        <button className="btn btn-primary"><Plus size={14}/> Add lot</button>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Lot #</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Current tenant</th>
              <th>Monthly rate</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6}><div className="loading-row"><div className="spinner"/></div></td></tr>}
            {!loading && parcels.length === 0 && (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-title">No lots added yet</div>
                  <div className="empty-state-sub">Add your lots to get started</div>
                </div>
              </td></tr>
            )}
            {parcels.map(p => (
              <tr key={p.id}>
                <td className="td-primary">{p.lot_number || '—'}</td>
                <td>{p.name}</td>
                <td className="td-muted" style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description || '—'}</td>
                <td>
                  <span className={`badge ${p.status==='occupied'?'badge-active':p.status==='vacant'?'badge-vacant':'badge-pending'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="td-muted">{p.tenants?.company_name || '—'}</td>
                <td>{fmtMoney(p.monthly_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
