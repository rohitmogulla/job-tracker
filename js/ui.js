// DOM rendering and form handling. User data is always set via textContent, never innerHTML.

import { STATUSES, todayISO } from './jobs.js';

const form = document.getElementById('job-form');
const listEl = document.getElementById('job-list');
const emptyEl = document.getElementById('empty-state');
const messageEl = document.getElementById('form-message');
const statusSelect = document.getElementById('status');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const summaryEl = document.getElementById('summary');
const filterStatusEl = document.getElementById('filter-status');
const resultCountEl = document.getElementById('result-count');
const backupMessageEl = document.getElementById('backup-message');
const importDialog = document.getElementById('import-dialog');
const importSummaryEl = document.getElementById('import-summary');
const importWarningEl = document.getElementById('import-warning');
const importReplaceBtn = document.getElementById('import-replace');
const importMergeBtn = document.getElementById('import-merge');

const FIELDS = ['company', 'role', 'link', 'dateApplied', 'status', 'notes'];

/** Populate the status <select> and set form defaults. Call once on startup. */
export function initForm() {
  for (const status of STATUSES) {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = status;
    statusSelect.append(opt);
  }
  // Link each error message to its input so screen readers announce it.
  for (const errEl of form.querySelectorAll('[data-error-for]')) {
    const name = errEl.dataset.errorFor;
    errEl.id = `${name}-error`;
    form.elements[name].setAttribute('aria-describedby', errEl.id);
  }
  for (const status of ['All', ...STATUSES]) {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = status === 'All' ? 'All statuses' : status;
    filterStatusEl.append(opt);
  }
  resetForm();
}

/** Show total + per-status counts (always across all jobs, not just the filtered ones). */
export function renderSummary(counts, total) {
  const items = [['Total', total, '']].concat(
    STATUSES.map((s) => [s, counts[s], `badge-${s.toLowerCase()}`])
  );
  summaryEl.replaceChildren(
    ...items.map(([label, count, cls]) => {
      const li = el('li', `summary-item ${cls}`.trim());
      li.append(el('span', 'summary-count', String(count)), el('span', 'summary-label', label));
      return li;
    })
  );
}

/** "Showing 3 of 10" when filters hide some jobs; blank otherwise. */
export function renderResultCount(shown, total) {
  resultCountEl.textContent = shown < total ? `Showing ${shown} of ${total}` : '';
}

export function readForm() {
  return Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));
}

export function resetForm() {
  form.reset();
  form.elements.dateApplied.value = todayISO();
  form.elements.status.value = 'Applied';
  showErrors({});
  setFormMode(false);
}

/** Load a job into the form for editing. */
export function fillForm(job) {
  showErrors({});
  for (const name of FIELDS) form.elements[name].value = job[name] || '';
  setFormMode(true);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.company.focus({ preventScroll: true });
}

function setFormMode(editing) {
  formTitle.textContent = editing ? 'Edit job' : 'Add a job';
  submitBtn.textContent = editing ? 'Save changes' : 'Add job';
  cancelBtn.hidden = !editing;
}

function setFieldError(name, msg) {
  const input = form.elements[name];
  if (!input) return;
  const errEl = form.querySelector(`[data-error-for="${name}"]`);
  if (errEl) errEl.textContent = msg;
  input.closest('.field').classList.toggle('has-error', Boolean(msg));
  if (msg) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

export function showErrors(errors) {
  for (const name of FIELDS) setFieldError(name, errors[name] || '');
  const firstInvalid = FIELDS.find((name) => errors[name]);
  if (firstInvalid) form.elements[firstInvalid].focus();
}

/** Clear one field's error, e.g. as soon as the user starts fixing it. */
export function clearFieldError(name) {
  if (FIELDS.includes(name)) setFieldError(name, '');
}

export function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('is-error', isError);
}

export function showBackupMessage(text, isError = false) {
  backupMessageEl.textContent = text;
  backupMessageEl.classList.toggle('is-error', isError);
}

