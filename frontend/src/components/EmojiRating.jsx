import React from "react";

const EMOJIS = [
  { value: 1, label: "Meh", emoji: "😡" },
  { value: 2, label: "Bad",        emoji: "🙁" },
  { value: 3, label: "Mid",      emoji: "😐" },
  { value: 4, label: "Good",           emoji: "🙂" },
  { value: 5, label: "Perfect",       emoji: "🤩" },
];

export default function EmojiRating({ value, onChange }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Értékelés">
      {EMOJIS.map(opt => {
        const active = Number(value) === opt.value;
        return (
          <label
            key={opt.value}
            className={`cursor-pointer select-none rounded-xl border px-3 py-2 text-2xl transition
                        ${active ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}
            title={`${opt.value} – ${opt.label}`}
          >
            <input
              type="radio"
              name="emoji-rating"
              className="sr-only"
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
            />
            <span aria-hidden>{opt.emoji}</span>
          </label>
        );
      })}
    </div>
  );
}
