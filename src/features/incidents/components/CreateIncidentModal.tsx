import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiErrorMessage } from '@/services/api/client';
import { classroomService } from '@/services/api/classroomService';
import { incidentService, type IncidentCreateInput } from '@/services/api/incidentService';
import { SEVERITY_LEVELS } from '@/utils/constants';
import type { Classroom } from '@/types/classroom.types';
import type { Incident, IncidentAssignee } from '@/types/incident.types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
  /** Prefill when escalating an alert */
  initial?: Partial<IncidentCreateInput>;
}

const textareaClass =
  'w-full rounded-md border border-cg-border-default bg-cg-bg-surface p-3 text-sm text-cg-text-primary ' +
  'placeholder:text-cg-text-tertiary focus:border-cg-border-focus focus:outline-none focus:ring-1 focus:ring-cg-border-focus';

export function CreateIncidentModal({ open, onClose, onCreated, initial }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Incident['severity']>('medium');
  const [classroomId, setClassroomId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [assignees, setAssignees] = useState<IncidentAssignee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setSeverity(initial?.severity ?? 'medium');
    setClassroomId(initial?.classroomId ?? '');
    setAssignedTo('');
    setError(null);
    classroomService.getAll().then(setClassrooms).catch(() => setClassrooms([]));
    incidentService.getAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, [open, initial]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const incident = await incidentService.create({
        ...initial,
        title: title.trim(),
        description: description.trim(),
        severity,
        classroomId: classroomId || undefined,
        assignedTo: assignedTo || undefined,
      });
      onCreated(incident);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.alertId ? 'Escalate alert to an incident' : 'New incident'}
      description="A formal record of what happened, who is handling it and what was decided."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!title.trim() || saving}>
            Create incident
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="incident-description" className="text-xs font-medium text-cg-text-secondary">
            What happened
          </label>
          <textarea
            id="incident-description"
            className={textareaClass}
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Student, seat, what was seen and what the invigilator did"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Incident['severity'])}
            options={SEVERITY_LEVELS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
          />
          <Select
            label="Assign to"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={[{ value: '', label: 'Unassigned' }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </div>
        {!initial?.alertId && (
          <Select
            label="Room"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            options={[{ value: '', label: 'Not tied to a room' }, ...classrooms.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        {error && (
          <p className="text-sm text-cg-status-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
