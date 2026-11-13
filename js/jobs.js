// Pure data functions for jobs. No DOM, no storage.

export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

/** Today's date as YYYY-MM-DD in the user's local time zone. */
export function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Add https:// to links typed without a protocol, e.g. "example.com/job". */
export function normalizeLink(link) {
  const trimmed = (link || '').trim();
  if (!trimmed) return '';
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim and normalize raw form fields. */
function clean(fields) {
  return {
    company: str(fields.company),
    role: str(fields.role),
    link: normalizeLink(str(fields.link)),
    dateApplied: str(fields.dateApplied) || todayISO(),
    status: STATUSES.includes(fields.status) ? fields.status : 'Applied',
    notes: str(fields.notes),
  };
}

/**
 * Make data loaded from storage safe to render: drop entries without a company/role,
 * fill missing fields, fix duplicate ids, and remove any link that isn't http(s)
 * (e.g. a tampered "javascript:" link).
 */
export function sanitizeJobs(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const c = clean(raw);
    if (!c.company || !c.role) return [];
    if (c.link && !isValidHttpUrl(c.link)) c.link = '';
    if (!DATE_RE.test(c.dateApplied)) c.dateApplied = todayISO();
    const id = typeof raw.id === 'string' && raw.id && !seen.has(raw.id) ? raw.id : newId();
    seen.add(id);
    const createdAt = Number(raw.createdAt) || Date.now();
    return [{ id, ...c, createdAt, updatedAt: Number(raw.updatedAt) || createdAt }];
  });
}

/**
 * Validate raw form fields.
 * Returns an object mapping field name -> error message (empty object if valid).
 */
export function validateJob(fields) {
  const errors = {};
  const c = clean(fields);
  if (!c.company) errors.company = 'Company is required.';
  if (!c.role) errors.role = 'Role is required.';
  if (c.link && !isValidHttpUrl(c.link)) errors.link = 'Enter a valid web address.';
  if (fields.status && !STATUSES.includes(fields.status)) errors.status = 'Pick a valid status.';
  if (!DATE_RE.test(c.dateApplied)) {
    errors.dateApplied = 'Enter a valid date.';
  }
  return errors;
}

/** crypto.randomUUID only exists in secure contexts (https/localhost); fall back elsewhere. */
function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Build a new job object from form fields. */
export function createJob(fields) {
  const now = Date.now();
  return {
    id: newId(),
    ...clean(fields),
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a new array with the job matching `id` updated. */
export function updateJob(jobs, id, fields) {
  return jobs.map((job) =>
    job.id === id
      ? { ...job, ...clean({ ...job, ...fields }), updatedAt: Date.now() }
      : job
  );
}

/** Return a new array without the job matching `id`. */
export function deleteJob(jobs, id) {
  return jobs.filter((job) => job.id !== id);
}

/** Filter by status ('All' or a status) and a case-insensitive search over company/role/notes. */
export function filterJobs(jobs, { status = 'All', search = '' } = {}) {
  const q = search.trim().toLowerCase();
  return jobs.filter((job) => {
    if (status !== 'All' && job.status !== status) return false;
    if (!q) return true;
    return [job.company, job.role, job.notes].some((v) => (v || '').toLowerCase().includes(q));
  });
}

/** Sort by 'dateApplied' or 'company'. dir is 'asc' or 'desc'. Returns a new array. */
export function sortJobs(jobs, key = 'dateApplied', dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return [...jobs].sort((a, b) => {
    let cmp;
    if (key === 'company') {
      cmp = a.company.localeCompare(b.company, undefined, { sensitivity: 'base' });
    } else {
      cmp = (a.dateApplied || '').localeCompare(b.dateApplied || '');
    }
    // Tie-break on creation time so order is stable and newest entries come first.
    return cmp !== 0 ? cmp * sign : (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/** Count jobs per status, e.g. { Applied: 3, Interview: 1, Offer: 0, Rejected: 2 }. */
export function countByStatus(jobs) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const job of jobs) {
    if (job.status in counts) counts[job.status] += 1;
  }
  return counts;
}
