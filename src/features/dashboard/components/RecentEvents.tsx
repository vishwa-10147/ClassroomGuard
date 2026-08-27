import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui';
import { eventService } from '@/services/api/eventService';
import type { DetectionEvent } from '@/types/event.types';
import { formatRelativeTime, formatTimestamp } from '@/utils/formatters';
import { Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const eventTypeLabels: Record<string, string> = {
  PHONE_USAGE_DETECTED: 'Phone Usage Detected',
  PERSON_ENTERED: 'Person Entered',
  PERSON_EXITED: 'Person Exited',
  UNAUTHORIZED_ACCESS: 'Unauthorized Access',
  CAMERA_OFFLINE: 'Camera Offline',
  CAMERA_ONLINE: 'Camera Online',
};

export function RecentEvents() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventService.getRecent(6)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-cg-text-primary">
          Recent Events
        </h3>
        <Link
          to="/events"
          className="text-xs font-medium text-cg-brand hover:text-cg-brand-hover transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="card divide-y divide-cg-border-subtle">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-cg-text-tertiary animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="h-8 w-8 text-cg-text-tertiary/30 mb-2" />
            <p className="text-sm text-cg-text-secondary">No recent events</p>
          </div>
        ) : (
          events.map((event) => (
            <Link
              to={`/events/${event.id}`}
              key={event.id}
              className={cn(
                'flex items-start gap-3 p-3 transition-colors duration-fast',
                'hover:bg-cg-bg-tertiary/50',
                'border-l-2',
                {
                  'border-l-cg-severity-critical': event.severity === 'critical',
                  'border-l-cg-severity-high': event.severity === 'high',
                  'border-l-cg-severity-medium': event.severity === 'medium',
                  'border-l-cg-severity-low': event.severity === 'low',
                  'border-l-cg-severity-info': event.severity === 'info',
                }
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-cg-text-primary truncate">
                    {eventTypeLabels[event.type] || event.type}
                  </span>
                  <Badge variant="severity" severity={event.severity}>
                    {event.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-2xs text-cg-text-tertiary">
                  <span>{event.classroomName}</span>
                  <span>·</span>
                  <span>{event.cameraName}</span>
                  {event.seatId && (
                    <>
                      <span>·</span>
                      <span>Seat {event.seatId}</span>
                    </>
                  )}
                </div>
                {event.confidence && (
                  <div className="mt-1 text-2xs text-cg-text-tertiary">
                    <span className="tabular-nums">
                      {event.confidence.toFixed(1)}%
                    </span>
                    {event.trackerId && (
                      <span className="ml-2 font-mono">
                        Tracker #{event.trackerId}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-2xs text-cg-text-tertiary tabular-nums">
                  {formatTimestamp(event.timestamp)}
                </p>
                <p className="text-2xs text-cg-text-tertiary">
                  {formatRelativeTime(event.timestamp)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
