'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, AlertTriangle, Check, X, Loader2,
  MapPin, User, Clock, Trash2, Edit3, Globe
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SpecialEvent, Department, Professor, Room, Subject, TimetableEntry, EventType } from '@/types';
import { formatTime, getEventTypeIcon, getEventPriorityColor } from '@/lib/timetable/utils';

interface EventForm {
  title: string; description: string; event_type: EventType;
  priority: string; event_date: string; start_time: string; end_time: string;
  target_all: boolean; department_id: string; semester: string; class: string; batch: string;
  timetable_id: string; subject_id: string;
  old_room_id: string; new_room_id: string;
  old_professor_id: string; new_professor_id: string;
  old_start_time: string; new_start_time: string;
  old_end_time: string; new_end_time: string;
  room_id: string; professor_id: string;
}

const defaultForm: EventForm = {
  title: '', description: '', event_type: 'announcement', priority: 'normal',
  event_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '',
  target_all: false, department_id: '', semester: '', class: '', batch: '',
  timetable_id: '', subject_id: '',
  old_room_id: '', new_room_id: '', old_professor_id: '', new_professor_id: '',
  old_start_time: '', new_start_time: '', old_end_time: '', new_end_time: '',
  room_id: '', professor_id: '',
};

const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'room_change', label: 'Room Change', icon: '🏛️' },
  { value: 'professor_change', label: 'Professor Change', icon: '👨‍🏫' },
  { value: 'time_change', label: 'Time Change', icon: '⏰' },
  { value: 'cancellation', label: 'Cancellation', icon: '❌' },
  { value: 'extra_lecture', label: 'Extra Lecture', icon: '📚' },
  { value: 'announcement', label: 'Announcement', icon: '📢' },
  { value: 'seminar', label: 'Seminar', icon: '🎤' },
  { value: 'workshop', label: 'Workshop', icon: '🔧' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
  { value: 'exam', label: 'Exam', icon: '📝' },
  { value: 'holiday', label: 'Holiday', icon: '🎉' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function LiveUpdatesPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(defaultForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, deptRes, profRes, roomRes, ttRes] = await Promise.all([
      supabase.from('special_events').select(`
        *, departments(*),
        old_rooms:rooms!special_events_old_room_id_fkey(*),
        new_rooms:rooms!special_events_new_room_id_fkey(*),
        old_professors:professors!special_events_old_professor_id_fkey(*),
        new_professors:professors!special_events_new_professor_id_fkey(*),
        subjects(*), professors(*), rooms(*)
      `).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
      supabase.from('professors').select('*').eq('status', 'active').order('name'),
      supabase.from('rooms').select('*').eq('status', 'active').order('room_number'),
      supabase.from('timetables').select('*, subjects(*), departments(*)').eq('status', 'published').order('day').order('start_time'),
    ]);
    setEvents(evRes.data || []);
    setDepartments(deptRes.data || []);
    setProfessors(profRes.data || []);
    setRooms(roomRes.data || []);
    setTimetables(ttRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      priority: form.priority,
      event_date: form.event_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      target_all: form.target_all,
      department_id: !form.target_all && form.department_id ? form.department_id : null,
      semester: !form.target_all && form.semester ? parseInt(form.semester) : null,
      class: !form.target_all && form.class ? form.class.toUpperCase() : null,
      batch: !form.target_all && form.batch ? form.batch.toUpperCase() : null,
      timetable_id: form.timetable_id || null,
      subject_id: form.subject_id || null,
      old_room_id: form.old_room_id || null,
      new_room_id: form.new_room_id || null,
      old_professor_id: form.old_professor_id || null,
      new_professor_id: form.new_professor_id || null,
      old_start_time: form.old_start_time || null,
      new_start_time: form.new_start_time || null,
      old_end_time: form.old_end_time || null,
      new_end_time: form.new_end_time || null,
      room_id: form.room_id || null,
      professor_id: form.professor_id || null,
      status: 'active',
    };

    if (!payload.title) { setFormError('Title is required.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('special_events').update(payload).eq('id', editingId)
      : await supabase.from('special_events').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm(defaultForm); load(); }
    setSaving(false);
  };

  const handleResolve = async (id: string) => {
    await supabase.from('special_events').update({ status: 'resolved' }).eq('id', id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('special_events').delete().eq('id', id);
    load();
  };

  const activeEvents = events.filter(e => e.status === 'active');
  const pastEvents = events.filter(e => e.status !== 'active');

  const setField = (field: keyof EventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="admin-page-wrap">
      <div className="updates-header lg:pl-0 pl-12" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Zap className="w-6 h-6 text-yellow-400" /> Live Updates
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {activeEvents.length} active • Real-time push to connected students
          </p>
        </div>
        <button id="createUpdateBtn" onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }} className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', flexShrink: 0 }}>
          <Plus className="w-4 h-4" /> Create Update
        </button>
      </div>

      {/* Active Events */}
      {loading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-yellow-400" /></div>
      ) : (
        <>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>ACTIVE UPDATES</h2>
          {activeEvents.length === 0 ? (
            <div className="glass-card p-10 text-center mb-6">
              <Zap className="w-8 h-8 mx-auto mb-3 opacity-20 text-yellow-400" />
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No active updates. Create one to push to students.</div>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {activeEvents.map(event => (
                <EventCard key={event.id} event={event} onResolve={handleResolve} onDelete={handleDelete}
                  onEdit={() => {
                    setForm({
                      title: event.title, description: event.description || '',
                      event_type: event.event_type, priority: event.priority,
                      event_date: event.event_date || new Date().toISOString().split('T')[0],
                      start_time: event.start_time || '', end_time: event.end_time || '',
                      target_all: event.target_all, department_id: event.department_id || '',
                      semester: event.semester ? String(event.semester) : '', class: event.class || '', batch: event.batch || '',
                      timetable_id: event.timetable_id || '', subject_id: event.subject_id || '',
                      old_room_id: event.old_room_id || '', new_room_id: event.new_room_id || '',
                      old_professor_id: event.old_professor_id || '', new_professor_id: event.new_professor_id || '',
                      old_start_time: event.old_start_time || '', new_start_time: event.new_start_time || '',
                      old_end_time: event.old_end_time || '', new_end_time: event.new_end_time || '',
                      room_id: event.room_id || '', professor_id: event.professor_id || '',
                    });
                    setEditingId(event.id);
                    setShowForm(true);
                  }} />
              ))}
            </div>
          )}

          {pastEvents.length > 0 && (
            <>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>PAST / RESOLVED</h2>
              <div className="space-y-2 opacity-60">
                {pastEvents.slice(0, 5).map(event => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Update' : 'Create Live Update'}
              </h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Event type selector */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>UPDATE TYPE</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(p => ({ ...p, event_type: t.value }))}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-all border"
                      style={{
                        background: form.event_type === t.value ? 'rgba(59,130,246,0.15)' : 'var(--bg-card-hover)',
                        borderColor: form.event_type === t.value ? '#3b82f6' : 'var(--border-subtle)',
                        color: form.event_type === t.value ? '#60a5fa' : 'var(--text-secondary)',
                      }}>
                      <span className="text-lg">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>TITLE *</label>
                <input className="input-field" value={form.title} onChange={setField('title')} placeholder="Update title" required />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DESCRIPTION</label>
                <textarea className="input-field" rows={2} value={form.description} onChange={setField('description')} placeholder="Additional details..." />
              </div>

              {/* Priority & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PRIORITY</label>
                  <select className="input-field" value={form.priority} onChange={setField('priority')}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DATE</label>
                  <input type="date" className="input-field" value={form.event_date} onChange={setField('event_date')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>START TIME</label>
                  <input type="time" className="input-field" value={form.start_time} onChange={setField('start_time')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>END TIME</label>
                  <input type="time" className="input-field" value={form.end_time} onChange={setField('end_time')} />
                </div>
              </div>

              {/* Type-specific fields */}
              {form.event_type === 'room_change' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-hover)' }}>
                  <div className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3.5 h-3.5" /> ROOM CHANGE DETAILS
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Old Room</label>
                      <select className="input-field" value={form.old_room_id} onChange={setField('old_room_id')}>
                        <option value="">Select old room</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>New Room</label>
                      <select className="input-field" value={form.new_room_id} onChange={setField('new_room_id')}>
                        <option value="">Select new room</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.event_type === 'professor_change' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-hover)' }}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>👨‍🏫 PROFESSOR CHANGE</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Old Professor</label>
                      <select className="input-field" value={form.old_professor_id} onChange={setField('old_professor_id')}>
                        <option value="">Select</option>
                        {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>New Professor</label>
                      <select className="input-field" value={form.new_professor_id} onChange={setField('new_professor_id')}>
                        <option value="">Select</option>
                        {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.event_type === 'time_change' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-hover)' }}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>⏰ TIME CHANGE</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Old Start</label>
                      <input type="time" className="input-field" value={form.old_start_time} onChange={setField('old_start_time')} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>New Start</label>
                      <input type="time" className="input-field" value={form.new_start_time} onChange={setField('new_start_time')} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Old End</label>
                      <input type="time" className="input-field" value={form.old_end_time} onChange={setField('old_end_time')} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>New End</label>
                      <input type="time" className="input-field" value={form.new_end_time} onChange={setField('new_end_time')} />
                    </div>
                  </div>
                </div>
              )}

              {/* Targeting */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-hover)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>🎯 TARGET AUDIENCE</span>
                  <label className="flex items-center gap-2 cursor-pointer ml-auto">
                    <div
                      className="w-10 h-5 rounded-full transition-all flex items-center px-0.5"
                      style={{ background: form.target_all ? '#10b981' : 'var(--border-subtle)' }}
                      onClick={() => setForm(p => ({ ...p, target_all: !p.target_all }))}>
                      <div className="w-4 h-4 rounded-full bg-white transition-all"
                        style={{ transform: form.target_all ? 'translateX(20px)' : 'translateX(0)' }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>All Students</span>
                  </label>
                </div>
                {!form.target_all && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Department</label>
                      <select className="input-field" value={form.department_id} onChange={setField('department_id')}>
                        <option value="">Any</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Semester</label>
                      <select className="input-field" value={form.semester} onChange={setField('semester')}>
                        <option value="">Any</option>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Class</label>
                      <input className="input-field" value={form.class} onChange={setField('class')} placeholder="A / B / C (or blank)" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Batch</label>
                      <input className="input-field" value={form.batch} onChange={setField('batch')} placeholder="CP2 (or blank)" />
                    </div>
                  </div>
                )}
              </div>

              {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}

              <div className="flex gap-3">
                <button type="submit" id="saveUpdateBtn" className="btn-primary flex-1" disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)' }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Push Live Update'}
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

function EventCard({
  event, onResolve, onDelete, onEdit
}: {
  event: SpecialEvent;
  onResolve?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: () => void;
}) {
  const colorClass = getEventPriorityColor(event.priority);
  const icon = getEventTypeIcon(event.event_type);

  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
              <span className="ml-2 badge text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                {event.event_type.replace('_', ' ')}
              </span>
              {event.priority === 'urgent' && <span className="ml-1 badge badge-urgent text-xs">URGENT</span>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onEdit && <button onClick={onEdit} className="p-1.5 rounded hover:bg-white/10" id={`editEvent-${event.id}`}><Edit3 className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} /></button>}
              {onResolve && event.status === 'active' && (
                <button onClick={() => onResolve(event.id)} className="p-1.5 rounded hover:bg-white/10" title="Mark resolved" id={`resolveEvent-${event.id}`}>
                  <Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                </button>
              )}
              <button onClick={() => onDelete(event.id)} className="p-1.5 rounded hover:bg-white/10" id={`deleteEvent-${event.id}`}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>

          {event.description && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{event.description}</div>}

          {/* Room change detail */}
          {event.event_type === 'room_change' && event.old_rooms && event.new_rooms && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                {event.old_rooms.room_number}
              </span>
              <span>→</span>
              <span className="font-bold text-green-400">{event.new_rooms.room_number}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {event.event_date && <span>{new Date(event.event_date).toLocaleDateString('en-IN')}</span>}
            {event.start_time && <span>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>}
            <span>•</span>
            <span>{event.target_all ? '🌐 All students' : [
              event.departments?.name,
              event.semester && `Sem ${event.semester}`,
              event.class && `Class ${event.class}`,
              event.batch && event.batch,
            ].filter(Boolean).join(' • ')}</span>
            <span className={`badge text-xs ${event.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>{event.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
