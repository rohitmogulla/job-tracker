// Entry point: holds state, wires events, and re-renders after every change.

import { loadJobs, saveJobs } from './storage.js';
import { createJob, validateJob, sortJobs } from './jobs.js';
import { initForm, readForm, resetForm, showErrors, showMessage, renderList } from './ui.js';

const state = {
  jobs: loadJobs(),
};

function render() {
  renderList(sortJobs(state.jobs, 'dateApplied', 'desc'));
}

/** Apply a change to the job list, save it, and re-render. Rolls back if saving fails. */
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

document.getElementById('job-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = readForm();
  const errors = validateJob(fields);
  showErrors(errors);
  if (Object.keys(errors).length > 0) {
    showMessage('');
    return;
  }

  const job = createJob(fields);
  if (commit([...state.jobs, job])) {
    resetForm();
    showMessage(`Added ${job.role} at ${job.company}.`);
    document.getElementById('company').focus();
  }
});

initForm();
render();
