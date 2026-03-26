// js/pages/landing.js

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Accordion Logic ---
  const acc = document.getElementsByClassName("accordion");

  for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function () {
      // Toggle the 'active' class on the clicked button
      this.classList.toggle("active");

      // Change the + to a -
      const icon = this.querySelector(".icon");
      if (this.classList.contains("active")) {
        icon.textContent = "-";
      } else {
        icon.textContent = "+";
      }

      // Animate the panel opening/closing
      const panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null; // Close it
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px"; // Open it
      }
    });
  }

  // --- 2. Contact Form Handling ---
  const contactForm = document.getElementById("landingContactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevents page reload

      // In a real app, you'd save this to DB or send an email.
      // For now, we just show a success message and clear the form.
      alert("Thank you! Your message has been received.");
      contactForm.reset();
    });
  }

  // --- 3. Newsletter Form Handling ---
  const newsletterForm = document.getElementById("newsletterForm");

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Subscribed successfully!");
      newsletterForm.reset();
    });
  }
});
