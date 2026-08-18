import { Video, Upload, Play, Download, Trash, BarChart } from 'lucide-react';
import { cn } from '@/utils/cn';

const mockRecordings = [
  { id: 'REC-1', name: 'CS101 Final Exam - Front', classroom: 'Hall A', duration: 7200, size: '2.4 GB', status: 'processed', detections: 42, date: '2023-10-25' },
  { id: 'REC-2', name: 'Physics Midterm', classroom: 'Room 302', duration: 3600, size: '1.1 GB', status: 'processing', progress: 45, date: '2023-10-26' },
  { id: 'REC-3', name: 'Chemistry Lab Session', classroom: 'Lab 2', duration: 5400, size: '1.8 GB', status: 'failed', date: '2023-10-24' },
];

const Badge = ({ status, progress }: any) => {
  if (status === 'processed') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold uppercase">Processed</span>;
  if (status === 'failed') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold uppercase">Failed</span>;
  if (status === 'processing') return (
    <div className="flex items-center gap-2">
      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold uppercase animate-pulse">Processing</span>
      <span className="text-xs text-gray-500 font-mono">{progress}%</span>
    </div>
  );
  return null;
}

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function RecordingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Video className="w-6 h-6 mr-2 text-primary-600" /> Recordings & Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">Upload offline videos for AI analysis or review past recordings.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
          <Upload className="w-4 h-4 mr-2" /> Upload Video
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recording Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockRecordings.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                      <Play className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{rec.name}</div>
                      <div className="text-xs text-gray-500">{rec.date}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{rec.classroom}</div>
                  <div className="text-xs">{formatDuration(rec.duration)} • {rec.size}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge status={rec.status} progress={rec.progress} />
                  {rec.status === 'processing' && (
                     <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${rec.progress}%` }}></div>
                     </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {rec.status === 'processed' ? (
                    <span className="font-medium text-gray-900">{rec.detections} events</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-3">
                    <button className="text-gray-400 hover:text-primary-600" title="View Analysis" disabled={rec.status !== 'processed'}><BarChart className="w-4 h-4" /></button>
                    <button className="text-gray-400 hover:text-gray-700" title="Download"><Download className="w-4 h-4" /></button>
                    <button className="text-gray-400 hover:text-red-600" title="Delete"><Trash className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
