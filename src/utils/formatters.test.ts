import { formatNumber, formatPercent, formatFileSize, formatDuration } from './formatters';

describe('formatters', () => {
  it('formats number with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('formats percent', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(33.333)).toBe('33.3%');
  });

  it('formats file size', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('formats duration', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3665)).toBe('1:01:05');
  });
});
