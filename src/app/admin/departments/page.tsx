'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building, Plus, Search, Edit3, Trash2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Department } from '@/types';

interface DeptForm { name: string; code: string; }

export default function DepartmentsPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptForm>({ name: '', code: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = departments.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (d: Department) => {
    setForm({ name: d.name, code: d.code });
    setEditingId(d.id);
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };
    if (!payload.name || !payload.code) {
      setFormError('Name and code are required.');
      setSaving(false);
      return;
    }

    const { error } = editingId
      ? await supabase.from('departments').update(payload).eq('id', editingId)
      : await supabase.from('departments').insert(payload);

    if (error) {
      setFormError(error.code === '23505' ? 'This department name or code already exists.' : error.message);
    } else {
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', code: '' });
      load();
    }
    setSaving(false);
  };

  const handleToggleStatus = async (dept: Department) => {
    const newStatus = dept.status === 'active' ? 'inactive' : 'active';
    await supabase.from('departments').update({ status: newStatus }).eq('id', dept.id);
    load();
  };

  const deptColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building className="w-6 h-6 text-cyan-400" /> Departments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {departments.filter(d => d.status === 'active').length} active departments
          </p>
        </div>
        <button
          id="addDeptBtn"
          onClick={() => { setForm({ name: '', code: '' }); setEditingId(null); setFormError(''); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input
          className="input-field pl-9 py-2.5"
          placeholder="Search departments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Department Cards */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
          {search ? 'No departments match your search.' : 'No departments yet. Add your first department!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept, i) => {
            const color = deptColors[i % deptColors.length];
            return (
              <div key={dept.id} className="glass-card p-5 hover:scale-[1.01] transition-all"
                style={{ borderColor: `${color}30` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: `${color}20`, color }}>
                    {dept.code.slice(0, 2)}
                  </div>
                  <span className={`badge text-xs ${dept.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>
                    {dept.status}
                  </span>
                </div>
                <div className="font-bold text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>{dept.name}</div>
                <div className="font-mono text-xs mb-4" style={{ color }}>{dept.code}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(dept)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                    id={`editDept-${dept.id}`}
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(dept)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                    style={{
                      background: dept.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: dept.status === 'active' ? '#ef4444' : '#10b981',
                      border: `1px solid ${dept.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    }}
                    id={`toggleDept-${dept.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {dept.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Department' : 'Add Department'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Department Name *
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Computer Engineering"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Short Code *
                </label>
                <input
                  className="input-field font-mono"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="CE"
                  maxLength={10}
                  required
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Used as a short identifier (e.g., CE, IT, ME)
                </p>
              </div>
              {formError && (
                <div className="text-sm text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />{formError}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" id="saveDeptBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add Department'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
