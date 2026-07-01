import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { PublicBooking } from './pages/PublicBooking';
import { DashboardRedirect } from './pages/DashboardRedirect';
import { PublicWebsite, PublicHome, PublicAbout, PublicDoctors, PublicDoctorProfile, PublicDepartments, PublicServices, PublicAppointment, PublicContact, PublicBlog, PublicEmergency } from './pages/PublicWebsite';
import { QueueTvDisplay } from './pages/QueueTvDisplay';

// Dashboard Placeholders
import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { DoctorDashboard } from './pages/dashboards/DoctorDashboard';
import { StaffDashboard } from './pages/dashboards/StaffDashboard';
import { PatientDashboard } from './pages/dashboards/PatientDashboard';
import { NurseDashboard } from './pages/dashboards/NurseDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicWebsite />}>
            <Route index element={<PublicHome />} />
            <Route path="about" element={<PublicAbout />} />
            <Route path="doctors" element={<PublicDoctors />} />
            <Route path="doctors/:id" element={<PublicDoctorProfile />} />
            <Route path="departments" element={<PublicDepartments />} />
            <Route path="services" element={<PublicServices />} />
            <Route path="appointment" element={<PublicAppointment />} />
            <Route path="contact" element={<PublicContact />} />
            <Route path="blog" element={<PublicBlog />} />
            <Route path="emergency" element={<PublicEmergency />} />
          </Route>

          {/* Public & Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/public-book/:clinicId" element={<PublicBooking />} />
          <Route path="/queue-tv" element={<QueueTvDisplay />} />

          {/* Protected Role-Based Dashboards */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', 'receptionist']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nurse"
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          {/* Root Redirection Route */}
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/goal" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
