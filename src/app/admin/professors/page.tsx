'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSquare2, Plus, Search, Edit3, Trash2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Professor, Department } from '@/types';

interface ProfForm { name: string; department_id: string; email: string; }

export default function ProfessorsPage() {
  const supabase = createClient();
  const [professors, setProfessors] = useState<(Professor & { departments?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfForm>({ name: '', department_id: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [profRes, deptRes] = await Promise.all([
      supabase.from('professors').select('*, departments(*)').order('name'),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
    ]);
    setProfessors(profRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = professors.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: Professor) => {
    setForm({ name: p.name, department_id: p.department_id || '', email: p.email || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = { name: form.name.trim(), department_id: form.department_id || null, email: form.email.trim() || null };
    if (!payload.name) { setFormError('Name is required.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('professors').update(payload).eq('id', editingId)
      : await supabase.from('professors').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm({ name: '', department_id: '', email: '' }); load(); }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('professors').update({ status: 'inactive' }).eq('id', id);
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <UserSquare2 className="w-6 h-6 text-green-400" /> Professors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{professors.filter(p => p.status === 'active').length} active professors</p>
        </div>
        <button id="addProfBtn" onClick={() => { setForm({ name: '', department_id: '', email: '' }); setEditingId(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Professor
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input className="input-field pl-9 py-2.5" placeholder="Search professors..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#10b981' }} /></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Department</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{p.name.charAt(0)}</div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.departments?.name || '—'}</td>
                  <td><span className="text-xs">{p.email || '—'}</span></td>
                  <td><span className={`badge text-xs ${p.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>{p.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-white/5" id={`editProf-${p.id}`}><Edit3 className="w-3.5 h-3.5 text-blue-400" /></button>
                      <button onClick={() => handleDeactivate(p.id)} className="p-1.5 rounded hover:bg-white/5" id={`deleteProf-${p.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingId ? 'Edit Professor' : 'Add Professor'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Prof. Full Name" required />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Department</label>
                <select className="input-field" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input className="input-field" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="professor@college.edu" />
              </div>
              {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}
              <div className="flex gap-3">
                <button type="submit" id="saveProfBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
