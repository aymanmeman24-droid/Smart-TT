import { createClient } from '@/lib/supabase/server';
import { Users, UserSquare2, BookOpen, Building2, CalendarDays, Zap, TrendingUp, Bell, Building } from 'lucide-react';

export default async function AdminDashboard() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="p-6 max-w-3xl mx-auto lg:pl-6 pl-16">
        <div className="mb-8">
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        </div>
        <div className="glass-card p-8" style={{ borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.05)' }}>
          <div className="text-3xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Supabase Setup Required</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            To activate the full application, connect your Supabase project.
          </p>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              <>Go to <a href="https://supabase.com" target="_blank" className="text-blue-400 underline">supabase.com</a> and create a new project</>,
              <>Copy your <strong>Project URL</strong> and <strong>anon key</strong> from Settings → API</>,
              <>Create <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card-hover)' }}>.env.local</code> in the project root</>,
              <>Run both SQL files in <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card-hover)' }}>supabase/migrations/</code> in Supabase SQL editor</>,
              'Create an admin user: Supabase Dashboard → Auth → Add User',
              'Restart the dev server',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: '#2952cc' }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 p-4 rounded-xl font-mono text-xs" style={{ background: 'var(--bg-card-hover)', color: '#34d399' }}>
            <div style={{ color: 'var(--text-muted)' }}># .env.local</div>
            <div>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here</div>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [studentsRes, professorsRes, subjectsRes, roomsRes, deptsRes, timetablesRes, eventsRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('professors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('departments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('special_events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  const todayEntriesRes = await supabase
    .from('timetables')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('day', today)
    .neq('entry_type', 'break');

  const stats = {
    students: studentsRes.count || 0,
    professors: professorsRes.count || 0,
    subjects: subjectsRes.count || 0,
    rooms: roomsRes.count || 0,
    departments: deptsRes.count || 0,
    timetables: timetablesRes.count || 0,
    events: eventsRes.count || 0,
    todayEntries: todayEntriesRes.count || 0,
  };

  const { data: { user } } = await supabase.auth.getUser();

  const { data: recentEvents } = await supabase
    .from('special_events')
    .select('*, departments(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentStudents } = await supabase
    .from('students')
    .select('*, departments(*)')
    .order('created_at', { ascending: false })
    .limit(5);

  const statCards = [
    { label: 'Students',         value: stats.students,     icon: Users,        color: '#93b4ff', bg: 'rgba(65,105,225,0.12)',  href: '/admin/students' },
    { label: 'Professors',       value: stats.professors,   icon: UserSquare2,  color: '#34d399', bg: 'rgba(16,185,129,0.12)',  href: '/admin/professors' },
    { label: 'Departments',      value: stats.departments,  icon: Building,     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   href: '/admin/departments' },
    { label: 'Subjects',         value: stats.subjects,     icon: BookOpen,     color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', href: '/admin/subjects' },
    { label: 'Rooms',            value: stats.rooms,        icon: Building2,    color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', href: '/admin/rooms' },
    { label: 'Published Entries',value: stats.timetables,  icon: CalendarDays, color: '#67e8f9', bg: 'rgba(6,182,212,0.10)',  href: '/admin/timetable' },
    { label: "Today's Classes",  value: stats.todayEntries, icon: TrendingUp,   color: '#f9a8d4', bg: 'rgba(236,72,153,0.10)', href: '/admin/timetable' },
    { label: 'Active Updates',   value: stats.events,       icon: Zap,          color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', href: '/admin/updates' },
  ];

  const eventIcon = (type: string) => {
    const icons: Record<string, string> = { room_change: '🏛️', cancellation: '❌', seminar: '🎤', emergency: '🚨', workshop: '🔧', exam: '📝', announcement: '📢' };
    return icons[type] || '📌';
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6 lg:pl-0 pl-12">
        <h1 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {user?.email?.split('@')[0]} · {today}, {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map(card => (
          <a key={card.label} href={card.href} className="stat-card hover:no-underline block">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg }}>
                <card.icon style={{ width: 16, height: 16, color: card.color }} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tabular-nums mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {card.value}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
          </a>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Recent Students */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: '#93b4ff' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Students</span>
            </div>
            <a href="/admin/students" className="text-xs font-medium hover:underline" style={{ color: '#93b4ff' }}>View all →</a>
          </div>
          <div>
            {(recentStudents || []).map((s: Record<string, unknown>) => (
              <div key={s.id as string} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(65,105,225,0.15)', color: '#93b4ff' }}>
                  {(s.name as string).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name as string}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {s.enrollment_no as string} · {(s.departments as Record<string, string>)?.code} · Sem {s.semester as number} · {s.batch as string}
                  </div>
                </div>
              </div>
            ))}
            {!recentStudents?.length && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No students added yet.</div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Active Updates</span>
            </div>
            <a href="/admin/updates" className="text-xs font-medium hover:underline" style={{ color: '#93b4ff' }}>Manage →</a>
          </div>
          <div>
            {(recentEvents || []).map((event: Record<string, unknown>) => (
              <div key={event.id as string} className="px-5 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-base flex-shrink-0">{eventIcon(event.event_type as string)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{event.title as string}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {(event.event_type as string).replace(/_/g, ' ')} ·{' '}
                    {event.target_all ? 'All students' : (event.departments as Record<string, string>)?.name}
                  </div>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${
                  event.priority === 'urgent' ? 'badge-urgent' : event.priority === 'high' ? 'badge-next' : 'badge-draft'
                }`}>
                  {event.priority as string}
                </span>
              </div>
            ))}
            {!recentEvents?.length && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active updates.</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card-sm p-5">
        <div className="text-label mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/students',   label: 'Add Student',    icon: Users,        color: '#93b4ff' },
            { href: '/admin/timetable',  label: 'Add Lecture',    icon: CalendarDays, color: '#34d399' },
            { href: '/admin/updates',    label: 'Live Update',    icon: Zap,          color: '#fbbf24' },
            { href: '/admin/events',     label: 'Create Event',   icon: Bell,         color: '#a78bfa' },
          ].map(action => (
            <a key={action.href} href={action.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: `${action.color}14`,
                color: action.color,
                border: `1px solid ${action.color}30`,
              }}>
              <action.icon style={{ width: 15, height: 15, flexShrink: 0 }} />
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
