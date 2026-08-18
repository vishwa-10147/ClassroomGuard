import React, { useState } from 'react';
import { Camera, Plus, LayoutGrid, List, Search, MoreVertical, Edit, Trash, Settings, ShieldAlert } from 'lucide-react';
import { mockCameras } from '@/mocks/cameras';
import { cn } from '@/utils/cn';

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: any = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>{children}</span>;
};

export default function CamerasPage() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCameras = mockCameras.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cameras</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all connected camera feeds.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Add Camera
        </button>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search cameras..." 
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-md">
          <button 
            className={cn("p-1.5 rounded-md", viewMode === 'table' ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700")}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            className={cn("p-1.5 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700")}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classroom</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spec</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCameras.map((camera) => (
                <tr key={camera.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{camera.name}</div>
                        <div className="text-xs font-mono text-gray-500">{camera.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{camera.classroomId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={camera.status === 'online' ? 'success' : 'danger'}>{camera.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{camera.resolution}</div>
                    <div className="text-xs text-gray-500">{camera.fps} FPS</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={camera.aiProcessing ? 'info' : 'default'}>{camera.aiProcessing ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCameras.length === 0 && (
            <div className="p-8 text-center text-gray-500">No cameras found matching your search.</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCameras.map((camera) => (
            <div key={camera.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="h-32 bg-gray-900 relative flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-600" />
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                   <Badge variant={camera.status === 'online' ? 'success' : 'danger'}>{camera.status}</Badge>
                   {camera.aiProcessing && <Badge variant="info">AI Active</Badge>}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{camera.name}</h3>
                <p className="text-xs font-mono text-gray-500 mb-3">{camera.id}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-auto">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="block text-xs text-gray-400">Classroom</span>
                    <span className="font-medium truncate block">{camera.classroomId}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="block text-xs text-gray-400">Specs</span>
                    <span className="font-medium">{camera.fps} FPS</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 p-3 bg-gray-50 flex justify-end space-x-2">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"><Settings className="w-4 h-4" /></button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Trash className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
