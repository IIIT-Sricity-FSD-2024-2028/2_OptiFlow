// js/utils/validator.js

// ─────────────────────────────────────────
// PART 1: The Advanced PM Validator
// ─────────────────────────────────────────
window.Validator = {
  rules: {
    required(val) {
      return val !== null && val !== undefined && String(val).trim().length > 0;
    },
    minLength(val, n) {
      return String(val).trim().length >= n;
    },
    maxLength(val, n) {
      return String(val).trim().length <= n;
    },
    email(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim());
    },
    numeric(val) {
      return !isNaN(Number(val)) && String(val).trim() !== "";
    },
    min(val, n) {
      return Number(val) >= n;
    },
    max(val, n) {
      return Number(val) <= n;
    },
    date(val) {
      return !isNaN(Date.parse(val));
    },
    futureDate(val) {
      return Date.parse(val) > Date.now();
    },
    phone(val) {
      return /^[\+]?[\d\s\-\(\)]{7,15}$/.test(String(val).trim());
    },
    noSpecialChars(val) {
      return /^[a-zA-Z0-9\s\-_\.]+$/.test(String(val).trim());
    },
  },

  messages: {
    required: "This field is required.",
    minLength: (n) => `Must be at least ${n} characters.`,
    maxLength: (n) => `Must be no more than ${n} characters.`,
    email: "Enter a valid email address.",
    numeric: "Must be a number.",
    min: (n) => `Must be at least ${n}.`,
    max: (n) => `Must be no more than ${n}.`,
    date: "Enter a valid date.",
    futureDate: "Date must be in the future.",
    phone: "Enter a valid phone number.",
    noSpecialChars: "No special characters allowed.",
  },

  validate(el, config) {
    const val = el.value != null ? el.value : "";

    if (config.required === true && !this.rules.required(val))
      return { valid: false, error: this.messages.required };

    const nonEmpty = this.rules.required(val);
    if (config.minLength != null && typeof config.minLength === "number") {
      if (nonEmpty && !this.rules.minLength(val, config.minLength))
        return {
          valid: false,
          error: this.messages.minLength(config.minLength),
        };
    }
    if (config.maxLength != null && typeof config.maxLength === "number") {
      if (nonEmpty && !this.rules.maxLength(val, config.maxLength))
        return {
          valid: false,
          error: this.messages.maxLength(config.maxLength),
        };
    }

    if (
      config.email === true &&
      nonEmpty &&
      !this.rules.email(val)
    )
      return { valid: false, error: this.messages.email };

    if (config.numeric === true && nonEmpty && !this.rules.numeric(val))
      return { valid: false, error: this.messages.numeric };

    return { valid: true, error: "" };
  },

  /** Live blur/input validation tied to `#${fieldId}-error` if present */
  attachLive(fieldId, config) {
    const el = document.getElementById(fieldId);
    if (!el) return;

    const run = () => {
      const result = this.validate(el, config);
      const err = document.getElementById(`${fieldId}-error`);
      if (!result.valid) {
        el.classList.add("error");
        if (err) {
          err.textContent =
            typeof result.error === "string"
              ? result.error
              : String(result.error || this.messages.required);
          err.classList.remove("hidden");
        }
      } else {
        el.classList.remove("error");
        if (err) {
          err.textContent = "";
          err.classList.add("hidden");
        }
      }
    };

    el.addEventListener("blur", run);
    el.addEventListener("input", run);
  },

  validateForm(fields) {
    let valid = true;
    const errors = {};
    for (const [id, config] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const result = this.validate(el, config);
      errors[id] = result.error;
      const errorEl = document.getElementById(`${id}-error`);
      if (!result.valid) {
        valid = false;
        el.classList.add("error");
        if (errorEl) {
          errorEl.textContent = result.error;
          errorEl.classList.remove("hidden");
        }
      } else {
        el.classList.remove("error");
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.classList.add("hidden");
        }
      }
    }
    return { valid, errors };
  },
};

// ─────────────────────────────────────────
// PART 2: The Legacy Validators (For older pages)
// ─────────────────────────────────────────
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
