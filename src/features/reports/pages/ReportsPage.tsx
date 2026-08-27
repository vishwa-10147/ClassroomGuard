import { useState, useEffect } from 'react';
import { FileBarChart, Download, Printer, Filter, Loader2 } from 'lucide-react';
import { reportService } from '@/services/api/reportService';
import type { ReportParams, ReportData } from '@/services/api/reportService';
import { classroomService } from '@/services/api/classroomService';
import type { Classroom } from '@/types/classroom.types';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    classroomService.getAll().then(setClassrooms);
  }, []);

  const buildParams = (): ReportParams => ({
    type: reportType,
    dateFrom: dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    dateTo: dateTo || new Date().toISOString().split('T')[0],
    classroomId: classroomId || undefined,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await reportService.generate(buildParams());
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    const blob = await reportService.exportCsv(buildParams());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const blob = await reportService.exportPdf(buildParams());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileBarChart className="w-6 h-6 mr-2 text-primary-600" /> Reports
        </h1>
        <p className="text-sm text-gray-500 mt-1">Generate and export analytics reports.</p>
      </div>

      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <select 
            className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="daily">Daily Summary</option>
            <option value="weekly">Weekly Incident Report</option>
            <option value="classroom">Classroom Utilization</option>
            <option value="system">System Health</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
          <input
            type="date"
            className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
          <input
            type="date"
            className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
          <select
            className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          >
            <option value="">All Classrooms</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center h-[38px] disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
          Generate Report
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 min-h-[400px]">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 capitalize">{reportType} Report</h2>
            <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
              title="Export PDF"
            >
              <FileBarChart className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCsv}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-200" title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {reportData ? (
          <div className="grid grid-cols-3 gap-6 mb-8">
            {Object.entries(reportData.summary).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-sm text-gray-500 font-medium">{key}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-medium">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-medium">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-1">--</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-medium">Active Cameras</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">--</p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg h-64 flex items-center justify-center text-gray-400">
          {reportData ? 'Report data loaded. Chart visualization will be available soon.' : '[ Chart Visualization Placeholder ]'}
        </div>
      </div>
    </div>
  );
}
