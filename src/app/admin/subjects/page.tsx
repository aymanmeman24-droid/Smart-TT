'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Subject, Department } from '@/types';

interface SubjectForm { subject_code: string; subject_name: string; semester: string; department_id: string; }

export default function SubjectsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<(Subject & { departments?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectForm>({ subject_code: '', subject_name: '', semester: '3', department_id: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [subjRes, deptRes] = await Promise.all([
      supabase.from('subjects').select('*, departments(*)').order('semester').order('subject_name'),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
    ]);
    setSubjects(subjRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subjects.filter(s =>
    !search || s.subject_name.toLowerCase().includes(search.toLowerCase()) || s.subject_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = { subject_code: form.subject_code.trim().toUpperCase(), subject_name: form.subject_name.trim(), semester: parseInt(form.semester), department_id: form.department_id || null };
    if (!payload.subject_code || !payload.subject_name) { setFormError('Code and name are required.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('subjects').update(payload).eq('id', editingId)
      : await supabase.from('subjects').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm({ subject_code: '', subject_name: '', semester: '3', department_id: '' }); load(); }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen className="w-6 h-6 text-purple-400" /> Subjects
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subjects.filter(s => s.status === 'active').length} active subjects</p>
        </div>
        <button id="addSubjectBtn" onClick={() => { setEditingId(null); setForm({ subject_code: '', subject_name: '', semester: '3', department_id: '' }); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input className="input-field pl-9 py-2.5" placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div> : (
          <table className="data-table">
            <thead><tr><th>Code</th><th>Subject Name</th><th>Semester</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="font-mono text-xs badge badge-draft">{s.subject_code}</span></td>
                  <td><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.subject_name}</span></td>
                  <td>Sem {s.semester}</td>
                  <td>{s.departments?.code || '—'}</td>
                  <td><span className={`badge text-xs ${s.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>{s.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ subject_code: s.subject_code, subject_name: s.subject_name, semester: String(s.semester), department_id: s.department_id || '' }); setEditingId(s.id); setShowForm(true); }} className="p-1.5 rounded hover:bg-white/5" id={`editSubj-${s.id}`}><Edit3 className="w-3.5 h-3.5 text-blue-400" /></button>
                      <button onClick={async () => { await supabase.from('subjects').update({ status: 'inactive' }).eq('id', s.id); load(); }} className="p-1.5 rounded hover:bg-white/5" id={`deleteSubj-${s.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingId ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Subject Code *</label>
                <input className="input-field font-mono" value={form.subject_code} onChange={e => setForm(p => ({ ...p, subject_code: e.target.value }))} placeholder="CE301" required />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Subject Name *</label>
                <input className="input-field" value={form.subject_name} onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))} placeholder="Database Management System" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Semester</label>
                  <select className="input-field" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Department</label>
                  <select className="input-field" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                    <option value="">Any</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                  </select>
                </div>
              </div>
              {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}
              <div className="flex gap-3">
                <button type="submit" id="saveSubjectBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? 'Update' : 'Add'}
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
