(() => {
  "use strict";

  let plan = loadPlan();
  let editMode = false;
  let saveTimer = null;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      savePlan(plan);
      scheduleAllReminders();
    }, 250);
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

  // ---------------- Reminders ----------------
  // Best-effort local reminders: they fire via a timer while this app/tab
  // is open (foreground or backgrounded), using the Notification API. A
  // fully-closed app can't be woken up without a push server, so there's
  // no true "closed app" alarm here — the UI is upfront about that.
  let reminderTimers = [];

  function clearReminders() {
    reminderTimers.forEach(clearTimeout);
    reminderTimers = [];
  }

  function parseTimeString(str) {
    const m = String(str || "").match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const isPM = /p/i.test(m[3]);
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return { h, min };
  }

  function nextOccurrence(h, min, daysAllowed) {
    const now = new Date();
    for (let addDays = 0; addDays < 8; addDays++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + addDays, h, min, 0, 0);
      if (d <= now) continue;
      if (!daysAllowed || daysAllowed.includes(d.getDay())) return d;
    }
    return null;
  }

  function scheduleAt(date, fn) {
    if (!date) return;
    const delay = date.getTime() - Date.now();
    if (delay <= 0 || delay > 2147483647) return; // guard past times / setTimeout overflow
    reminderTimers.push(setTimeout(fn, delay));
  }

  function notify(title, body, tag) {
    const options = { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options))
        .catch(() => {
          try { new Notification(title, options); } catch (e) { /* unsupported */ }
        });
    } else if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, options); } catch (e) { /* unsupported */ }
    }
  }

  function scheduleAllReminders() {
    clearReminders();
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    if (plan.settings.mealRemindersEnabled) {
      plan.meals.forEach((meal) => {
        const t = parseTimeString(meal.time);
        if (!t) return;
        const fire = () => {
          notify(`🍽️ ${meal.title} time`, meal.items[0] ? meal.items[0] : "Time to eat!", `meal-${meal.id}`);
          scheduleAt(nextOccurrence(t.h, t.min, null), fire);
        };
        scheduleAt(nextOccurrence(t.h, t.min, null), fire);
      });
    }
  }

  function buildReminderToggle(settingKey, labelText, rerender) {
    const wrap = el("div", { class: "reminder-row" });
    const supported = "Notification" in window;
    const permission = supported ? Notification.permission : "unsupported";

    const label = el("label", { class: "switch reminder-switch" });
    const input = el("input", { type: "checkbox" });
    input.checked = !!plan.settings[settingKey];
    input.disabled = !supported || permission === "denied";
    label.appendChild(input);
    label.appendChild(el("span", { class: "switch__track" }, el("span", { class: "switch__thumb" })));
    label.appendChild(el("span", { class: "switch__label", text: labelText }));
    wrap.appendChild(label);

    const status = el("p", { class: "reminder-status" });
    if (!supported) {
      status.textContent = "Notifications aren't supported in this browser.";
    } else if (permission === "denied") {
      status.classList.add("warn");
      status.textContent = "Notifications are blocked for this site — enable them in your browser's site settings to use reminders.";
    } else {
      status.textContent = "Reminders fire while this app stays open in the background. For best results, add it to your Home Screen and leave it running.";
    }
    wrap.appendChild(status);

    input.addEventListener("change", async () => {
      if (input.checked && supported && Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          input.checked = false;
          rerender();
          return;
        }
      }
      plan.settings[settingKey] = input.checked;
      scheduleSave();
      rerender();
    });

    return wrap;
  }

  function renderMealReminders() {
    const card = document.getElementById("meal-reminders-card");
    card.innerHTML = "";
    card.appendChild(el("h3", { text: "🔔 Meal Reminders" }));
    card.appendChild(buildReminderToggle("mealRemindersEnabled", "Notify me at each meal time", renderMealReminders));
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


  // ---------------- Weight Log ----------------
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function syncCurrentWeightFromLog() {
    if (plan.weightLog.length === 0) return;
    const latest = plan.weightLog[plan.weightLog.length - 1];
    plan.stats.currentWeight = latest.weight;
  }

  function renderWeightLog() {
    const card = document.getElementById("weightlog-card");
    card.innerHTML = "";

    const summary = el("div", { class: "stats-grid weightlog-summary" }, [
      el("div", { class: "stat-box" }, [
        el("div", { class: "stat-box__label", text: "Current Weight" }),
        el("div", { class: "stat-box__value", text: `${plan.stats.currentWeight} kg` }),
      ]),
      el("div", { class: "stat-box" }, [
        el("div", { class: "stat-box__label", text: "Target Weight" }),
        el("div", { class: "stat-box__value", text: `${plan.stats.targetWeightLow}–${plan.stats.targetWeightHigh} kg` }),
      ]),
    ]);
    card.appendChild(summary);

    const form = el("div", { class: "weightlog-form" });
    const dateInput = el("input", { type: "date", value: todayISO() });
    const weightInput = el("input", { type: "number", step: "0.1", placeholder: "Weight (kg)" });
    const addBtn = el("button", { text: "Log" });
    addBtn.addEventListener("click", () => {
      const w = Number(weightInput.value);
      if (!w || w <= 0) { showToast("Enter a valid weight"); return; }
      plan.weightLog.push({ date: dateInput.value || todayISO(), weight: w });
      plan.weightLog.sort((a, b) => a.date.localeCompare(b.date));
      syncCurrentWeightFromLog();
      scheduleSave();
      weightInput.value = "";
      renderWeightLog();
      renderStats();
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
        syncCurrentWeightFromLog();
        scheduleSave();
        renderWeightLog();
        renderStats();
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
    renderRules();
    renderMeals();
    renderMealReminders();
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
    if (!("serviceWorker" in navigator)) return;

    // If a controller is already present, this is a returning visit under
    // an existing worker — a later controllerchange means a real update
    // landed and swapped it out, so the stale already-loaded page should
    // reload. If there's no controller yet, the first controllerchange is
    // just this worker claiming the page for the first time, not an update.
    let hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((reg) => {
          // iOS Safari in particular rarely re-checks an installed PWA's
          // service worker on its own, so ask explicitly whenever the app
          // is opened or comes back into view instead of waiting on that.
          reg.update();
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") reg.update();
          });
        })
        .catch((err) => {
          console.warn("Service worker registration failed", err);
        });
    });
  }

  function init() {
    initTabs();
    initEditToggle();
    initMenu();
    initAddMeal();
    initInstallPrompt();
    initServiceWorker();
    renderAll();
    scheduleAllReminders();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleAllReminders();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
