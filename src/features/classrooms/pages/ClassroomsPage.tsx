import { mockClassrooms } from '@/mocks/classrooms';
import { Building, MapPin, Users, Video } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: any = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
  };
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>{children}</span>;
};

export default function ClassroomsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classrooms</h1>
          <p className="text-sm text-gray-500 mt-1">Manage classrooms and monitor their status.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium">
          Add Classroom
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classroom</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockClassrooms.map((classroom) => (
              <tr key={classroom.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <Link to={`/classrooms/${classroom.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                        {classroom.name}
                      </Link>
                      <div className="text-xs text-gray-500">Cap: {classroom.totalSeats}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Building className="w-4 h-4 mr-1 text-gray-400" /> {classroom.building}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1 text-gray-400" /> Fl {classroom.floor}, Rm {classroom.roomNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Video className="w-4 h-4 mr-1 text-gray-500" /> {classroom.cameraId ? 1 : 0} Connected
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                     <div className="flex-1 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.random() * 80 + 10}%` }}></div>
                     </div>
                     <span className="text-xs text-gray-500 font-medium">~{Math.floor(Math.random() * classroom.totalSeats)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={classroom.activeDetections > 0 ? 'success' : 'default'}>
                    {classroom.activeDetections > 0 ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/classrooms/${classroom.id}`} className="text-primary-600 hover:text-primary-900">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
