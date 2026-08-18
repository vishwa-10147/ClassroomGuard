import React, { useState } from 'react';
import { Camera, LayoutGrid, Maximize, Play, Settings2, Video, AlertTriangle, Users, Smartphone, Clock, Filter, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import { mockCameras } from '@/mocks/cameras';
import { mockEvents } from '@/mocks/events';
import { mockClassrooms } from '@/mocks/classrooms';

// Simple fallback components if complex UI components are not fully exported
const Card = ({ children, className }: any) => <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", className)}>{children}</div>;
const Badge = ({ children, className, variant = 'default' }: any) => {
  const variants: any = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>{children}</span>;
};
const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: any) => {
  const variants: any = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  const sizes: any = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    icon: 'p-2',
  };
  return <button className={cn("inline-flex items-center justify-center font-medium rounded-md transition-colors", variants[variant], sizes[size], className)} {...props}>{children}</button>;
};

export default function LiveMonitoringPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(mockCameras[0]?.id || null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  
  const selectedCamera = mockCameras.find(c => c.id === selectedCameraId) || mockCameras[0];
  
  const filteredCameras = selectedClassroomId === 'all' 
    ? mockCameras 
    : mockCameras.filter(c => c.classroomId === selectedClassroomId);

  const activeEvents = mockEvents.filter(e => e.cameraId === selectedCamera?.id).slice(0, 5);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select 
              className="border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
            >
              <option value="all">All Classrooms</option>
              {mockClassrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <select className="border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500">
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-md">
          <Button 
            variant={viewMode === 'grid' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === 'single' ? 'primary' : 'ghost'} 
            size="icon" 
            onClick={() => setViewMode('single')}
            title="Single View"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pb-4">
          {filteredCameras.map((camera) => (
            <Card key={camera.id} className="overflow-hidden flex flex-col h-64 hover:border-primary-500 transition-colors cursor-pointer" onClick={() => { setSelectedCameraId(camera.id); setViewMode('single'); }}>
              <div className="relative flex-1 bg-gray-900 group">
                {camera.status === 'online' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-700 opacity-50" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Offline
                  </div>
                )}
                
                <div className="absolute top-2 left-2 flex space-x-2">
                  <Badge variant={camera.status === 'online' ? 'success' : 'danger'} className="uppercase">
                    {camera.status}
                  </Badge>
                  {camera.aiProcessing && (
                    <Badge variant="info" className="flex items-center space-x-1">
                      <Activity className="w-3 h-3 mr-1" /> AI Active
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{camera.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Camera className="w-3 h-3 mr-1" /> {camera.fps} FPS
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-900">{camera.activeDetections || 0} Detections</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Left: Video Area */}
          <div className="lg:w-2/3 xl:w-3/4 flex flex-col space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden flex-1 flex items-center justify-center border border-gray-800 shadow-lg">
               {selectedCamera?.status === 'online' ? (
                  <div className="flex flex-col items-center">
                     <Play className="w-16 h-16 text-gray-600 opacity-30" />
                     <p className="text-gray-500 mt-4 font-mono text-sm">LIVE STREAM - {selectedCamera.name}</p>
                  </div>
               ) : (
                 <p className="text-gray-500">Camera Offline</p>
               )}
               
               {/* Video Overlay Info */}
               <div className="absolute top-4 left-4 flex space-x-2">
                  <Badge variant={selectedCamera?.status === 'online' ? 'success' : 'danger'} className="uppercase">
                    {selectedCamera?.status}
                  </Badge>
                  <Badge variant="default" className="font-mono">{selectedCamera?.fps} FPS</Badge>
                  <Badge variant="default" className="font-mono">{selectedCamera?.resolution}</Badge>
               </div>
            </div>
            
            {/* Timeline Strip */}
            <Card className="p-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-500" /> Recent Events Timeline
              </h3>
              <div className="flex items-center h-12 bg-gray-50 rounded border border-gray-200 relative px-2">
                {/* Mock timeline events */}
                <div className="absolute left-[10%] h-full w-0.5 bg-red-400"></div>
                <div className="absolute left-[30%] h-full w-0.5 bg-amber-400"></div>
                <div className="absolute left-[75%] h-full w-0.5 bg-amber-400"></div>
                
                <div className="w-full flex justify-between text-xs text-gray-400 px-1 absolute bottom-0">
                  <span>-1h</span>
                  <span>-45m</span>
                  <span>-30m</span>
                  <span>-15m</span>
                  <span>Now</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Info Panel */}
          <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4 overflow-y-auto pb-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center justify-between">
                Camera Info
                <Button variant="ghost" size="icon"><Settings2 className="w-4 h-4" /></Button>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{selectedCamera?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-mono text-gray-700">{selectedCamera?.id}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={selectedCamera?.status === 'online' ? 'success' : 'danger'}>{selectedCamera?.status}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">AI Engine</span><Badge variant={selectedCamera?.aiProcessing ? 'info' : 'default'}>{selectedCamera?.aiProcessing ? 'Active' : 'Inactive'}</Badge></div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Live Detections</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col items-center">
                  <Users className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-2xl font-bold text-blue-700">{Math.floor(Math.random() * 30) + 10}</span>
                  <span className="text-xs text-blue-600 font-medium">People</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                  <Smartphone className="w-5 h-5 text-amber-500 mb-1" />
                  <span className="text-2xl font-bold text-amber-700">{Math.floor(Math.random() * 5)}</span>
                  <span className="text-xs text-amber-600 font-medium">Phones</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> Recent Alerts
              </h3>
              <div className="space-y-3">
                {activeEvents.length > 0 ? activeEvents.map(event => (
                  <div key={event.id} className="p-2.5 border border-gray-100 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-gray-900">{event.type}</span>
                      <span className="text-xs text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={event.severity === 'high' ? 'danger' : event.severity === 'medium' ? 'warning' : 'info'}>
                        {event.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">Conf: {(event.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 italic text-center py-4">No recent events for this camera.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
