'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Clock, Zap, BookOpen, Bell, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState('');
  const [remember, setRemember]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [now, setNow]               = useState(new Date());
  const [online, setOnline]         = useState(true);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('enrollment_no');
    if (saved) { setEnrollment(saved); setRemember(true); }
    const t = setInterval(() => setNow(new Date()), 1000);
    const onOn  = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener('online',  onOn);
    window.addEventListener('offline', onOff);
    return () => {
      clearInterval(t);
      window.removeEventListener('online',  onOn);
      window.removeEventListener('offline', onOff);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = enrollment.trim().toUpperCase().replace(/\s+/g, '');
    if (!val) { setError('Enter your enrollment number'); return; }
    if (val.length < 6) { setError('Enrollment number too short'); return; }
    setLoading(true);
    if (remember) localStorage.setItem('enrollment_no', val);
    else localStorage.removeItem('enrollment_no');
    router.push(`/student/${val}`);
  };

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h12    = ((now.getHours() % 12) || 12).toString().padStart(2, '0');
  const mm     = now.getMinutes().toString().padStart(2, '0');
  const ss     = now.getSeconds().toString().padStart(2, '0');
  const ampm   = now.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div style={{ minHeight: '100dvh', background: '#080a14', position: 'relative', overflowX: 'hidden' }}>

      {/* ── Aurora glow blobs ────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '55%', height: '55%',
          background: 'radial-gradient(ellipse, rgba(245,166,35,0.18) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '-5%',
          width: '45%', height: '45%',
          background: 'radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '55%',
          width: '35%', height: '35%',
          background: 'radial-gradient(ellipse, rgba(255,209,102,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
      </div>

      {/* ── Top bar ──────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: online ? '#34d399' : '#fbbf24',
            boxShadow: online ? '0 0 8px #34d399' : '0 0 8px #fbbf24',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a3a' }}>{online ? 'Live' : 'Offline'}</span>
        </div>
        <a href="/admin/login" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 12,
          background: 'rgba(245,166,35,0.1)',
          border: '1px solid rgba(245,166,35,0.25)',
          color: '#ffd166', fontSize: 12, fontWeight: 700,
          textDecoration: 'none', transition: 'all 0.2s',
        }}>
          <Shield style={{ width: 12, height: 12 }} />
          Admin
        </a>
      </div>

      {/* ── Main content ─────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 440, margin: '0 auto', padding: '0 20px 40px' }}>

        {/* College header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,166,35,0.35), transparent)',
              filter: 'blur(8px)',
            }} />
            <div style={{
              position: 'relative', width: 56, height: 56, borderRadius: 16,
              overflow: 'hidden', background: '#fff',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 24px rgba(245,166,35,0.25)',
            }}>
              <Image src="/logo.jpg" alt="GEC Palanpur" fill sizes="56px" className="object-contain p-1" priority />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 2 }}>
              Govt. Engineering College
            </div>
            <div style={{
              fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
              background: 'linear-gradient(135deg, #ffd166, #f5a623)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              PALANPUR
            </div>
          </div>
        </div>

        {/* Big headline */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 'clamp(2.25rem, 9vw, 3rem)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.05,
            color: '#fdf6e3', marginBottom: 10,
          }}>
            Smart<br />
            <span style={{
              background: 'linear-gradient(135deg, #ffd166 0%, #f472b6 60%, #fb923c 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Timetable</span>
          </h1>
          <p style={{ fontSize: 15, color: '#c4a882', lineHeight: 1.6, maxWidth: 320 }}>
            Your lectures, live room changes &amp; campus updates — in one tap.
          </p>
        </div>

        {/* Enrollment form card */}
        <div style={{
          background: 'rgba(25,30,48,0.9)',
          border: '1px solid rgba(245,166,35,0.2)',
          borderRadius: 24, padding: '28px 24px',
          marginBottom: 16,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 8 }}>
            Enrollment Number
          </div>
          <form onSubmit={handleSubmit}>
            <input
              id="enrollment"
              type="text"
              value={enrollment}
              onChange={e => { setEnrollment(e.target.value); setError(''); }}
              placeholder="e.g. 220123456"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={loading}
              maxLength={20}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(15,11,26,0.8)',
                border: '1.5px solid rgba(245,166,35,0.2)',
                borderRadius: 14, color: '#fdf6e3',
                fontSize: 16, fontFamily: 'inherit',
                outline: 'none', marginBottom: 12,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#8b5cf6'}
              onBlur={e => e.target.style.borderColor = 'rgba(245,166,35,0.2)'}
            />

            {error && (
              <div style={{
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
                borderRadius: 10, padding: '8px 12px', marginBottom: 12,
                color: '#fb7185', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="viewTimetableBtn"
              type="submit"
              disabled={loading || !enrollment.trim()}
              style={{
                width: '100%', padding: '15px 24px',
                background: loading || !enrollment.trim()
                  ? 'rgba(109,40,217,0.4)'
                  : 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 16, fontWeight: 800,
                fontFamily: 'inherit', cursor: loading || !enrollment.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s', letterSpacing: '-0.01em',
                boxShadow: loading || !enrollment.trim() ? 'none' : '0 8px 24px rgba(245,166,35,0.35)',
              }}>
              {loading ? (
                <>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.75s linear infinite',
                  }} />
                  Finding timetable…
                </>
              ) : (
                <>View My Timetable <ArrowRight style={{ width: 18, height: 18 }} /></>
              )}
            </button>

            {/* Remember toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                role="switch"
                aria-checked={remember}
                onClick={() => setRemember(r => !r)}
                style={{
                  position: 'relative', width: 44, height: 24, borderRadius: 12,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: remember ? 'linear-gradient(135deg, #7c3aed, #db2777)' : 'rgba(92,79,124,0.3)',
                  transition: 'all 0.25s',
                  boxShadow: remember ? '0 0 12px rgba(245,166,35,0.35)' : 'none',
                }}>
                <div style={{
                  position: 'absolute', top: 3, left: 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'transform 0.25s',
                  transform: remember ? 'translateX(20px)' : 'translateX(0)',
                }} />
              </button>
              <span style={{ fontSize: 13, color: '#c4a882' }}>Remember my enrollment number</span>
            </div>
          </form>
        </div>

        {/* Live clock card */}
        <div style={{
          background: 'rgba(28,20,50,0.7)',
          border: '1px solid rgba(245,166,35,0.15)',
          borderRadius: 20, padding: '20px 24px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 4 }}>
              Current Time
            </div>
            {mounted ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', color: '#fdf6e3', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {h12}:{mm}
                  <span style={{ fontSize: 18, color: '#6b5a3a', fontWeight: 700 }}>{ampm}</span>
                  <span style={{ fontSize: 14, color: '#2d2448', fontWeight: 600 }}>{ss}s</span>
                </div>
                <div style={{ fontSize: 13, color: '#c4a882', marginTop: 4 }}>
                  {days[now.getDay()]}, {now.getDate()} {months[now.getMonth()]} {now.getFullYear()}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 36, fontWeight: 900, color: '#fdf6e3' }}>--:--</div>
            )}
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock style={{ width: 26, height: 26, color: '#38bdf8' }} />
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: BookOpen, label: 'Personalised', sub: 'Timetable',     color: '#a78bfa', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.18)' },
            { icon: Zap,      label: 'Live Updates', sub: 'Room changes',  color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.18)' },
            { icon: Bell,     label: 'Alerts',       sub: 'Announcements', color: '#fb7185', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.18)'  },
          ].map(f => (
            <div key={f.label} style={{
              background: f.bg, border: `1px solid ${f.border}`,
              borderRadius: 16, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, margin: '0 auto 8px',
                background: `${f.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <f.icon style={{ width: 16, height: 16, color: f.color }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#fdf6e3', lineHeight: 1.3 }}>{f.label}</div>
              <div style={{ fontSize: 10, color: '#6b5a3a', marginTop: 2 }}>{f.sub}</div>
            </div>
          ))}
        </div>

        {/* Demo hint */}
        <div style={{
          background: 'rgba(28,20,50,0.7)',
          border: '1px solid rgba(245,166,35,0.1)',
          borderRadius: 18, padding: '16px 20px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 10 }}>
            🧪 Try a demo enrollment
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['220123456', '210234567', '220234569'].map(en => (
              <button key={en} onClick={() => setEnrollment(en)}
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  background: 'rgba(245,166,35,0.1)',
                  border: '1px solid rgba(245,166,35,0.25)',
                  color: '#ffd166', fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                {en}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#2d2448', marginTop: 10, lineHeight: 1.5 }}>
            Works after connecting Supabase &amp; running the SQL migrations
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingBottom: 24 }}>
        <p style={{ fontSize: 11, color: '#2d2448' }}>
          GEC Palanpur · Smart Timetable Portal · {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #6b5a3a; }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}

