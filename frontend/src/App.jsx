import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import WorkingHours from './pages/WorkingHours';
import OwnerAppointments from './pages/OwnerAppointments';
import AdminApproval from './pages/AdminApproval';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />

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
          <Route path="/working-hours" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><WorkingHours /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/owner-appointments" element={
            <ProtectedRoute roles={['BUSINESS_OWNER']}>
              <AppLayout><OwnerAppointments /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AppLayout><AdminApproval /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}