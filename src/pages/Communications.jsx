import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, MessageSquare, Phone, FileText, Cpu } from 'lucide-react';

const TYPE_ICONS = {
  email:   { Icon: Mail,          cls: 'email' },
  sms:     { Icon: MessageSquare, cls: 'email' },
  call:    { Icon: Phone,         cls: 'system' },
  note:    { Icon: FileText,      cls: 'lease' },
  system:  { Icon: Cpu,           cls: 'system' },
};

export default function Communications() {
  const [comms,   setComms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    supabase
      .from('communications')
      .select('*, tenants(company_name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setComms(data || []); setLoading(false); });
  }, []);

  const filtered = comms.filter(c =>
    !search ||
    c.tenants?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase()) ||
    c.body?.toLowerCase().includes(search.toLowerCase())
  );

  const fmtDateTime = (d) => new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

  return (
    <div className="page-content">
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search communications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading && <div className="loading-row"><div className="spinner"/></div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-title">No communications yet</div>
            <div className="empty-state-sub">Emails, reminders, and notes will appear here automatically</div>
          </div>
        )}
        {filtered.map(c => {
          const { Icon, cls } = TYPE_ICONS[c.type] || TYPE_ICONS.system;
          return (
            <div key={c.id} className="activity-item">
              <div className={`activity-icon ${cls}`}><Icon size={13}/></div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:500,color:'var(--slate)'}}>{c.subject || c.type}</span>
                  <span style={{fontSize:11,color:'var(--slate-light)'}}>{c.direction === 'inbound' ? '← Inbound' : '→ Outbound'}</span>
                </div>
                {c.tenants?.company_name && (
                  <div style={{fontSize:12,color:'var(--sage)',marginBottom:3}}>{c.tenants.company_name}</div>
                )}
                {c.body && (
                  <div style={{fontSize:12.5,color:'var(--slate-mid)',lineHeight:1.5}}>
                    {c.body.slice(0,160)}{c.body.length>160?'…':''}
                  </div>
                )}
              </div>
              <div style={{fontSize:11,color:'var(--slate-light)',flexShrink:0,marginTop:2,textAlign:'right'}}>
                <div>{fmtDateTime(c.created_at)}</div>
                <div style={{marginTop:3}}><span className="badge badge-draft">{c.type}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