/** Download `data` as a pretty-printed JSON file. */
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "1 job", "3 jobs" */
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Ask whether to merge or replace. Resolves to 'merge', 'replace', or 'cancel'.
 * When the current list is empty there's nothing to replace, so only "Import" is offered.
 */
export function askImportMode({ fileName, found, skipped, current }) {
  const summary = [
    'Found ',
    el('strong', '', plural(found, 'job')),
    ' in ',
    el('strong', '', fileName),
  ];
  if (skipped) summary.push(` (${skipped} skipped as invalid)`);
  summary.push('. ');
  summary.push(current ? ['You currently have ', el('strong', '', String(current)), '.'] : 'Your list is empty.');
  importSummaryEl.replaceChildren(...summary.flat());

  importWarningEl.textContent = current
    ? `Replace all deletes your ${plural(current, 'current job')}. Export first if you might need them.`
    : '';
  importReplaceBtn.hidden = current === 0;
  importMergeBtn.textContent = current ? 'Merge' : 'Import';

  importDialog.returnValue = '';
  importDialog.showModal();
  return new Promise((resolve) => {
    importDialog.addEventListener(
      'close',
      () => resolve(['merge', 'replace'].includes(importDialog.returnValue) ? importDialog.returnValue : 'cancel'),
      { once: true }
    );
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  // Construct in local time so the date doesn't shift across time zones.
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderActions(job) {
  const actions = el('div', 'job-actions');

  const label = el('label', 'status-control');
  label.append(el('span', '', 'Status'));
  const select = el('select');
  select.dataset.action = 'status';
  for (const status of STATUSES) {
    const opt = el('option', '', status);
    opt.value = status;
    select.append(opt);
  }
  select.value = job.status;
  label.append(select);

  const edit = el('button', 'btn btn-small', 'Edit');
  edit.type = 'button';
  edit.dataset.action = 'edit';
  edit.setAttribute('aria-label', `Edit ${job.role} at ${job.company}`);

  const del = el('button', 'btn btn-small btn-danger', 'Delete');
  del.type = 'button';
  del.dataset.action = 'delete';
  del.setAttribute('aria-label', `Delete ${job.role} at ${job.company}`);

  actions.append(label, edit, del);
  return actions;
}

function renderJob(job, editingId) {
  const li = el('li', 'job-card');
  li.classList.toggle('is-editing', job.id === editingId);
  li.dataset.id = job.id;

  const head = el('div', 'job-card-head');
  const title = el('h3', 'job-title', job.role);
  title.append(' ', el('span', 'job-company', `at ${job.company}`));
  const badge = el('span', `badge badge-${job.status.toLowerCase()}`, job.status);
  head.append(title, badge);
  li.append(head);

  const meta = el('p', 'job-meta');
  meta.append(el('span', '', `Applied ${formatDate(job.dateApplied)}`));
  if (job.link) {
    const a = el('a', '', 'View posting');
    a.href = job.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    meta.append(a);
  }
  li.append(meta);

  if (job.notes) {
    const notes = el('p', 'job-notes', job.notes);
    notes.title = 'Click to expand';
    li.append(notes);
  }

  li.append(renderActions(job));
  return li;
}

/**
 * Render the job list.
 * @param {Array} jobs - jobs to display (already filtered/sorted)
 * @param {object} options
 * @param {string|null} options.editingId - id of the job currently in the form, highlighted
 * @param {string} options.emptyText - message to show when the list is empty
 */
export function renderList(
  jobs,
  { editingId = null, emptyText = 'No jobs yet. Add your first application above.' } = {}
) {
  listEl.replaceChildren(...jobs.map((job) => renderJob(job, editingId)));
  emptyEl.hidden = jobs.length > 0;
  emptyEl.textContent = emptyText;
}

/** Toggle expanded notes on click (event delegation). */
listEl.addEventListener('click', (e) => {
  const notes = e.target.closest('.job-notes');
  if (notes) notes.classList.toggle('is-expanded');
});
