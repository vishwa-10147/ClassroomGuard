import { useMemo } from 'react';
import type { Bench, ClassroomSeatmap } from '@/types/classroom.types';

export interface UseClassroomSeatmapOptions {
  classroomId: string;
  totalSeats: number;
  seatsPerBench?: number;
  /** ~0..1 fraction of seats that are occupied in the mock layout. */
  occupancyRatio?: number;
}

/**
 * Standard mock roster used to demo the seatmap until real camera footage is
 * wired up. When footage drives the map, replace this hook's internals (or pass
 * a `layout` override) with tracked detections keyed by seat/bench.
 */
const MOCK_STUDENTS = [
  'Aarav Sharma', 'Ananya Patel', 'Vivaan Mehta', 'Diya Iyer',
  'Advik Kumar', 'Saanvi Reddy', 'Kabir Nair', 'Ishita Gupta',
  'Rohan Joshi', 'Anika Singh', 'Arjun Rao', 'Myra Desai',
  'Ishaan Verma', 'Navya Pillai', 'Krishna Menon', 'Zara Khan',
  'Dhruv Bansal', 'Tara Joshi', 'Reyansh Das', 'Kiara Mehra',
  'Vihaan Kulkarni', 'Aadhya Shukla', 'Atharv Bhatt', 'Ananya Rao',
  'Yash Nair', 'Prisha Malhotra', 'Ayaan Chopra', 'Eva Sharma',
  'Kabir Khanna', 'Sara Fernandes',
];

/** Tiny deterministic PRNG (mulberry32) so a classroom's layout is stable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function useClassroomSeatmap({
  classroomId,
  totalSeats,
  seatsPerBench = 8,
  occupancyRatio = 0.62,
}: UseClassroomSeatmapOptions): ClassroomSeatmap {
  return useMemo(() => {
    const total = Math.max(totalSeats, 1);
    const perBench = Math.max(seatsPerBench, 1);
    const benchCount = Math.ceil(total / perBench);
    const rand = mulberry32(hashCode(classroomId || 'default-classroom'));
    const studentCount = Math.round(total * occupancyRatio);

    // Deterministically shuffle the mock roster for this classroom.
    const roster = [...MOCK_STUDENTS];
    for (let i = roster.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [roster[i], roster[j]] = [roster[j], roster[i]];
    }

    const benches: Bench[] = [];
    let seatIndex = 0;
    for (let b = 0; b < benchCount; b += 1) {
      const rowLabel = String.fromCharCode(65 + b);
      const seats: Bench['seats'] = [];
      for (let i = 0; i < perBench; i += 1) {
        if (seatIndex >= total) break;
        const label = `${rowLabel}${i + 1}`;
        const occupied = seatIndex < studentCount;
        seats.push({
          id: `${classroomId}-${rowLabel}-${i + 1}`,
          label,
          student: occupied
            ? {
                id: `stu-${seatIndex + 1}`,
                name: roster[seatIndex % roster.length],
                personId: `person-${seatIndex + 1}`,
              }
            : null,
          phoneDetected: occupied && rand() < 0.08,
        });
        seatIndex += 1;
      }
      benches.push({ id: `bench-${classroomId}-${rowLabel}`, rowLabel, seatCount: seats.length, seats });
    }

    return {
      classroomId,
      benches,
      occupiedCount: Math.min(studentCount, total),
      totalSeats: total,
      demo: true,
    };
  }, [classroomId, totalSeats, seatsPerBench, occupancyRatio]);
}
