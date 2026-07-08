import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { PublicRoute, ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Layout
import AppLayout from '@/components/layout/AppLayout';

// Main pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DocumentLibraryPage from '@/pages/documents/DocumentLibraryPage';
import DocumentUploadPage from '@/pages/documents/DocumentUploadPage';
import DocumentDetailPage from '@/pages/documents/DocumentDetailPage';

// Admin pages
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminPermissionsPage from '@/pages/admin/AdminPermissionsPage';
import AdminAuditLogsPage from '@/pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

// Error pages - inline components
const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md text-center space-y-6">
      <h1 className="text-3xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      <a href="/dashboard" className="text-primary hover:underline">กลับไปแดชบอร์ด</a>
    </div>
  </div>
);

const PendingApprovalPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md text-center space-y-6">
      <h1 className="text-3xl font-bold">รอการอนุมัติ</h1>
      <p className="text-muted-foreground">บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ</p>
      <a href="/login" className="text-primary hover:underline">เข้าสู่ระบบใหม่</a>
    </div>
  </div>
);

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md text-center space-y-6">
      <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
      <p className="text-muted-foreground">หน้าที่คุณค้นหาไม่พบ</p>
      <a href="/dashboard" className="text-primary hover:underline">กลับไปแดชบอร์ด</a>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><div>Forgot Password - TODO</div></PublicRoute>} />

            {/* Error pages */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Navigate to="/dashboard" replace />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Document routes */}
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentLibraryPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentUploadPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentUploadPage editMode />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div>Profile Page - TODO</div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <AdminUsersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <AdminCategoriesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/permissions"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <AdminPermissionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <AdminAuditLogsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <AdminSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
