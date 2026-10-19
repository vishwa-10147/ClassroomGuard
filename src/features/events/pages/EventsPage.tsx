import { useLiveRefresh } from '@/components/providers/RealTimeProvider';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/api/client';
import { AuthedImage } from '@/components/shared/AuthedImage';
import { eventService, type EventFilters } from '@/services/api/eventService';
import { recordingService } from '@/services/api/recordingService';
import type { DetectionEvent } from '@/types/event.types';
import { Smartphone, Clock, MapPin, Video, AlertTriangle, Loader2, Film, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SEVERITY_LEVELS } from '@/utils/constants';
import { evidenceFile, eventLabel, videoTime } from '@/utils/events';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchInput, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-cg-severity-critical-bg text-cg-severity-critical',
  high: 'bg-cg-severity-high-bg text-cg-severity-high',
  medium: 'bg-cg-severity-medium-bg text-cg-severity-medium',
  low: 'bg-cg-severity-low-bg text-cg-severity-low',
  info: 'bg-cg-severity-low-bg text-cg-severity-low',
};

const SeverityBadge = ({ severity }: { severity: string }) => (
  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium uppercase', SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info)}>
    {severity}
  </span>
);

const displayConf = (c: number) => (c > 1 ? c.toFixed(0) : (c * 100).toFixed(0));

