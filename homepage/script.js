document.addEventListener("DOMContentLoaded", () => {
  const bubbles = document.querySelectorAll('.bubble');

  // Scroll reveal observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  bubbles.forEach((bubble, i) => {
    bubble.style.transitionDelay = `${i * 75}ms`;
    observer.observe(bubble);
  });

  // Form persistence in localStorage
  const form = document.getElementById('sponsorForm');
  const fields = ['sponsor-name', 'sponsor-email', 'amount', 'appear-site', 'appear-shirt', 'details'];

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (!el) return;
    const saved = localStorage.getItem(field);
    if (saved) el.value = saved;
    el.addEventListener('input', () => {
      localStorage.setItem(field, el.value);
    });
  });

  // EmailJS initialization
  emailjs.init('6bf7NhIB_DHhPZN6G');

  // Submit sponsor form through EmailJS
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    emailjs.sendForm('service_kg1roki', 'template_5zjqhin', form)
      .then(() => {
        document.getElementById('sponsor-success').textContent = 'Thank you! Your sponsorship has been sent.';
        form.reset();
        fields.forEach(field => localStorage.removeItem(field));
      })
      .catch(() => {
        document.getElementById('sponsor-success').textContent = 'Failed to send. Please try again.';
      });
  });
});
