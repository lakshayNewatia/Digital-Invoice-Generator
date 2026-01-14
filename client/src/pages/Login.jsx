import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/state/auth.jsx';

function Login() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const emailError = useMemo(() => {
    const v = String(email || '').trim();
    if (!v) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
    return '';
  }, [email]);

  const passwordError = useMemo(() => {
    const v = String(password || '');
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    return '';
  }, [password]);

  const canSubmit = useMemo(() => {
    return !emailError && !passwordError && !isSubmitting;
  }, [emailError, passwordError, isSubmitting]);

  const transition = useMemo(
    () => (reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }),
    [reduceMotion],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (emailError || passwordError) {
      setError(emailError || passwordError);
      return;
    }
    setIsSubmitting(true);
    try {
      await login({ email, password });
      const next = location.state?.from || '/dashboard';
      navigate(next);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={transition}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            Secure access
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Welcome back</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65">
            Sign in to your workspace and get a clear, real-time view of invoices, clients, and what needs attention.
          </p>

          <div className="ds-panel p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Tip</div>
            <div className="mt-2 text-sm text-white/70">
              Your session uses a JWT token stored locally and sent as a Bearer header to the API.
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
          className="ds-panel overflow-hidden"
        >
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Account</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Sign in</div>
            <div className="mt-1 text-sm text-white/60">Use the credentials you registered with.</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="ds-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
              {email ? <div className={emailError ? 'text-xs font-semibold text-rose-200' : 'text-xs text-white/55'}>{emailError || 'Looks good.'}</div> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="ds-input pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/70 hover:text-white"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password ? <div className={passwordError ? 'text-xs font-semibold text-rose-200' : 'text-xs text-white/55'}>{passwordError || 'Looks good.'}</div> : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button className="ds-btn-primary w-full" type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <div className="text-white/60">New here?</div>
              <Link to="/register" className="font-semibold text-white hover:text-white/80">
                Create account
              </Link>
            </div>
          </form>
        </motion.section>
      </div>
    </div>
  );
}

export default Login;
