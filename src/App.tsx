
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoader } from './components/ui/loader';
import Header from './components/layout/Header';
import Sidebar, { SidebarProvider } from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Students = lazy(() => import('./pages/Students'));
const Classes = lazy(() => import('./pages/Classes'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Timetable = lazy(() => import('./pages/Timetable'));
import ExamSeatingGenerator from './pages/ExamSeatingGenerator';
const Library = lazy(() => import('./pages/Library'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Groups = lazy(() => import('./pages/Groups'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const NoDueRequests = lazy(() => import('./pages/NoDueRequests'));
const MenteesSection = lazy(() => import('./components/mentees/MenteesSection'));
const MenteeManagement = lazy(() => import('./pages/MenteeManagement'));
const FacultyAssignments = lazy(() => import('./pages/FacultyAssignments'));
const Departments = lazy(() => import('./pages/Departments'));
const DigitalIDCard = lazy(() => import('./pages/DigitalIDCard'));
const IDCardPublicView = lazy(() => import('./pages/IDCardPublicView'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <PageLoader text="Initializing V Connect Portal..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </SidebarProvider>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader text="Initializing..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader text="Loading page..." />}>
              <Routes>
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                <Route path="/id-card/view/:userId" element={<IDCardPublicView />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="/departments" element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <Departments />
                  </ProtectedRoute>
                } />
                <Route path="/students" element={
                  <ProtectedRoute>
                    <Students />
                  </ProtectedRoute>
                } />
                <Route path="/classes" element={
                  <ProtectedRoute>
                    <Classes />
                  </ProtectedRoute>
                } />
                <Route path="/attendance" element={
                  <ProtectedRoute>
                    <Attendance />
                  </ProtectedRoute>
                } />
                <Route path="/timetable" element={
                  <ProtectedRoute>
                    <Timetable />
                  </ProtectedRoute>
                } />
                <Route path="/exam-seating" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'EXAM_CELL_COORDINATOR']}>
                    <ExamSeatingGenerator />
                  </ProtectedRoute>
                } />
                <Route path="/library" element={
                  <ProtectedRoute allowedRoles={['LIBRARIAN']}>
                    <Library />
                  </ProtectedRoute>
                } />
                <Route path="/no-due" element={
                  <ProtectedRoute>
                    <NoDueRequests />
                  </ProtectedRoute>
                } />
                <Route path="/meetings" element={
                  <ProtectedRoute>
                    <Meetings />
                  </ProtectedRoute>
                } />
                <Route path="/groups" element={
                  <ProtectedRoute>
                    <Groups />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/mentees" element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'COORDINATOR']}>
                    <MenteesSection />
                  </ProtectedRoute>
                } />
                <Route path="/mentee-management" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HOD']}>
                    <MenteeManagement />
                  </ProtectedRoute>
                } />
                <Route path="/faculty-assignments" element={
                  <ProtectedRoute allowedRoles={['HOD', 'ADMIN', 'PRINCIPAL']}>
                    <FacultyAssignments />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/id-card" element={
                  <ProtectedRoute>
                    <DigitalIDCard />
                  </ProtectedRoute>
                } />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
