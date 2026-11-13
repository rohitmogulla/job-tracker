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

const FIELDS = ['company', 'role', 'link', 'dateApplied', 'status', 'notes'];

/** Populate the status <select> and set form defaults. Call once on startup. */
export function initForm() {
  for (const status of STATUSES) {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = status;
    statusSelect.append(opt);
  }
  resetForm();
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

export function showErrors(errors) {
  for (const name of FIELDS) {
    const errEl = form.querySelector(`[data-error-for="${name}"]`);
    const input = form.elements[name];
    const msg = errors[name] || '';
    if (errEl) errEl.textContent = msg;
    input.closest('.field').classList.toggle('has-error', Boolean(msg));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  const firstInvalid = FIELDS.find((name) => errors[name]);
  if (firstInvalid) form.elements[firstInvalid].focus();
}

export function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('is-error', isError);
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
