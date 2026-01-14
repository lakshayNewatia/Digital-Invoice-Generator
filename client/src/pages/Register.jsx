import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/state/auth.jsx';

function Register() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nameError = useMemo(() => {
    const v = String(name || '').trim();
    if (!v) return 'Name is required.';
    if (v.length < 2) return 'Name must be at least 2 characters.';
    if (!/^[A-Za-z ]+$/.test(v)) return 'Name can contain only letters and spaces.';
    return '';
  }, [name]);

  const passwordRules = useMemo(() => {
    const v = String(password || '');
    return {
      minLen: v.length >= 8,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      number: /[0-9]/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
    };
  }, [password]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required.';
    if (!passwordRules.minLen) return 'Password must be at least 8 characters.';
    if (!passwordRules.upper) return 'Password must include at least 1 uppercase letter.';
    if (!passwordRules.lower) return 'Password must include at least 1 lowercase letter.';
    if (!passwordRules.number) return 'Password must include at least 1 number.';
    if (!passwordRules.special) return 'Password must include at least 1 special character.';
    return '';
  }, [password, passwordRules]);

  const confirmError = useMemo(() => {
    if (!confirm) return 'Please confirm your password.';
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  }, [password, confirm]);

  const canSubmit = useMemo(() => {
    return !nameError && !passwordError && !confirmError && !isSubmitting;
  }, [nameError, passwordError, confirmError, isSubmitting]);

  const transition = useMemo(
    () => (reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }),
    [reduceMotion],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (nameError || passwordError || confirmError) {
      setError(nameError || passwordError || confirmError);
      return;
    }
    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Registration failed');
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
            Create your workspace
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Start invoicing in minutes</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65">
            A premium invoice flow: clean creation, clear totals, and a dashboard that prioritizes signal.
          </p>
        </motion.section>

        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
          className="ds-panel overflow-hidden"
        >
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Account</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Create account</div>
            <div className="mt-1 text-sm text-white/60">Your details are stored securely in MongoDB.</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="ds-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aryan"
                required
              />
              {name ? <div className={nameError ? 'text-xs font-semibold text-rose-200' : 'text-xs text-white/55'}>{nameError || 'Looks good.'}</div> : null}
            </div>

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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className="ds-input pr-12"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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
                {password ? <div className={passwordError ? 'text-xs font-semibold text-rose-200' : 'text-xs text-white/55'}>{passwordError || 'Strong password.'}</div> : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="confirm">
                  Confirm
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    className="ds-input pr-12"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/70 hover:text-white"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {confirm ? <div className={confirmError ? 'text-xs font-semibold text-rose-200' : 'text-xs text-white/55'}>{confirmError || 'Passwords match.'}</div> : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button className="ds-btn-primary w-full" type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Creating…' : 'Create account'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <div className="text-white/60">Already have an account?</div>
              <Link to="/login" className="font-semibold text-white hover:text-white/80">
                Sign in
              </Link>
            </div>
          </form>
        </motion.section>
      </div>
    </div>
  );
}

export default Register;
