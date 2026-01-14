import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/state/auth.jsx';

function Stat({ label, value }) {
  return (
    <div className="ds-panel p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-white/60">Live preview with mock data</div>
    </div>
  );
}

function Landing() {
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();

  const up = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
      };

  return (
    <div className="relative">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <motion.section
          variants={up}
          initial={reduceMotion ? undefined : 'hidden'}
          animate={reduceMotion ? undefined : 'show'}
          transition={reduceMotion ? undefined : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            Premium invoicing, designed first
          </div>

          <h1 className="font-display text-5xl font-semibold tracking-tight text-white">
            A digital invoice generator that feels like a product, not a tool.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/70">
            Build invoices in minutes, send them with confidence, and track what matters—without the admin-panel energy.
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="ds-btn-primary">
                Get started
              </Link>
              <Link to="/login" className="ds-btn-secondary">
                Sign in
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Flow</div>
              <div className="mt-1 text-sm font-semibold text-white/85">Frictionless create</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Signal</div>
              <div className="mt-1 text-sm font-semibold text-white/85">Command-center dashboard</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Detail</div>
              <div className="mt-1 text-sm font-semibold text-white/85">Authority in every pixel</div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
          className="relative"
        >
          <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(60%_50%_at_30%_0%,rgb(var(--glow-a)_/_0.16),transparent_60%)]" />
          <div className="ds-panel relative overflow-hidden p-7">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgb(var(--glow-b)_/_0.12),rgb(var(--glow-a)_/_0.10),rgb(var(--glow-c)_/_0.10))]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Preview</div>
                  <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Invoice Studio</div>
                  <div className="mt-1 text-sm text-white/60">Mock data. Real vibe.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Today</div>
                  <div className="mt-1 font-display text-xl font-semibold">₹ 84,920</div>
                  <div className="text-xs text-white/55">total invoiced</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Stat label="Outstanding" value="₹ 18,400" />
                <Stat label="Overdue" value="₹ 6,100" />
                <Stat label="Paid" value="₹ 60,420" />
                <Stat label="Clients" value="24" />
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Recent activity</div>
                  <div className="text-xs text-white/55">Last 24 hours</div>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { t: 'Invoice #INV-1042 sent', s: 'Nimbus Labs · ₹ 12,500' },
                    { t: 'Payment received', s: 'Nova Retail · ₹ 4,200' },
                    { t: 'Draft created', s: 'Aster Studio · ₹ 7,800' },
                  ].map((row) => (
                    <div key={row.t} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white/85">{row.t}</div>
                        <div className="text-xs text-white/55">{row.s}</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-emerald-400/70" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[{ k: 'Create', v: 'Zero-friction invoice builder' }, { k: 'Send', v: 'One-tap delivery and reminders' }, { k: 'Track', v: 'Clarity on paid vs overdue' }].map(
          (f) => (
            <div key={f.k} className="ds-panel p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{f.k}</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-white/90">{f.v}</div>
              <div className="mt-2 text-sm text-white/60">Designed to feel premium at every step.</div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default Landing;
