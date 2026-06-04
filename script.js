const calendarStage = document.querySelector("#calendarStage");
const plannerSubtitle = document.querySelector("#plannerSubtitle");
const zoomLabel = document.querySelector("#zoomLabel");
const todoForm = document.querySelector("#todoForm");
const taskInput = document.querySelector("#taskInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const priorityInput = document.querySelector("#priorityInput");
const allTaskList = document.querySelector("#allTaskList");
const filterTabs = document.querySelector(".filter-tabs");
const plannerCount = document.querySelector("#plannerCount");
const allTasksCount = document.querySelector("#allTasksCount");

const today = stripTime(new Date());
const viewModes = ["day", "week", "month"];
let selectedDate = stripTime(new Date());
let visibleDate = stripTime(new Date());
let calendarMode = "week";
let activePage = "planner";
let activeFilter = "all";
let tasksByDate = loadTasks();

dateInput.value = dateKey(selectedDate);

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    activePage = button.dataset.page;
    render();
  });
});

document.querySelector("#prevRange").addEventListener("click", () => {
  visibleDate = shiftVisibleDate(-1);
  selectedDate = stripTime(new Date(visibleDate));
  dateInput.value = dateKey(selectedDate);
  render();
});

document.querySelector("#nextRange").addEventListener("click", () => {
  visibleDate = shiftVisibleDate(1);
  selectedDate = stripTime(new Date(visibleDate));
  dateInput.value = dateKey(selectedDate);
  render();
});

document.querySelector("#todayButton").addEventListener("click", () => {
  selectedDate = stripTime(new Date());
  visibleDate = stripTime(new Date());
  dateInput.value = dateKey(selectedDate);
  render();
});

document.querySelector("#zoomOut").addEventListener("click", () => {
  setZoom(viewModes[Math.min(viewModes.indexOf(calendarMode) + 1, viewModes.length - 1)]);
});

document.querySelector("#zoomIn").addEventListener("click", () => {
  setZoom(viewModes[Math.max(viewModes.indexOf(calendarMode) - 1, 0)]);
});

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    return;
  }

  const taskDate = parseDateInput(dateInput.value);
  const key = dateKey(taskDate);
  const task = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    priority: priorityInput.value,
    time: timeInput.value,
    done: false,
  };

  tasksByDate[key] = [...(tasksByDate[key] || []), task];
  selectedDate = taskDate;
  visibleDate = taskDate;
  taskInput.value = "";
  timeInput.value = "";
  saveTasks();
  render();
});

dateInput.addEventListener("change", () => {
  if (!dateInput.value) {
    dateInput.value = dateKey(selectedDate);
    return;
  }

  selectedDate = parseDateInput(dateInput.value);
  visibleDate = stripTime(new Date(selectedDate));
  render();
});

filterTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) {
    return;
  }

  activeFilter = button.dataset.filter;
  renderAllTasks();
});

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const taskItem = actionButton.closest("[data-task-id]");
  const taskId = taskItem.dataset.taskId;
  const key = taskItem.dataset.dateKey;
  const tasks = tasksByDate[key] || [];

  if (actionButton.dataset.action === "toggle") {
    tasksByDate[key] = tasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task
    );
  }

  if (actionButton.dataset.action === "delete") {
    tasksByDate[key] = tasks.filter((task) => task.id !== taskId);
  }

  if (tasksByDate[key]?.length === 0) {
    delete tasksByDate[key];
  }

  saveTasks();
  render();
});

function render() {
  renderNavigation();
  renderPlanner();
  renderAllTasks();
}

function renderNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === activePage);
  });

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `${activePage}Page`);
  });

  plannerCount.textContent = String((tasksByDate[dateKey(today)] || []).filter((task) => !task.done).length);
  allTasksCount.textContent = String(flattenTasks().filter((task) => !task.done).length);
}

