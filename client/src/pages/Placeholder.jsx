import { motion, useReducedMotion } from 'framer-motion';

function Placeholder({ title }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="ds-panel p-8"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Coming next</div>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/65">
        This screen is intentionally left as a placeholder while we build screens in the required order.
      </p>
    </motion.div>
  );
}

export default Placeholder;
