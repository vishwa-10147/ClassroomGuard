import type { DetectionEvent } from '@/types/event.types';

/** File name of the annotated evidence frame the AI saved for a detection, if any. */
export function evidenceFile(event: Pick<DetectionEvent, 'metadata'>): string | null {
  const path = event.metadata?.evidence_path;
  return typeof path === 'string' && path ? path.split(/[\\/]/).pop() ?? null : null;
}

/** "PHONE_USAGE" -> "Phone usage" */
export function eventLabel(type: string): string {
  const words = String(type).replace(/_/g, ' ').toLowerCase().trim();
  return words ? words[0].toUpperCase() + words.slice(1) : '';
}

/** Seconds into a recording as m:ss or h:mm:ss. */
export function videoTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}
