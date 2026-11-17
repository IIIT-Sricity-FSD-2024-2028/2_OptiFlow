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
