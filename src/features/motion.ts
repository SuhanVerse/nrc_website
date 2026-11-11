const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const selector =
  '[data-reveal], .project-row, .person-card, .edition-card, .contact-card, .membership-status-card';
const targets = [...document.querySelectorAll<HTMLElement>(selector)];
const active = new Map<HTMLElement, Animation>();
const seen = new WeakSet<HTMLElement>();

// HTML stays visible; animations only exist while a newly visible card enters.
if (
  'IntersectionObserver' in window &&
  typeof Element.prototype.animate === 'function'
) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      const groupRanks = new Map<Element, number>();
      visible.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const group =
          target.closest('[data-reveal-group]') ?? target.parentElement!;
        const index = groupRanks.get(group) ?? 0;
        groupRanks.set(group, index + 1);
        observer.unobserve(target);
        seen.add(target);
        if (reducedMotion.matches || target.contains(document.activeElement))
          return;

        const card = target.dataset.reveal === 'card';
        const animation = target.animate(
          [
            {
              opacity: 0,
              translate: `0 ${card ? 18 : 12}px`,
              scale: card ? '0.975' : '1',
            },
            { opacity: 1, translate: '0 0', scale: '1' },
          ],
          {
            id: 'content-enter',
            duration: card ? 560 : 440,
            delay: Math.min(index, 3) * 70,
            easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)',
            fill: 'backwards',
          },
        );
        active.set(target, animation);
        const release = () => active.delete(target);
        void animation.finished.then(release, release);
      });
    },
    { threshold: 0.08 },
  );
  targets.forEach((target) => observer.observe(target));

  document.addEventListener('focusin', (event) => {
    const target = (event.target as Element).closest<HTMLElement>(selector);
    if (target) {
      observer.unobserve(target);
      seen.add(target);
      active.get(target)?.cancel();
      active.delete(target);
    }
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    active.forEach((animation) => animation.cancel());
    active.clear();
  });
  addEventListener('pagehide', () => {
    observer.disconnect();
    active.forEach((animation) => animation.cancel());
    active.clear();
  });
  addEventListener('pageshow', (event) => {
    if (event.persisted)
      targets.forEach((target) => {
        if (!seen.has(target)) observer.observe(target);
      });
  });
}
