// The only module that touches localStorage.

export const STORAGE_KEY = 'jobTracker.v1';
const VERSION = 1;

/**
 * Load jobs from localStorage.
 * Returns [] if nothing is stored, the data is corrupt, or storage is unavailable.
 */
export function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.jobs)) return [];
    return data.jobs;
  } catch (err) {
    console.warn('Could not load saved jobs; starting fresh.', err);
    return [];
  }
}

/**
 * Save jobs to localStorage.
 * Returns { ok: true } or { ok: false, error } (e.g. quota exceeded, private mode).
 */
export function saveJobs(jobs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, jobs }));
    return { ok: true };
  } catch (err) {
    console.error('Could not save jobs.', err);
    return { ok: false, error: 'Could not save. Your browser storage may be full or disabled.' };
  }
}
