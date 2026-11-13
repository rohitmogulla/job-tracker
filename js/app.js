// Entry point: holds state, wires events, and re-renders after every change.

import { STORAGE_KEY, loadJobs, saveJobs } from './storage.js';
import {
  sanitizeJobs,
  createJob,
  updateJob,
  deleteJob,
  validateJob,
  filterJobs,
  sortJobs,
  countByStatus,
} from './jobs.js';
import {
  initForm,
  readForm,
  resetForm,
  fillForm,
  showErrors,
  clearFieldError,
  showMessage,
  renderList,
  renderSummary,
  renderResultCount,
} from './ui.js';

const state = {
  jobs: sanitizeJobs(loadJobs()),
  editingId: null,
  filter: 'All',
  search: '',
  sort: { key: 'dateApplied', dir: 'desc' },
};

function hasActiveFilters() {
  return state.filter !== 'All' || state.search.trim() !== '';
}

function render() {
  const visible = sortJobs(
    filterJobs(state.jobs, { status: state.filter, search: state.search }),
    state.sort.key,
    state.sort.dir
  );
  const emptyText =
    state.jobs.length === 0
      ? 'No jobs yet. Add your first application above.'
      : 'No jobs match your search or filter.';

  renderList(visible, { editingId: state.editingId, emptyText });
  renderSummary(countByStatus(state.jobs), state.jobs.length);
  renderResultCount(visible.length, state.jobs.length);
}

/** Apply a change to the job list, save it, and re-render. Leaves state unchanged if saving fails. */
function commit(nextJobs) {
  const result = saveJobs(nextJobs);
  if (!result.ok) {
    showMessage(result.error, true);
    return false;
  }
  state.jobs = nextJobs;
  render();
  return true;
}

function findJob(id) {
  return state.jobs.find((job) => job.id === id);
}

/** Note when a job the user just added or edited is hidden by the current filters. */
function hiddenNote(job) {
  if (!hasActiveFilters()) return '';
  const visible = filterJobs([job], { status: state.filter, search: state.search }).length > 0;
  return visible ? '' : ' (hidden by the current filter)';
}

function stopEditing() {
  state.editingId = null;
  resetForm();
  render();
}

// Add or save edits
document.getElementById('job-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = readForm();
  const errors = validateJob(fields);
  showErrors(errors);
  if (Object.keys(errors).length > 0) {
    showMessage('');
    return;
  }

  if (state.editingId) {
    const id = state.editingId;
    state.editingId = null; // clear before commit so the highlight is removed on re-render
    if (commit(updateJob(state.jobs, id, fields))) {
      const job = findJob(id);
      resetForm();
      showMessage(`Saved changes to ${job.role} at ${job.company}.${hiddenNote(job)}`);
    } else {
      state.editingId = id;
    }
    return;
  }

  const job = createJob(fields);
  if (commit([...state.jobs, job])) {
    resetForm();
    showMessage(`Added ${job.role} at ${job.company}.${hiddenNote(job)}`);
    document.getElementById('company').focus();
  }
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  stopEditing();
  showMessage('');
});

// Clear a field's error as soon as the user edits it.
document.getElementById('job-form').addEventListener('input', (e) => {
  clearFieldError(e.target.name);
});

// Escape cancels editing (when focus is in the form).
document.getElementById('job-form').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.editingId) {
    stopEditing();
    showMessage('Edit cancelled.');
  }
});

// Edit / delete buttons (event delegation on the list)
document.getElementById('job-list').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('.job-card').dataset.id;
  const job = findJob(id);
  if (!job) return;

  if (button.dataset.action === 'edit') {
    state.editingId = id;
    fillForm(job);
    showMessage('');
    render();
  }

  if (button.dataset.action === 'delete') {
    if (!confirm(`Delete ${job.role} at ${job.company}? This can't be undone.`)) return;
    const wasEditing = state.editingId === id;
    if (wasEditing) state.editingId = null;
    if (commit(deleteJob(state.jobs, id))) {
      if (wasEditing) resetForm();
      showMessage(`Deleted ${job.role} at ${job.company}.`);
    }
  }
});

// Inline status change
document.getElementById('job-list').addEventListener('change', (e) => {
  const select = e.target.closest('select[data-action="status"]');
  if (!select) return;
  const id = select.closest('.job-card').dataset.id;
  const job = findJob(id);
  if (!job) return;

  if (!commit(updateJob(state.jobs, id, { status: select.value }))) {
    select.value = job.status; // revert the dropdown if saving failed
    return;
  }
  // Keep the form in sync if this job is open for editing.
  if (state.editingId === id) document.getElementById('status').value = select.value;
});

// Search, filter, sort
document.getElementById('search').addEventListener('input', (e) => {
  state.search = e.target.value;
  render();
});

document.getElementById('filter-status').addEventListener('change', (e) => {
  state.filter = e.target.value;
  render();
});

document.getElementById('sort').addEventListener('change', (e) => {
  const [key, dir] = e.target.value.split(':');
  state.sort = { key, dir };
  render();
});

// Keep multiple open tabs in sync, so one tab doesn't overwrite another's changes.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY && e.key !== null) return; // null = storage was cleared
  state.jobs = sanitizeJobs(loadJobs());
  if (state.editingId && !findJob(state.editingId)) {
    stopEditing();
    showMessage('The job you were editing was deleted in another tab.', true);
    return;
  }
  render();
});

initForm();
render();
