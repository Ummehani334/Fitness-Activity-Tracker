
const form = document.getElementById("activity-form");
const activityList = document.getElementById("activity-list");
const emptyMessage = document.getElementById("empty-message");
const message = document.getElementById("form-message");

const STORAGE_KEY = "fittrack_activities";
const GOAL_KEY = "fittrack_daily_goal";

// Approximate calories burned per minute.
// These are illustrative estimates, not personalized measurements.
const calorieRates = {
  "Walking": 4,
  "Running": 10,
  "Cycling": 8,
  "Swimming": 9,
  "Gym Workout": 6,
  "Yoga": 3
};

const activityIcons = {
  "Walking": "🚶",
  "Running": "🏃",
  "Cycling": "🚴",
  "Swimming": "🏊",
  "Gym Workout": "🏋️",
  "Yoga": "🧘"
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.activity === "string" &&
      Number.isFinite(item.duration) &&
      item.duration > 0 &&
      typeof item.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    );
  } catch (error) {
    return [];
  }
}

let activities = loadActivities();

function saveActivities() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    return true;
  } catch (error) {
    message.textContent =
      "Unable to save data. Check your browser storage settings.";
    return false;
  }
}

function getGoal() {
  const value = Number(localStorage.getItem(GOAL_KEY));
  return Number.isFinite(value) && value >= 1 && value <= 1440
    ? value
    : 30;
}

let dailyGoal = getGoal();

document.getElementById("activity-date").value = localDateString();
document.getElementById("goal-input").value = dailyGoal;

function getCalories(item) {
  return Math.round(
    item.duration * (calorieRates[item.activity] || 4)
  );
}

function renderDashboard() {
  const today = localDateString();

  const todaysActivities = activities.filter(item =>
    item.date === today
  );

  const totalMinutes = todaysActivities.reduce(
    (sum, item) => sum + item.duration, 0
  );

  const totalCalories = todaysActivities.reduce(
    (sum, item) => sum + getCalories(item), 0
  );

  document.getElementById("calories").textContent = totalCalories;
  document.getElementById("minutes").textContent = totalMinutes;
  document.getElementById("activity-count").textContent =
    todaysActivities.length;

  document.getElementById("goal-label").textContent =
    `${dailyGoal} minutes`;

  const percentage = Math.min(
    100, Math.round((totalMinutes / dailyGoal) * 100)
  );

  document.getElementById("goal-progress").style.width =
    `${percentage}%`;

  document.getElementById("goal-message").textContent =
    totalMinutes >= dailyGoal
      ? `Goal completed! ${totalMinutes} minutes exercised today.`
      : `${percentage}% completed — ${
          dailyGoal - totalMinutes
        } more minutes to reach your goal.`;

  renderHistory();
  renderWeeklyChart();
}

form.addEventListener("submit", function(event) {
  event.preventDefault();

  const activity = document.getElementById("activity").value;
  const duration = Number(
    document.getElementById("duration").value
  );
  const date = document.getElementById("activity-date").value;
  const notes = document.getElementById("notes").value.trim();

  if (
    !Object.prototype.hasOwnProperty.call(calorieRates, activity) ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440 ||
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    message.textContent = "Please enter valid activity details.";
    return;
  }

  const newActivity = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    activity,
    duration,
    date,
    notes
  };

  activities.unshift(newActivity);

  if (!saveActivities()) {
    activities.shift();
    return;
  }

  form.reset();
  document.getElementById("activity-date").value = localDateString();

  message.textContent =
    `Activity added! Estimated calories: ${getCalories(newActivity)} kcal.`;

  renderDashboard();
});

document.getElementById("save-goal").addEventListener("click", function() {
  const input = document.getElementById("goal-input");
  const newGoal = Number(input.value);

  if (
    !Number.isInteger(newGoal) ||
    newGoal < 1 ||
    newGoal > 1440
  ) {
    message.textContent = "";
    input.setCustomValidity(
      "Enter a whole number between 1 and 1440."
    );
    input.reportValidity();
    return;
  }

  input.setCustomValidity("");

  try {
    localStorage.setItem(GOAL_KEY, String(newGoal));
    dailyGoal = newGoal;
    renderDashboard();
    message.textContent = "Daily workout goal updated!";
  } catch (error) {
    message.textContent = "Unable to save your goal.";
  }
});

function renderHistory() {
  activityList.replaceChildren();
  emptyMessage.hidden = activities.length > 0;

  const sorted = [...activities].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  sorted.forEach(item => {
    const row = document.createElement("article");
    row.className = "activity-item";

    const emoji = document.createElement("div");
    emoji.className = "activity-emoji";
    emoji.textContent = activityIcons[item.activity] || "💪";

    const details = document.createElement("div");
    details.className = "activity-details";

    const title = document.createElement("h3");
    title.textContent = item.activity;

    const info = document.createElement("p");
    info.textContent = `${item.date}${item.notes ? " · " + item.notes : ""}`;

    details.append(title, info);

    const stats = document.createElement("div");
    stats.className = "activity-stats";

    const duration = document.createElement("strong");
    duration.textContent = `${item.duration} min`;

    const calories = document.createElement("p");
    calories.textContent = `~${getCalories(item)} kcal`;

    stats.append(duration, calories);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "✕";
    deleteButton.setAttribute(
      "aria-label", `Delete ${item.activity} on ${item.date}`
    );

    deleteButton.addEventListener("click", function() {
      const previous = activities;
      activities = activities.filter(activity => activity.id !== item.id);

      if (!saveActivities()) {
        activities = previous;
        return;
      }

      message.textContent = "Activity deleted.";
      renderDashboard();
    });

    row.append(emoji, details, stats, deleteButton);
    activityList.appendChild(row);
  });
}

function renderWeeklyChart() {
  const chart = document.getElementById("weekly-chart");
  chart.replaceChildren();

  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const key = localDateString(date);
    const minutes = activities
      .filter(item => item.date === key)
      .reduce((sum, item) => sum + item.duration, 0);

    days.push({
      key,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      minutes
    });
  }

  const maximum = Math.max(30, ...days.map(day => day.minutes));

  days.forEach(day => {
    const column = document.createElement("div");
    column.className = "chart-day";

    const area = document.createElement("div");
    area.className = "bar-area";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(3, day.minutes / maximum * 100)}%`;
    bar.title = `${day.key}: ${day.minutes} minutes`;

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = day.minutes;

    bar.appendChild(value);
    area.appendChild(bar);

    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = day.label;

    column.append(area, label);
    chart.appendChild(column);
  });
}

document.getElementById("clear-history").addEventListener("click", function() {
  if (activities.length === 0) {
    message.textContent = "There are no activities to clear.";
    return;
  }

  if (!confirm("Are you sure you want to delete all activities?")) {
    return;
  }

  const previous = activities;
  activities = [];

  if (!saveActivities()) {
    activities = previous;
    return;
  }

  message.textContent = "All activity records cleared.";
  renderDashboard();
});

// Display saved data when the page opens.
renderDashboard();
