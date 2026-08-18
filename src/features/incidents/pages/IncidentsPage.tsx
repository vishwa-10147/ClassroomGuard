import { Link } from 'react-router-dom';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';

const mockIncidents = [
  { id: 'INC-2023-001', title: 'Cheating suspected during Final Math Exam', severity: 'high', status: 'investigating', classroom: 'Room 302', assignee: 'Admin User', created: '2023-10-25T10:30:00Z' },
  { id: 'INC-2023-002', title: 'Unauthorized person in testing area', severity: 'critical', status: 'open', classroom: 'Lab A', assignee: 'Unassigned', created: '2023-10-26T14:15:00Z' },
  { id: 'INC-2023-003', title: 'Multiple phone detections', severity: 'medium', status: 'resolved', classroom: 'Room 101', assignee: 'John Doe', created: '2023-10-20T09:00:00Z' },
];

const Badge = ({ children, variant, className }: any) => {
  const v: any = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    open: 'bg-red-50 text-red-700',
    investigating: 'bg-indigo-50 text-indigo-700',
    resolved: 'bg-green-50 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
  };
  return <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", v[variant] || v.open, className)}>{children}</span>;
}

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-primary-600" /> Incidents
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage formal incident reports.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Create Incident
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex gap-4 bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search incidents..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md" />
          </div>
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title & Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockIncidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{incident.id}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">{incident.title}</div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={incident.severity} className="uppercase">{incident.severity}</Badge>
                    <span className="text-xs text-gray-500">{incident.classroom}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={incident.status} className="uppercase">{incident.status}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incident.assignee}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(incident.created).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/incidents/${incident.id}`} className="text-primary-600 hover:text-primary-900 font-medium">Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
