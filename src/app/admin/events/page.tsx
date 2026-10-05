'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Search, Edit3, Trash2, Check, X, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SpecialEvent, Department, EventType } from '@/types';
import { getEventTypeIcon, getEventTypeBadgeColor, formatTime } from '@/lib/timetable/utils';

interface EventForm {
  title: string; description: string; event_type: EventType; priority: string;
  event_date: string; start_time: string; end_time: string;
  target_all: boolean; department_id: string; semester: string; class: string; batch: string;
}

const defaultForm: EventForm = {
  title: '', description: '', event_type: 'seminar', priority: 'normal',
  event_date: new Date().toISOString().split('T')[0], start_time: '', end_time: '',
  target_all: false, department_id: '', semester: '', class: '', batch: '',
};

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<(SpecialEvent & { departments?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(defaultForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, deptRes] = await Promise.all([
      supabase.from('special_events').select('*, departments(*)').in('event_type', ['seminar','workshop','extra_lecture','exam','holiday','other']).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('status', 'active').order('name'),
    ]);
    setEvents(evRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      event_type: form.event_type, priority: form.priority,
      event_date: form.event_date || null, start_time: form.start_time || null, end_time: form.end_time || null,
      target_all: form.target_all,
      department_id: !form.target_all && form.department_id ? form.department_id : null,
      semester: !form.target_all && form.semester ? parseInt(form.semester) : null,
      class: !form.target_all && form.class ? form.class.toUpperCase() : null,
      batch: !form.target_all && form.batch ? form.batch.toUpperCase() : null,
      status: 'active' as const,
    };

    if (!payload.title) { setFormError('Title is required.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('special_events').update(payload).eq('id', editingId)
      : await supabase.from('special_events').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm(defaultForm); load(); }
    setSaving(false);
  };

  const setField = (field: keyof EventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="admin-page-wrap">
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bell className="w-6 h-6 text-purple-400" /> Special Events
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Seminars, workshops, exams and more</p>
        </div>
        <button id="addEventBtn" onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div> : (
          events.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No special events. Create seminars, workshops, and more here.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {events.map(event => (
                <div key={event.id} className="p-5 flex items-start gap-4 hover:bg-white/2 transition-colors">
                  <span className="text-2xl flex-shrink-0">{getEventTypeIcon(event.event_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                      <span className={`badge text-xs ${getEventTypeBadgeColor(event.event_type)}`}>{event.event_type.replace('_', ' ')}</span>
                      <span className={`badge text-xs ${event.status === 'active' ? 'badge-published' : 'badge-cancelled'}`}>{event.status}</span>
                    </div>
                    {event.description && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{event.description}</div>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {event.start_time && <span>{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>}
                      <span>•</span>
                      <span>{event.target_all ? '🌐 All' : [event.departments?.name, event.semester && `Sem ${event.semester}`, event.batch].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setForm({ title: event.title, description: event.description || '', event_type: event.event_type, priority: event.priority, event_date: event.event_date || new Date().toISOString().split('T')[0], start_time: event.start_time || '', end_time: event.end_time || '', target_all: event.target_all, department_id: event.department_id || '', semester: event.semester ? String(event.semester) : '', class: event.class || '', batch: event.batch || '' }); setEditingId(event.id); setShowForm(true); }} className="p-1.5 rounded hover:bg-white/5" id={`editEvent-${event.id}`}><Edit3 className="w-3.5 h-3.5 text-blue-400" /></button>
                    <button onClick={async () => { await supabase.from('special_events').delete().eq('id', event.id); load(); }} className="p-1.5 rounded hover:bg-white/5" id={`deleteEvent-${event.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingId ? 'Edit Event' : 'Add Special Event'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>EVENT TYPE</label>
                <select className="input-field" value={form.event_type} onChange={setField('event_type')}>
                  {(['seminar','workshop','extra_lecture','exam','holiday','other'] as EventType[]).map(t => (
                    <option key={t} value={t}>{getEventTypeIcon(t)} {t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>TITLE *</label>
                <input className="input-field" value={form.title} onChange={setField('title')} placeholder="Event title" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DESCRIPTION</label>
                <textarea className="input-field" rows={2} value={form.description} onChange={setField('description')} placeholder="Details..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Priority</label>
                  <select className="input-field" value={form.priority} onChange={setField('priority')}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Start</label>
                  <input type="time" className="input-field" value={form.start_time} onChange={setField('start_time')} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>End</label>
                  <input type="time" className="input-field" value={form.end_time} onChange={setField('end_time')} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
                <input type="date" className="input-field" value={form.event_date} onChange={setField('event_date')} />
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card-hover)' }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <div className="w-9 h-5 rounded-full transition-all flex items-center px-0.5" style={{ background: form.target_all ? '#10b981' : 'var(--border-subtle)' }} onClick={() => setForm(p => ({ ...p, target_all: !p.target_all }))}>
                    <div className="w-4 h-4 rounded-full bg-white transition-all" style={{ transform: form.target_all ? 'translateX(16px)' : 'translateX(0)' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>All Students</span>
                </label>
                {!form.target_all && (
                  <div className="grid grid-cols-2 gap-2">
                    <select className="input-field" value={form.department_id} onChange={setField('department_id')}>
                      <option value="">Any Dept</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select className="input-field" value={form.semester} onChange={setField('semester')}>
                      <option value="">Any Sem</option>
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                    </select>
                    <input className="input-field" value={form.class} onChange={setField('class')} placeholder="Class (blank=any)" />
                    <input className="input-field" value={form.batch} onChange={setField('batch')} placeholder="Batch (blank=any)" />
                  </div>
                )}
              </div>
              {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}
              <div className="flex gap-3">
                <button type="submit" id="saveEventBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? 'Update' : 'Create Event'}
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
