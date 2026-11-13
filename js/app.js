// Entry point: holds state, wires events, and re-renders after every change.

import { loadJobs, saveJobs } from './storage.js';
import { createJob, updateJob, deleteJob, validateJob, sortJobs } from './jobs.js';
import {
  initForm,
  readForm,
  resetForm,
  fillForm,
  showErrors,
  showMessage,
  renderList,
} from './ui.js';

const state = {
  jobs: loadJobs(),
  editingId: null,
};

function render() {
  renderList(sortJobs(state.jobs, 'dateApplied', 'desc'), { editingId: state.editingId });
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
      showMessage(`Saved changes to ${job.role} at ${job.company}.`);
    } else {
      state.editingId = id;
    }
    return;
  }

  const job = createJob(fields);
  if (commit([...state.jobs, job])) {
    resetForm();
    showMessage(`Added ${job.role} at ${job.company}.`);
    document.getElementById('company').focus();
  }
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  stopEditing();
  showMessage('');
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

initForm();
render();
