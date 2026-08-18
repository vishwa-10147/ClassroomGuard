import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin, MessageSquare, Paperclip, Video } from 'lucide-react';

const Badge = ({ children, className }: any) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${className}`}>{children}</span>
);

export default function IncidentDetailPage() {
  const { id } = useParams();
  
  // Use mock for demo
  const incident = { 
    id: id || 'INC-2023-001', 
    title: 'Cheating suspected during Final Math Exam', 
    severity: 'high', 
    status: 'investigating', 
    classroom: 'Room 302', 
    assignee: 'Admin User', 
    created: '2023-10-25T10:30:00Z',
    description: 'Multiple alerts triggered for phone usage and suspicious head movements during the final exam period. Video evidence suggests student in seat D4 may have been using a device concealed under desk.',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/incidents" className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200">{incident.severity}</Badge>
            <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">{incident.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 font-mono mt-1">{incident.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{incident.description}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Paperclip className="w-5 h-5 mr-2 text-gray-500" /> Evidence
            </h2>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center border border-gray-200 relative group overflow-hidden">
                 <Video className="w-8 h-8 text-gray-400" />
                 <div className="absolute bottom-0 w-full bg-black/60 text-white text-xs p-1 text-center">Video Clip: Camera 1</div>
               </div>
               <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center border border-gray-200 relative group overflow-hidden">
                 <div className="w-full h-full bg-gray-300"></div>
                 <div className="absolute bottom-0 w-full bg-black/60 text-white text-xs p-1 text-center">Snapshot: Seat D4</div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-gray-500" /> Notes & Updates
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-900">System</span>
                  <span className="text-xs text-gray-500">Oct 25, 10:30 AM</span>
                </div>
                <p className="text-gray-700">Incident automatically created from escalated alert ALT-892.</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm border border-blue-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-900">Admin User</span>
                  <span className="text-xs text-gray-500">Oct 25, 11:15 AM</span>
                </div>
                <p className="text-gray-700">Reviewed the footage. Forwarding to academic integrity board for review.</p>
              </div>
            </div>

            <div>
              <textarea 
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 text-sm focus:ring-primary-500 focus:border-primary-500" 
                rows={3}
                placeholder="Add a note or update..."
              ></textarea>
              <div className="mt-2 flex justify-end">
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium">Add Note</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Details</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center text-gray-600"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> <span className="font-medium text-gray-900 ml-1">{incident.classroom}</span></li>
              <li className="flex items-center text-gray-600"><Calendar className="w-4 h-4 mr-2 text-gray-400" /> <span className="ml-1">{new Date(incident.created).toLocaleString()}</span></li>
              <li className="flex items-center text-gray-600"><User className="w-4 h-4 mr-2 text-gray-400" /> Assigned: <span className="font-medium text-gray-900 ml-1">{incident.assignee}</span></li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors text-sm border border-green-200">
                Mark as Resolved
              </button>
              <button className="w-full text-left px-3 py-2 rounded bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm border border-gray-200">
                Reassign
              </button>
              <button className="w-full text-left px-3 py-2 rounded bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors text-sm border border-red-200">
                Escalate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
