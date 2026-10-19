import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ImagePlus, Trash } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AuthedImage } from '@/components/shared/AuthedImage';
import { cameraService } from '@/services/api/cameraService';
import { apiErrorMessage } from '@/services/api/client';
import type { Camera, CameraZone } from '@/types/camera.types';
import { nextSeatLabel, zoneProblems } from '@/features/cameras/zones';

interface Props {
  camera: Camera | null;
  onClose: () => void;
  onSaved: (camera: Camera) => void;
}

type Draft = { x0: number; y0: number; x1: number; y1: number };

const MIN_SIZE = 0.01; // ignore clicks that are not a drag
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Draw seat and ignore zones on a camera's view.
 * Seats label every detection with the seat; ignore zones (the invigilator's desk, aisles)
 * stop people there being flagged at all.
 */
export function ZoneEditor({ camera, onClose, onSaved }: Props) {
  const [zones, setZones] = useState<CameraZone[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawType, setDrawType] = useState<CameraZone['type']>('seat');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZones(camera?.zones ?? []);
    setSelected(null);
    setDraft(null);
    setError(null);
    setLocalImage(null);
  }, [camera]);

  useEffect(() => () => {
    if (localImage) URL.revokeObjectURL(localImage);
  }, [localImage]);

  if (!camera) return null;

  const point = (e: ReactPointerEvent) => {
    const rect = surface.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== surface.current) return; // clicks on a zone select it instead
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    setSelected(null);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    const p = point(e);
    setDraft({ ...draft, x1: p.x, y1: p.y });
  };

  const onPointerUp = () => {
    if (!draft) return;
    const x = Math.min(draft.x0, draft.x1);
    const y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0);
    const h = Math.abs(draft.y1 - draft.y0);
    setDraft(null);
    if (w < MIN_SIZE || h < MIN_SIZE) return;
    const zone: CameraZone = {
      id: crypto.randomUUID().slice(0, 8),
      type: drawType,
      label: drawType === 'seat' ? nextSeatLabel(zones) : 'Invigilator area',
      x: round(x),
      y: round(y),
      w: round(Math.min(w, 1 - x)),
      h: round(Math.min(h, 1 - y)),
    };
    setZones((list) => [...list, zone]);
    setSelected(zone.id);
  };

  const change = (id: string, patch: Partial<CameraZone>) =>
    setZones((list) => list.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const remove = (id: string) => {
    setZones((list) => list.filter((z) => z.id !== id));
    if (selected === id) setSelected(null);
  };

  const problems = zoneProblems(zones);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await cameraService.update(camera.id, {
        zones: zones.map((z) => ({ ...z, label: z.label.trim() })),
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const seats = zones.filter((z) => z.type === 'seat').length;

  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      title={`Zones: ${camera.name}`}
      description="Drag on the picture to draw. Seats name the seat in every detection; ignore zones (the invigilator's desk, aisles) are never flagged."
      footer={
        <>
          {problems[0] && <span className="mr-auto text-sm text-cg-status-error">{problems[0]}</span>}
          {error && !problems[0] && <span className="mr-auto text-sm text-cg-status-error">{error}</span>}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={saving || problems.length > 0}>
            Save zones
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-cg-text-secondary">Draw:</span>
            {(['seat', 'ignore'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDrawType(t)}
                aria-pressed={drawType === t}
                className={cn(
                  'rounded-md border px-3 py-1 text-xs font-medium',
                  drawType === t
                    ? t === 'seat'
                      ? 'border-cg-brand bg-cg-brand-subtle text-cg-brand'
                      : 'border-cg-status-warning bg-cg-status-warning/10 text-cg-status-warning'
                    : 'border-cg-border-default text-cg-text-secondary hover:bg-cg-bg-tertiary'
                )}
              >
                {t === 'seat' ? 'Seat' : 'Ignore zone'}
              </button>
            ))}
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-cg-border-default px-3 py-1 text-xs text-cg-text-secondary hover:bg-cg-bg-tertiary">
              <ImagePlus className="h-3.5 w-3.5" />
              Use a still image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setLocalImage(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-cg-border-default bg-cg-bg-video select-none">
            {/* The picture is stretched to the box so zone fractions match the camera image exactly */}
            {localImage ? (
              <img src={localImage} alt="" className="absolute inset-0 h-full w-full object-fill" />
            ) : camera.streamUrl ? (
              <AuthedImage src={`/cameras/${camera.id}/snapshot`} alt="" className="absolute inset-0 h-full w-full object-fill" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-cg-text-tertiary">
                This camera has no stream URL, so there is no live picture. Use a still image from the camera
                (for example a screenshot of a recording) to draw on.
              </div>
            )}

            <div
              ref={surface}
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDraft(null)}
              role="application"
              aria-label="Zone drawing area"
            >
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelected(z.id)}
                  className={cn(
                    'absolute border-2 text-left',
                    z.type === 'seat' ? 'border-cg-brand bg-cg-brand/15' : 'border-cg-status-warning bg-cg-status-warning/15',
                    selected === z.id && 'ring-2 ring-white'
                  )}
                  style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}
                  title={z.label}
                >
                  <span className="absolute left-0 top-0 max-w-full truncate bg-black/60 px-1 text-[10px] font-medium text-white">
                    {z.label || '?'}
                  </span>
                </button>
              ))}
              {draft && (
                <div
                  className={cn('absolute border-2 border-dashed', drawType === 'seat' ? 'border-cg-brand' : 'border-cg-status-warning')}
                  style={{
                    left: `${Math.min(draft.x0, draft.x1) * 100}%`,
                    top: `${Math.min(draft.y0, draft.y1) * 100}%`,
                    width: `${Math.abs(draft.x1 - draft.x0) * 100}%`,
                    height: `${Math.abs(draft.y1 - draft.y0) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-cg-text-tertiary">
            Draw each seat around where the student sits and their desk. Where zones overlap, the smaller one wins.
          </p>
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <h3 className="mb-2 text-sm font-semibold text-cg-text-primary">
            {seats} {seats === 1 ? 'seat' : 'seats'}, {zones.length - seats} ignore {zones.length - seats === 1 ? 'zone' : 'zones'}
          </h3>
          {zones.length === 0 ? (
            <p className="text-sm text-cg-text-tertiary">No zones yet. Detections are reported without a seat.</p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {zones.map((z) => (
                <li
                  key={z.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-2',
                    selected === z.id ? 'border-cg-brand' : 'border-cg-border-default'
                  )}
                  onClick={() => setSelected(z.id)}
                >
                  <select
                    aria-label="Zone type"
                    value={z.type}
                    onChange={(e) => change(z.id, { type: e.target.value as CameraZone['type'] })}
                    className="h-8 rounded border border-cg-border-default bg-cg-bg-surface px-1 text-xs text-cg-text-primary"
                  >
                    <option value="seat">Seat</option>
                    <option value="ignore">Ignore</option>
                  </select>
                  <input
                    aria-label="Label"
                    value={z.label}
                    maxLength={50}
                    onChange={(e) => change(z.id, { label: e.target.value })}
                    placeholder={z.type === 'seat' ? 'Seat, e.g. B4' : 'Note'}
                    className="h-8 min-w-0 flex-1 rounded border border-cg-border-default bg-cg-bg-surface px-2 text-sm text-cg-text-primary"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(z.id);
                    }}
                    className="rounded p-1.5 text-cg-text-tertiary hover:bg-cg-bg-tertiary hover:text-cg-status-error"
                    aria-label={`Remove ${z.label || 'zone'}`}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
