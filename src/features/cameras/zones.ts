import type { CameraZone } from '@/types/camera.types';

/** Next free seat label after the last one that ends in a number: A3 -> A4. */
export function nextSeatLabel(zones: CameraZone[]): string {
  const seats = zones.filter((z) => z.type === 'seat');
  const last = seats[seats.length - 1]?.label ?? '';
  const match = /^(.*?)(\d+)$/.exec(last);
  const taken = new Set(seats.map((z) => z.label.toLowerCase()));
  let candidate = match ? `${match[1]}${Number(match[2]) + 1}` : `S${seats.length + 1}`;
  let n = match ? Number(match[2]) + 1 : seats.length + 1;
  while (taken.has(candidate.toLowerCase())) {
    n += 1;
    candidate = match ? `${match[1]}${n}` : `S${n}`;
  }
  return candidate;
}

/** Problems that would make the API reject the zones, for showing before saving. */
export function zoneProblems(zones: CameraZone[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const z of zones) {
    if (z.type === 'seat') {
      const label = z.label.trim().toLowerCase();
      if (!label) problems.push('Every seat needs a label.');
      else if (seen.has(label)) problems.push(`Seat "${z.label}" is used twice.`);
      seen.add(label);
    }
  }
  return [...new Set(problems)];
}
