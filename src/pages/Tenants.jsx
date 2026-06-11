import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, Send } from 'lucide-react';

const initials = (name) => name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
const COLORS = ['#E8F0EB','#FDF3E3','#E3EEF9','#F9EDE5','#F0EDE8'];
const avatarColor = (name) => COLORS[(name?.charCodeAt(0)||0) % COLORS.length];

const STATUS_TABS = ['all','active','prospect','former'];

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState('');
  const [tab,     setTab]       = useState('all');

  useEffect(() => {
    async function load() {
      let q = supabase.from('tenants').select('*').order('company_name');
      if (tab !== 'all') q = q.eq('status', tab);
      const { data } = await q;
      setTenants(data || []);
      setLoading(false);
    }
    load();
  }, [tab]);

  const filtered = tenants.filter(t =>
    !search ||
    t.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="filter-bar">
        <div style={{position:'relative',flex:1,maxWidth:320}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--slate-light)'}}/>
          <input
            className="search-input"
            style={{paddingLeft:32,maxWidth:'100%',width:'100%'}}
            placeholder="Search tenants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tenants/new')}>
          <Plus size={14}/> Add tenant
        </button>
      </div>

      <div className="tabs">
        {STATUS_TABS.map(s => (
          <div key={s} className={`tab ${tab===s?'active':''}`} onClick={()=>setTab(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </div>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6}><div className="loading-row"><div className="spinner"/></div></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No tenants found</div></div></td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} style={{cursor:'pointer'}} onClick={() => navigate(`/tenants/${t.id}`)}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="avatar" style={{width:28,height:28,fontSize:10,background:avatarColor(t.company_name),color:'var(--slate)',flexShrink:0}}>
                      {initials(t.company_name)}
                    </div>
                    <span className="td-primary">{t.company_name}</span>
                  </div>
                </td>
                <td className="td-muted">{t.contact_name || '—'}</td>
                <td className="td-muted">{t.email || '—'}</td>
                <td className="td-muted">{t.phone || '—'}</td>
                <td>
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => navigate(`/tenants/${t.id}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:'var(--slate-light)',marginTop:8}}>
        {filtered.length} tenant{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
