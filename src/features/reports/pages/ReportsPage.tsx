import { useState, useEffect, useCallback } from 'react';
import { FileBarChart, Download, FileText, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService } from '@/services/api/reportService';
import type { ReportParams, ReportData } from '@/services/api/reportService';
import { classroomService } from '@/services/api/classroomService';
import type { Classroom } from '@/types/classroom.types';
import { Button } from '@/components/ui/Button';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function Stat({ label, value, tone = 'text-cg-text-primary' }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg border border-cg-border-default bg-cg-bg-tertiary p-4">
      <p className="text-xs font-medium text-cg-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(isoDay(new Date(Date.now() - 6 * 86_400_000)));
  const [dateTo, setDateTo] = useState(isoDay(new Date()));
  const [classroomId, setClassroomId] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const params: ReportParams = { dateFrom, dateTo, classroomId: classroomId || undefined };
  const classroomName = classrooms.find((c) => c.id === classroomId)?.name ?? 'All classrooms';

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await reportService.generate({ dateFrom, dateTo, classroomId: classroomId || undefined }));
    } catch {
      setError('Could not generate the report. Check the dates and try again.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, classroomId]);

  useEffect(() => {
    classroomService.getAll().then(setClassrooms).catch(() => undefined);
  }, []);

  // Show the last 7 days straight away
  useEffect(() => {
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = async () => {
    downloadBlob(await reportService.exportCsv(params), `classroomguard-${dateFrom}-to-${dateTo}.csv`);
  };

  const exportPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('ClassroomGuard - Exam Monitoring Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${dateFrom} to ${dateTo}   Classroom: ${classroomName}`, 14, 26);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 14, 32);
    autoTable(doc, {
      startY: 38,
      head: [['Measure', 'Value']],
      body: [
        ['Detection events', report.totalEvents],
        ['Phone detections', report.phoneDetections],
        ['Calculator detections', report.calculatorDetections],
        ['Alerts raised', report.totalAlerts],
        ['Alerts resolved', report.alertsResolved],
        ['Alerts still open', report.alertsOpen],
        ['Cameras online / total', `${report.camerasOnline} / ${report.totalCameras}`],
      ],
    });
    if (report.byClassroom.length) {
      autoTable(doc, {
        head: [['Classroom', 'Detections', 'Phone', 'Calculator']],
        body: report.byClassroom.map((r) => [r.classroom, r.events, r.phone, r.calculator]),
      });
    }
    if (report.byDay.length) {
      autoTable(doc, {
        head: [['Date', 'Detections', 'Alerts']],
        body: report.byDay.map((d) => [d.date, d.events, d.alerts]),
      });
    }
    doc.setFontSize(8);
    doc.text(
      'AI detections are prompts for invigilator review, not proof of misconduct.',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.save(`classroomguard-${dateFrom}-to-${dateTo}.pdf`);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-cg-text-primary">
            <FileBarChart className="h-5 w-5 text-brand-500" /> Reports
          </h1>
          <p className="mt-0.5 text-sm text-cg-text-secondary">Exam monitoring summary for a period and classroom</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={!report} icon={<Download className="h-4 w-4" />}>
            CSV
          </Button>
          <Button variant="secondary" onClick={exportPdf} disabled={!report} icon={<FileText className="h-4 w-4" />}>
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-cg-border-default bg-cg-bg-secondary p-4 md:grid-cols-4">
        <label className="text-sm text-cg-text-secondary">
          From
          <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-md border border-cg-border-default bg-cg-bg-tertiary px-3 py-2 text-cg-text-primary" />
        </label>
        <label className="text-sm text-cg-text-secondary">
          To
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-cg-border-default bg-cg-bg-tertiary px-3 py-2 text-cg-text-primary" />
        </label>
        <label className="text-sm text-cg-text-secondary">
          Classroom
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}
            className="mt-1 w-full rounded-md border border-cg-border-default bg-cg-bg-tertiary px-3 py-2 text-cg-text-primary">
            <option value="">All classrooms</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button onClick={generate} loading={loading} className="w-full">Generate</Button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-cg-status-error">{error}</p>}

      {!report && loading && (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Detection events" value={report.totalEvents} />
            <Stat label="Phone detections" value={report.phoneDetections} tone="text-cg-status-warning" />
            <Stat label="Calculator detections" value={report.calculatorDetections} tone="text-cg-status-warning" />
            <Stat label="Alerts raised" value={report.totalAlerts} tone="text-cg-status-error" />
            <Stat label="Alerts resolved" value={report.alertsResolved} tone="text-cg-status-online" />
            <Stat label="Alerts still open" value={report.alertsOpen} />
            <Stat label="High-severity alerts" value={report.alertsBySeverity.high ?? 0} tone="text-cg-status-error" />
            <Stat label="Cameras online" value={`${report.camerasOnline} / ${report.totalCameras}`} />
          </div>

          <div className="rounded-lg border border-cg-border-default bg-cg-bg-secondary p-4">
            <h2 className="mb-3 text-sm font-semibold text-cg-text-primary">Detections and alerts per day</h2>
            {report.byDay.length === 0 ? (
              <p className="py-10 text-center text-sm text-cg-text-tertiary">No detections in this period.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2738" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#8B95A8', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#8B95A8', fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="events" name="Detections" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="alerts" name="Alerts" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-cg-border-default bg-cg-bg-secondary">
            <h2 className="p-4 text-sm font-semibold text-cg-text-primary">By classroom</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-cg-bg-tertiary text-left text-xs uppercase text-cg-text-tertiary">
                <tr>
                  <th className="px-4 py-2">Classroom</th>
                  <th className="px-4 py-2">Detections</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Calculator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border-default text-cg-text-primary">
                {report.byClassroom.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-cg-text-tertiary">No detections in this period.</td></tr>
                ) : (
                  report.byClassroom.map((r) => (
                    <tr key={r.classroom}>
                      <td className="px-4 py-2">{r.classroom}</td>
                      <td className="px-4 py-2">{r.events}</td>
                      <td className="px-4 py-2">{r.phone}</td>
                      <td className="px-4 py-2">{r.calculator}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-cg-text-tertiary">
            Generated {new Date(report.generatedAt).toLocaleString()}. AI detections are prompts for invigilator review, not
            proof of misconduct.
          </p>
        </>
      )}
    </div>
  );
}
