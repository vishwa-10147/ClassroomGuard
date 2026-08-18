import { SystemOverview } from '../components/SystemOverview';
import { LiveFeedsPreview } from '../components/LiveFeedsPreview';
import { RecentEvents } from '../components/RecentEvents';
import { ActiveAlerts } from '../components/ActiveAlerts';
import { AnalyticsCharts } from '../components/AnalyticsCharts';

export function DashboardPage() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-cg-text-primary">
          Dashboard
        </h1>
        <p className="mt-0.5 text-sm text-cg-text-secondary">
          System overview and operational status
        </p>
      </div>

      {/* System status metrics */}
      <section aria-label="System Status">
        <SystemOverview />
      </section>

      {/* Live camera feeds */}
      <section aria-label="Live Camera Feeds">
        <LiveFeedsPreview />
      </section>

      {/* Events and Alerts side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Recent Events">
          <RecentEvents />
        </section>
        <section aria-label="Active Alerts">
          <ActiveAlerts />
        </section>
      </div>

      {/* Analytics charts */}
      <section aria-label="Analytics">
        <AnalyticsCharts />
      </section>
    </div>
  );
}
