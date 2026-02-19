import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './auth/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SuperAdminBranches } from './pages/SuperAdminBranches';
import { SuperAdminUsers } from './pages/SuperAdminUsers';
import { SuperAdminAuditLogs } from './pages/SuperAdminAuditLogs';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ClientListPage } from './pages/ClientListPage';
import { ClientRegistrationPage } from './pages/ClientRegistrationPage';
import { ClientProfilePage } from './pages/ClientProfilePage';

import LoanOfficerClientsPage from './pages/LoanOfficerClientsPage';
import LoanOfficerClientLoanContextPage from './pages/LoanOfficerClientLoanContextPage';
import BranchManagerLoanQueuePage from './pages/BranchManagerLoanQueuePage';
import BranchManagerLoanDetailPage from './pages/BranchManagerLoanDetailPage';
import CashierLoanQueuePage from './pages/CashierLoanQueuePage';
import CashierDisbursementPage from './pages/CashierDisbursementPage';

import axiosInstance from './api/axios';

const SuperAdminPanel = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Super Admin Panel</h1>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/super-admin/branches')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Manage Branches
        </button>

        <button
          onClick={() => navigate('/super-admin/users')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Manage Users
        </button>

        <button
          onClick={() => navigate('/super-admin/audit-logs')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          View Audit Logs
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user, setAccessToken, setUser } = React.useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');

    if (storedAccessToken && !user) {
      setAccessToken(storedAccessToken);

      axiosInstance
        .get('/auth/me/', {
          headers: { Authorization: `Bearer ${storedAccessToken}` },
        })
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/login', { replace: true });
        });
    }
  }, [user, setAccessToken, setUser, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />

      <Route
        path="/super-admin"
        element={
          <RequireAuth>
            <RequireRole role="SUPER_ADMIN">
              <SuperAdminPanel />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/super-admin/branches"
        element={
          <RequireAuth>
            <RequireRole role="SUPER_ADMIN">
              <SuperAdminBranches />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/super-admin/users"
        element={
          <RequireAuth>
            <RequireRole role="SUPER_ADMIN">
              <SuperAdminUsers />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/super-admin/audit-logs"
        element={
          <RequireAuth>
            <RequireRole role="SUPER_ADMIN">
              <SuperAdminAuditLogs />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/clients"
        element={
          <RequireAuth>
            <RequireRole roles={['CASHIER', 'BRANCH_MANAGER']}>
              <ClientListPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/clients/new"
        element={
          <RequireAuth>
            <RequireRole role="CASHIER">
              <ClientRegistrationPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/clients/:id"
        element={
          <RequireAuth>
            <RequireRole roles={['CASHIER', 'BRANCH_MANAGER']}>
              <ClientProfilePage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* =========================
          LOAN OFFICER ROUTES
         ========================= */}
      <Route
        path="/loan-officer/clients"
        element={
          <RequireAuth>
            <RequireRole role="LOAN_OFFICER">
              <LoanOfficerClientsPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/loan-officer/clients/:clientId/loan-context"
        element={
          <RequireAuth>
            <RequireRole role="LOAN_OFFICER">
              <LoanOfficerClientLoanContextPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/loan-officer/clients/:clientId"
        element={
          <RequireAuth>
            <RequireRole role="LOAN_OFFICER">
              <LoanOfficerClientLoanContextPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* =========================
          BRANCH MANAGER ROUTES
         ========================= */}

      {/* ✅ FIX: this route was missing, so your "Loans(All)" button hit a dead route */}
      <Route
        path="/branch-manager/loans"
        element={
          <RequireAuth>
            <RequireRole role="BRANCH_MANAGER">
              <BranchManagerLoanQueuePage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/branch-manager/loan-queue"
        element={
          <RequireAuth>
            <RequireRole role="BRANCH_MANAGER">
              <BranchManagerLoanQueuePage />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/branch-manager/loans/:loanId"
        element={
          <RequireAuth>
            <RequireRole role="BRANCH_MANAGER">
              <BranchManagerLoanDetailPage />
            </RequireRole>
          </RequireAuth>
        }
      />

        {/* Cashier routes */}
  <Route
    path="/cashier/loans"
    element={
      <RequireAuth>
          <RequireRole role="CASHIER">
          <CashierLoanQueuePage />
        </RequireRole>
      </RequireAuth>
    }
  />
  
  <Route
    path="/cashier/loans/:loanId/disburse"
    element={
      <RequireAuth>
          <RequireRole role="CASHIER">
          <CashierDisbursementPage />
        </RequireRole>
      </RequireAuth>
    }
  />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
