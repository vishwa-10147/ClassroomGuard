import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { lazy, Suspense } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';

// Lazy-load feature pages to reduce initial bundle size
const LiveMonitoringPage = lazy(() =>
  import('@/features/live-monitoring/pages/LiveMonitoringPage').then((m) => ({
    default: m.LiveMonitoringPage,
  }))
);

const CamerasPage = lazy(() =>
  import('@/features/cameras/pages/CamerasPage').then((m) => ({
    default: m.CamerasPage,
  }))
);

const ClassroomsPage = lazy(() =>
  import('@/features/classrooms/pages/ClassroomsPage').then((m) => ({
    default: m.ClassroomsPage,
  }))
);

const ClassroomDetailPage = lazy(() =>
  import('@/features/classrooms/pages/ClassroomDetailPage').then((m) => ({
    default: m.ClassroomDetailPage,
  }))
);

const EventsPage = lazy(() =>
  import('@/features/events/pages/EventsPage').then((m) => ({
    default: m.EventsPage,
  }))
);

const AlertsPage = lazy(() =>
  import('@/features/alerts/pages/AlertsPage').then((m) => ({
    default: m.AlertsPage,
  }))
);

const IncidentsPage = lazy(() =>
  import('@/features/incidents/pages/IncidentsPage').then((m) => ({
    default: m.IncidentsPage,
  }))
);

const IncidentDetailPage = lazy(() =>
  import('@/features/incidents/pages/IncidentDetailPage').then((m) => ({
    default: m.IncidentDetailPage,
  }))
);

const RecordingsPage = lazy(() =>
  import('@/features/recordings/pages/RecordingsPage').then((m) => ({
    default: m.RecordingsPage,
  }))
);

const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  }))
);

const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage').then((m) => ({
    default: m.UsersPage,
  }))
);

const RolesPage = lazy(() =>
  import('@/features/roles/pages/RolesPage').then((m) => ({
    default: m.RolesPage,
  }))
);

const AuditLogsPage = lazy(() =>
  import('@/features/audit-logs/pages/AuditLogsPage').then((m) => ({
    default: m.AuditLogsPage,
  }))
);

const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
);

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
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
    element: <AppShell />,
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
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
