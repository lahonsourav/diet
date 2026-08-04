# Rapid Bulk Plan

An installable PWA for a diet + home workout plan. No build step, no
dependencies — plain HTML/CSS/JS.

## Run locally

```
npx http-server -p 8080 .
```

Then open `http://localhost:8080`.

## Editing the plan

Toggle **Edit** in the header to edit stats, meals, exercises, the weekly
schedule, timeline, and golden rules directly in the app — add or remove
items with the +/× controls. Everything is saved to the browser's
`localStorage` as you type.

Use the **⋮** menu to export your plan as JSON (for backup), import a JSON
file, or reset to the original defaults.

## Installing as an app

Open the site in a browser and use "Add to Home Screen" (mobile) or the
install icon in the address bar (desktop Chrome/Edge). It also works
offline once installed, via the included service worker.
