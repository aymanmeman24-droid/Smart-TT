'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Search, Edit3, Trash2, Check, X, Loader2,
  AlertTriangle, Globe, Filter, Clock, MapPin, User, BookOpen, Upload
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TimetableEntry, Department, Professor, Subject, Room, DayOfWeek } from '@/types';
import { formatTime, DAYS_OF_WEEK } from '@/lib/timetable/utils';

type TimetableStatus = 'draft' | 'published' | 'archived';

interface TTForm {
  department_id: string; semester: string; class: string; batch: string;
  day: string; start_time: string; end_time: string; entry_type: string;
  subject_id: string; professor_id: string; room_id: string; status: TimetableStatus;
}

const defaultForm: TTForm = {
  department_id: '', semester: '3', class: 'C', batch: 'ALL',
  day: 'Monday', start_time: '09:00', end_time: '10:00', entry_type: 'lecture',
  subject_id: '', professor_id: '', room_id: '', status: 'published',
};

export default function TimetablePage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TTForm>(defaultForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [publishingAll, setPublishingAll] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ttRes, deptRes, profRes, subjRes, roomRes] = await Promise.all([
      supabase.from('timetables').select(`*, departments(*), subjects(*), professors(*), rooms(*)`).order('day').order('start_time'),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
      supabase.from('professors').select('*').eq('status', 'active').order('name'),
      supabase.from('subjects').select('*').eq('status', 'active').order('subject_name'),
      supabase.from('rooms').select('*').eq('status', 'active').order('room_number'),
    ]);
    setEntries(ttRes.data || []);
    setDepartments(deptRes.data || []);
    setProfessors(profRes.data || []);
    setSubjects(subjRes.data || []);
    setRooms(roomRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => {
    if (filterDept && e.department_id !== filterDept) return false;
    if (filterSem && String(e.semester) !== filterSem) return false;
    if (filterClass && e.class !== filterClass) return false;
    if (filterBatch && e.batch !== filterBatch) return false;
    if (filterDay && e.day !== filterDay) return false;
    return true;
  });

  const detectConflicts = (formData: TTForm): string[] => {
    const errs: string[] = [];
    if (formData.start_time >= formData.end_time) {
      errs.push('End time must be after start time.');
    }

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const startMin = toMin(formData.start_time);
    const endMin = toMin(formData.end_time);

    const sameDayEntries = entries.filter(e =>
      e.day === formData.day &&
      e.id !== editingId &&
      e.department_id === formData.department_id &&
      String(e.semester) === formData.semester &&
      e.class === formData.class &&
      (e.batch === formData.batch || e.batch === 'ALL' || formData.batch === 'ALL')
    );

    for (const e of sameDayEntries) {
      const eStart = toMin(e.start_time);
      const eEnd = toMin(e.end_time);
      if (startMin < eEnd && endMin > eStart) {
        errs.push(`Time conflict with existing entry: ${e.entry_type === 'break' ? 'Break' : (e as unknown as { subjects?: Subject }).subjects?.subject_name || 'entry'} (${e.start_time}–${e.end_time})`);
      }
    }

    // Professor conflict
    if (formData.professor_id) {
      const profConflicts = entries.filter(e =>
        e.day === formData.day &&
        e.id !== editingId &&
        e.professor_id === formData.professor_id
      );
      for (const e of profConflicts) {
        const eStart = toMin(e.start_time);
        const eEnd = toMin(e.end_time);
        if (startMin < eEnd && endMin > eStart) {
          errs.push(`Professor is already assigned to another class at this time.`);
          break;
        }
      }
    }

    // Room conflict
    if (formData.room_id) {
      const roomConflicts = entries.filter(e =>
        e.day === formData.day &&
        e.id !== editingId &&
        e.room_id === formData.room_id
      );
      for (const e of roomConflicts) {
        const eStart = toMin(e.start_time);
        const eEnd = toMin(e.end_time);
        if (startMin < eEnd && endMin > eStart) {
          errs.push(`Room is already booked at this time.`);
          break;
        }
      }
    }

    return errs;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const detectedConflicts = detectConflicts(form);
    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      return;
    }
    setConflicts([]);
    setSaving(true);

    const payload = {
      department_id: form.department_id,
      semester: parseInt(form.semester),
      class: form.class.toUpperCase(),
      batch: form.batch.toUpperCase(),
      day: form.day,
      start_time: form.start_time,
      end_time: form.end_time,
      entry_type: form.entry_type,
      subject_id: form.entry_type !== 'break' && form.entry_type !== 'free' ? form.subject_id || null : null,
      professor_id: form.entry_type !== 'break' && form.entry_type !== 'free' ? form.professor_id || null : null,
      room_id: form.entry_type !== 'break' && form.entry_type !== 'free' ? form.room_id || null : null,
      status: form.status,
    };

    if (!payload.department_id) { setFormError('Please select a department.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('timetables').update(payload).eq('id', editingId)
      : await supabase.from('timetables').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm(defaultForm); load(); }
    setSaving(false);
  };

  const handlePublishAll = async () => {
    setPublishingAll(true);
    const draftIds = entries.filter(e => e.status === 'draft').map(e => e.id);
    if (draftIds.length > 0) {
      await supabase.from('timetables').update({ status: 'published' }).in('id', draftIds);
    }
    await load();
    setPublishingAll(false);
  };

  const openEdit = (entry: TimetableEntry) => {
    setForm({
      department_id: entry.department_id,
      semester: String(entry.semester),
      class: entry.class,
      batch: entry.batch,
      day: entry.day,
      start_time: entry.start_time,
      end_time: entry.end_time,
      entry_type: entry.entry_type,
      subject_id: entry.subject_id || '',
      professor_id: entry.professor_id || '',
      room_id: entry.room_id || '',
      status: entry.status,
    });
    setEditingId(entry.id);
    setConflicts([]);
    setShowForm(true);
  };

  const filteredSubjects = subjects.filter(s =>
    !form.semester || s.semester === parseInt(form.semester)
  );

  const dayColors: Record<string, string> = {
    Monday: '#3b82f6', Tuesday: '#8b5cf6', Wednesday: '#10b981',
    Thursday: '#f59e0b', Friday: '#ef4444', Saturday: '#06b6d4', Sunday: '#ec4899',
  };

  return (
    <div className="admin-page-wrap">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays className="w-6 h-6 text-blue-400" /> Timetable
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {entries.filter(e => e.status === 'published').length} published • {entries.filter(e => e.status === 'draft').length} drafts
          </p>
        </div>
        <div className="flex gap-2">
          {entries.some(e => e.status === 'draft') && (
            <button id="publishAllBtn" onClick={handlePublishAll} className="btn-secondary" disabled={publishingAll}
              style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}>
              {publishingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Publish All Drafts
            </button>
          )}
          <button id="addLectureBtn" onClick={() => { setForm(defaultForm); setEditingId(null); setConflicts([]); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input-field py-2.5 w-auto" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Depts</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
        <select className="input-field py-2.5 w-auto" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
          <option value="">All Sems</option>
          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
        </select>
        <select className="input-field py-2.5 w-auto" value={filterDay} onChange={e => setFilterDay(e.target.value)}>
          <option value="">All Days</option>
          {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input className="input-field py-2.5 w-24" placeholder="Class" value={filterClass} onChange={e => setFilterClass(e.target.value.toUpperCase())} />
        <input className="input-field py-2.5 w-24" placeholder="Batch" value={filterBatch} onChange={e => setFilterBatch(e.target.value.toUpperCase())} />
        {(filterDept || filterSem || filterDay || filterClass || filterBatch) && (
          <button className="btn-secondary py-2.5" onClick={() => { setFilterDept(''); setFilterSem(''); setFilterDay(''); setFilterClass(''); setFilterBatch(''); }}>
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
            No timetable entries found. Add your first lecture!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th><th>Time</th><th>Type</th><th>Subject</th>
                  <th>Professor</th><th>Room</th><th>Target</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <span className="font-semibold text-xs px-2 py-1 rounded-lg"
                        style={{ background: `${dayColors[e.day]}20`, color: dayColors[e.day] }}>
                        {e.day.slice(0, 3).toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">
                      {formatTime(e.start_time)} – {formatTime(e.end_time)}
                    </td>
                    <td>
                      <span className={`badge text-xs ${e.entry_type === 'break' ? 'badge-break' : e.entry_type === 'lab' ? '' : ''}`}
                        style={e.entry_type === 'lab' ? { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' } : {}}>
                        {e.entry_type}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {(e as unknown as { subjects?: Subject }).subjects?.subject_name || (e.entry_type === 'break' ? '☕ Break' : '—')}
                      </span>
                    </td>
                    <td className="text-xs">{(e as unknown as { professors?: Professor }).professors?.name || '—'}</td>
                    <td className="text-xs">{(e as unknown as { rooms?: Room }).rooms?.room_number || '—'}</td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        <div style={{ color: 'var(--text-secondary)' }}>{(e as unknown as { departments?: Department }).departments?.code} S{e.semester}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Cls {e.class} • {e.batch}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge text-xs ${e.status === 'published' ? 'badge-published' : e.status === 'archived' ? 'badge-cancelled' : 'badge-draft'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-white/5" id={`editTT-${e.id}`}><Edit3 className="w-3.5 h-3.5 text-blue-400" /></button>
                        <button onClick={async () => { await supabase.from('timetables').delete().eq('id', e.id); load(); }} className="p-1.5 rounded hover:bg-white/5" id={`deleteTT-${e.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
              </h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Target */}
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>DEPARTMENT *</label>
                  <select className="input-field" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))} required>
                    <option value="">Select dept</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>SEMESTER</label>
                  <select className="input-field" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>CLASS</label>
                  <input className="input-field" value={form.class} onChange={e => setForm(p => ({ ...p, class: e.target.value.toUpperCase() }))} placeholder="A / B / C" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>BATCH</label>
                  <input className="input-field" value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value.toUpperCase() }))} placeholder="ALL / CP1 / CP2" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>DAY</label>
                  <select className="input-field" value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}>
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>TYPE</label>
                  <select className="input-field" value={form.entry_type} onChange={e => setForm(p => ({ ...p, entry_type: e.target.value }))}>
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab</option>
                    <option value="break">Break</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>START TIME</label>
                  <input type="time" className="input-field" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>END TIME</label>
                  <input type="time" className="input-field" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} required />
                </div>

                {form.entry_type !== 'break' && form.entry_type !== 'free' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>SUBJECT</label>
                      <select className="input-field" value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                        <option value="">Select subject</option>
                        {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>PROFESSOR</label>
                      <select className="input-field" value={form.professor_id} onChange={e => setForm(p => ({ ...p, professor_id: e.target.value }))}>
                        <option value="">Select professor</option>
                        {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>ROOM</label>
                      <select className="input-field" value={form.room_id} onChange={e => setForm(p => ({ ...p, room_id: e.target.value }))}>
                        <option value="">Select room</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} {r.building ? `(${r.building})` : ''}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>STATUS</label>
                  <div className="flex gap-2">
                    {(['draft', 'published'] as TimetableStatus[]).map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border"
                        style={{
                          background: form.status === s ? (s === 'published' ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)') : 'transparent',
                          borderColor: form.status === s ? (s === 'published' ? '#10b981' : '#6b7280') : 'var(--border-subtle)',
                          color: form.status === s ? (s === 'published' ? '#10b981' : '#9ca3af') : 'var(--text-muted)',
                        }}>
                        {s === 'published' ? '🌐 Published' : '📝 Draft'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conflict warnings */}
              {conflicts.length > 0 && (
                <div className="mb-4 p-4 rounded-xl space-y-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div className="font-semibold text-sm text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Timetable Conflicts Detected
                  </div>
                  {conflicts.map((c, i) => <div key={i} className="text-xs text-red-300">• {c}</div>)}
                  <button type="submit" className="text-xs text-red-300 underline mt-1 block">
                    Save anyway (override conflicts)
                  </button>
                </div>
              )}

              {formError && <div className="mb-4 text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}

              <div className="flex gap-3">
                <button type="submit" id="saveTTBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Update Entry' : 'Add Entry'}
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
