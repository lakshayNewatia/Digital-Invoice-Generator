import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="ds-panel p-8">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">404</div>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-white/65">This route doesn’t exist in UI v2.</p>
      <div className="mt-6">
        <Link to="/" className="ds-btn-secondary">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
