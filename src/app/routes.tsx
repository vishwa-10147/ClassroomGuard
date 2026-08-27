import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { LoadingState } from '@/components/shared/LoadingState';
import { RealTimeProvider } from '@/components/providers/RealTimeProvider';

const LiveMonitoringPage = lazy(
  () => import('@/features/live-monitoring/pages/LiveMonitoringPage')
);

const CamerasPage = lazy(
  () => import('@/features/cameras/pages/CamerasPage')
);

const ClassroomsPage = lazy(
  () => import('@/features/classrooms/pages/ClassroomsPage')
);

const ClassroomDetailPage = lazy(
  () => import('@/features/classrooms/pages/ClassroomDetailPage')
);

const EventsPage = lazy(
  () => import('@/features/events/pages/EventsPage')
);

const AlertsPage = lazy(
  () => import('@/features/alerts/pages/AlertsPage')
);

const IncidentsPage = lazy(
  () => import('@/features/incidents/pages/IncidentsPage')
);

const IncidentDetailPage = lazy(
  () => import('@/features/incidents/pages/IncidentDetailPage')
);

const RecordingsPage = lazy(
  () => import('@/features/recordings/pages/RecordingsPage')
);

const ReportsPage = lazy(
  () => import('@/features/reports/pages/ReportsPage')
);

const UsersPage = lazy(
  () => import('@/features/users/pages/UsersPage')
);

const RolesPage = lazy(
  () => import('@/features/roles/pages/RolesPage')
);

const AuditLogsPage = lazy(
  () => import('@/features/audit-logs/pages/AuditLogsPage')
);

const SettingsPage = lazy(
  () => import('@/features/settings/pages/SettingsPage')
);

const EvidencePage = lazy(
  () => import('@/features/evidence/pages/EvidencePage')
);

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState message="Loading page..." />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },

  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RealTimeProvider>
          <AppShell />
        </RealTimeProvider>
      </ProtectedRoute>
    ),

    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      {
        path: 'dashboard',
        element: <DashboardPage />,
      },

      {
        path: 'live',
        element: (
          <SuspenseWrapper>
            <LiveMonitoringPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'cameras',
        element: (
          <SuspenseWrapper>
            <CamerasPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'classrooms',
        element: (
          <SuspenseWrapper>
            <ClassroomsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'classrooms/:id',
        element: (
          <SuspenseWrapper>
            <ClassroomDetailPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'recordings',
        element: (
          <SuspenseWrapper>
            <RecordingsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'evidence',
        element: (
          <SuspenseWrapper>
            <EvidencePage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'events',
        element: (
          <SuspenseWrapper>
            <EventsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'events/:id',
        element: (
          <SuspenseWrapper>
            <EventsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'alerts',
        element: (
          <SuspenseWrapper>
            <AlertsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'incidents',
        element: (
          <SuspenseWrapper>
            <IncidentsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'incidents/:id',
        element: (
          <SuspenseWrapper>
            <IncidentDetailPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'reports',
        element: (
          <SuspenseWrapper>
            <ReportsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'users',
        element: (
          <SuspenseWrapper>
            <UsersPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'roles',
        element: (
          <SuspenseWrapper>
            <RolesPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'audit-logs',
        element: (
          <SuspenseWrapper>
            <AuditLogsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        ),
      },

      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
