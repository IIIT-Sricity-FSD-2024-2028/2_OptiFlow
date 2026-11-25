// Date-input limits shared by work pages. Values are "YYYY-MM-DD" for <input type="date">.

const toInputDate = (date) => date.toLocaleDateString('en-CA');

/** Today in the user's local calendar. Deadlines cannot be earlier. */
export const todayInput = () => toInputDate(new Date());

/** Tomorrow; used where the deadline must be in the future (extensions). */
export const tomorrowInput = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toInputDate(date);
};

/** Converts a stored ISO deadline to an input value, or undefined. */
export const deadlineInput = (value) => (value ? String(value).slice(0, 10) : undefined);

/**
 * Minimum date allowed for a deadline extension request.
 * Must be strictly after the current deadline (at least deadline + 1 day)
 * and strictly in the future (at least tomorrow).
 * Returns "YYYY-MM-DD" for <input type="date" min="...">.
 */
export const minExtensionDateInput = (currentDeadline) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (!currentDeadline) {
    return toInputDate(tomorrow);
  }

  const deadlineStr = String(currentDeadline).slice(0, 10);
  const parts = deadlineStr.split('-').map(Number);
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    const [y, m, d] = parts;
    const dayAfter = new Date(y, m - 1, d + 1);
    dayAfter.setHours(0, 0, 0, 0);
    return toInputDate(dayAfter > tomorrow ? dayAfter : tomorrow);
  }

  const parsed = new Date(currentDeadline);
  if (!isNaN(parsed.getTime())) {
    parsed.setDate(parsed.getDate() + 1);
    parsed.setHours(0, 0, 0, 0);
    return toInputDate(parsed > tomorrow ? parsed : tomorrow);
  }

  return toInputDate(tomorrow);
};

/**
 * Maximum date allowed for a subtask extension request.
 * Must be before/on the parent task's deadline.
 * Returns "YYYY-MM-DD" for <input type="date" max="...">.
 */
export const maxExtensionDateInput = (parentTaskDeadline) => {
  if (!parentTaskDeadline) return undefined;
  return deadlineInput(parentTaskDeadline);
};