function renderPlanner() {
  zoomLabel.textContent = capitalize(calendarMode);
  dateInput.value = dateKey(selectedDate);

  if (calendarMode === "month") {
    plannerSubtitle.textContent = visibleDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    renderMonthView();
    return;
  }

  const days = calendarMode === "week" ? getWeekDays(visibleDate) : [selectedDate];
  const start = days[0];
  const end = days[days.length - 1];
  plannerSubtitle.textContent =
    calendarMode === "week"
      ? `${formatShortDate(start)} - ${formatShortDate(end)}`
      : selectedDate.toLocaleDateString(undefined, fullDateOptions());
  renderTimeGrid(days);
}

function renderMonthView() {
  const firstDay = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1);
  const gridStart = stripTime(new Date(firstDay));
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const monthWrap = document.createElement("div");
  monthWrap.className = "month-view";
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  weekdays.forEach((day) => {
    const label = document.createElement("span");
    label.className = "month-weekday";
    label.textContent = day;
    monthWrap.append(label);
  });

  for (let index = 0; index < 42; index += 1) {
    const cellDate = stripTime(new Date(gridStart));
    cellDate.setDate(gridStart.getDate() + index);
    const key = dateKey(cellDate);
    const tasks = tasksByDate[key] || [];
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "month-cell",
      cellDate.getMonth() !== visibleDate.getMonth() ? "is-muted" : "",
      sameDay(cellDate, today) ? "is-today" : "",
      sameDay(cellDate, selectedDate) ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.addEventListener("click", () => {
      selectedDate = cellDate;
      visibleDate = cellDate;
      dateInput.value = dateKey(cellDate);
      render();
    });

    const number = document.createElement("span");
    number.className = "month-number";
    number.textContent = cellDate.getDate();
    button.append(number);

    tasks.slice(0, 3).forEach((task) => {
      button.append(createMiniTask(task));
    });

    if (tasks.length > 3) {
      const more = document.createElement("span");
      more.className = "more-count";
      more.textContent = `+${tasks.length - 3} more`;
      button.append(more);
    }

    monthWrap.append(button);
  }

  calendarStage.replaceChildren(monthWrap);
}

function renderTimeGrid(days) {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  const grid = document.createElement("div");
  grid.className = `time-grid ${calendarMode === "day" ? "day-mode" : ""}`;
  grid.style.setProperty("--day-count", days.length);

  const corner = document.createElement("div");
  corner.className = "time-corner";
  grid.append(corner);

  days.forEach((day) => {
    const header = document.createElement("button");
    header.type = "button";
    header.className = [
      "day-header",
      sameDay(day, today) ? "is-today" : "",
      sameDay(day, selectedDate) ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    header.addEventListener("click", () => {
      selectedDate = stripTime(new Date(day));
      dateInput.value = dateKey(selectedDate);
      render();
    });
    header.innerHTML = `<span>${day.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</span><strong>${day.getDate()}</strong>`;
    grid.append(header);
  });

  hours.forEach((hour) => {
    const timeLabel = document.createElement("div");
    timeLabel.className = "time-label";
    timeLabel.textContent = formatHour(hour);
    grid.append(timeLabel);

    days.forEach((day) => {
      const slot = document.createElement("div");
      slot.setAttribute("role", "button");
      slot.tabIndex = 0;
      slot.className = ["time-slot", sameDay(day, selectedDate) ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ");
      slot.addEventListener("click", (event) => {
        if (event.target.closest("[data-action]")) {
          return;
        }

        selectedDate = stripTime(new Date(day));
        dateInput.value = dateKey(day);
        timeInput.value = `${String(hour).padStart(2, "0")}:00`;
        taskInput.focus();
        render();
      });
      slot.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        selectedDate = stripTime(new Date(day));
        dateInput.value = dateKey(day);
        timeInput.value = `${String(hour).padStart(2, "0")}:00`;
        taskInput.focus();
        render();
      });

      getTasksForHour(day, hour).forEach((task) => {
        slot.append(createEventCard(task, day));
      });

      grid.append(slot);
    });
  });

  calendarStage.replaceChildren(grid);
}

