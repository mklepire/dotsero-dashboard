import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

export default function EditTenantModal({ tenant, onClose, onSave }) {
  const [form, setForm] = useState({
    company_name:    tenant?.company_name    || '',
    contact_name:    tenant?.contact_name    || '',
    email:           tenant?.email           || '',
    phone:           tenant?.phone           || '',
    mailing_address: tenant?.mailing_address || '',
    status:          tenant?.status          || 'active',
    notes:           tenant?.notes           || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.company_name.trim()) { setError('Company name is required.'); return; }
    setSaving(true);
    setError('');

    const { error } = tenant?.id
      ? await supabase.from('tenants').update(form).eq('id', tenant.id)
      : await supabase.from('tenants').insert(form);

    if (error) { setError(error.message); setSaving(false); return; }
    onSave();
    onClose();
  };

  const isNew = !tenant?.id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{width:520}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <div className="modal-title">{isNew ? 'Add tenant' : 'Edit tenant'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--slate-light)'}}>
            <X size={16}/>
          </button>
        </div>
        <div className="modal-sub">{isNew ? 'Add a new tenant to the system.' : `Editing ${tenant.company_name}`}</div>

        <div className="field">
          <label className="field-label">Company / business name *</label>
          <input className="field-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Gravel Co." autoFocus />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Contact name</label>
            <input className="field-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Dale Morrow" />
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select className="field-input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="former">Former</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="dale@acmegravel.com" />
          </div>
          <div className="field">
            <label className="field-label">Phone</label>
            <input className="field-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(970) 555-0101" />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Mailing address</label>
          <input className="field-input" value={form.mailing_address} onChange={e => set('mailing_address', e.target.value)} placeholder="123 Canyon Rd, Gypsum CO 81637" />
        </div>

        <div className="field">
          <label className="field-label">Notes</label>
          <textarea className="field-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any internal notes about this tenant..." style={{resize:'vertical'}} />
        </div>

        {error && (
          <div style={{fontSize:13,color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 12px',borderRadius:'var(--radius-md)',marginBottom:12}}>
            {error}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add tenant' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
