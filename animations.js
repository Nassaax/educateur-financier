(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Apparitions au scroll ---
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(el => io.observe(el));
    }
  }

  // --- Accordéon FAQ animé (garde le comportement natif <details>, juste la hauteur est animée) ---
  document.querySelectorAll('.faq-item').forEach(details => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('p');
    if (!summary || !content) return;

    if (reduceMotion) return; // le natif suffit, pas d'animation à ajouter

    let animation = null;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (animation) animation.cancel();

      if (details.open) {
        const startHeight = content.offsetHeight;
        animation = content.animate(
          [{ height: startHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 220, easing: 'ease' }
        );
        animation.onfinish = () => { details.open = false; };
      } else {
        details.open = true;
        const endHeight = content.offsetHeight;
        animation = content.animate(
          [{ height: '0px', opacity: 0 }, { height: endHeight + 'px', opacity: 1 }],
          { duration: 240, easing: 'ease' }
        );
      }
    });
  });
})();
