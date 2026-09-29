import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrototypeBanner } from './components/common/Banner';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ApplicantAuthPage } from './pages/ApplicantAuthPage';
import { OfficerAuthPage } from './pages/OfficerAuthPage';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { NewApplicationWizard } from './pages/NewApplicationWizard';
import { ApplicantApplicationDetail } from './pages/ApplicantApplicationDetail';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { OfficerApplicationReview } from './pages/OfficerApplicationReview';
import { AdminDashboard } from './pages/AdminDashboard';
import { ApiDocsPage } from './pages/ApiDocsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <PrototypeBanner />
          <Navbar />
          
          <div className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/applicant/login" element={<ApplicantAuthPage />} />
              <Route path="/officer/login" element={<OfficerAuthPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />

              {/* Applicant Protected Routes */}
              <Route
                path="/applicant/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'ADMIN']}>
                    <ApplicantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicant/new"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'ADMIN']}>
                    <ApplicantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicant/apply/:appNumber"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'ADMIN']}>
                    <NewApplicationWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicant/applications/:appNumber"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'ADMIN']}>
                    <ApplicantApplicationDetail />
                  </ProtectedRoute>
                }
              />

              {/* Officer Protected Routes */}
              <Route
                path="/officer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                    <OfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/review/:appNumber"
                element={
                  <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                    <OfficerApplicationReview />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
