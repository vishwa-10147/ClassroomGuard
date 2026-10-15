import { useMemo } from 'react';
import type { Bench, ClassroomSeatmap } from '@/types/classroom.types';

export interface UseClassroomSeatmapOptions {
  classroomId: string;
  totalSeats: number;
  seatsPerBench?: number;
}

/**
 * Bench / seat layout for a classroom.
 *
 * Seats carry no student names or detections: the system does not know which student sits
 * where (that needs a seating plan and per-camera seat calibration). Detections are shown
 * per student track on the Events and Evidence pages instead.
 */
export function useClassroomSeatmap({
  classroomId,
  totalSeats,
  seatsPerBench = 8,
}: UseClassroomSeatmapOptions): ClassroomSeatmap {
  return useMemo(() => {
    const total = Math.max(totalSeats, 1);
    const perBench = Math.max(seatsPerBench, 1);
    const benchCount = Math.ceil(total / perBench);

    const benches: Bench[] = [];
    let seatIndex = 0;
    for (let b = 0; b < benchCount; b += 1) {
      const rowLabel = String.fromCharCode(65 + b);
      const seats: Bench['seats'] = [];
      for (let i = 0; i < perBench; i += 1) {
        if (seatIndex >= total) break;
        seats.push({
          id: `${classroomId}-${rowLabel}-${i + 1}`,
          label: `${rowLabel}${i + 1}`,
          student: null,
          phoneDetected: false,
        });
        seatIndex += 1;
      }
      benches.push({ id: `bench-${classroomId}-${rowLabel}`, rowLabel, seatCount: seats.length, seats });
    }

    return { classroomId, benches, occupiedCount: 0, totalSeats: total, demo: false };
  }, [classroomId, totalSeats, seatsPerBench]);
}
