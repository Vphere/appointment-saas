import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider'; 
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import OAuth2Callback from './pages/OAuth2Callback';
import Dashboard from './pages/Dashboard';
import BusinessList from './pages/BusinessList';
import BusinessDetails from './pages/BusinessDetails';
import Booking from './pages/Booking';
import MyAppointments from './pages/MyAppointments';
import AllServices from './pages/AllServices';
import OwnerDashboard from './pages/OwnerDashboard';
import ManageServices from './pages/ManageServices';
import OwnerAppointments from './pages/OwnerAppointments';
import AdminApproval from './pages/AdminApproval';
import CompleteProfile from './pages/CompleteProfile';
import ForgotPassword from './pages/ForgotPassword';
import ProfilePage from './pages/ProfilePage';
import BusinessAnalytics from './pages/BusinessAnalytics';
import BusinessSettings from './pages/BusinessSettings';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminReviews from './pages/AdminReviews';
import ConsentConfirm from './pages/ConsentConfirm';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

document.addEventListener('wheel', (e) => {
  if (document.activeElement?.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: false });

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile/>} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />
          <Route path="/profile" element={<ProfilePage/>} />
          <Route path="/consent/:token" element={<ConsentConfirm/>} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Customer Routes */}
          <Route path="/businesses" element={
            <ProtectedRoute roles={['CUSTOMER']}>
              <AppLayout><BusinessList /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/business/analytics" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><BusinessAnalytics /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/business/:id" element={
            <ProtectedRoute>
              <AppLayout><BusinessDetails /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/book/:businessId" element={
            <ProtectedRoute>
              <AppLayout><Booking /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/my-appointments" element={
            <ProtectedRoute>
              <AppLayout><MyAppointments /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/all-services" element={
            <ProtectedRoute>
              <AppLayout><AllServices /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Business Owner Routes */}
          <Route path="/my-businesses" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><OwnerDashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/manage-services" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><ManageServices /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/business-settings" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><BusinessSettings/></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/owner-appointments" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><OwnerAppointments /></AppLayout>
            </ProtectedRoute>
          } />          

          {/* ── Admin Routes ── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout><AdminDashboard/></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/approvals" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout><AdminApproval/></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout><AdminUserManagement /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reviews" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout><AdminReviews/></AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}