
import { calcRating } from '../utils/calcRating';

export default function Rating({ value, max = 10 }) {
  const percent = calcRating(value, max);

  return (
    <div data-testid="rating">
      <div data-testid="rating-percent">{percent}</div>
      {/* visual bar for visual verification in tests */}
      <div
        data-testid="rating-bar"
        aria-hidden="true"
        style={{
          width: `${percent}%`,
          background: '#f5a623',
          height: '8px',
          borderRadius: '4px',
          marginTop: '6px',
        }}
      />
    </div>
  );
}