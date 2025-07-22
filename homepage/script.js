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

	bubbles.forEach((bubble, idx) => {
		bubble.style.transitionDelay = (idx * 100) + 'ms';
		observer.observe(bubble);
	});
});
