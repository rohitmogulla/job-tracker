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
- Export and import a JSON backup (see below).

## Backup and restore

- **Export JSON** downloads every job (search and filters are ignored) as `job-tracker-backup-YYYY-MM-DD.json`.
- **Import JSON** reads a backup file, tells you how many jobs it found, and lets you choose:
  - **Merge:** adds jobs you don't have. For a job that's in both, keeps whichever copy was changed most recently, so an old backup never undoes newer edits.
  - **Replace all:** deletes your current list and uses the file's jobs instead. Export first if you might need the current list.
- Imported data goes through the same checks as data loaded on startup. Entries with no company or role are skipped, and links that aren't `http(s)` are removed.
- Jobs are matched by a hidden ID that's kept through export and import. The same job typed in separately in two browsers has two different IDs, so merging those lists will show it twice.
- Import also accepts a plain JSON array of jobs. Files over 5 MB, or made by a newer version of the app, are rejected.

## Where your data lives

Everything is stored under the `localStorage` key `jobTracker.v1`, as `{ "version": 1, "jobs": [...] }`.

- Data stays in **this browser on this device** only. A different browser, a different device, or a private window won't see it.
- Clearing your browser's site data deletes it. Use **Export JSON** to keep a backup.
- Data is tied to the address the page is served from. `http://127.0.0.1:5500` (Live Server) and `http://localhost:8000` count as different sites, so each has its own separate list.
- Open tabs stay in sync with each other.

## Project structure

```
index.html       Page layout
css/styles.css   Styles
js/storage.js    Reading and writing localStorage (the only file that touches it)
js/jobs.js       Data functions: create, update, delete, validate, filter, sort, count, backup
js/ui.js         Rendering the list and handling the form
js/app.js        Entry point: app state and event wiring
```

User-entered text is always inserted with `textContent`, never `innerHTML`. Saved data is checked on load, and any link that isn't `http(s)` is removed.
