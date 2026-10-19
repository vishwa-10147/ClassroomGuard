import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin, MessageSquare, Paperclip, Video, Loader2, Camera } from 'lucide-react';
import { incidentService, type IncidentUpdateInput } from '@/services/api/incidentService';
import { eventService } from '@/services/api/eventService';
import { apiErrorMessage } from '@/services/api/client';
import type { Incident, IncidentAssignee } from '@/types/incident.types';
import type { DetectionEvent } from '@/types/event.types';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { hasPermission } from '@/utils/permissions';
import { PERMISSIONS } from '@/utils/constants';
import { escalatedSeverity } from '@/features/incidents/severity';
import { evidenceFile, eventLabel } from '@/utils/events';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { AuthedImage } from '@/components/shared/AuthedImage';
import { IncidentBadge } from '@/features/incidents/components/IncidentBadge';

const card = 'bg-cg-bg-secondary rounded-lg border border-cg-border-default shadow-sm';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const canManage = hasPermission(user?.role || 'viewer', PERMISSIONS.MANAGE_INCIDENTS);
  const addToast = useToastStore((s) => s.addToast);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [assignees, setAssignees] = useState<IncidentAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    incidentService
      .getById(id)
      .then(setIncident)
      .catch(() => setIncident(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (canManage) incidentService.getAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, [canManage]);

  // The detections attached to the incident are its evidence
  const eventIdsKey = (incident?.eventIds ?? []).join(',');
  useEffect(() => {
    const ids = eventIdsKey ? eventIdsKey.split(',') : [];
    Promise.all(ids.map((eid) => eventService.getById(eid).catch(() => null))).then((found) =>
      setEvents(found.filter((e): e is DetectionEvent => e !== null))
    );
  }, [eventIdsKey]);

  const run = useCallback(
    async (key: string, action: () => Promise<Incident>) => {
      setBusy(key);
      try {
        setIncident(await action());
        return true;
      } catch (e) {
        const message = apiErrorMessage(e);
        if (message) addToast(message, 'error', 4000);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [addToast]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-cg-brand animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-4 lg:p-6 text-center py-24">
        <p className="text-cg-text-secondary">Incident not found.</p>
        <Link to="/incidents" className="mt-2 inline-block text-sm text-cg-brand hover:underline">
          Back to incidents
        </Link>
      </div>
    );
  }

  const update = (key: string, data: IncidentUpdateInput) => run(key, () => incidentService.update(incident.id, data));

  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    if (await run('note', () => incidentService.addNote(incident.id, text))) setNote('');
  };

  const escalate = async () => {
    const next = escalatedSeverity(incident.severity);
    const ok = await update('escalate', { severity: next, status: 'investigating' });
    if (ok) await run('escalate', () => incidentService.addNote(incident.id, `Escalated to ${next} severity.`));
  };

  const closed = incident.status === 'resolved' || incident.status === 'dismissed';

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 lg:p-6">
      <div className="flex items-start gap-4">
        <Link
          to="/incidents"
          className="p-2 rounded-full hover:bg-cg-bg-tertiary text-cg-text-secondary"
          aria-label="Back to incidents"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-cg-text-primary">{incident.title}</h1>
            <IncidentBadge value={incident.severity} />
            <IncidentBadge value={incident.status} />
          </div>
          <p className="text-xs text-cg-text-tertiary font-mono mt-1">{incident.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className={`${card} p-6`}>
            <h2 className="text-base font-semibold text-cg-text-primary mb-3">Description</h2>
            <p className="text-cg-text-secondary whitespace-pre-wrap text-sm leading-relaxed">
              {incident.description || 'No description.'}
            </p>
          </div>

          <div className={`${card} p-6`}>
            <h2 className="text-base font-semibold text-cg-text-primary mb-4 flex items-center">
              <Paperclip className="w-4 h-4 mr-2 text-cg-text-tertiary" /> Evidence
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-cg-text-tertiary">
                No detections are attached. Incidents escalated from an alert include its detection and evidence frame.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.map((event) => {
                  const file = evidenceFile(event);
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block rounded-lg border border-cg-border-default overflow-hidden hover:border-cg-border-strong"
                    >
                      <div className="relative aspect-video bg-cg-bg-tertiary flex items-center justify-center">
                        {file ? (
                          <AuthedImage
                            src={`/api/v1/evidence/frames/${file}`}
                            alt={`Evidence: ${eventLabel(event.type)}`}
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        ) : (
                          <Video className="w-8 h-8 text-cg-text-tertiary" />
                        )}
                      </div>
                      <div className="p-2 text-xs text-cg-text-secondary">
                        <span className="font-medium text-cg-text-primary">{eventLabel(event.type)}</span>
                        {event.seatId && <> &bull; seat {event.seatId}</>}
                        {' '}&bull; {event.cameraName ?? 'camera'} &bull; {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`${card} p-6`}>
            <h2 className="text-base font-semibold text-cg-text-primary mb-4 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-cg-text-tertiary" /> Notes & Updates
            </h2>

            <div className="space-y-3 mb-6">
              {incident.notes && incident.notes.length > 0 ? (
                incident.notes.map((n) => (
                  <div key={n.id} className="bg-cg-bg-tertiary rounded-lg p-4 text-sm border border-cg-border-subtle">
                    <div className="flex justify-between items-start mb-1 gap-3">
                      <span className="font-semibold text-cg-text-primary">{n.author}</span>
                      <span className="text-xs text-cg-text-tertiary">{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-cg-text-secondary whitespace-pre-wrap">{n.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-cg-text-tertiary italic">No notes yet.</p>
              )}
            </div>

            {canManage && (
              <div>
                <label htmlFor="incident-note" className="sr-only">
                  Add a note
                </label>
                <textarea
                  id="incident-note"
                  className="w-full rounded-md border border-cg-border-default bg-cg-bg-surface p-3 text-sm text-cg-text-primary placeholder:text-cg-text-tertiary focus:border-cg-border-focus focus:outline-none focus:ring-1 focus:ring-cg-border-focus"
                  rows={3}
                  maxLength={2000}
                  placeholder="Add a note or update..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote();
                  }}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={addNote} loading={busy === 'note'} disabled={!note.trim() || busy !== null}>
                    Add Note
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${card} p-4`}>
            <h3 className="font-semibold text-cg-text-primary border-b border-cg-border-default pb-2 mb-3">Details</h3>
            <ul className="space-y-3 text-sm text-cg-text-secondary">
              <li className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-cg-text-tertiary" />
                <span className="font-medium text-cg-text-primary">{incident.classroomName || 'No room'}</span>
              </li>
              {incident.cameraName && (
                <li className="flex items-center">
                  <Camera className="w-4 h-4 mr-2 text-cg-text-tertiary" /> {incident.cameraName}
                </li>
              )}
              <li className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-cg-text-tertiary" /> {new Date(incident.createdAt).toLocaleString()}
              </li>
              <li className="flex items-center">
                <User className="w-4 h-4 mr-2 text-cg-text-tertiary" /> Assigned:
                <span className="font-medium text-cg-text-primary ml-1">{incident.assigneeName || 'Unassigned'}</span>
              </li>
              {incident.resolvedAt && (
                <li className="text-xs">Closed {new Date(incident.resolvedAt).toLocaleString()}</li>
              )}
            </ul>
          </div>

          {canManage && (
            <div className={`${card} p-4`}>
              <h3 className="font-semibold text-cg-text-primary border-b border-cg-border-default pb-2 mb-3">Actions</h3>
              <div className="space-y-3">
                {closed ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={busy === 'reopen'}
                    disabled={busy !== null}
                    onClick={() => update('reopen', { status: 'open' })}
                  >
                    Reopen
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      loading={busy === 'resolve'}
                      disabled={busy !== null}
                      onClick={() => update('resolve', { status: 'resolved' })}
                    >
                      Mark as Resolved
                    </Button>
                    {incident.status === 'open' && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        loading={busy === 'investigate'}
                        disabled={busy !== null}
                        onClick={() => update('investigate', { status: 'investigating' })}
                      >
                        Start investigating
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      className="w-full"
                      loading={busy === 'escalate'}
                      disabled={busy !== null || incident.severity === 'critical'}
                      title={incident.severity === 'critical' ? 'Already at the highest severity' : undefined}
                      onClick={escalate}
                    >
                      Escalate
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      loading={busy === 'dismiss'}
                      disabled={busy !== null}
                      onClick={() => update('dismiss', { status: 'dismissed' })}
                    >
                      Dismiss (no violation)
                    </Button>
                  </>
                )}
                <Select
                  label="Reassign"
                  value={incident.assignedTo ?? ''}
                  disabled={busy !== null}
                  onChange={(e) => update('assign', { assignedTo: e.target.value || null })}
                  options={[{ value: '', label: 'Unassigned' }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
