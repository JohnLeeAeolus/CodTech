const STORAGE_KEY = 'codtech.assignmentDraft.v1';
const RESUME_KEY = 'codtech.assignmentDraft.resume.v1';

export function saveAssignmentDraft(draft) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft || null));
  } catch (e) {
    // ignore
  }
}

export function loadAssignmentDraft() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearAssignmentDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(RESUME_KEY);
  } catch (e) {
    // ignore
  }
}

export function setAssignmentDraftResumeFlag() {
  try {
    window.sessionStorage.setItem(RESUME_KEY, '1');
  } catch (e) {
    // ignore
  }
}

export function consumeAssignmentDraftResumeFlag() {
  try {
    const v = window.sessionStorage.getItem(RESUME_KEY);
    if (v) {
      window.sessionStorage.removeItem(RESUME_KEY);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