function renderAllTasks() {
  document.querySelectorAll(".filter-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
  });

  const tasks = flattenTasks()
    .filter((task) => {
      if (activeFilter === "open") {
        return !task.done;
      }

      if (activeFilter === "done") {
        return task.done;
      }

      return true;
    })
    .sort((a, b) => `${a.dateKey} ${a.time || "99:99"}`.localeCompare(`${b.dateKey} ${b.time || "99:99"}`));

  allTaskList.innerHTML = "";

  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-list";
    empty.textContent = "No tasks for this view.";
    allTaskList.append(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-row ${task.done ? "done" : ""}`;
    item.dataset.taskId = task.id;
    item.dataset.dateKey = task.dateKey;

    const toggle = document.createElement("button");
    toggle.className = "check-button";
    toggle.type = "button";
    toggle.dataset.action = "toggle";
    toggle.setAttribute("aria-label", task.done ? "Mark task open" : "Mark task done");
    toggle.textContent = task.done ? "✓" : "";

    const body = document.createElement("div");
    body.className = "task-row-body";
    body.innerHTML = `<strong>${escapeHtml(task.title)}</strong><span>${formatTaskDate(task.dateKey)}${task.time ? ` · ${formatTime(task.time)}` : ""}</span>`;

    const priority = document.createElement("span");
    priority.className = `priority-pill ${task.priority}`;
    priority.textContent = task.priority;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.setAttribute("aria-label", "Delete task");
    remove.textContent = "×";

    item.append(toggle, body, priority, remove);
    allTaskList.append(item);
  });
}

function createEventCard(task, day) {
  const card = document.createElement("article");
  card.className = `event-card ${task.priority} ${task.done ? "done" : ""}`;
  card.dataset.taskId = task.id;
  card.dataset.dateKey = dateKey(day);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "event-check";
  toggle.dataset.action = "toggle";
  toggle.setAttribute("aria-label", task.done ? "Mark task open" : "Mark task done");
  toggle.textContent = task.done ? "✓" : "";

  const title = document.createElement("strong");
  title.textContent = task.title;

  const meta = document.createElement("span");
  meta.textContent = task.time ? formatTime(task.time) : "Any time";

  card.append(toggle, title, meta);
  return card;
}

function createMiniTask(task) {
  const mini = document.createElement("span");
  mini.className = `mini-task ${task.priority} ${task.done ? "done" : ""}`;
  mini.textContent = task.title;
  return mini;
}

function getTasksForHour(day, hour) {
  const tasks = tasksByDate[dateKey(day)] || [];
  return tasks.filter((task) => {
    if (!task.time) {
      return hour === 9;
    }

    return Number(task.time.split(":")[0]) === hour;
  });
}

function setZoom(nextMode) {
  calendarMode = nextMode;
  visibleDate = stripTime(new Date(selectedDate));
  render();
}

function shiftVisibleDate(direction) {
  const next = stripTime(new Date(visibleDate));

  if (calendarMode === "day") {
    next.setDate(next.getDate() + direction);
  }

  if (calendarMode === "week") {
    next.setDate(next.getDate() + direction * 7);
  }

  if (calendarMode === "month") {
    next.setMonth(next.getMonth() + direction);
  }

  return next;
}

function flattenTasks() {
  return Object.entries(tasksByDate).flatMap(([key, tasks]) =>
    tasks.map((task) => ({
      ...task,
      dateKey: key,
    }))
  );
}

function getWeekDays(date) {
  const monday = stripTime(new Date(date));
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);

  return Array.from({ length: 5 }, (_, index) => {
    const next = stripTime(new Date(monday));
    next.setDate(monday.getDate() + index);
    return next;
  });
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem("canvas-calendar-tasks")) || {};
  } catch {
    return {};
  }
}

function saveTasks() {
  localStorage.setItem("canvas-calendar-tasks", JSON.stringify(tasksByDate));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function sameDay(firstDate, secondDate) {
  return dateKey(firstDate) === dateKey(secondDate);
}

function fullDateOptions() {
  return {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTaskDate(key) {
  return parseDateInput(key).toLocaleDateString(undefined, fullDateOptions());
}

function formatHour(hour) {
  if (hour === 12) {
    return "12p";
  }

  return hour > 12 ? `${hour - 12}p` : `${hour}a`;
}

function formatTime(value) {
  const [hour, minute] = value.split(":");
  return new Date(2000, 0, 1, Number(hour), Number(minute)).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (match) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[match];
  });
}

render();
