import { SEVERITY_LEVELS } from '@/utils/constants';
import type { Incident } from '@/types/incident.types';

/** One step up the severity scale (critical stays critical). */
export function escalatedSeverity(severity: Incident['severity']): Incident['severity'] {
  const order = [...SEVERITY_LEVELS].reverse(); // info -> critical
  const index = order.indexOf(severity);
  return order[Math.min(order.length - 1, Math.max(index, 0) + 1)];
}
