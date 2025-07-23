// Reveal bubbles on scroll
document.addEventListener("DOMContentLoaded", () => {
	const bubbles = document.querySelectorAll('.bubble');
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
});

// Form persistence for sponsor form
document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById('sponsorForm');
	const fields = [
		'sponsor-name',
		'sponsor-email',
		'donation-amount',
		'appear-site',
		'shirt',
		'details'
	];

	// Autofill from localStorage
	fields.forEach(field => {
		const el = document.getElementById(field);
		if (el && localStorage.getItem(field)) {
			el.value = localStorage.getItem(field);
		}
		el && el.addEventListener('input', () => {
			localStorage.setItem(field, el.value);
		});
	});
	
	// Optionally, clear fields on submit (comment/uncomment as desired)
	form.addEventListener('submit', function(e) {
		// e.preventDefault(); // Uncomment to prevent real submission for demo/testing
		fields.forEach(field => localStorage.removeItem(field));
	});
});

    document.addEventListener('DOMContentLoaded', function() {

    // Initialize with your EmailJS public key!
    emailjs.init({
        publicKey: "6bf7NhIB_DHhPZN6G"
    });

    document.getElementById("sponsorForm").addEventListener("submit", function(e){
        e.preventDefault();
        emailjs.sendForm(
        "service_kg1roki",    // e.g., "service_abc123"
        "template_5zjqhin",   // e.g., "template_xyz789"
        this
        )
        .then(function() {
        document.getElementById('sponsor-success').textContent = "Thank you! Your sponsorship has been sent.";
        document.getElementById("sponsorForm").reset();
        }, function(error) {
        document.getElementById('sponsor-success').textContent = "Failed to send. Please try again.";
        console.log('FAILED...', error);
        });
    });
    });


