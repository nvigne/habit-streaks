import test from "node:test";
import assert from "node:assert/strict";
import { habitName, isDateKey, localDateKey, parseHabits, readHabits, saveHabits, shiftDay, STORAGE_KEY, streaks, toggleCheckIn } from "../habit-core.js";

const today = "2026-10-30";
const habit = { id: "water", name: "Drink water", checkIns: [] };
const serialize = (habits, version = 1) => JSON.stringify({ version, habits });

test("empty history has zero streaks", () => {
  assert.deepEqual(streaks([], today), { current: 0, best: 0 });
});
test("today extends a streak; yesterday stays alive before today's check-in", () => {
  const dates = ["2026-10-28", "2026-10-29"];
  assert.deepEqual(streaks(dates, today), { current: 2, best: 2 });
  assert.deepEqual(streaks([...dates, today], today), { current: 3, best: 3 });
});
test("a missed full day breaks current but preserves best", () => {
  assert.deepEqual(streaks(["2026-10-26", "2026-10-27", "2026-10-28"], today), { current: 0, best: 3 });
  assert.deepEqual(streaks(["2026-10-26", "2026-10-27", "2026-10-28", today], today), { current: 1, best: 3 });
});
test("best streak spans multiple separate runs", () => {
  assert.deepEqual(streaks(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-10", "2026-10-29", today], today),
    { current: 2, best: 3 });
});
test("unordered and duplicate dates do not inflate streaks; future dates do not count", () => {
  assert.deepEqual(streaks([today, "2026-10-29", today, "2026-10-31", "2026-11-01"], today), { current: 2, best: 2 });
});
test("toggle adds/removes only today without mutating the source", () => {
  const original = { ...habit, checkIns: ["2026-10-29"] };
  const checked = toggleCheckIn(original, today);
  assert.deepEqual(checked.checkIns, ["2026-10-29", today]);
  assert.deepEqual(original.checkIns, ["2026-10-29"]);
  const unchecked = toggleCheckIn(checked, today);
  assert.deepEqual(unchecked, original);
  assert.deepEqual(streaks(unchecked.checkIns, today), { current: 1, best: 1 });
  assert.deepEqual(streaks(toggleCheckIn(habit, today).checkIns, today), { current: 1, best: 1 });
});
test("calendar arithmetic crosses months, years, and leap days", () => {
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDay("2026-05-01", -1), "2026-04-30");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(streaks(["2025-12-31", "2026-01-01"], "2026-01-01"), { current: 2, best: 2 });
  assert.deepEqual(streaks(["2024-02-28", "2024-02-29", "2024-03-01"], "2024-03-01"), { current: 3, best: 3 });
});
test("local dates and streaks remain correct around DST and UTC midnight", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.equal(localDateKey(new Date("2026-10-31T01:00:00Z")), "2026-10-30");
    assert.equal(localDateKey(new Date("2026-03-08T09:59:00Z")), "2026-03-08");
    assert.equal(localDateKey(new Date("2026-03-08T10:01:00Z")), "2026-03-08");
    assert.deepEqual(streaks(["2026-03-07", "2026-03-08", "2026-03-09"], "2026-03-09"), { current: 3, best: 3 });
    assert.deepEqual(streaks(["2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02"), { current: 3, best: 3 });
    process.env.TZ = "Pacific/Kiritimati";
    assert.equal(localDateKey(new Date("2026-10-30T12:00:00Z")), "2026-10-31");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("date validation rejects malformed and impossible dates", () => {
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "bad", null, 1]) {
    assert.equal(isDateKey(date), false);
  }
  assert.equal(isDateKey("2024-02-29"), true);
  assert.throws(() => streaks(["2026-02-30"], today));
  assert.throws(() => shiftDay("bad", 1));
  assert.throws(() => shiftDay(today, 0.5));
  assert.throws(() => toggleCheckIn(habit, "bad"));
});
test("habit names are trimmed, bounded, and required", () => {
  assert.equal(habitName("  Read  "), "Read");
  assert.equal(habitName("x".repeat(80)).length, 80);
  for (const value of ["", "  ", "x".repeat(81), null, 42]) assert.throws(() => habitName(value));
});
test("storage round trip preserves ids, names, history, and version", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readHabits(storage), []);
  const habits = [{ ...habit, checkIns: ["2026-10-29", today] }];
  saveHabits(storage, habits);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).version, 1);
  assert.deepEqual(readHabits(storage), habits);
  assert.deepEqual(parseHabits(serialize([{ ...habit, checkIns: [today, "2026-10-29", today] }])), habits);
});
test("invalid payloads are rejected rather than silently reset", () => {
  const invalid = [
    "{", "null", "[]", serialize([], 2), JSON.stringify({ version: 1, habits: {} }),
    serialize([null]), serialize([{ ...habit, id: "" }]), serialize([habit, habit]),
    serialize([{ ...habit, name: " " }]), serialize([{ ...habit, name: " padded " }]),
    serialize([{ ...habit, checkIns: ["2026-02-30"] }]), serialize([{ ...habit, checkIns: "bad" }]),
  ];
  for (const raw of invalid) assert.throws(() => parseHabits(raw));
});
test("storage read/write failures propagate and do not overwrite records", () => {
  const raw = serialize([habit]);
  const storage = {
    getItem: () => raw,
    setItem: () => { throw new Error("Quota exceeded"); },
  };
  assert.throws(() => saveHabits(storage, []), /Quota exceeded/);
  assert.deepEqual(readHabits(storage), [habit]);
  assert.throws(() => readHabits({ getItem: () => { throw new Error("Storage denied"); } }), /Storage denied/);
  let writes = 0;
  assert.throws(() => saveHabits({ setItem: () => writes++ }, [{ ...habit, name: "" }]));
  assert.equal(writes, 0);
});
