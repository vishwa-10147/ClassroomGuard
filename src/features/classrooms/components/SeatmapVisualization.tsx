import {
  AlertTriangle,
  Armchair,
  PersonStanding,
  Presentation,
  User,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ClassroomSeatmap, BenchSeat } from '@/types/classroom.types';

interface SeatmapVisualizationProps {
  seatmap: ClassroomSeatmap;
}

function shortName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] || '';
  return first.length > 10 ? `${first.slice(0, 9)}…` : first || '?';
}

function SeatChip({ seat }: { seat: BenchSeat }) {
  const occupied = Boolean(seat.student);
  return (
    <div
      className={cn(
        'group relative flex h-9 w-14 min-w-[3.5rem] flex-col items-center justify-center rounded-md border text-center transition-colors',
        occupied
          ? 'border-cg-status-online/40 bg-cg-status-online/10 hover:bg-cg-status-online/20'
          : 'border-cg-border-strong bg-cg-bg-tertiary/40'
      )}
      title={
        occupied && seat.student
          ? `${seat.label} — ${seat.student.name}${seat.phoneDetected ? ' (phone detected)' : ''}`
          : `${seat.label} — empty`
      }
    >
      {occupied && seat.student ? (
        <>
          <User className="mb-0.5 h-3 w-3 text-cg-status-online" />
          <span className="w-full truncate px-1 text-[10px] font-medium leading-tight text-cg-text-primary">
            {shortName(seat.student.name)}
          </span>
          <span className="absolute left-0 -top-4 hidden whitespace-nowrap rounded bg-cg-bg-surface px-1.5 py-0.5 text-[10px] text-cg-text-secondary shadow-cg-md group-hover:block">
            {seat.student.name}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-cg-text-tertiary">{seat.label}</span>
      )}
    </div>
  );
}

export default function SeatmapVisualization({
  seatmap,
}: SeatmapVisualizationProps) {
  const { benches, occupiedCount, totalSeats, demo } = seatmap;
  const occupancy = totalSeats > 0 ? Math.round((occupiedCount / totalSeats) * 100) : 0;
  const phoneCount = benches.reduce(
    (acc, bench) => acc + bench.seats.filter((s) => s.phoneDetected).length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cg-text-primary">Seat Map</h3>
        <div className="flex items-center gap-2 text-xs text-cg-text-secondary">
          <span className="rounded-full border border-cg-border-strong bg-cg-bg-tertiary px-2 py-0.5">
            {occupiedCount}/{totalSeats} occupied · {occupancy}%
          </span>
          {demo && (
            <span className="rounded-full border border-cg-status-info/40 bg-cg-status-info/10 px-2 py-0.5 text-cg-status-info">
              Demo data
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-cg-border-default bg-cg-bg-secondary p-4">
        <div className="mx-auto min-w-[32rem] max-w-2xl">
          {/* Teacher desk / board */}
          <div className="mb-8 flex items-center justify-center gap-2 rounded-md border border-cg-border-strong bg-cg-bg-tertiary px-4 py-2.5 text-xs font-medium text-cg-text-secondary">
            <Presentation className="h-4 w-4 text-brand-500" />
            TEACHER DESK · BOARD
          </div>

          <div className="space-y-4">
            {benches.map((bench) => (
              <div key={bench.id} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-center text-xs font-bold text-cg-text-tertiary">
                  {bench.rowLabel}
                </span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-cg-border-default bg-cg-bg-surface px-3 py-2">
                  <Armchair className="mr-1 hidden h-4 w-4 text-cg-text-tertiary sm:block" />
                  {bench.seats.map((seat) => (
                    <SeatChip key={seat.id} seat={seat} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-cg-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-cg-status-online/40 bg-cg-status-online/10" />
              Student present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-cg-border-strong bg-cg-bg-tertiary/40" />
              Empty seat
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-cg-status-warning" />
              Phone detected ({phoneCount})
            </span>
            <span className="flex items-center gap-1.5">
              <PersonStanding className="h-3.5 w-3.5 text-cg-text-tertiary" />
              Row label
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
