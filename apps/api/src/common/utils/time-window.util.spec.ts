import { isTimeWindowValid, timeFallsWithinWindow, windowsOverlap } from './time-window.util';

describe('stock time windows', () => {
  it('rejects invalid or reversed windows', () => {
    expect(isTimeWindowValid('12:00', '08:00')).toBe(false);
    expect(isTimeWindowValid('08:00', '12:00')).toBe(true);
  });

  it('detects overlaps and touching windows', () => {
    expect(windowsOverlap('08:00', '12:00', '11:00', '13:00')).toBe(true);
    expect(windowsOverlap('08:00', '12:00', '12:00', '16:00')).toBe(false);
    expect(windowsOverlap(undefined, undefined, '12:00', '16:00')).toBe(true);
  });

  it('treats boundaries consistently', () => {
    expect(timeFallsWithinWindow('08:00', '08:00', '12:00')).toBe(true);
    expect(timeFallsWithinWindow('12:00', '08:00', '12:00')).toBe(false);
  });
});
