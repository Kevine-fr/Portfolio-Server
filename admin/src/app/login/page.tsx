'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrate();
      if (useAuth.getState().user) router.replace('/dashboard');
    })();
  }, [hydrate, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back ✦');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (user) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decorative constellation backdrop */}
      <Constellation />

      <form
        onSubmit={handleSubmit}
        className="relative card-gold p-8 md:p-10 w-full max-w-md animate-fade-in shadow-gold-lg z-10"
      >
        <div className="mb-8 text-center">
          <p className="console-label mb-3">[ portfolio.sys ]</p>
          <h1 className="text-3xl font-bold text-whiteHex mb-2">Authentication</h1>
          <p className="text-muted text-sm font-mono">Enter credentials to access the console</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-goldDeep mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-gold"
              placeholder="admin@kevinefray.dev"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-goldDeep mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-gold"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center mt-6">
          {submitting ? 'Authenticating...' : '> login'}
        </button>

        <p className="text-center text-[10px] text-muted/60 mt-6 font-mono uppercase tracking-widest">
          Secure session · JWT-based
        </p>
      </form>
    </div>
  );
}

// Cosmic decorative SVG constellation, nodding to the portfolio
function Constellation() {
  const stars = [
    { x: 15, y: 22, mag: 0.4 }, { x: 28, y: 18, mag: 0.7 },
    { x: 42, y: 30, mag: 0.5 }, { x: 60, y: 22, mag: 0.6 },
    { x: 78, y: 28, mag: 0.8 }, { x: 85, y: 45, mag: 0.4 },
    { x: 72, y: 58, mag: 0.6 }, { x: 55, y: 65, mag: 0.5 },
    { x: 35, y: 70, mag: 0.7 }, { x: 18, y: 55, mag: 0.4 },
    { x: 50, y: 42, mag: 0.9 },
  ];
  const lines = [[0,1],[1,2],[2,10],[10,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0],[10,7]];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={stars[a].x} y1={stars[a].y} x2={stars[b].x} y2={stars[b].y}
          stroke="rgba(212,193,154,0.15)" strokeWidth="0.08"
        />
      ))}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={0.4 + s.mag * 0.4}
          fill="#ffd97a"
          opacity={s.mag}
          style={{ animation: `twinkle ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite` }}
        />
      ))}
    </svg>
  );
}
