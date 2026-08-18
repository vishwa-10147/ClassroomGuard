import { List, Search, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';

const mockLogs = [
  { id: '1', ts: '2023-10-26T10:15:22Z', user: 'Admin System', action: 'LOGIN', resource: 'System', result: 'success', ip: '192.168.1.10' },
  { id: '2', ts: '2023-10-26T10:20:05Z', user: 'Admin System', action: 'UPDATE_CAMERA', resource: 'CAM-01', result: 'success', ip: '192.168.1.10' },
  { id: '3', ts: '2023-10-26T11:05:12Z', user: 'Unknown', action: 'LOGIN', resource: 'System', result: 'failure', ip: '203.0.113.42' },
];

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <List className="w-6 h-6 mr-2 text-primary-600" /> Audit Logs
        </h1>
        <p className="text-sm text-gray-500 mt-1">System activity and security events trail.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex gap-4 bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md" />
          </div>
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 font-mono text-sm">
            {mockLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 whitespace-nowrap text-gray-500 text-xs">{new Date(log.ts).toLocaleString()}</td>
                <td className="px-6 py-3 whitespace-nowrap font-sans font-medium text-gray-900">{log.user}</td>
                <td className="px-6 py-3 whitespace-nowrap text-blue-600">{log.action}</td>
                <td className="px-6 py-3 whitespace-nowrap text-gray-600">{log.resource}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-bold font-sans", log.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                    {log.result.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-gray-400 text-xs">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
