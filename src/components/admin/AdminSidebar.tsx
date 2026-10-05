'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserSquare2, BookOpen, Building2,
  CalendarDays, Bell, Zap, LogOut, Building, Menu, X, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { label: 'Dashboard',      href: '/admin/dashboard',   icon: LayoutDashboard, color: '#818cf8' },
  { label: 'Students',       href: '/admin/students',    icon: Users,           color: '#34d399' },
  { label: 'Professors',     href: '/admin/professors',  icon: UserSquare2,     color: '#ffd166' },
  { label: 'Departments',    href: '/admin/departments', icon: Building,        color: '#22d3ee' },
  { label: 'Subjects',       href: '/admin/subjects',    icon: BookOpen,        color: '#fbbf24' },
  { label: 'Rooms',          href: '/admin/rooms',       icon: Building2,       color: '#f87171' },
  { label: 'Timetable',      href: '/admin/timetable',   icon: CalendarDays,    color: '#c084fc' },
  { label: 'Live Updates',   href: '/admin/updates',     icon: Zap,             color: '#fb923c' },
  { label: 'Special Events', href: '/admin/events',      icon: Bell,            color: '#f472b6' },
];

export default function AdminSidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [open, setOpen]   = useState(false);   // mobile drawer
  const [wide, setWide]   = useState(true);    // desktop collapsed/wide
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  /* ── Shared nav content ───────────────────────── */
  const NavContent = ({ full }: { full: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(245,166,35,0.2)', flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', background: '#fff', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.2)' }}>
          <Image src="/logo.jpg" alt="GEC" width={34} height={34} style={{ objectFit: 'contain', padding: 2 }} />
        </div>
        {full && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#fdf6e3', letterSpacing: '-0.02em', lineHeight: 1.3 }}>GEC Palanpur</div>
            <div style={{ fontSize: 10, color: '#6b5a3a', fontWeight: 600 }}>Admin Panel</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              title={!full ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: full ? '9px 10px' : '9px',
                borderRadius: 12, textDecoration: 'none',
                fontWeight: 700, fontSize: 13,
                transition: 'all 0.15s',
                justifyContent: full ? 'flex-start' : 'center',
                background: active ? `${item.color}18` : 'transparent',
                border: `1px solid ${active ? `${item.color}35` : 'transparent'}`,
                color: active ? item.color : '#6d607a',
              }}
            >
              <item.icon style={{ width: 17, height: 17, flexShrink: 0, color: active ? item.color : '#6d607a' }} />
              {full && (
                <>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {active && <ChevronRight style={{ width: 13, height: 13, opacity: 0.5, flexShrink: 0 }} />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(245,166,35,0.2)', flexShrink: 0 }}>
        <button onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: full ? '9px 10px' : '9px',
            justifyContent: full ? 'flex-start' : 'center',
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 12, color: '#6d607a', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fb7185'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6d607a'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}>
          <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
          {full && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  /* ── Mobile hamburger button (only shown on small screens) ── */
  const HamburgerBtn = () => (
    <button
      onClick={() => setOpen(true)}
      style={{
        position: 'fixed', top: 14, left: 14, zIndex: 40,
        width: 38, height: 38, borderRadius: 12,
        background: 'rgba(28,20,50,0.95)',
        border: '1px solid rgba(245,166,35,0.2)',
        display: 'none', // overridden by CSS media query below
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#ffd166',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      id="sidebar-hamburger"
      aria-label="Open menu">
      <Menu style={{ width: 18, height: 18 }} />
    </button>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ────────────────────────── */}
      <div
        style={{
          width: wide ? 200 : 56,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: 'rgba(15,11,26,0.97)',
          borderRight: '1px solid rgba(245,166,35,0.2)',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 30,
        }}
        className="admin-sidebar-desktop"
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setWide(w => !w)}
          style={{
            position: 'absolute', top: 14, right: wide ? 12 : 6,
            width: 24, height: 24, borderRadius: 8,
            background: 'rgba(245,166,35,0.2)',
            border: '1px solid rgba(245,166,35,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#f5a623', transition: 'all 0.2s',
            zIndex: 1,
          }}
          aria-label={wide ? 'Collapse sidebar' : 'Expand sidebar'}>
          <ChevronRight style={{ width: 13, height: 13, transform: wide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        <NavContent full={wide} />
      </div>

      {/* ── MOBILE: hamburger button ─────────────────── */}
      <HamburgerBtn />

      {/* ── MOBILE DRAWER ────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(10,6,18,0.85)', backdropFilter: 'blur(8px)' }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
            zIndex: 50, background: 'rgba(15,11,26,0.99)',
            borderRight: '1px solid rgba(245,166,35,0.2)',
            boxShadow: '8px 0 40px rgba(0,0,0,0.5)',
          }}>
            {/* Close button */}
            <button onClick={() => setOpen(false)}
              style={{
                position: 'absolute', top: 14, right: 12, width: 30, height: 30,
                borderRadius: 8, background: 'rgba(245,166,35,0.2)',
                border: '1px solid rgba(245,166,35,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#ffd166',
              }}>
              <X style={{ width: 15, height: 15 }} />
            </button>
            <NavContent full={true} />
          </div>
        </>
      )}

      {/* Media query to show hamburger on mobile */}
      <style>{`
        .admin-sidebar-desktop { display: flex !important; }
        #sidebar-hamburger { display: none !important; }
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          #sidebar-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}

