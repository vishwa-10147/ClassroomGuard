import { evidenceFile, eventLabel, videoTime } from './events';
import { apiErrorMessage } from './apiError';
import { nextSeatLabel, zoneProblems } from '@/features/cameras/zones';
import { escalatedSeverity } from '@/features/incidents/severity';
import type { CameraZone } from '@/types/camera.types';

const seat = (label: string, id = label): CameraZone => ({ id, type: 'seat', label, x: 0, y: 0, w: 0.1, h: 0.1 });

describe('event helpers', () => {
  it('takes the evidence file name from a Windows or POSIX path', () => {
    expect(evidenceFile({ metadata: { evidence_path: 'storage/evidence/a.jpg' } })).toBe('a.jpg');
    expect(evidenceFile({ metadata: { evidence_path: 'C:\\ai\\storage\\evidence\\b.jpg' } })).toBe('b.jpg');
    expect(evidenceFile({ metadata: {} })).toBeNull();
    expect(evidenceFile({})).toBeNull();
  });

  it('labels event types for people', () => {
    expect(eventLabel('PHONE_USAGE')).toBe('Phone usage');
    expect(eventLabel('')).toBe('');
  });

  it('formats a position in a recording', () => {
    expect(videoTime(4.2)).toBe('0:04');
    expect(videoTime(125)).toBe('2:05');
    expect(videoTime(3725)).toBe('1:02:05');
  });
});

describe('zones', () => {
  it('numbers the next seat after the last one', () => {
    expect(nextSeatLabel([])).toBe('S1');
    expect(nextSeatLabel([seat('A1'), seat('A2')])).toBe('A3');
    // skips labels already taken (case-insensitive)
    expect(nextSeatLabel([seat('B10'), seat('b11', 'x'), seat('B9', 'z')])).toBe('B12');
  });

  it('reports what the API would reject', () => {
    expect(zoneProblems([seat('A1'), seat('a1', 'b')])).toEqual(['Seat "a1" is used twice.']);
    expect(zoneProblems([seat(' ')])).toEqual(['Every seat needs a label.']);
    expect(zoneProblems([{ ...seat(''), type: 'ignore' }])).toEqual([]);
  });
});

describe('incident escalation', () => {
  it('raises severity one step, stopping at critical', () => {
    expect(escalatedSeverity('info')).toBe('low');
    expect(escalatedSeverity('medium')).toBe('high');
    expect(escalatedSeverity('critical')).toBe('critical');
  });
});

describe('apiErrorMessage', () => {
  const err = (status: number, detail?: unknown) => ({ response: { status, data: { detail } } });

  it('shows the API reason for a rejected request', () => {
    expect(apiErrorMessage(err(400, 'Already queued or processing'))).toBe('Already queued or processing');
    expect(apiErrorMessage(err(422, [{ msg: 'Value error, zone must lie inside the image' }]))).toBe(
      'zone must lie inside the image'
    );
    expect(apiErrorMessage(err(413), 'Too big')).toBe('Too big');
  });

  it('stays quiet for errors the API client already announces', () => {
    for (const status of [401, 403, 404, 500, 503]) expect(apiErrorMessage(err(status, 'x'))).toBeNull();
  });
});
