import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Clients from './pages/Clients';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Reports from './pages/Reports';
import Register from './pages/Register';
import Settings from './pages/Settings';
import SelectInvoiceTemplate from './pages/SelectInvoiceTemplate';
import InvoiceEmailComposer from './pages/InvoiceEmailComposer';
import EmailOutbox from './pages/EmailOutbox';
import { useAuth } from './state/auth.jsx';

function ProtectedRoute({ children }) {
  const { isBooting, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return <div className="ds-panel p-8">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/new"
            element={
              <ProtectedRoute>
                <CreateInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id/email"
            element={
              <ProtectedRoute>
                <InvoiceEmailComposer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id/template"
            element={
              <ProtectedRoute>
                <SelectInvoiceTemplate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emails"
            element={
              <ProtectedRoute>
                <EmailOutbox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
