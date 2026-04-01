// js/pages/landing.js
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Accordion Logic ---
  const accordions = document.querySelectorAll(".accordion");

  accordions.forEach((acc) => {
    acc.addEventListener("click", function () {
      // 1. Toggle the 'active' class on the parent WRAPPER (.accordion-item)
      const itemWrapper = this.parentElement;
      itemWrapper.classList.toggle("active");

      // 2. Change the + to a - (Looking for .acc-icon)
      const icon = this.querySelector(".acc-icon");
      if (itemWrapper.classList.contains("active")) {
        icon.textContent = "-";
      } else {
        icon.textContent = "+";
      }

      // 3. Animate the panel opening/closing
      const panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null; // Close it
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px"; // Open it
      }
    });
  });

  // --- 2. Contact Form Handling ---
  // --- 2. Contact Form Handling ---
  const contactForm = document.getElementById("landingContactForm");

  if (contactForm) {
    // 1. Get the elements we want to change dynamically
    const radioButtons = contactForm.querySelectorAll('input[name="intent"]');
    const messageField = contactForm.querySelector("textarea");
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    // 2. Listen for clicks on the radio buttons
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.value === "quote") {
          // Change UI for a Quote
          messageField.placeholder =
            "Please describe your project requirements and estimated budget...";
          submitBtn.textContent = "Request Quote";
        } else {
          // Change UI back to Say Hi
          messageField.placeholder = "Message";
          submitBtn.textContent = "Send Message";
        }
      });
    });

    // 3. Handle the actual form submission
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevents page reload

      // Find out which radio button is currently checked
      const selectedIntent = contactForm.querySelector(
        'input[name="intent"]:checked',
      ).value;
      const userName = contactForm.querySelector('input[type="text"]').value;

      // Show a different alert based on what they chose!
      if (selectedIntent === "quote") {
        alert(
          `Thank you, ${userName}! Your quote request has been received. Our sales team will be in touch shortly.`,
        );
      } else {
        alert(
          `Thanks for saying hi, ${userName}! We've received your message.`,
        );
      }

      // Clear the form
      contactForm.reset();

      // Reset the UI back to the default "Say Hi" state after clearing
      messageField.placeholder = "Message";
      submitBtn.textContent = "Send Message";
    });
  }
});
