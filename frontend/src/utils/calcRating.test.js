import { describe, it, expect } from 'vitest';
import { calcRating } from '/calcRating';

describe('calcRating', () => {
  it('returns 0 for negative ratings', () => {
    expect(calcRating(-5)).toBe(0);
  });

  it('caps at 100 for ratings greater than max', () => {
    expect(calcRating(15, 10)).toBe(100);
  });

  it('converts rating to percentage with two decimals', () => {
    expect(calcRating(7, 10)).toBe(70);
    expect(calcRating(7.5, 10)).toBe(75);
  });

  it('returns 0 for NaN input', () => {
    expect(calcRating(Number.NaN)).toBe(0);
  });

  it('supports non-default max value', () => {
    expect(calcRating(3, 6)).toBe(50);
  });
});
