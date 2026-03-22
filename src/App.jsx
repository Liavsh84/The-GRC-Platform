import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Governance from './pages/Governance';
import Compliance from './pages/Compliance';
import RiskManagement from './pages/RiskManagement';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

const AppLayout = ({ children }) => (
  <div className="flex h-screen bg-gray-50 overflow-hidden">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white text-xl font-semibold">Loading GRC Platform...</p>
      <p className="text-slate-400 text-sm mt-2">Syncing data, please wait</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { currentUser, authLoading } = useAuth();
  const { dataLoading } = useData();

  if (authLoading || dataLoading) return <LoadingScreen />;

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/risk-management" element={<RiskManagement />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/users"
          element={currentUser.role === 'admin' ? <UserManagement /> : <Navigate to="/" replace />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