export default function EventsPage() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { id: routeEventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(routeEventId ?? null);
  const [raising, setRaising] = useState(false);

  const recordingId = searchParams.get('recording') ?? '';
  const [recordingName, setRecordingName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState<'' | 'live' | 'recording'>('');
  const q = useDebouncedValue(search.trim());

  useEffect(() => {
    setRecordingName(null);
    if (recordingId) recordingService.getById(recordingId).then((r) => setRecordingName(r.name)).catch(() => undefined);
  }, [recordingId]);

  const raiseAlert = async (event: DetectionEvent) => {
    setRaising(true);
    try {
      await apiClient.post('/alerts', {
        title: `${eventLabel(event.type)} - ${event.classroomName ?? 'classroom'}`,
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

  const loadEvents = useCallback(() => {
    const filters: EventFilters = { pageSize: 100 };
    if (q) filters.q = q;
    if (severity) filters.severity = severity as EventFilters['severity'];
    if (recordingId) filters.recordingId = recordingId;
    else if (source) filters.source = source;
    eventService
      .getAll(filters)
      .then((data) => {
        setEvents(data);
        setSelectedEventId((current) => (current && data.some((e) => e.id === current) ? current : data[0]?.id ?? null));
      })
      .finally(() => setLoading(false));
  }, [q, severity, source, recordingId]);

  useEffect(loadEvents, [loadEvents]);
  useLiveRefresh(recordingId ? ['recording'] : ['detection'], loadEvents);

  // Follow /events/:id links, fetching the event if it is outside the current list
  useEffect(() => {
    if (!routeEventId || loading) return;
    setSelectedEventId(routeEventId);
    if (events.some((e) => e.id === routeEventId)) return;
    eventService
      .getById(routeEventId)
      .then((event) => setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]))
      .catch(() => setSelectedEventId(events[0]?.id ?? null));
  }, [routeEventId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectEvent = (id: string) => {
    setSelectedEventId(id);
    navigate({ pathname: `/events/${id}`, search: searchParams.toString() }, { replace: true });
  };

  const clearRecording = () => {
    searchParams.delete('recording');
    setSearchParams(searchParams, { replace: true });
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const filtered = Boolean(q || severity || source || recordingId);
  const selectedVideoTime =
    typeof selectedEvent?.metadata?.video_time_s === 'number' ? (selectedEvent.metadata.video_time_s as number) : null;

  return (
    <div className="h-full flex flex-col p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-cg-text-primary">Detection Events</h1>
        <p className="text-sm text-cg-text-secondary mt-0.5">
          Review and investigate AI detections from live cameras and uploaded recordings.
        </p>
      </div>

      {recordingId && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-cg-border-default bg-cg-brand-subtle px-3 py-2 text-sm text-cg-text-primary">
          <Film className="h-4 w-4 text-cg-brand" />
          Detections in recording <span className="font-medium">{recordingName ?? recordingId}</span>
          <button
            className="ml-auto rounded p-1 text-cg-text-secondary hover:bg-cg-bg-tertiary"
            onClick={clearRecording}
            aria-label="Show all detections"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Left Panel: List */}
        <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden">
          <div className="p-3 border-b border-cg-border-default bg-cg-bg-tertiary space-y-2">
            <SearchInput
              placeholder="Search type, seat, camera, room..."
              value={search}
              onSearch={setSearch}
              aria-label="Search events"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  aria-label="Severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  options={[{ value: '', label: 'Any severity' }, ...SEVERITY_LEVELS.map((s) => ({ value: s, label: s }))]}
                />
              </div>
              {!recordingId && (
                <div className="flex-1">
                  <Select
                    aria-label="Source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as typeof source)}
                    options={[
                      { value: '', label: 'All sources' },
                      { value: 'live', label: 'Live cameras' },
                      { value: 'recording', label: 'Recordings' },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-cg-brand animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 text-center text-sm text-cg-text-tertiary">
                {filtered ? 'No detections match.' : 'No detections yet.'}
                {filtered && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setSeverity('');
                        setSource('');
                        if (recordingId) clearRecording();
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEvent(event.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    selectedEventId === event.id
                      ? 'bg-cg-brand-subtle border-cg-brand ring-1 ring-cg-brand'
                      : 'bg-cg-bg-secondary border-cg-border-subtle hover:bg-cg-bg-tertiary hover:border-cg-border-default'
                  )}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {String(event.type).toLowerCase().includes('phone') ? (
                        <Smartphone className="w-4 h-4 shrink-0 text-cg-text-tertiary" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-cg-text-tertiary" />
                      )}
                      <span className="font-medium text-sm text-cg-text-primary truncate">{eventLabel(event.type)}</span>
                      {event.recordingId && <Film className="w-3.5 h-3.5 shrink-0 text-cg-text-tertiary" aria-label="From a recording" />}
                    </div>
                    <SeverityBadge severity={event.severity} />
                  </div>
                  <div className="text-xs text-cg-text-secondary flex items-center justify-between gap-2">
                    <span className="flex items-center truncate">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" /> {event.classroomName || event.classroomId}
                      {event.seatId && <> &bull; {event.seatId}</>}
                    </span>
                    <span className="flex items-center font-mono shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {typeof event.metadata?.video_time_s === 'number'
                        ? videoTime(event.metadata.video_time_s as number)
                        : new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Detail */}
        <div className="w-full md:w-3/5 lg:w-2/3 bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm overflow-hidden flex flex-col">
          {selectedEvent ? (
            <>
              <div className="p-4 border-b border-cg-border-default bg-cg-bg-tertiary flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-cg-text-primary flex items-center gap-2">
                    {eventLabel(selectedEvent.type)}
                    <SeverityBadge severity={selectedEvent.severity} />
                  </h2>
                  <p className="text-xs text-cg-text-tertiary font-mono mt-1 truncate">ID: {selectedEvent.id}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selectedEvent.recordingId ? (
                    <Link
                      to="/recordings"
                      className="px-3 py-1.5 text-sm font-medium text-cg-text-primary border border-cg-border-default rounded-md hover:bg-cg-bg-surface"
                    >
                      Open recordings
                    </Link>
                  ) : ['high', 'medium', 'critical'].includes(String(selectedEvent.severity).toLowerCase()) ? (
                    // Medium/high detections raise an alert automatically
                    <Link
                      to="/alerts"
                      className="px-3 py-1.5 text-sm font-medium text-cg-text-primary border border-cg-border-default rounded-md hover:bg-cg-bg-surface"
                    >
                      View alerts
                    </Link>
                  ) : (
                    <Button variant="danger" size="sm" onClick={() => raiseAlert(selectedEvent)} loading={raising}>
                      Raise alert
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-cg-bg-video rounded-lg aspect-video relative mb-6 flex items-center justify-center overflow-hidden border border-cg-border-default">
                  {evidenceFile(selectedEvent) ? (
                    <AuthedImage
                      src={`/api/v1/evidence/frames/${evidenceFile(selectedEvent)}`}
                      alt="Annotated evidence frame"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-cg-text-tertiary">
                      <Video className="w-12 h-12 mb-2" />
                      <span className="text-sm">No evidence frame for this detection</span>
                    </div>
                  )}
                </div>

                {typeof selectedEvent.metadata?.message === 'string' && (
                  <p className="mb-6 text-sm text-cg-text-secondary">{selectedEvent.metadata.message as string}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-cg-text-primary border-b border-cg-border-default pb-2 mb-3">Detection</h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">Type</dt><dd className="font-medium text-cg-text-primary">{eventLabel(selectedEvent.type)}</dd></div>
                      {selectedEvent.confidence != null && (
                        <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">Confidence</dt><dd className="font-medium text-cg-text-primary">{displayConf(selectedEvent.confidence)}%</dd></div>
                      )}
                      <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">{selectedEvent.recordingId ? 'Analysed' : 'Time'}</dt><dd className="font-medium text-cg-text-primary">{new Date(selectedEvent.timestamp).toLocaleString()}</dd></div>
                      {selectedVideoTime !== null && (
                        <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">In the recording</dt><dd className="font-mono text-cg-text-primary">{videoTime(selectedVideoTime)}</dd></div>
                      )}
                      <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">Tracker ID</dt><dd className="font-mono text-cg-text-primary">{selectedEvent.trackerId || 'N/A'}</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-cg-text-primary border-b border-cg-border-default pb-2 mb-3">Location</h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-cg-text-secondary">Classroom</dt>
                        <dd>
                          {selectedEvent.classroomId ? (
                            <Link to={`/classrooms/${selectedEvent.classroomId}`} className="font-medium text-cg-brand hover:underline">
                              {selectedEvent.classroomName || selectedEvent.classroomId}
                            </Link>
                          ) : (
                            'N/A'
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3"><dt className="text-cg-text-secondary">Camera</dt><dd className="font-medium text-cg-text-primary">{selectedEvent.cameraName || selectedEvent.cameraId}</dd></div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-cg-text-secondary">Seat</dt>
                        <dd className="font-medium text-cg-text-primary">
                          {selectedEvent.seatId || <span className="text-cg-text-tertiary font-normal">No seat zone here</span>}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-cg-text-tertiary text-sm">
              {loading ? '' : 'Select an event to view details'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
