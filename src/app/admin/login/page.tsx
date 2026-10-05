'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError('Invalid email or password. Please try again.'); setLoading(false); return; }
    router.push('/admin/dashboard');
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#080a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>

      {/* Aurora glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(245,166,35,0.15) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(219,39,119,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400 }}>

        {/* College branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.15), transparent)', filter: 'blur(12px)' }} />
            <div style={{
              position: 'relative', width: 72, height: 72, borderRadius: 20,
              overflow: 'hidden', background: '#fff',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 32px rgba(245,166,35,0.15)',
              margin: '0 auto',
            }}>
              <Image src="/logo.jpg" alt="GEC Palanpur" width={72} height={72} className="object-contain p-1" />
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 6 }}>
            Govt. Engineering College, Palanpur
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#fdf6e3', marginBottom: 4 }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: 13, color: '#6b5a3a' }}>ShalaSync — Admin Portal</p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(25,30,48,0.95)',
          border: '1px solid rgba(245,166,35,0.2)',
          borderRadius: 24, padding: '28px 24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <form onSubmit={handleLogin}>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 8 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b5a3a', fontSize: 14, pointerEvents: 'none' }}>✉</span>
                <input
                  id="email" type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@gecpalanpur.ac.in"
                  autoComplete="email"
                  required disabled={loading}
                  style={{
                    width: '100%', padding: '13px 16px 13px 40px',
                    background: 'rgba(15,11,26,0.8)',
                    border: '1.5px solid rgba(245,166,35,0.2)',
                    borderRadius: 12, color: '#fdf6e3',
                    fontSize: 15, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#f5a623'}
                  onBlur={e => e.target.style.borderColor = 'rgba(245,166,35,0.2)'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5a3a', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b5a3a', fontSize: 14, pointerEvents: 'none' }}>🔒</span>
                <input
                  id="password" type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required disabled={loading}
                  style={{
                    width: '100%', padding: '13px 48px 13px 40px',
                    background: 'rgba(15,11,26,0.8)',
                    border: '1.5px solid rgba(245,166,35,0.2)',
                    borderRadius: 12, color: '#fdf6e3',
                    fontSize: 15, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#f5a623'}
                  onBlur={e => e.target.style.borderColor = 'rgba(245,166,35,0.2)'}
                />
                <button type="button" onClick={() => setShow(!show)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b5a3a', padding: 4 }}>
                  {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#fb7185', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button id="loginBtn" type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px 24px',
                background: loading ? 'rgba(109,40,217,0.4)' : 'linear-gradient(135deg, #e8890c, #f5a623)',
                border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 16, fontWeight: 800,
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(245,166,35,0.15)',
                transition: 'all 0.2s',
              }}>
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 0.75s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight style={{ width: 18, height: 18 }} /></>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ fontSize: 13, color: '#6b5a3a', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c4a882')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b5a3a')}>
            ← Back to Student Portal
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } input::placeholder { color: #6b5a3a; }`}</style>
    </div>
  );
}

