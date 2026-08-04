// Default plan data. Users edit this at runtime via the UI; edits are
// persisted to localStorage (see app.js). This object is only the
// fallback used the first time the app loads, or after a Reset.
const DEFAULT_PLAN = {
  version: 1,
  stats: {
    height: "5'6\"",
    currentWeight: 58,
    targetWeightLow: 65,
    targetWeightHigh: 66,
    dailyCalories: 2700,
    trainingDaysPerWeek: 3,
    trainingLocation: "Home",
  },
  nutrition: {
    calories: 2700,
    protein: 175,
    carbs: 310,
    fats: 85,
  },
  meals: [
    {
      id: "m1",
      time: "10:00 AM",
      title: "Breakfast",
      calories: 650,
      items: [
        "Super banana shake (2 bananas + 300ml full-fat milk + 2 tbsp peanut butter + 2 tbsp oats)",
        "2 whole wheat bread slices + 1 tbsp peanut butter",
      ],
    },
    {
      id: "m2",
      time: "11:00 AM",
      title: "Snack",
      calories: 300,
      items: [
        "30g mixed dry fruits (almonds, cashews, raisins)",
        "20g peanuts",
        "1 apple",
      ],
    },
    {
      id: "m3",
      time: "1:30 PM",
      title: "Lunch",
      calories: 800,
      items: [
        "200g chicken curry / grilled",
        "2 cups cooked rice",
        "1 bowl dal",
        "1 bowl vegetable sabzi",
        "1 tsp ghee on rice",
      ],
    },
    {
      id: "m4",
      time: "5:30 PM",
      title: "Evening",
      calories: 420,
      items: [
        "4 whole eggs (cooked in butter)",
        "1 banana",
        "1 glass full-fat milk",
      ],
    },
    {
      id: "m5",
      time: "8:30 PM",
      title: "Dinner",
      calories: 600,
      items: ["200g chicken", "2 cups rice or 3 rotis", "1 bowl dal"],
    },
    {
      id: "m6",
      time: "10:30 PM",
      title: "Before Bed",
      calories: 330,
      items: ["Mass gainer with 200ml milk"],
    },
  ],
  goldenRules: [
    "Eat within 30 mins after workout — this is the most important window for muscle gain",
    "Sleep 7-8 hours — 70% of muscle is built during sleep, not workout",
    "Weigh every Monday morning — adjust plan if not gaining 0.5 kg/month",
    "Don't skip meals — set phone alarms for every meal time",
    "Stay consistent — 3 months of discipline beats 3 weeks of perfection",
  ],
  // User-logged weigh-ins — this is the source of truth for progress.
  weightLog: [],
  settings: {
    mealRemindersEnabled: false,
  },
};

const STORAGE_KEY = "bulkPlan.data.v1";

function loadPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PLAN);
    const parsed = JSON.parse(raw);
    // Shallow-merge with defaults so newly-added fields in future updates
    // still show up for users with older saved data.
    return { ...structuredClone(DEFAULT_PLAN), ...parsed };
  } catch (e) {
    console.warn("Failed to load saved plan, using defaults", e);
    return structuredClone(DEFAULT_PLAN);
  }
}

function savePlan(plan) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}
