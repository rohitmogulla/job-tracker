# Job Tracker

A simple single-page app for tracking job applications. Plain HTML, CSS, and JavaScript, with no build step and no dependencies. Your data is saved in your browser's `localStorage`.

## Running it

The JavaScript uses ES modules, so the page has to be served over HTTP. Opening `index.html` directly (`file://`) won't work.

- **VS Code:** install the Live Server extension, right-click `index.html`, and choose **Open with Live Server**.
- **Terminal:** run `python3 -m http.server` in this folder and open <http://localhost:8000>.

## Features

- Add a job with company, role, link, date applied, status, and notes. Company and role are required. The date defaults to today and the status to Applied. Links typed without `https://` get it added.
- Edit a job in the same form. Press **Cancel** or **Esc** to stop editing.
- Delete a job (asks for confirmation).
- Change a job's status straight from the list.
- Search company, role, and notes; filter by status; sort by date or company.
- Counts of jobs per status.
- Long notes are cut to two lines; click to expand.

## Where your data lives

Everything is stored under the `localStorage` key `jobTracker.v1`, as `{ "version": 1, "jobs": [...] }`.

- Data stays in **this browser on this device** only. A different browser, a different device, or a private window won't see it.
- Clearing your browser's site data deletes it. There's no backup or export yet.
- Data is tied to the address the page is served from. `http://127.0.0.1:5500` (Live Server) and `http://localhost:8000` count as different sites, so each has its own separate list.
- Open tabs stay in sync with each other.

## Project structure

```
index.html       Page layout
css/styles.css   Styles
js/storage.js    Reading and writing localStorage (the only file that touches it)
js/jobs.js       Data functions: create, update, delete, validate, filter, sort, count
js/ui.js         Rendering the list and handling the form
js/app.js        Entry point: app state and event wiring
```

User-entered text is always inserted with `textContent`, never `innerHTML`. Saved data is checked on load, and any link that isn't `http(s)` is removed.
