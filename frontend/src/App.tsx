import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import Income from './pages/Income';
import PaycheckPlanner from './pages/PaycheckPlanner';
import LoanCalculator from './pages/LoanCalculator';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Suggestions from './pages/Suggestions';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!user && isLoading) {
    return <div className="min-h-screen bg-gray-50" />;
  }
  return <>{children}</>;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suggestions"
          element={
            <ProtectedRoute>
              <Suggestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="bills" element={<Bills />} />
          <Route path="income" element={<Income />} />
          <Route path="planner" element={<PaycheckPlanner />} />
          <Route path="calculator" element={<LoanCalculator />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
