import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

export default function EditParcelModal({ parcel, onClose, onSave }) {
  const [form, setForm] = useState({
    lot_number:   parcel?.lot_number   || '',
    name:         parcel?.name         || '',
    description:  parcel?.description  || '',
    acreage:      parcel?.acreage      || '',
    monthly_rate: parcel?.monthly_rate || '',
    status:       parcel?.status       || 'vacant',
    tenant_id:    parcel?.tenant_id    || '',
    notes:        parcel?.notes        || '',
  });
  const [tenants, setTenants] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    supabase.from('tenants').select('id, company_name').eq('status','active').order('company_name')
      .then(({ data }) => setTenants(data || []));
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.lot_number.trim() && !form.name.trim()) {
      setError('Lot number or name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      acreage:      form.acreage      ? Number(form.acreage)      : null,
      monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : null,
      tenant_id:    form.tenant_id    || null,
      // Auto-set status based on tenant assignment
      status: form.tenant_id ? 'occupied' : form.status,
    };

    const { error } = parcel?.id
      ? await supabase.from('parcels').update(payload).eq('id', parcel.id)
      : await supabase.from('parcels').insert(payload);

    if (error) { setError(error.message); setSaving(false); return; }
    onSave();
    onClose();
  };

  const isNew = !parcel?.id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{width:520}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <div className="modal-title">{isNew ? 'Add lot' : 'Edit lot'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--slate-light)'}}>
            <X size={16}/>
          </button>
        </div>
        <div className="modal-sub">{isNew ? 'Add a new lot or parcel to the property.' : `Editing ${parcel.name || `Lot ${parcel.lot_number}`}`}</div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Lot number *</label>
            <input className="field-input" value={form.lot_number} onChange={e => set('lot_number', e.target.value)} placeholder="12" autoFocus />
          </div>
          <div className="field">
            <label className="field-label">Display name</label>
            <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Lot 12" />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Description</label>
          <input className="field-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="North corner lot, approx. 0.25 acres" />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Acreage</label>
            <input className="field-input" type="number" step="0.01" value={form.acreage} onChange={e => set('acreage', e.target.value)} placeholder="0.25" />
          </div>
          <div className="field">
            <label className="field-label">Monthly rate ($)</label>
            <input className="field-input" type="number" value={form.monthly_rate} onChange={e => set('monthly_rate', e.target.value)} placeholder="800" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Status</label>
            <select className="field-input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Current tenant</label>
            <select className="field-input" value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
              <option value="">— Vacant —</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.company_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Notes</label>
          <textarea className="field-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this lot..." style={{resize:'vertical'}} />
        </div>

        {error && (
          <div style={{fontSize:13,color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 12px',borderRadius:'var(--radius-md)',marginBottom:12}}>
            {error}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add lot' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
