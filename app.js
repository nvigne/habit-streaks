import { STORAGE_KEY, localDateKey, habitName, readHabits, saveHabits, streaks, toggleCheckIn } from "./habit-core.js";

const $ = (selector) => document.querySelector(selector);
let habits = [];
let displayedDay;
let selectedId;
let storageBlocked = false;

function announce(message) {
  $("#announcement").textContent = message;
}

function storageError(error, reading) {
  storageBlocked = true;
  $("#storage-error").hidden = false;
  $("#error-message").textContent = reading
    ? `Saved habits could not be read. Existing data has not been replaced. Try again, check browser storage permissions, or explicitly reset the saved data. (${error.message})`
    : `This change was not saved. Your previously saved habits are unchanged. Check browser storage permissions or available space, then try again. (${error.message})`;
  $("#reset-storage").hidden = !reading;
  render();
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  $("#retry-storage").focus();
}

function clearError() {
  storageBlocked = false;
  $("#storage-error").hidden = true;
}

function load() {
  try {
    habits = readHabits(window.localStorage);
    clearError();
    render();
  } catch (error) {
    storageError(error, true);
  }
}

function commit(change, message) {
  try {
    // Read immediately before editing so another tab's saved changes are preserved.
    const latest = readHabits(window.localStorage);
    const next = change(latest);
    saveHabits(window.localStorage, next);
    habits = next;
    clearError();
    render();
    announce(message);
    return true;
  } catch (error) {
    storageError(error, false);
    return false;
  }
}

function button(label, className, action) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", action);
  return element;
}

function render() {
  const today = localDateKey();
  displayedDay = today;
  const date = new Date();
  $("#today-date").dateTime = today;
  $("#today-date").textContent = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const completed = habits.filter((habit) => habit.checkIns.includes(today)).length;
  $("#progress-count").textContent = `${completed} of ${habits.length} complete`;
  $("#daily-progress").max = Math.max(1, habits.length);
  $("#daily-progress").value = completed;
  $("#progress-note").textContent = habits.length === 0 ? "Your next chapter starts with one small habit."
    : completed === habits.length ? "You showed up for yourself today. Take that win."
      : completed === 0 ? "No rush. Your first little win is waiting."
        : "Look at you showing up. Keep the good things going.";
  $("#habit-count").textContent = habits.length;
  $("#empty-state").hidden = habits.length !== 0 || storageBlocked;
  $("#habit-name").disabled = storageBlocked;
  $("#add-form button").disabled = storageBlocked;
  const list = $("#habit-list");
  list.replaceChildren();
  for (const habit of habits) {
    const checked = habit.checkIns.includes(today);
    const { current, best } = streaks(habit.checkIns, today);
    const card = document.createElement("article");
    card.className = `habit-card${checked ? " completed" : ""}`;
    const check = button(checked ? "✓" : "", "check-button", () => {
      const focusId = habit.id;
      if (commit((latest) => {
        if (!latest.some((item) => item.id === habit.id)) throw new Error("This habit was removed in another tab.");
        return latest.map((item) => item.id === habit.id ? toggleCheckIn(item) : item);
      },
        checked ? `${habit.name}: today's check-in removed.` : `${habit.name}: checked in for today.`)) {
        [...document.querySelectorAll(".check-button")].find((item) => item.dataset.habitId === focusId)?.focus();
      }
    });
    check.dataset.habitId = habit.id;
    check.setAttribute("aria-label", `Check in today for ${habit.name}`);
    check.setAttribute("aria-pressed", String(checked));
    check.disabled = storageBlocked;
    const details = document.createElement("div");
    details.className = "habit-details";
    const name = document.createElement("h3");
    name.textContent = habit.name;
    const status = document.createElement("p");
    status.className = checked ? "done-label" : "muted";
    status.textContent = checked ? "Done for today. Nicely done!" : "A small promise to yourself.";
    details.append(name, status);
    const stats = document.createElement("div");
    stats.className = "streak-stats";
    for (const [label, value] of [["Current streak", current], ["Best streak", best]]) {
      const stat = document.createElement("div");
      const number = document.createElement("strong");
      number.textContent = `${value} ${value === 1 ? "day" : "days"}`;
      const caption = document.createElement("span");
      caption.textContent = label;
      stat.append(number, caption);
      stats.append(stat);
    }
    const actions = document.createElement("div");
    actions.className = "habit-actions";
    const rename = button("Rename", "text-button", () => {
      selectedId = habit.id;
      $("#edit-name").value = habit.name;
      $("#edit-name").setCustomValidity("");
      $("#edit-dialog").showModal();
      $("#edit-name").focus();
      $("#edit-name").select();
    });
    rename.setAttribute("aria-label", `Rename ${habit.name}`);
    const remove = button("Delete", "text-button delete-button", () => {
      selectedId = habit.id;
      $("#delete-description").textContent = `You're deleting "${habit.name}".`;
      $("#delete-dialog").showModal();
    });
    remove.setAttribute("aria-label", `Delete ${habit.name}`);
    rename.disabled = remove.disabled = storageBlocked;
    actions.append(rename, remove);
    card.append(check, details, stats, actions);
    list.append(card);
  }
}

function validatedName(input) {
  try {
    return habitName(input.value);
  } catch (error) {
    input.setCustomValidity(error.message);
    input.reportValidity();
    return null;
  }
}

$("#habit-name").addEventListener("input", (event) => event.target.setCustomValidity(""));
$("#edit-name").addEventListener("input", (event) => event.target.setCustomValidity(""));
$("#add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#habit-name");
  const name = validatedName(input);
  if (!name) return;
  if (commit((latest) => [...latest, { id: crypto.randomUUID(), name, checkIns: [] }], `${name} added.`)) {
    input.value = "";
    input.focus();
  }
});
$("#edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = validatedName($("#edit-name"));
  if (!name) return;
  if (commit((latest) => {
    if (!latest.some((habit) => habit.id === selectedId)) throw new Error("This habit was removed in another tab.");
    return latest.map((habit) => habit.id === selectedId ? { ...habit, name } : habit);
  }, "Habit renamed.")) {
    $("#edit-dialog").close();
    $("#habit-name").focus();
  }
});
$("#confirm-delete").addEventListener("click", () => {
  if (commit((latest) => latest.filter((habit) => habit.id !== selectedId), "Habit deleted.")) {
    $("#delete-dialog").close();
    $("#habit-name").focus();
  }
});
document.querySelectorAll("[data-close]").forEach((element) => {
  element.addEventListener("click", () => element.closest("dialog").close());
});
document.querySelectorAll("[data-suggestion]").forEach((element) => {
  element.addEventListener("click", () => {
    $("#habit-name").value = element.dataset.suggestion;
    $("#habit-name").setCustomValidity("");
    $("#habit-name").focus();
  });
});
$("#retry-storage").addEventListener("click", load);
$("#reset-storage").addEventListener("click", () => $("#reset-dialog").showModal());

// Reset is the only operation allowed to replace an unreadable payload.
$("#confirm-reset").addEventListener("click", () => {
  try {
    saveHabits(window.localStorage, []);
    habits = [];
    clearError();
    render();
    $("#reset-dialog").close();
    announce("Saved data reset.");
    $("#habit-name").focus();
  } catch (error) {
    $("#reset-dialog").close();
    storageError(error, true);
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) load();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load();
});
setInterval(() => {
  if (localDateKey() !== displayedDay) render();
}, 1000);
load();
