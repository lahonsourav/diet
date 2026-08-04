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
      time: "7:30 AM",
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
  workoutDays: {
    A: {
      label: "Day A",
      name: "Push + Legs",
      exercises: [
        { name: "Push-ups", sets: 3, reps: "10-15", rest: "60 sec" },
        { name: "Wide push-ups", sets: 3, reps: "10-12", rest: "60 sec" },
        { name: "Pike push-ups (shoulders)", sets: 3, reps: "8-10", rest: "60 sec" },
        { name: "Squats (bodyweight)", sets: 4, reps: "15-20", rest: "60 sec" },
        { name: "Lunges", sets: 3, reps: "12 each leg", rest: "60 sec" },
        { name: "Glute bridge", sets: 3, reps: "15", rest: "45 sec" },
        { name: "Plank", sets: 3, reps: "30-45 sec", rest: "45 sec" },
      ],
    },
    B: {
      label: "Day B",
      name: "Pull + Core",
      exercises: [
        { name: "Chair/table rows (home row)", sets: 3, reps: "10-12", rest: "60 sec" },
        { name: "Superman hold (back)", sets: 3, reps: "12", rest: "45 sec" },
        { name: "Doorframe bicep curl (resistance)", sets: 3, reps: "12", rest: "60 sec" },
        { name: "Leg raises", sets: 3, reps: "12-15", rest: "45 sec" },
        { name: "Crunches", sets: 3, reps: "20", rest: "45 sec" },
        { name: "Mountain climbers", sets: 3, reps: "20", rest: "45 sec" },
        { name: "Side plank", sets: 3, reps: "20 sec each", rest: "45 sec" },
      ],
    },
  },
  // 7 entries, Monday first. Value is a key into workoutDays, or "Rest".
  schedule: ["A", "Rest", "B", "Rest", "A", "Rest", "Rest"],
  scheduleNote:
    "Next week flip — Day B on Monday, Day A on Wednesday & Friday.",
  progressionRule:
    "Every 2 weeks, increase either reps or sets by 1. This forces your muscles to keep growing.",
  workoutTiming: [
    {
      label: "Best",
      when: "6:00-7:00 PM (after evening meal)",
      why: "Eggs + banana = perfect pre-workout fuel",
    },
    {
      label: "Good",
      when: "Morning 7:00 AM",
      why: "Before breakfast shake",
    },
  ],
  timeline: [
    { month: "Start", weight: "58 kg", milestone: "Begin diet + workout" },
    { month: "Month 1", weight: "59.5-60 kg", milestone: "Body adapting" },
    { month: "Month 2", weight: "61-61.5 kg", milestone: "Strength increasing" },
    { month: "Month 3", weight: "62.5-63 kg", milestone: "Visible muscle growth" },
    { month: "Month 6", weight: "65-66 kg", milestone: "Target achieved" },
  ],
  goldenRules: [
    "Eat within 30 mins after workout — this is the most important window for muscle gain",
    "Sleep 7-8 hours — 70% of muscle is built during sleep, not workout",
    "Weigh every Monday morning — adjust plan if not gaining 0.5 kg/month",
    "Don't skip meals — set phone alarms for every meal time",
    "Stay consistent — 3 months of discipline beats 3 weeks of perfection",
  ],
  // User-logged weigh-ins, kept separate from the static timeline above.
  weightLog: [],
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
