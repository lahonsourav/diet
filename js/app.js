(() => {
  "use strict";

  let plan = loadPlan();
  let editMode = false;
  let saveTimer = null;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => savePlan(plan), 250);
  }

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(opts)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function textInput(value, onInput, opts = {}) {
    const input = el("input", { type: "text", value, ...opts });
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }

  function numberInput(value, onInput, opts = {}) {
    const input = el("input", { type: "number", value, ...opts });
    input.addEventListener("input", () => onInput(input.value === "" ? "" : Number(input.value)));
    return input;
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    toast.style.opacity = "1";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.classList.add("hidden"), 200);
    }, 1800);
  }

  // ---------------- Stats ----------------
  function renderStats() {
    const card = document.getElementById("stats-card");
    card.innerHTML = "";
    card.appendChild(el("h3", { text: "📋 Your Stats" }));
    const grid = el("div", { class: "stats-grid" });
    const s = plan.stats;

    function box(label, valueNode) {
      return el("div", { class: "stat-box" }, [
        el("div", { class: "stat-box__label", text: label }),
        valueNode,
      ]);
    }

    if (editMode) {
      grid.appendChild(box("Height", textInput(s.height, (v) => { s.height = v; scheduleSave(); })));
      grid.appendChild(box("Current Weight (kg)", numberInput(s.currentWeight, (v) => { s.currentWeight = v; scheduleSave(); }, { step: "0.1" })));
      const rangeRow = el("div", { class: "range-inputs" }, [
        numberInput(s.targetWeightLow, (v) => { s.targetWeightLow = v; scheduleSave(); }, { step: "0.1" }),
        el("span", { text: "–" }),
        numberInput(s.targetWeightHigh, (v) => { s.targetWeightHigh = v; scheduleSave(); }, { step: "0.1" }),
      ]);
      grid.appendChild(box("Target Weight (kg)", rangeRow));
      grid.appendChild(box("Daily Calories", numberInput(s.dailyCalories, (v) => { s.dailyCalories = v; scheduleSave(); })));
      grid.appendChild(box("Training Days/Week", numberInput(s.trainingDaysPerWeek, (v) => { s.trainingDaysPerWeek = v; scheduleSave(); }, { min: "1", max: "7" })));
      grid.appendChild(box("Training Location", textInput(s.trainingLocation, (v) => { s.trainingLocation = v; scheduleSave(); })));
    } else {
      grid.appendChild(box("Height", el("div", { class: "stat-box__value", text: s.height })));
      grid.appendChild(box("Current Weight", el("div", { class: "stat-box__value", text: `${s.currentWeight} kg` })));
      grid.appendChild(box("Target Weight", el("div", { class: "stat-box__value", text: `${s.targetWeightLow}–${s.targetWeightHigh} kg` })));
      grid.appendChild(box("Daily Calories", el("div", { class: "stat-box__value", text: `${s.dailyCalories} kcal` })));
      grid.appendChild(box("Training", el("div", { class: "stat-box__value", text: `${s.trainingDaysPerWeek}x/week` })));
      grid.appendChild(box("Location", el("div", { class: "stat-box__value", text: s.trainingLocation })));
    }
    card.appendChild(grid);
  }

  // ---------------- Nutrition ----------------
  function renderNutrition() {
    const card = document.getElementById("nutrition-card");
    card.innerHTML = "";
    card.appendChild(el("h3", { text: "📊 Daily Nutrition" }));
    const grid = el("div", { class: "nutrition-grid" });
    const n = plan.nutrition;
    const fields = [
      ["Calories", "calories", "kcal"],
      ["Protein", "protein", "g"],
      ["Carbs", "carbs", "g"],
      ["Fats", "fats", "g"],
    ];
    for (const [label, key, unit] of fields) {
      const valueNode = editMode
        ? numberInput(n[key], (v) => { n[key] = v; scheduleSave(); })
        : el("div", { class: "stat-box__value", text: `${n[key]}${unit === "kcal" ? "" : "g"}` });
      grid.appendChild(el("div", { class: "stat-box" }, [
        el("div", { class: "stat-box__label", text: label }),
        valueNode,
      ]));
    }
    card.appendChild(grid);
  }

  // ---------------- Timing ----------------
  function renderTiming() {
    const card = document.getElementById("timing-card");
    card.innerHTML = "";
    const headRow = el("div", { class: "section-heading-row", style: "margin:0 0 10px" }, [
      el("h3", { text: "⏰ Best Time to Workout" }),
      editMode ? el("button", { class: "add-btn", text: "+ Add", onclick: () => {
        plan.workoutTiming.push({ label: "Good", when: "", why: "" });
        scheduleSave();
        renderTiming();
      } }) : null,
    ]);
    card.appendChild(headRow);

    plan.workoutTiming.forEach((t, i) => {
      const row = el("div", { class: "timing-row" });
      if (editMode) {
        row.appendChild(el("div", { class: "timing-row__body" }, [
          textInput(t.label, (v) => { t.label = v; scheduleSave(); }, { placeholder: "Label e.g. Best" }),
          textInput(t.when, (v) => { t.when = v; scheduleSave(); }, { placeholder: "When" }),
          textInput(t.why, (v) => { t.why = v; scheduleSave(); }, { placeholder: "Why" }),
        ]));
        row.appendChild(el("button", { class: "remove-btn", text: "×", title: "Remove", onclick: () => {
          plan.workoutTiming.splice(i, 1);
          scheduleSave();
          renderTiming();
        } }));
      } else {
        row.appendChild(el("span", { class: `timing-row__badge ${i === 0 ? "" : "secondary"}`, text: t.label }));
        row.appendChild(el("div", { class: "timing-row__body" }, [
          el("div", { class: "timing-row__when", text: t.when }),
          el("div", { class: "timing-row__why", text: t.why }),
        ]));
      }
      card.appendChild(row);
    });
  }

  // ---------------- Golden Rules ----------------
  function renderRules() {
    const card = document.getElementById("rules-card");
    card.innerHTML = "";
    const headRow = el("div", { class: "section-heading-row", style: "margin:0 0 10px" }, [
      el("h3", { text: "💡 Golden Rules" }),
      editMode ? el("button", { class: "add-btn", text: "+ Add", onclick: () => {
        plan.goldenRules.push("");
        scheduleSave();
        renderRules();
      } }) : null,
    ]);
    card.appendChild(headRow);

    const list = el("ul", { class: "rules-list" });
    plan.goldenRules.forEach((rule, i) => {
      const li = el("li");
      if (editMode) {
        li.appendChild(textInput(rule, (v) => { plan.goldenRules[i] = v; scheduleSave(); }));
        li.appendChild(el("button", { class: "remove-btn", text: "×", onclick: () => {
          plan.goldenRules.splice(i, 1);
          scheduleSave();
          renderRules();
        } }));
      } else {
        li.appendChild(el("span", { class: "list-row__text", text: rule }));
      }
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  // ---------------- Meals ----------------
  function renderMeals() {
    const container = document.getElementById("meals-list");
    container.innerHTML = "";
    document.getElementById("add-meal-btn").classList.toggle("hidden", !editMode);

    plan.meals.forEach((meal, mi) => {
      const card = el("div", { class: "card meal-card" });

      if (editMode) {
        card.appendChild(el("button", { class: "remove-btn meal-card__remove", text: "×", title: "Remove meal", onclick: () => {
          plan.meals.splice(mi, 1);
          scheduleSave();
          renderMeals();
        } }));
        const fields = el("div", { class: "meal-card__edit-fields" }, [
          textInput(meal.time, (v) => { meal.time = v; scheduleSave(); }, { class: "time-input", placeholder: "Time" }),
          textInput(meal.title, (v) => { meal.title = v; scheduleSave(); }, { class: "title-input", placeholder: "Meal name" }),
          numberInput(meal.calories, (v) => { meal.calories = v; scheduleSave(); }, { class: "cal-input", placeholder: "kcal" }),
        ]);
        card.appendChild(fields);
      } else {
        const header = el("div", { class: "meal-card__header" }, [
          el("div", { class: "meal-card__time-title" }, [
            el("span", { class: "meal-card__time", text: meal.time }),
            el("span", { class: "meal-card__title", text: meal.title }),
          ]),
          el("span", { class: "meal-card__cal", text: `~${meal.calories} kcal` }),
        ]);
        card.appendChild(header);
      }

      const list = el("ul", { style: "list-style:none;margin:0;padding:0" });
      meal.items.forEach((item, ii) => {
        const li = el("li", { class: "list-row" });
        if (editMode) {
          li.appendChild(textInput(item, (v) => { meal.items[ii] = v; scheduleSave(); }));
          li.appendChild(el("button", { class: "remove-btn", text: "×", onclick: () => {
            meal.items.splice(ii, 1);
            scheduleSave();
            renderMeals();
          } }));
        } else {
          li.appendChild(el("span", { class: "list-row__text", text: item }));
        }
        list.appendChild(li);
      });
      card.appendChild(list);

      if (editMode) {
        card.appendChild(el("button", { class: "add-btn", text: "+ Add item", onclick: () => {
          meal.items.push("");
          scheduleSave();
          renderMeals();
        } }));
      }

      container.appendChild(card);
    });
  }

  function addMeal() {
    plan.meals.push({
      id: "m" + Date.now(),
      time: "12:00 PM",
      title: "New Meal",
      calories: 0,
      items: [],
    });
    scheduleSave();
    renderMeals();
  }

  // ---------------- Schedule ----------------
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function renderSchedule() {
    const card = document.getElementById("schedule-card");
    card.innerHTML = "";
    card.appendChild(el("h3", { text: "🗓️ Weekly Schedule" }));
    const grid = el("div", { class: "schedule-grid" });

    const dayKeys = Object.keys(plan.workoutDays);

    plan.schedule.forEach((val, i) => {
      const cell = el("div", { class: "schedule-day" });
      cell.appendChild(el("div", { class: "schedule-day__name", text: DAY_NAMES[i] }));
      if (editMode) {
        const select = el("select");
        const options = [["Rest", "Rest"], ...dayKeys.map((k) => [k, plan.workoutDays[k].label])];
        for (const [optVal, optLabel] of options) {
          select.appendChild(el("option", { value: optVal, text: optLabel, selected: optVal === val ? "" : undefined }));
        }
        select.value = val;
        select.addEventListener("change", () => {
          plan.schedule[i] = select.value;
          scheduleSave();
        });
        cell.appendChild(select);
      } else {
        const isRest = val === "Rest";
        cell.appendChild(el("div", { class: "schedule-day__value", text: isRest ? "😴" : "💪" }));
        cell.appendChild(el("div", { class: "schedule-day__name", text: isRest ? "Rest" : val }));
      }
      grid.appendChild(cell);
    });
    card.appendChild(grid);

    const noteWrap = el("div", { class: "schedule-note" });
    if (editMode) {
      noteWrap.appendChild(textInput(plan.scheduleNote, (v) => { plan.scheduleNote = v; scheduleSave(); }));
    } else {
      noteWrap.textContent = plan.scheduleNote;
    }
    card.appendChild(noteWrap);
  }

  // ---------------- Workout Days ----------------
  function renderWorkoutDays() {
    const container = document.getElementById("workout-days");
    container.innerHTML = "";

    for (const key of Object.keys(plan.workoutDays)) {
      const day = plan.workoutDays[key];
      const card = el("div", { class: "card workout-day-card" });

      const heading = el("h3");
      heading.appendChild(el("span", { class: "workout-day-badge", text: key }));
      if (editMode) {
        heading.appendChild(textInput(day.name, (v) => { day.name = v; scheduleSave(); }, { class: "day-name-input" }));
      } else {
        heading.appendChild(el("span", { text: `${day.label} — ${day.name}` }));
      }
      card.appendChild(heading);

      const table = el("table", { class: "exercise-table" });
      const thead = el("thead", {}, el("tr", {}, [
        el("th", { text: "Exercise" }),
        el("th", { text: "Sets" }),
        el("th", { text: "Reps" }),
        el("th", { text: "Rest" }),
        editMode ? el("th", { text: "" }) : null,
      ]));
      table.appendChild(thead);

      const tbody = el("tbody");
      day.exercises.forEach((ex, i) => {
        const tr = el("tr");
        if (editMode) {
          tr.appendChild(el("td", { class: "ex-name" }, textInput(ex.name, (v) => { ex.name = v; scheduleSave(); })));
          tr.appendChild(el("td", { class: "ex-sets" }, numberInput(ex.sets, (v) => { ex.sets = v; scheduleSave(); })));
          tr.appendChild(el("td", { class: "ex-reps" }, textInput(String(ex.reps), (v) => { ex.reps = v; scheduleSave(); })));
          tr.appendChild(el("td", { class: "ex-rest" }, textInput(ex.rest, (v) => { ex.rest = v; scheduleSave(); })));
          tr.appendChild(el("td", { class: "ex-remove" }, el("button", { class: "remove-btn", text: "×", onclick: () => {
            day.exercises.splice(i, 1);
            scheduleSave();
            renderWorkoutDays();
          } })));
        } else {
          tr.appendChild(el("td", { class: "ex-name", text: ex.name }));
          tr.appendChild(el("td", { text: String(ex.sets) }));
          tr.appendChild(el("td", { text: String(ex.reps) }));
          tr.appendChild(el("td", { text: ex.rest }));
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);

      if (editMode) {
        card.appendChild(el("button", { class: "add-btn", text: "+ Add exercise", onclick: () => {
          day.exercises.push({ name: "New exercise", sets: 3, reps: "10-12", rest: "60 sec" });
          scheduleSave();
          renderWorkoutDays();
        } }));
      }

      container.appendChild(card);
    }
  }

  // ---------------- Progression ----------------
  function renderProgression() {
    const card = document.getElementById("progression-card");
    card.innerHTML = "";
    card.appendChild(el("h3", { text: "🔄 Progression Rule" }));
    if (editMode) {
      const textarea = el("textarea", { text: plan.progressionRule });
      textarea.addEventListener("input", () => { plan.progressionRule = textarea.value; scheduleSave(); });
      card.appendChild(textarea);
    } else {
      card.appendChild(el("p", { text: plan.progressionRule }));
    }
  }

  // ---------------- Timeline ----------------
  function renderTimeline() {
    const card = document.getElementById("timeline-card");
    card.innerHTML = "";
    const headRow = el("div", { class: "section-heading-row", style: "margin:0 0 6px" }, [
      el("h3", { text: "Milestones" }),
      editMode ? el("button", { class: "add-btn", text: "+ Add", onclick: () => {
        plan.timeline.push({ month: "", weight: "", milestone: "" });
        scheduleSave();
        renderTimeline();
      } }) : null,
    ]);
    card.appendChild(headRow);

    const list = el("ul", { class: "timeline-list" });
    plan.timeline.forEach((t, i) => {
      const li = el("li", { class: "timeline-row" });
      if (editMode) {
        li.appendChild(el("div", { class: "timeline-row__body" }, [
          textInput(t.month, (v) => { t.month = v; scheduleSave(); }, { placeholder: "Month" }),
          textInput(t.weight, (v) => { t.weight = v; scheduleSave(); }, { placeholder: "Weight" }),
          textInput(t.milestone, (v) => { t.milestone = v; scheduleSave(); }, { placeholder: "Milestone" }),
        ]));
        li.appendChild(el("button", { class: "remove-btn", text: "×", onclick: () => {
          plan.timeline.splice(i, 1);
          scheduleSave();
          renderTimeline();
        } }));
      } else {
        li.appendChild(el("div", { class: "timeline-row__dot" }));
        li.appendChild(el("div", { class: "timeline-row__body" }, [
          el("div", {}, [
            el("span", { class: "timeline-row__month", text: t.month + " " }),
            el("span", { class: "timeline-row__weight", text: t.weight }),
          ]),
          el("div", { class: "timeline-row__milestone", text: t.milestone }),
        ]));
      }
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  // ---------------- Weight Log ----------------
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function renderWeightLog() {
    const card = document.getElementById("weightlog-card");
    card.innerHTML = "";

    const form = el("div", { class: "weightlog-form" });
    const dateInput = el("input", { type: "date", value: todayISO() });
    const weightInput = el("input", { type: "number", step: "0.1", placeholder: "Weight (kg)" });
    const addBtn = el("button", { text: "Log" });
    addBtn.addEventListener("click", () => {
      const w = Number(weightInput.value);
      if (!w || w <= 0) { showToast("Enter a valid weight"); return; }
      plan.weightLog.push({ date: dateInput.value || todayISO(), weight: w });
      plan.weightLog.sort((a, b) => a.date.localeCompare(b.date));
      scheduleSave();
      weightInput.value = "";
      renderWeightLog();
      showToast("Weigh-in logged");
    });
    form.appendChild(dateInput);
    form.appendChild(weightInput);
    form.appendChild(addBtn);
    card.appendChild(form);

    if (plan.weightLog.length === 0) {
      card.appendChild(el("div", { class: "weightlog-empty", text: "No weigh-ins logged yet. Add your Monday morning weight above." }));
      return;
    }

    card.appendChild(renderWeightChart(plan.weightLog));

    const list = el("ul", { class: "weightlog-list" });
    [...plan.weightLog].reverse().forEach((entry) => {
      const realIndex = plan.weightLog.indexOf(entry);
      const li = el("li");
      li.appendChild(el("span", { class: "wl-date", text: entry.date }));
      li.appendChild(el("span", { class: "wl-weight", text: `${entry.weight} kg` }));
      li.appendChild(el("button", { class: "remove-btn", text: "×", onclick: () => {
        plan.weightLog.splice(realIndex, 1);
        scheduleSave();
        renderWeightLog();
      } }));
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  function renderWeightChart(entries) {
    const width = 300, height = 140, padX = 10, padY = 16;
    const weights = entries.map((e) => e.weight);
    const min = Math.min(...weights, plan.stats.currentWeight) - 1;
    const max = Math.max(...weights, plan.stats.targetWeightHigh) + 1;
    const span = max - min || 1;

    const xStep = entries.length > 1 ? (width - padX * 2) / (entries.length - 1) : 0;
    const yFor = (w) => height - padY - ((w - min) / span) * (height - padY * 2);
    const points = entries.map((e, i) => [padX + i * xStep, yFor(e.weight)]);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "weightlog-chart");
    svg.setAttribute("preserveAspectRatio", "none");

    // target band
    const targetY1 = yFor(plan.stats.targetWeightHigh);
    const targetY2 = yFor(plan.stats.targetWeightLow);
    const band = document.createElementNS(svgNS, "rect");
    band.setAttribute("x", "0");
    band.setAttribute("y", String(targetY1));
    band.setAttribute("width", String(width));
    band.setAttribute("height", String(Math.max(1, targetY2 - targetY1)));
    band.setAttribute("fill", "var(--accent)");
    band.setAttribute("opacity", "0.12");
    svg.appendChild(band);

    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", points.map((p) => p.join(",")).join(" "));
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "var(--accent)");
    polyline.setAttribute("stroke-width", "2.5");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("stroke-linecap", "round");
    svg.appendChild(polyline);

    for (const [x, y] of points) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", String(x));
      c.setAttribute("cy", String(y));
      c.setAttribute("r", "3.5");
      c.setAttribute("fill", "var(--accent)");
      svg.appendChild(c);
    }

    return svg;
  }

  // ---------------- Render all ----------------
  function renderAll() {
    renderStats();
    renderNutrition();
    renderTiming();
    renderRules();
    renderMeals();
    renderSchedule();
    renderWorkoutDays();
    renderProgression();
    renderTimeline();
    renderWeightLog();
  }

  // ---------------- Tabs ----------------
  function initTabs() {
    const buttons = document.querySelectorAll(".tab-bar__btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        buttons.forEach((b) => b.classList.toggle("active", b === btn));
        document.querySelectorAll(".tab-panel").forEach((panel) => {
          panel.classList.toggle("hidden", panel.dataset.tabPanel !== tab);
        });
        window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      });
    });
  }

  // ---------------- Edit mode ----------------
  function initEditToggle() {
    const toggle = document.getElementById("edit-mode-toggle");
    toggle.addEventListener("change", () => {
      editMode = toggle.checked;
      renderAll();
    });
  }

  // ---------------- Menu (export / import / reset) ----------------
  function initMenu() {
    const menuBtn = document.getElementById("menu-btn");
    const popover = document.getElementById("menu-popover");

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = popover.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener("click", (e) => {
      if (!popover.contains(e.target) && e.target !== menuBtn) {
        popover.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.getElementById("export-btn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: `bulk-plan-${todayISO()}.json` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      popover.classList.add("hidden");
      showToast("Plan exported");
    });

    const fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", () => {
      fileInput.click();
      popover.classList.add("hidden");
    });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
        plan = { ...structuredClone(DEFAULT_PLAN), ...parsed };
        savePlan(plan);
        renderAll();
        showToast("Plan imported");
      } catch (err) {
        console.error(err);
        showToast("Import failed: invalid file");
      } finally {
        fileInput.value = "";
      }
    });

    document.getElementById("reset-btn").addEventListener("click", () => {
      popover.classList.add("hidden");
      if (!confirm("Reset the plan to the original default? Your edits and weight log will be lost (export first if you want a backup).")) return;
      plan = structuredClone(DEFAULT_PLAN);
      savePlan(plan);
      renderAll();
      showToast("Plan reset to default");
    });
  }

  // ---------------- Add meal button ----------------
  function initAddMeal() {
    document.getElementById("add-meal-btn").addEventListener("click", addMeal);
  }

  // ---------------- Install prompt ----------------
  function initInstallPrompt() {
    let deferredPrompt = null;
    const installBtn = document.getElementById("install-btn");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.classList.remove("hidden");
    });
    installBtn.addEventListener("click", async () => {
      document.getElementById("menu-popover").classList.add("hidden");
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.add("hidden");
    });
    window.addEventListener("appinstalled", () => {
      installBtn.classList.add("hidden");
      showToast("App installed");
    });
  }

  // ---------------- Service worker ----------------
  function initServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch((err) => {
          console.warn("Service worker registration failed", err);
        });
      });
    }
  }

  function init() {
    initTabs();
    initEditToggle();
    initMenu();
    initAddMeal();
    initInstallPrompt();
    initServiceWorker();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
