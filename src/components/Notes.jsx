import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Send, Trash2 } from 'lucide-react';

const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

export default function Notes({ tenantId }) {
  const { displayName } = useAuth();
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [body,    setBody]    = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const addNote = async () => {
    if (!body.trim()) return;
    setSaving(true);
    await supabase.from('notes').insert({
      tenant_id: tenantId,
      body: body.trim(),
      author_name: displayName,
    });
    setBody('');
    setSaving(false);
    load();
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await supabase.from('notes').delete().eq('id', id);
    load();
  };

  return (
    <div>
      {/* Add note input */}
      <div style={{
        display:'flex', gap:8, marginBottom:'1rem',
        background:'var(--sand)', borderRadius:'var(--radius-md)',
        padding:12, border:'1px solid var(--border)',
      }}>
        <textarea
          style={{
            flex:1, fontSize:13, padding:'6px 10px',
            border:'1px solid var(--border-mid)',
            borderRadius:'var(--radius-md)',
            background:'var(--white)', color:'var(--slate)',
            resize:'none', outline:'none', fontFamily:'var(--font-body)',
            minHeight:60,
          }}
          placeholder="Add a note — e.g. Called Dale, says he'll pay by Friday"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote();
          }}
        />
        <button
          className="btn btn-primary"
          style={{alignSelf:'flex-end'}}
          onClick={addNote}
          disabled={saving || !body.trim()}
        >
          {saving ? '...' : <Send size={13}/>}
        </button>
      </div>
      <div style={{fontSize:11,color:'var(--slate-light)',marginBottom:'1rem',marginTop:-8}}>
        ⌘+Enter to save
      </div>

      {/* Notes list */}
      {loading && <div className="loading-row"><div className="spinner"/></div>}
      {!loading && notes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No notes yet</div>
          <div className="empty-state-sub">Add a note to track calls, conversations, or context</div>
        </div>
      )}
      {notes.map(note => (
        <div key={note.id} style={{
          padding:'12px 0', borderBottom:'1px solid var(--border)',
          display:'flex', gap:10, alignItems:'flex-start',
        }}>
          <div style={{
            width:30, height:30, borderRadius:'50%',
            background:'var(--sage-light)', color:'var(--sage)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:600, flexShrink:0,
          }}>
            {(note.author_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:500,color:'var(--slate)'}}>{note.author_name || 'Unknown'}</span>
              <span style={{fontSize:11,color:'var(--slate-light)'}}>{fmtDateTime(note.created_at)}</span>
            </div>
            <div style={{fontSize:13,color:'var(--slate)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
              {note.body}
            </div>
          </div>
          <button
            onClick={() => deleteNote(note.id)}
            style={{background:'none',border:'none',color:'var(--slate-light)',cursor:'pointer',padding:4,flexShrink:0}}
            title="Delete note"
          >
            <Trash2 size={13}/>
          </button>
        </div>
      ))}
    </div>
  );
}
