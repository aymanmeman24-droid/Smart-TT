'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ChevronLeft, Bell, RefreshCw, WifiOff,
  MapPin, User, Clock, ArrowRight, Coffee, X, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Create supabase client ONCE outside component (not re-created on every render)
const supabase = createClient();

import type {
  Student, Department, TimetableEntry, SpecialEvent,
  TimetableOverride, EnrichedTimetableEntry, DayOfWeek
} from '@/types';
import {
  getCurrentDayName, formatTime, enrichEntries,
  isEventRelevantToStudent, getEventTypeIcon,
  formatDuration, getRemainingMinutes, getMinutesUntilStart,
  timeToMinutes, getCurrentTimeMinutes, DAYS_OF_WEEK
} from '@/lib/timetable/utils';

interface Notif { id: string; title: string; message: string; type: string; }

/* ── helpers ──────────────────────────────────────────────── */
function getLectureProgress(start: string, end: string) {
  const now = getCurrentTimeMinutes();
  const s = timeToMinutes(start), e = timeToMinutes(end);
  return e > s ? Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100))) : 0;
}

/* ═══════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const { enrollment } = useParams<{ enrollment: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student & { departments?: Department } | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayName());
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'updates'>('today');
  const [online, setOnline] = useState(true);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [now, setNow] = useState(new Date());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Update clock every 60s (was 30s) to reduce re-renders
    const t = setInterval(() => setNow(new Date()), 60000);
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadData = useCallback(async () => {
    if (!enrollment) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/student/${enrollment.toUpperCase()}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Student not found.'); setLoading(false); return; }
      const s = json.student as Student & { departments: Department };
      setStudent(s);

      const today = new Date().toISOString().split('T')[0];

      // ── Run timetable + events queries IN PARALLEL ────────
      const [ttResult, evResult] = await Promise.all([
        supabase.from('timetables')
          .select('*, departments(*), subjects(*), professors(*), rooms(*)')
          .eq('department_id', s.department_id!)
          .eq('semester', s.semester)
          .eq('status', 'published')
          .or(`batch.eq.ALL,batch.eq.${s.batch}`),
        supabase.from('special_events')
          .select(`*, departments(*), subjects(*), professors(*), rooms(*),
            old_rooms:rooms!special_events_old_room_id_fkey(*),
            new_rooms:rooms!special_events_new_room_id_fkey(*),
            old_professors:professors!special_events_old_professor_id_fkey(*),
            new_professors:professors!special_events_new_professor_id_fkey(*)`)
          .eq('status', 'active').order('created_at', { ascending: false }),
      ]);

      const tt = ttResult.data || [];
      setTimetableEntries(tt);
      setEvents((evResult.data || []).filter(e =>
        isEventRelevantToStudent(e, { department_id: s.department_id, semester: s.semester, class: s.class, batch: s.batch })
      ));

      // ── Overrides only if there are timetable entries ─────
      const ids = tt.map(t => t.id);
      if (ids.length) {
        const { data: ov } = await supabase.from('timetable_overrides')
          .select('*, rooms(*), professors(*)')
          .in('timetable_id', ids).eq('override_date', today);
        setOverrides(ov || []);
      }
    } catch { setError('Connection error. Check your internet.'); }
    finally { setLoading(false); }
  }, [enrollment]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!student) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`s-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetables' }, () => { addNotif({ title: '📅 Timetable Updated', message: 'Your schedule changed.', type: 'update' }); loadData(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'special_events' }, (p) => {
        const e = p.new as SpecialEvent;
        if (isEventRelevantToStudent(e, { department_id: student.department_id, semester: student.semester, class: student.class, batch: student.batch })) {
          addNotif({ title: `${getEventTypeIcon(e.event_type)} ${e.title}`, message: e.description || 'New update posted.', type: e.event_type });
          loadData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_overrides' }, () => { addNotif({ title: '⚡ Live Change', message: 'A lecture was updated.', type: 'update' }); loadData(); })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [student]);

  function addNotif(n: Omit<Notif, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    setNotifs(p => [{ ...n, id }, ...p.slice(0, 3)]);
    setTimeout(() => setNotifs(p => p.filter(x => x.id !== id)), 7000);
  }

  /* ── Derived ── */
  const today = getCurrentDayName();
  const todayEntries = enrichEntries(timetableEntries.filter(e => e.day === today), overrides);
  const currentEntry = todayEntries.find(e => e.isCurrentLecture) || null;
  const nextEntry    = todayEntries.find(e => e.isNextLecture) || null;

  const weeklyByDay = DAYS_OF_WEEK.reduce((acc, d) => {
    acc[d] = enrichEntries(timetableEntries.filter(e => e.day === d), overrides);
    return acc;
  }, {} as Record<DayOfWeek, EnrichedTimetableEntry[]>);

  const selectedDayEntries = weeklyByDay[selectedDay] || [];
  const urgentEvents = events.filter(e => e.priority === 'urgent' || e.priority === 'high');

  if (loading) return <LoadingScreen />;
  if (error || !student) return <ErrorScreen message={error || 'Not found'} onBack={() => router.push('/')} />;

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--bg-root)', width: '100%', overflowX: 'hidden' }}>
      <div className="aurora-bg" aria-hidden><div className="aurora-orb" /></div>

      {/* Toast notifications */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'min(20rem, calc(100vw - 2rem))' }}>
        {notifs.map(n => (
          <div key={n.id} className="notification-toast bento-card p-4 flex gap-3 items-start"
            style={{ borderColor: n.type === 'cancellation' ? 'rgba(244,63,94,0.4)' : 'rgba(139,92,246,0.35)', background: 'var(--bg-card-2)' }}>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{n.title}</div>
              <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.message}</div>
            </div>
            <button onClick={() => setNotifs(p => p.filter(x => x.id !== n.id))} className="btn-ghost p-0.5 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 glass-surface">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            <button onClick={() => router.push('/')} className="btn-ghost p-2 rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-white flex-shrink-0">
              <Image src="/logo.jpg" alt="GEC" width={28} height={28} className="object-contain p-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{student.name}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {student.enrollment_no} · {student.departments?.name} · Sem {student.semester}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {events.length > 0 && (
                <button onClick={() => setActiveTab('updates')} className="relative btn-ghost p-2 rounded-xl">
                  <Bell style={{ width: 18, height: 18 }} />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 badge-pulse" />
                </button>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: online ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: online ? '#34d399' : '#fbbf24', border: `1px solid ${online ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'pulse-live bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">{online ? 'Live' : 'Offline'}</span>
              </div>
              <button onClick={loadData} className="btn-ghost p-2 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {([
              { key: 'today',   label: 'Today',   badge: undefined as number | undefined },
              { key: 'weekly',  label: 'Weekly',  badge: undefined as number | undefined },
              { key: 'updates', label: 'Updates', badge: events.length as number | undefined },
            ] as { key: 'today' | 'weekly' | 'updates'; label: string; badge: number | undefined }[]).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold relative transition-colors"
                  style={{ color: active ? '#c4b5fd' : 'var(--text-muted)' }}>
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="w-4 h-4 rounded-full text-white flex items-center justify-center"
                      style={{ background: '#f43f5e', fontSize: '0.6rem' }}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                  {active && <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #db2777)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="student-main">

        {!online && (
          <div className="alert-warning text-xs">
            <WifiOff className="w-4 h-4 flex-shrink-0" />Offline — showing cached data
          </div>
        )}

        {/* ══ TODAY ══════════════════════════════════════════════ */}
        {activeTab === 'today' && (
          <>
            {/* Student meta strip */}
            <div className="bento-card p-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.1))' }}>
                    🎓
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {student.departments?.name} · Sem {student.semester} · Class {student.class} · Batch {student.batch}
                    </div>
                    <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl tabular-nums" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{today}</div>
                </div>
              </div>
            </div>

            {/* Current Lecture */}
            {currentEntry
              ? <CurrentCard entry={currentEntry} />
              : <NoCurrentCard todayEntries={todayEntries} nextEntry={nextEntry} />}

            {/* Next Lecture */}
            {nextEntry && <NextCard entry={nextEntry} />}

            {/* Urgent alerts */}
            {urgentEvents.length > 0 && (
              <div className="space-y-2">
                <div className="text-label flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Urgent Notices
                </div>
                {urgentEvents.slice(0, 2).map(e => <EventCard key={e.id} event={e} />)}
              </div>
            )}

            {/* Today's schedule */}
            <div>
              <div className="text-label flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8b5cf6' }} />
                {today}'s Schedule
              </div>
              {todayEntries.length === 0
                ? <EmptyState emoji="🎉" title="No classes today" sub="Enjoy your day off!" />
                : <ScheduleList entries={todayEntries} />}
            </div>
          </>
        )}

        {/* ══ WEEKLY ═════════════════════════════════════════════ */}
        {activeTab === 'weekly' && (
          <>
            <div className="overflow-x-auto -mx-4 px-4 pb-1">
              <div className="flex gap-2 min-w-max">
                {DAYS_OF_WEEK.filter(d => d !== 'Sunday').map(day => {
                  const hasClass = (weeklyByDay[day] || []).some(e => e.entry_type !== 'break' && e.entry_type !== 'free');
                  const isSel = day === selectedDay;
                  const isToday = day === today;
                  return (
                    <button key={day} onClick={() => setSelectedDay(day)}
                      className="flex flex-col items-center px-4 py-3 rounded-2xl text-sm font-black transition-all flex-shrink-0 min-w-[64px]"
                      style={{
                        background: isSel ? 'linear-gradient(135deg, #6d28d9, #db2777)' : isToday ? 'rgba(139,92,246,0.12)' : 'var(--bg-card)',
                        border: isSel ? 'none' : isToday ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--border-subtle)',
                        color: isSel ? 'white' : isToday ? '#c4b5fd' : 'var(--text-secondary)',
                        boxShadow: isSel ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                        letterSpacing: '-0.01em',
                      }}>
                      <span>{day.slice(0, 3).toUpperCase()}</span>
                      {hasClass && <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: isSel ? 'rgba(255,255,255,0.7)' : '#8b5cf6' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-label flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8b5cf6' }} />
              {selectedDay}{selectedDay === today ? ' · Today' : ''}
            </div>
            {selectedDayEntries.length === 0
              ? <EmptyState emoji="📖" title={`No classes on ${selectedDay}`} sub="Enjoy your free time!" />
              : <ScheduleList entries={selectedDayEntries} />}
          </>
        )}

        {/* ══ UPDATES ════════════════════════════════════════════ */}
        {activeTab === 'updates' && (
          <>
            <div className="text-label flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Updates & Announcements
            </div>
            {events.length === 0
              ? <EmptyState emoji="✅" title="You're all caught up" sub="No updates right now." />
              : <div className="space-y-3">{events.map(e => <EventCard key={e.id} event={e} expanded />)}</div>}
          </>
        )}
      </main>
    </div>
  );
}

/* ══ CURRENT LECTURE CARD ════════════════════════════════════ */
function CurrentCard({ entry }: { entry: EnrichedTimetableEntry }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const room = entry.override?.new_room_id ? entry.override.rooms : entry.rooms;
  const prof = entry.override?.new_professor_id ? entry.override.professors : entry.professors;
  const st = entry.override?.new_start_time || entry.start_time;
  const et = entry.override?.new_end_time || entry.end_time;
  const prog = getLectureProgress(st, et);
  const rem  = getRemainingMinutes(et);

  return (
    <div className="bento-live p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <span className="badge badge-live">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-live" />LIVE NOW
        </span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
          {formatDuration(rem)} left
        </span>
      </div>

      <div className="mb-1">
        <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          {entry.subjects?.subject_name || 'Lecture'}
        </h2>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
          {entry.subjects?.subject_code}
          {entry.entry_type === 'lab' && <span className="ml-2 badge badge-lab">Lab</span>}
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar my-4">
        <div className="progress-fill" style={{ width: `${prog}%` }} />
      </div>

      {/* Info pills */}
      <div className="flex flex-wrap gap-2">
        {prof?.name && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
            <User className="w-3 h-3" />
            {prof.name}
            {entry.override?.new_professor_id && <span style={{ color: '#fbbf24' }}>*</span>}
          </div>
        )}
        {room?.room_number && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(244,63,94,0.12)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)' }}>
            <MapPin className="w-3 h-3" />
            {room.room_number}
            {entry.override?.new_room_id && <span style={{ color: '#fbbf24' }}>*</span>}
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(14,165,233,0.1)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.2)' }}>
          <Clock className="w-3 h-3" />
          {formatTime(st)} – {formatTime(et)}
        </div>
      </div>

      {/* Override notes */}
      {entry.override?.new_room_id && entry.override.rooms && (
        <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          Room changed: <strong>{entry.rooms?.room_number}</strong> → <strong>{entry.override.rooms.room_number}</strong>
        </div>
      )}
      {entry.override?.reason && (
        <div className="mt-2 text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
          📌 {entry.override.reason}
        </div>
      )}
    </div>
  );
}

/* ══ NO CURRENT CARD ═════════════════════════════════════════ */
function NoCurrentCard({ todayEntries, nextEntry }: { todayEntries: EnrichedTimetableEntry[]; nextEntry: EnrichedTimetableEntry | null }) {
  const lastEntry = todayEntries.filter(e => e.entry_type !== 'break' && e.entry_type !== 'free').slice(-1)[0];
  const isDone = lastEntry && getCurrentTimeMinutes() > timeToMinutes(lastEntry.end_time);
  return (
    <div className="bento-card p-6 text-center animate-slide-up">
      <div className="text-4xl mb-3 animate-float">{isDone ? '✅' : todayEntries.length === 0 ? '🎉' : '📚'}</div>
      <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
        {isDone ? 'All done for today!' : todayEntries.length === 0 ? 'No classes today' : 'No lecture in progress'}
      </div>
      {nextEntry && (
        <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Next: <span className="font-bold" style={{ color: '#fbbf24' }}>{formatTime(nextEntry.override?.new_start_time || nextEntry.start_time)}</span>
        </div>
      )}
    </div>
  );
}

/* ══ NEXT LECTURE CARD ════════════════════════════════════════ */
function NextCard({ entry }: { entry: EnrichedTimetableEntry }) {
  const room = entry.override?.new_room_id ? entry.override.rooms : entry.rooms;
  const prof = entry.override?.new_professor_id ? entry.override.professors : entry.professors;
  const st   = entry.override?.new_start_time || entry.start_time;
  const minsUntil = getMinutesUntilStart(st);

  return (
    <div className="bento-card bento-amber p-4 flex items-center justify-between gap-4 animate-slide-up anim-delay-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-next">Next Up</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>in {formatDuration(minsUntil)}</span>
        </div>
        <div className="font-black text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {entry.subjects?.subject_name || 'Lecture'}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {prof?.name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{prof.name}</span>}
          {room?.room_number && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{room.room_number}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(st)}</span>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

/* ══ SCHEDULE LIST ════════════════════════════════════════════ */
function ScheduleList({ entries }: { entries: EnrichedTimetableEntry[] }) {
  return (
    <div className="bento-card overflow-hidden">
      {entries.map((entry, i) => {
        const ov = entry.override;
        const isCancelled = ov?.is_cancelled;
        const room = ov?.new_room_id ? ov.rooms : entry.rooms;
        const prof = ov?.new_professor_id ? ov.professors : entry.professors;
        const st   = ov?.new_start_time || entry.start_time;
        const et   = ov?.new_end_time   || entry.end_time;
        const isActive = entry.isCurrentLecture;
        const isNext   = entry.isNextLecture;

        if (entry.entry_type === 'break') return (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div className="w-12 text-xs text-right tabular-nums flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{formatTime(entry.start_time)}</div>
            <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--border-subtle)' }} />
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Coffee className="w-3.5 h-3.5" />Break</div>
          </div>
        );
        if (entry.entry_type === 'free') return (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div className="w-12 text-xs text-right tabular-nums flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{formatTime(entry.start_time)}</div>
            <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--border-subtle)' }} />
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Free Period</div>
          </div>
        );

        const stripColor = isCancelled ? '#f43f5e' : isActive ? '#7c3aed' : isNext ? '#f59e0b' : 'var(--border-subtle)';

        return (
          <div key={entry.id}
            className="flex items-start gap-3 px-4 py-3.5 transition-colors"
            style={{
              borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              background: isActive ? 'rgba(124,58,237,0.07)' : 'transparent',
              opacity: isCancelled ? 0.6 : 1,
            }}>
            {/* Time */}
            <div className="w-12 flex-shrink-0 text-right">
              <div className="text-xs font-bold tabular-nums" style={{ color: isActive ? '#c4b5fd' : 'var(--text-muted)' }}>{formatTime(st)}</div>
              <div className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>{formatTime(et)}</div>
            </div>
            {/* Colored strip */}
            <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ background: stripColor, minHeight: '40px', boxShadow: isActive ? '0 0 8px rgba(124,58,237,0.6)' : 'none' }} />
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                {isActive && <span className="badge badge-live">Live</span>}
                {isNext && !isActive && <span className="badge badge-next">Next</span>}
                {isCancelled && <span className="badge badge-cancelled">Cancelled</span>}
                {entry.entry_type === 'lab' && <span className="badge badge-lab">Lab</span>}
              </div>
              <div className={`font-black text-sm ${isCancelled ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {entry.subjects?.subject_name || '—'}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {prof?.name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{prof.name}{ov?.new_professor_id && <span style={{ color: '#fbbf24' }}>*</span>}</span>}
                {room?.room_number && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{room.room_number}{ov?.new_room_id && <span style={{ color: '#fbbf24' }}>*</span>}</span>}
              </div>
              {ov?.reason && (
                <div className="text-xs mt-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#fbbf24' }}>{ov.reason}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ EVENT CARD ══════════════════════════════════════════════ */
function EventCard({ event, expanded = false }: { event: SpecialEvent; expanded?: boolean }) {
  const icon = getEventTypeIcon(event.event_type);
  const borderColor = event.priority === 'urgent' ? 'rgba(244,63,94,0.4)' : event.priority === 'high' ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)';
  const bg = event.priority === 'urgent' ? 'rgba(244,63,94,0.07)' : event.priority === 'high' ? 'rgba(245,158,11,0.05)' : 'var(--bg-card)';

  return (
    <div className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${borderColor}` }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
            <span className="font-black text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{event.title}</span>
            <div className="flex gap-1.5 flex-wrap">
              {event.priority === 'urgent' && <span className="badge badge-urgent">Urgent</span>}
              {event.priority === 'high' && <span className="badge badge-next">High</span>}
              <span className="chip">{event.event_type.replace(/_/g, ' ')}</span>
            </div>
          </div>
          {event.description && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{event.description}</div>}
          {event.event_type === 'room_change' && event.old_rooms && event.new_rooms && (
            <div className="flex items-center gap-2 mt-2 text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{event.old_rooms.room_number}</span>
              <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="font-black" style={{ color: '#34d399' }}>{event.new_rooms.room_number}</span>
            </div>
          )}
          {(event.event_date || event.start_time) && (
            <div className="flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" />
              {event.event_date && new Date(event.event_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              {event.start_time && ` at ${formatTime(event.start_time)}`}
              {event.end_time && ` – ${formatTime(event.end_time)}`}
            </div>
          )}
          {expanded && (
            <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <Info className="w-3 h-3" />
              {event.target_all ? 'All students' : [event.departments?.name, event.semester && `Sem ${event.semester}`, event.class && `Class ${event.class}`, event.batch && `Batch ${event.batch}`].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ EMPTY STATE ═════════════════════════════════════════════ */
function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="bento-card p-10 text-center">
      <div className="text-4xl mb-3 animate-float">{emoji}</div>
      <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

/* ══ LOADING SCREEN ══════════════════════════════════════════ */
function LoadingScreen() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-4 gap-6" style={{ background: 'var(--bg-root)' }}>
      <div className="aurora-bg" aria-hidden><div className="aurora-orb" /></div>
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-white/10 animate-float">
          <Image src="/logo.jpg" alt="GEC" width={64} height={64} className="object-contain p-1.5" />
        </div>
        <div className="text-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Loading your timetable…</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fetching the latest schedule</div>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-16 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ══ ERROR SCREEN ════════════════════════════════════════════ */
function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--bg-root)' }}>
      <div className="aurora-bg" aria-hidden><div className="aurora-orb" /></div>
      <div className="relative z-10">
        <div className="text-5xl mb-5 animate-float">🔍</div>
        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Student Not Found</h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <button onClick={onBack} className="btn-primary"><ChevronLeft className="w-4 h-4" />Go Back</button>
      </div>
    </div>
  );
}
