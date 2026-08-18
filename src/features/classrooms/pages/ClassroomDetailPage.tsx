import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Building, Video, AlertCircle, Smartphone } from 'lucide-react';
import { mockClassrooms } from '@/mocks/classrooms';
import { mockCameras } from '@/mocks/cameras';
import { cn } from '@/utils/cn';

const Card = ({ children, className }: any) => <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm p-4", className)}>{children}</div>;

export default function ClassroomDetailPage() {
  const { id } = useParams();
  
  // Use mock data for demonstration
  const classroom = mockClassrooms.find(c => c.id === id) || mockClassrooms[0];
  const cameras = mockCameras.filter(c => classroom.cameraId === c.id);

  // Generate a mock seat map 5 rows, 8 cols
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/classrooms" className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <Building className="w-4 h-4 mr-1" /> {classroom.building}, Floor {classroom.floor}, Room {classroom.roomNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-indigo-50 mr-4">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Capacity</p>
            <p className="text-2xl font-bold text-gray-900">{classroom.totalSeats}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-blue-50 mr-4">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cameras</p>
            <p className="text-2xl font-bold text-gray-900">{cameras.length}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-amber-50 mr-4">
            <Smartphone className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Phones</p>
            <p className="text-2xl font-bold text-gray-900">{Math.floor(Math.random() * 5)}</p>
          </div>
        </Card>
        <Card className="flex items-center p-4">
          <div className="p-3 rounded-lg bg-red-50 mr-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Alerts (Today)</p>
            <p className="text-2xl font-bold text-gray-900">{Math.floor(Math.random() * 10)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="bg-gray-900 aspect-video relative flex items-center justify-center">
               <Video className="w-16 h-16 text-gray-700" />
               <div className="absolute top-4 left-4">
                 <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">LIVE</span>
               </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Timeline</h3>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex border-l-2 border-indigo-200 pl-4 py-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Suspicious Activity Detected</p>
                    <p className="text-xs text-gray-500">Multiple phones detected in row C</p>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">10:{15 + i} AM</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seat Map Visualization</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="w-full bg-gray-300 h-8 rounded mb-8 flex items-center justify-center text-xs font-bold text-gray-600 tracking-widest">
                TEACHER DESK / BOARD
              </div>
              
              <div className="flex flex-col gap-3 items-center">
                {rows.map(row => (
                  <div key={row} className="flex gap-2">
                    <div className="w-6 flex items-center justify-center text-xs font-bold text-gray-400">{row}</div>
                    {cols.map(col => {
                      const isOccupied = Math.random() > 0.4;
                      const hasPhone = isOccupied && Math.random() > 0.8;
                      return (
                        <div 
                          key={`${row}${col}`}
                          className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center relative cursor-help transition-colors",
                            isOccupied ? "bg-indigo-100 border-indigo-300" : "bg-white border-gray-200 hover:border-gray-300"
                          )}
                          title={`Seat ${row}${col}${hasPhone ? ' - Phone Detected' : ''}`}
                        >
                          {hasPhone && <div className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-center gap-4 text-xs text-gray-600">
                <div className="flex items-center"><div className="w-3 h-3 bg-white border border-gray-200 rounded mr-1"></div> Empty</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded mr-1"></div> Occupied</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div> Phone</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
