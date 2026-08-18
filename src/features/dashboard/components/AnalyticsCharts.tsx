
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

// Detections over time (24h)
const detectionsOverTime = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  detections: Math.floor(
    Math.random() * 20 + (i >= 8 && i <= 18 ? 15 : 2)
  ),
  alerts: Math.floor(Math.random() * 5 + (i >= 9 && i <= 17 ? 2 : 0)),
}));

// Events by type
const eventsByType = [
  { name: 'Phone Usage', value: 68, color: '#F59E0B' },
  { name: 'Person Enter', value: 42, color: '#3B82F6' },
  { name: 'Person Exit', value: 38, color: '#06B6D4' },
  { name: 'Unauthorized', value: 4, color: '#EF4444' },
  { name: 'Camera Events', value: 8, color: '#8B95A8' },
];

// Camera uptime
const cameraUptime = [
  { name: 'CAM-01', uptime: 99.9 },
  { name: 'CAM-02', uptime: 99.7 },
  { name: 'CAM-03', uptime: 45.2 },
  { name: 'CAM-04', uptime: 98.5 },
  { name: 'CAM-05', uptime: 99.8 },
  { name: 'CAM-06', uptime: 99.6 },
  { name: 'CAM-07', uptime: 97.1 },
  { name: 'CAM-08', uptime: 99.4 },
];

const chartTooltipStyle = {
  backgroundColor: '#1A2130',
  border: '1px solid #2A3548',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#E8ECF2',
};

export function AnalyticsCharts() {
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
        </div>

        {/* Camera Uptime */}
        <div className="card p-4 lg:col-span-2">
          <h4 className="mb-3 text-sm font-medium text-cg-text-secondary">
            Camera Uptime (%)
          </h4>
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
        </div>
      </div>
    </div>
  );
}
