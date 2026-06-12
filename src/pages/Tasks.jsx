import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Plus, CheckCircle, Circle, AlertTriangle, User } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const PRIORITY_COLORS = {
  high:   { bg: 'var(--red-bg)',   text: 'var(--red-text)' },
  normal: { bg: 'var(--amber-bg)', text: 'var(--amber-text)' },
  low:    { bg: 'var(--gray-bg)',  text: 'var(--gray-text)' },
};

function TaskModal({ onClose, onSave, tenants, user, displayName }) {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [priority, setPriority] = useState('normal');
  const [tenantId, setTenantId] = useState('');
  const [assignee, setAssignee] = useState(displayName);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      body: body.trim() || null,
      due_date: dueDate || null,
      priority,
      tenant_id: tenantId || null,
      assignee_name: assignee,
      created_by_name: displayName,
      status: 'open',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New task</div>
        <div className="modal-sub">Create a task for you or Charlie to follow up on.</div>

        <div className="field">
          <label className="field-label">Task title *</label>
          <input className="field-input" placeholder="e.g. Follow up with Acme re: overdue invoice" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>

        <div className="field">
          <label className="field-label">Notes (optional)</label>
          <textarea className="field-input" rows={2} placeholder="Any additional context..." value={body} onChange={e => setBody(e.target.value)} style={{resize:'vertical'}} />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Due date</label>
            <input className="field-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Priority</label>
            <select className="field-input" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Assign to</label>
            <select className="field-input" value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="Matt">Matt</option>
              <option value="Charlie">Charlie</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Related tenant</label>
            <select className="field-input" value={tenantId} onChange={e => setTenantId(e.target.value)}>
              <option value="">— None —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
            {saving ? 'Saving...' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const [tasks,   setTasks]   = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('open');
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    const [{ data: taskData }, { data: tenantData }] = await Promise.all([
      supabase.from('tasks')
        .select('*, tenants(id, company_name)')
        .neq('status', tab === 'open' ? 'done' : 'open')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('tenants').select('id, company_name').order('company_name'),
    ]);
    setTasks(taskData || []);
    setTenants(tenantData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const createTask = async (data) => {
    await supabase.from('tasks').insert(data);
    load();
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    load();
  };

  const isOverdue = (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
  const isDueSoon = (t) => {
    if (!t.due_date || t.status === 'done') return false;
    const days = Math.floor((new Date(t.due_date) - Date.now()) / 86400000);
    return days >= 0 && days <= 2;
  };

  const myTasks    = tasks.filter(t => t.assignee_name === 'Matt');
  const theirTasks = tasks.filter(t => t.assignee_name === 'Charlie');
  const unassigned = tasks.filter(t => !t.assignee_name || (t.assignee_name !== 'Matt' && t.assignee_name !== 'Charlie'));

  const renderTask = (task) => (
    <div key={task.id} style={{
      display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0',
      borderBottom:'1px solid var(--border)', opacity: task.status === 'done' ? 0.5 : 1,
    }}>
      <button
        onClick={() => toggleDone(task)}
        style={{background:'none',border:'none',padding:0,marginTop:1,flexShrink:0,color: task.status==='done' ? 'var(--sage)' : 'var(--border-mid)',cursor:'pointer'}}
      >
        {task.status === 'done' ? <CheckCircle size={18}/> : <Circle size={18}/>}
      </button>
      <div style={{flex:1}}>
        <div style={{
          fontSize:13.5, fontWeight:500,
          color: task.status==='done' ? 'var(--slate-light)' : 'var(--slate)',
          textDecoration: task.status==='done' ? 'line-through' : 'none',
        }}>
          {task.title}
        </div>
        {task.body && <div style={{fontSize:12,color:'var(--slate-light)',marginTop:2}}>{task.body}</div>}
        <div style={{display:'flex',gap:8,marginTop:5,alignItems:'center',flexWrap:'wrap'}}>
          {task.tenants && (
            <span
              style={{fontSize:11,color:'var(--sage)',cursor:'pointer',fontWeight:500}}
              onClick={() => navigate(`/tenants/${task.tenants.id}`)}
            >
              {task.tenants.company_name}
            </span>
          )}
          {task.due_date && (
            <span style={{
              fontSize:11,
              color: isOverdue(task) ? 'var(--red-text)' : isDueSoon(task) ? 'var(--clay)' : 'var(--slate-light)',
              display:'flex', alignItems:'center', gap:3,
            }}>
              {isOverdue(task) && <AlertTriangle size={10}/>}
              {fmtDate(task.due_date)}
            </span>
          )}
          <span style={{
            fontSize:11, padding:'1px 6px', borderRadius:10,
            background: PRIORITY_COLORS[task.priority]?.bg,
            color: PRIORITY_COLORS[task.priority]?.text,
          }}>
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );

  const TaskGroup = ({ label, tasks }) => {
    if (tasks.length === 0) return null;
    return (
      <div style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <User size={13} style={{color:'var(--slate-light)'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'var(--slate-light)',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            {label} · {tasks.length}
          </span>
        </div>
        <div className="card" style={{padding:'0 1.25rem'}}>
          {tasks.map(renderTask)}
        </div>
      </div>
    );
  };

  return (
    <div className="page-content">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <div className="tabs" style={{marginBottom:0,border:'none'}}>
          {[['open','Open'],['done','Completed']].map(([val,label]) => (
            <div key={val} className={`tab ${tab===val?'active':''}`} onClick={()=>{setTab(val);setLoading(true);}}>
              {label}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14}/> New task
        </button>
      </div>

      {loading && <div className="loading-row"><div className="spinner"/></div>}

      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">{tab === 'open' ? 'No open tasks' : 'No completed tasks'}</div>
          <div className="empty-state-sub">{tab === 'open' ? 'Create a task to track follow-ups and to-dos' : 'Completed tasks will appear here'}</div>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <>
          <TaskGroup label="Matt" tasks={myTasks} />
          <TaskGroup label="Charlie" tasks={theirTasks} />
          <TaskGroup label="Unassigned" tasks={unassigned} />
        </>
      )}

      {showNew && (
        <TaskModal
          onClose={() => setShowNew(false)}
          onSave={createTask}
          tenants={tenants}
          user={user}
          displayName={displayName}
        />
      )}
    </div>
  );
}
