import { describe, expect, it } from 'vitest';
import { positiveInteger } from './query';
describe('query page validation', () => {
  it('accepts only positive safe integers', () => {
    expect(positiveInteger('3')).toBe(3);
    for (const value of ['x', '', '-1', '0', '1.5', Infinity, 1e30])
      expect(positiveInteger(value)).toBe(1);
    expect(positiveInteger(undefined, 12)).toBe(12);
  });
});
