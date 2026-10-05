'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Trash2, Edit3, Upload, X, Check,
  Loader2, AlertTriangle, Download, Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Student, Department } from '@/types';
import Papa from 'papaparse';
import type { CSVValidationError } from '@/types';

interface StudentForm {
  enrollment_no: string;
  name: string;
  department_id: string;
  semester: string;
  class: string;
  batch: string;
}

export default function StudentsPage() {
  const supabase = createClient();
  const [students, setStudents] = useState<(Student & { departments?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StudentForm>({
    enrollment_no: '', name: '', department_id: '', semester: '3', class: 'A', batch: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [csvData, setCsvData] = useState<StudentForm[]>([]);
  const [csvErrors, setCsvErrors] = useState<CSVValidationError[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [studentsRes, deptsRes] = await Promise.all([
      supabase.from('students').select('*, departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
    ]);
    setStudents(studentsRes.data || []);
    setDepartments(deptsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.name.toLowerCase().includes(q) ||
      s.enrollment_no.toLowerCase().includes(q) ||
      s.batch.toLowerCase().includes(q);
    const matchDept = !filterDept || s.department_id === filterDept;
    const matchSem = !filterSem || String(s.semester) === filterSem;
    return matchSearch && matchDept && matchSem;
  });

  const resetForm = () => {
    setFormData({ enrollment_no: '', name: '', department_id: '', semester: '3', class: 'A', batch: '' });
    setFormError('');
    setEditingId(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (s: Student) => {
    setFormData({
      enrollment_no: s.enrollment_no,
      name: s.name,
      department_id: s.department_id || '',
      semester: String(s.semester),
      class: s.class,
      batch: s.batch,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const payload = {
      enrollment_no: formData.enrollment_no.trim().toUpperCase(),
      name: formData.name.trim(),
      department_id: formData.department_id || null,
      semester: parseInt(formData.semester),
      class: formData.class.trim().toUpperCase(),
      batch: formData.batch.trim().toUpperCase(),
    };

    if (!payload.enrollment_no || !payload.name) {
      setFormError('Enrollment number and name are required.');
      setFormLoading(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('students').update(payload).eq('id', editingId);
      if (error) { setFormError(error.message); setFormLoading(false); return; }
    } else {
      const { error } = await supabase.from('students').insert(payload);
      if (error) {
        setFormError(error.code === '23505' ? 'This enrollment number already exists.' : error.message);
        setFormLoading(false);
        return;
      }
    }

    setShowForm(false);
    resetForm();
    loadData();
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('students').update({ status: 'inactive' }).eq('id', id);
    setDeleteId(null);
    loadData();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: StudentForm[] = [];
        const errors: CSVValidationError[] = [];

        results.data.forEach((row, i) => {
          const rowNum = i + 2;
          if (!row.enrollment_no) errors.push({ row: rowNum, field: 'enrollment_no', message: 'Missing enrollment number' });
          if (!row.name) errors.push({ row: rowNum, field: 'name', message: 'Missing name' });
          if (!row.department) errors.push({ row: rowNum, field: 'department', message: 'Missing department' });
          if (!row.semester) errors.push({ row: rowNum, field: 'semester', message: 'Missing semester' });
          if (!row.batch) errors.push({ row: rowNum, field: 'batch', message: 'Missing batch' });

          rows.push({
            enrollment_no: (row.enrollment_no || '').toString().trim().toUpperCase(),
            name: (row.name || '').toString().trim(),
            department_id: departments.find(d => d.name.toLowerCase() === (row.department || '').toLowerCase())?.id || '',
            semester: (row.semester || '').toString().trim(),
            class: (row.class || 'A').toString().trim().toUpperCase(),
            batch: (row.batch || '').toString().trim().toUpperCase(),
          });
        });

        setCsvData(rows);
        setCsvErrors(errors);
      },
    });
  };

  const handleCSVImport = async () => {
    if (csvErrors.length > 0) return;
    setCsvLoading(true);

    const payload = csvData.map(r => ({
      enrollment_no: r.enrollment_no,
      name: r.name,
      department_id: r.department_id || null,
      semester: parseInt(r.semester) || 1,
      class: r.class || 'A',
      batch: r.batch,
      status: 'active' as const,
    }));

    const { error } = await supabase.from('students').upsert(payload, { onConflict: 'enrollment_no' });
    setCsvLoading(false);

    if (!error) {
      setShowCSV(false);
      setCsvData([]);
      setCsvErrors([]);
      loadData();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-6 h-6" style={{ color: '#3b82f6' }} />
            Students
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {students.filter(s => s.status === 'active').length} active students
          </p>
        </div>
        <div className="flex gap-2">
          <button id="importCSVBtn" onClick={() => setShowCSV(true)} className="btn-secondary">
            <Upload className="w-4 h-4" /> CSV
          </button>
          <button id="addStudentBtn" onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field pl-9 py-2.5"
            placeholder="Search by name, enrollment, batch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field py-2.5 w-auto"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          className="input-field py-2.5 w-auto"
          value={filterSem}
          onChange={e => setFilterSem(e.target.value)}
        >
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#3b82f6' }} />
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading students...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No students match your search.' : 'No students found. Add your first student.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrollment</th>
                  <th>Department</th>
                  <th>Sem</th>
                  <th>Class</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs">{s.enrollment_no}</span></td>
                    <td><span className="text-xs">{s.departments?.code || '—'}</span></td>
                    <td>{s.semester}</td>
                    <td>{s.class}</td>
                    <td><span className="badge badge-draft text-xs">{s.batch}</span></td>
                    <td>
                      <span className={`badge text-xs ${s.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          title="Edit" id={`editStudent-${s.id}`}>
                          <Edit3 className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
                        </button>
                        <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          title="Deactivate" id={`deleteStudent-${s.id}`}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editingId ? 'Edit Student' : 'Add Student'} onClose={() => { setShowForm(false); resetForm(); }}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Enrollment No *</label>
                <input className="input-field font-mono" value={formData.enrollment_no}
                  onChange={e => setFormData(p => ({ ...p, enrollment_no: e.target.value }))}
                  placeholder="e.g. 220123456" required disabled={!!editingId} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                <input className="input-field" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Student name" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Department</label>
                <select className="input-field" value={formData.department_id}
                  onChange={e => setFormData(p => ({ ...p, department_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Semester *</label>
                <select className="input-field" value={formData.semester}
                  onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Class *</label>
                <input className="input-field" value={formData.class}
                  onChange={e => setFormData(p => ({ ...p, class: e.target.value }))}
                  placeholder="A / B / C" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Batch *</label>
                <input className="input-field" value={formData.batch}
                  onChange={e => setFormData(p => ({ ...p, batch: e.target.value }))}
                  placeholder="e.g. CP2, IT1" required />
              </div>
            </div>
            {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="submit" id="saveStudentBtn" className="btn-primary flex-1" disabled={formLoading}>
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Update' : 'Add Student'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Confirm Deactivate" onClose={() => setDeleteId(null)}>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to deactivate this student? They won't be able to view their timetable.
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleDelete(deleteId)} id="confirmDeleteStudent"
              className="btn-primary flex-1" style={{ background: '#ef4444' }}>
              <Trash2 className="w-4 h-4" /> Deactivate
            </button>
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* CSV Modal */}
      {showCSV && (
        <Modal title="Import Students from CSV" onClose={() => { setShowCSV(false); setCsvData([]); setCsvErrors([]); }} wide>
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--bg-card-hover)' }}>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Expected columns:</div>
              <code className="text-xs" style={{ color: '#10b981' }}>
                enrollment_no, name, department, semester, class, batch
              </code>
            </div>
            <div>
              <label className="btn-secondary cursor-pointer w-full justify-center" style={{ display: 'flex' }}>
                <Upload className="w-4 h-4" />
                Choose CSV File
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} id="csvFileInput" />
              </label>
            </div>

            {csvErrors.length > 0 && (
              <div className="p-3 rounded-xl space-y-1" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="text-sm font-semibold text-red-400">Validation Errors:</div>
                {csvErrors.slice(0, 5).map((e, i) => (
                  <div key={i} className="text-xs text-red-300">Row {e.row}: {e.field} — {e.message}</div>
                ))}
              </div>
            )}

            {csvData.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Preview ({csvData.length} students):
                </div>
                <div className="max-h-48 overflow-auto rounded-xl" style={{ background: 'var(--bg-card-hover)' }}>
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>Enrollment</th><th>Name</th><th>Sem</th><th>Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono">{r.enrollment_no}</td>
                          <td>{r.name}</td>
                          <td>{r.semester}</td>
                          <td>{r.batch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {csvData.length > 0 && csvErrors.length === 0 && (
              <button onClick={handleCSVImport} id="confirmCSVImport" className="btn-primary w-full" disabled={csvLoading}>
                {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Import {csvData.length} Students
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className={`glass-card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
