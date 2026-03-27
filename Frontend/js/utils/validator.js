// js/utils/validator.js
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateRequired(text) {
  return text && text.trim().length > 0;
}

function showError(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isValid) {
    el.classList.remove("is-invalid");
  } else {
    el.classList.add("is-invalid");
  }
  return isValid;
}
