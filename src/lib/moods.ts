/** PRD FR-13 moods. Nocturne shows each as a coloured dot (not an emoji) — DESIGN.md §2 "Moods". */
export const MOODS = [
  { value: "loved", label: "Loved", color: "var(--mood-loved)" },
  { value: "happy", label: "Happy", color: "var(--mood-happy)" },
  { value: "calm", label: "Calm", color: "var(--mood-calm)" },
  { value: "excited", label: "Excited", color: "var(--mood-excited)" },
  { value: "funny", label: "Funny", color: "var(--mood-funny)" },
  { value: "tired", label: "Tired", color: "var(--mood-tired)" },
  { value: "bittersweet", label: "Bittersweet", color: "var(--mood-bittersweet)" },
  { value: "sad", label: "Sad", color: "var(--mood-sad)" },
] as const;

export type Mood = (typeof MOODS)[number]["value"];

export const CATEGORIES = [
  { value: "everyday", label: "Everyday" },
  { value: "date_night", label: "Date night" },
  { value: "travel", label: "Travel" },
  { value: "milestone", label: "Milestone" },
  { value: "food", label: "Food" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export function moodByValue(value: Mood) {
  return MOODS.find((m) => m.value === value)!;
}
