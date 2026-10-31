export const STORAGE_KEY = "habit-streaks:v1";
export const MAX_NAME_LENGTH = 80;

export function localDateKey(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftDay(key, offset) {
  if (!isDateKey(key) || !Number.isInteger(offset)) throw new Error("Invalid calendar date or offset.");
  // UTC arithmetic on a date-only key avoids local daylight-saving transitions.
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function streaks(checkIns, today = localDateKey()) {
  if (!isDateKey(today) || !Array.isArray(checkIns) || !checkIns.every(isDateKey)) {
    throw new Error("Invalid check-in dates.");
  }
  const dates = [...new Set(checkIns.filter((date) => date <= today))].sort();
  const completed = new Set(dates);
  let day = completed.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (completed.has(day)) {
    current++;
    day = shiftDay(day, -1);
  }
  let best = 0;
  let run = 0;
  let previous;
  for (const date of dates) {
    run = previous && shiftDay(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return { current, best };
}

export function habitName(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`Enter a habit name between 1 and ${MAX_NAME_LENGTH} characters.`);
  }
  return value.trim();
}

export function toggleCheckIn(habit, today = localDateKey()) {
  if (!isDateKey(today)) throw new Error("Invalid check-in date.");
  return {
    ...habit,
    checkIns: habit.checkIns.includes(today)
      ? habit.checkIns.filter((date) => date !== today)
      : [...habit.checkIns, today].sort(),
  };
}

export function parseHabits(raw) {
  if (raw === null) return [];
  const payload = JSON.parse(raw);
  if (!payload || payload.version !== 1 || !Array.isArray(payload.habits)) {
    throw new Error("Unsupported saved data.");
  }
  const ids = new Set();
  return payload.habits.map((habit) => {
    if (!habit || typeof habit.id !== "string" || !habit.id.trim() || ids.has(habit.id)
      || habit.name !== habitName(habit.name) || !Array.isArray(habit.checkIns)
      || !habit.checkIns.every(isDateKey)) {
      throw new Error("Invalid saved habit.");
    }
    ids.add(habit.id);
    return { id: habit.id, name: habit.name, checkIns: [...new Set(habit.checkIns)].sort() };
  });
}

export function readHabits(storage) {
  return parseHabits(storage.getItem(STORAGE_KEY));
}

export function saveHabits(storage, habits) {
  const raw = JSON.stringify({ version: 1, habits });
  parseHabits(raw);
  storage.setItem(STORAGE_KEY, raw);
}
