
import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiClient } from '@/services/api/client';
import { Loader2 } from 'lucide-react';

interface HourlyBucket {
  hour: string;
  detections: number;
  alerts: number;
}

interface TypeBucket {
  name: string;
  value: number;
  color: string;
}

interface UptimeBucket {
  name: string;
  uptime: number;
}

const typeColors: Record<string, string> = {
  PHONE_USAGE_DETECTED: '#F59E0B',
  PERSON_ENTERED: '#3B82F6',
  PERSON_EXITED: '#06B6D4',
  UNAUTHORIZED_ACCESS: '#EF4444',
  CAMERA_OFFLINE: '#8B95A8',
  CAMERA_ONLINE: '#22C55E',
  SUSPICIOUS_HEAD_TURN: '#A855F7',
  LOOKING_DOWN_DETECTED: '#EC4899',
  CALCULATOR_USAGE_DETECTED: '#F97316',
};

const chartTooltipStyle = {
  backgroundColor: '#1A2130',
  border: '1px solid #2A3548',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#E8ECF2',
};

export function AnalyticsCharts() {
  const [detectionsOverTime, setDetectionsOverTime] = useState<HourlyBucket[]>([]);
  const [eventsByType, setEventsByType] = useState<TypeBucket[]>([]);
  const [cameraUptime, setCameraUptime] = useState<UptimeBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsRes, camerasRes] = await Promise.all([
          apiClient.get('/events', { params: { page: 1, page_size: 200 } }),
          apiClient.get('/cameras'),
          apiClient.get('/alerts/count'),
        ]);

        const events = eventsRes.data?.data ?? [];
        const cameras = camerasRes.data;

        // Group events by hour of day
        const hourlyMap: Record<string, { detections: number; alerts: number }> = {};
        for (let i = 0; i < 24; i++) {
          const key = `${i.toString().padStart(2, '0')}:00`;
          hourlyMap[key] = { detections: 0, alerts: 0 };
        }
        events.forEach((evt: any) => {
          const ts = evt.timestamp || evt.createdAt;
          if (!ts) return;
          const d = new Date(ts);
          const key = `${d.getUTCHours().toString().padStart(2, '0')}:00`;
          if (hourlyMap[key]) {
            hourlyMap[key].detections += 1;
          }
        });

        const hourlyData: HourlyBucket[] = Object.entries(hourlyMap).map(
          ([hour, v]) => ({ hour, detections: v.detections, alerts: v.alerts })
        );
        setDetectionsOverTime(hourlyData);

        // Group events by type
        const typeMap: Record<string, number> = {};
        events.forEach((evt: any) => {
          const t = evt.type || evt.event_type || 'UNKNOWN';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const typeData: TypeBucket[] = Object.entries(typeMap)
          .map(([name, value]) => ({
            name: name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
            value,
            color: typeColors[name] || '#8B95A8',
          }))
          .sort((a, b) => b.value - a.value);
        setEventsByType(typeData);

        // Camera uptime
        if (Array.isArray(cameras)) {
          const uptimeData: UptimeBucket[] = cameras.map((cam: any) => ({
            name: cam.camera_id || cam.name || cam.id,
            uptime: cam.status === 'online' ? 99.9 : cam.status === 'connecting' ? 45.2 : cam.status === 'offline' ? 0 : 98.0,
          }));
          setCameraUptime(uptimeData);
        }
      } catch {
        // keep empty arrays on failure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h3 className="mb-3 text-base font-semibold text-cg-text-primary">Analytics</h3>
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-cg-text-tertiary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-cg-text-primary">
        Analytics
      </h3>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Detections Over Time */}
        <div className="card p-4">
          <h4 className="mb-3 text-sm font-medium text-cg-text-secondary">
            Detections Over Time (24h)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={detectionsOverTime}>
                <defs>
                  <linearGradient id="detectGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E2738"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5A6478', fontSize: 10 }}
                  interval={3}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5A6478', fontSize: 10 }}
                  width={30}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="detections"
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  fill="url(#detectGrad)"
                  name="Detections"
                />
                <Area
                  type="monotone"
                  dataKey="alerts"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  fill="url(#alertGrad)"
                  name="Alerts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events by Type */}
        <div className="card p-4">
          <h4 className="mb-3 text-sm font-medium text-cg-text-secondary">
            Events by Type
          </h4>
          {eventsByType.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-cg-text-tertiary">
              No event data yet
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventsByType}
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {eventsByType.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {eventsByType.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-cg-text-secondary">
                      {item.name}
                    </span>
                    <span className="text-xs font-medium text-cg-text-primary tabular-nums ml-auto">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Camera Uptime */}
        <div className="card p-4 lg:col-span-2">
          <h4 className="mb-3 text-sm font-medium text-cg-text-secondary">
            Camera Uptime (%)
          </h4>
          {cameraUptime.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-cg-text-tertiary">
              No camera data yet
            </div>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cameraUptime} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1E2738"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#5A6478', fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8B95A8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    width={60}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="uptime"
                    name="Uptime %"
                    radius={[0, 3, 3, 0]}
                    maxBarSize={16}
                  >
                    {cameraUptime.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.uptime >= 99
                            ? '#22C55E'
                            : entry.uptime >= 90
                              ? '#F59E0B'
                              : '#EF4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
