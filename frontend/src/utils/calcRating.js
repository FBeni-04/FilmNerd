// Normalizes a numeric rating to a percentage (0 - 100)
// rating: number, max: number (default 10)
export function calcRating(rating, max = 10) {
  if (Number.isNaN(rating)) return 0;
  const clamped = Math.max(0, Math.min(rating, max));
  // return percentage 0..100 with up to two decimal places
  return Number(((clamped / max) * 100).toFixed(2));
}