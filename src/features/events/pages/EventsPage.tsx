import { useLiveRefresh } from '@/components/providers/RealTimeProvider';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/services/api/client';
import { AuthedImage } from '@/components/shared/AuthedImage';
import { eventService } from '@/services/api/eventService';
import type { DetectionEvent } from '@/types/event.types';
import { Filter, Search, Smartphone, Clock, MapPin, Video, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: any = {
    default: 'bg-gray-100 text-gray-800',
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-blue-100 text-blue-800',
    critical: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase", variants[variant], className)}>{children}</span>;
};

const displayConf = (c: number) => c > 1 ? c.toFixed(0) : (c * 100).toFixed(0);

export default function EventsPage() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { id: routeEventId } = useParams();
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(routeEventId ?? null);
  const [raising, setRaising] = useState(false);

  /** Evidence frame saved by the AI engine for this detection (file name only). */
  const evidenceFile = (event: DetectionEvent): string | null => {
    const path = event.metadata?.evidence_path;
    return typeof path === 'string' && path ? path.split(/[\\/]/).pop() ?? null : null;
  };

  const raiseAlert = async (event: DetectionEvent) => {
    setRaising(true);
    try {
      await apiClient.post('/alerts', {
        title: `${String(event.type).replace(/_/g, ' ').toLowerCase()} - ${event.classroomName ?? 'classroom'}`,
        description: (event.metadata?.message as string) || 'Raised from a detection event',
        severity: event.severity,
        classroomId: event.classroomId,
        cameraId: event.cameraId,
        eventId: event.id,
      });
    } finally {
      setRaising(false);
    }
  };

  const loadEvents = () => {
    eventService.getRecent(50)
      .then((data) => {
        setEvents(data);
        setSelectedEventId((current) => current ?? data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadEvents, []);
  useLiveRefresh(['detection'], loadEvents);

  // Follow /events/:id links, fetching the event if it is outside the recent window
  useEffect(() => {
    if (!routeEventId || loading) return;
    setSelectedEventId(routeEventId);
    if (events.some((e) => e.id === routeEventId)) return;
    eventService.getById(routeEventId)
      .then((event) => setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]))
      .catch(() => setSelectedEventId(events[0]?.id ?? null));
  }, [routeEventId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectEvent = (id: string) => {
    setSelectedEventId(id);
    navigate(`/events/${id}`, { replace: true });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Detection Events</h1>
        <p className="text-sm text-gray-500 mt-1">Review and investigate AI detection events across all cameras.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Left Panel: List */}
        <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
              <input type="text" placeholder="Search events..." className="w-full pl-8 pr-3 py-1.5 text-sm border-gray-300 rounded-md" />
            </div>
            <button className="p-1.5 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {events.map(event => (
              <div 
                key={event.id}
                onClick={() => selectEvent(event.id)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedEventId === event.id 
                    ? "bg-primary-50 border-primary-200 ring-1 ring-primary-500" 
                    : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {String(event.type).toLowerCase().includes('phone') ? <Smartphone className="w-4 h-4 text-gray-500" /> : <AlertTriangle className="w-4 h-4 text-gray-500" />}
                    <span className="font-medium text-sm text-gray-900">{event.type}</span>
                  </div>
                  <Badge variant={event.severity}>{event.severity}</Badge>
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {event.classroomName || event.classroomId}</span>
                  <span className="flex items-center font-mono"><Clock className="w-3 h-3 mr-1" /> {new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Detail */}
        <div className="w-full md:w-3/5 lg:w-2/3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {selectedEvent ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Event Details
                    <Badge variant={selectedEvent.severity}>{selectedEvent.severity}</Badge>
                  </h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedEvent.id}</p>
                </div>
                <div className="flex gap-2">
                  {['high', 'medium', 'critical'].includes(String(selectedEvent.severity).toLowerCase()) ? (
                    // Medium/high detections raise an alert automatically
                    <Link
                      to="/alerts"
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      View alerts
                    </Link>
                  ) : (
                    <button
                      onClick={() => raiseAlert(selectedEvent)}
                      disabled={raising}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Raise alert
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-900 rounded-lg aspect-video relative mb-6 flex items-center justify-center overflow-hidden border border-gray-300">
                  {evidenceFile(selectedEvent) ? (
                    <AuthedImage
                      src={`/api/v1/evidence/frames/${evidenceFile(selectedEvent)}`}
                      alt="Annotated evidence frame"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Video className="w-12 h-12 mb-2" />
                      <span className="text-sm">No evidence frame for this detection</span>
                    </div>
                  )}
                </div>

                {typeof selectedEvent.metadata?.message === 'string' && (
                  <p className="mb-6 text-sm text-gray-700">{selectedEvent.metadata.message as string}</p>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Metadata</h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd className="font-medium text-gray-900">{selectedEvent.type}</dd></div>
                      {selectedEvent.confidence !== undefined && (
                        <div className="flex justify-between"><dt className="text-gray-500">Confidence</dt><dd className="font-medium text-gray-900">{displayConf(selectedEvent.confidence)}%</dd></div>
                      )}
                      <div className="flex justify-between"><dt className="text-gray-500">Timestamp</dt><dd className="font-medium text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Tracker ID</dt><dd className="font-mono text-gray-900">{selectedEvent.trackerId || 'N/A'}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Location</h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Classroom</dt><dd className="font-medium text-primary-600 cursor-pointer hover:underline">{selectedEvent.classroomName || selectedEvent.classroomId}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Camera</dt><dd className="font-medium text-gray-900">{selectedEvent.cameraName || selectedEvent.cameraId}</dd></div>
                      {selectedEvent.seatId && (
                        <div className="flex justify-between"><dt className="text-gray-500">Seat Grid</dt><dd className="font-medium text-gray-900">{selectedEvent.seatId}</dd></div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an event to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
