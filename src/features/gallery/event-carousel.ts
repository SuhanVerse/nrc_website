import { automaticPhotos, reducedMotion } from './preferences';

document
  .querySelectorAll<HTMLElement>('[data-event-carousel]')
  .forEach((root) => {
    const cards = [...root.querySelectorAll<HTMLElement>('[data-event-card]')];
    const links = [
      ...root.querySelectorAll<HTMLAnchorElement>('[data-event-photo]'),
    ];
    const images = links.map((link) =>
      link.querySelector<HTMLImageElement>('img')!,
    );
    const controls = root.querySelector<HTMLElement>('[data-event-controls]')!;
    const announcement = root.querySelector<HTMLElement>(
      '[data-event-announcement]',
    )!;
    let current = 0;
    let enabled = automaticPhotos();
    let visible = false;
    let hovered = false;
    let focused = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let gesture: { x: number; y: number } | undefined;
    let suppressClick = false;
    let hideClickTimer: ReturnType<typeof setTimeout> | undefined;
    const failed = new Set<number>();

    function render() {
      root.dataset.current = String(current);
      cards.forEach((card, index) => {
        let position = (index - current + cards.length) % cards.length;
        if (position > cards.length / 2) position -= cards.length;
        const distance = Math.abs(position);
        card.style.setProperty('--position', String(position));
        card.style.setProperty(
          '--scale',
          String(1 - Math.min(distance, 3) * 0.12),
        );
        card.style.setProperty(
          '--opacity',
          distance > 2 ? '0' : distance === 0 ? '1' : '0.78',
        );
        card.style.setProperty('--layer', String(10 - distance));
        card.toggleAttribute('data-distant', distance > 2);
        links[index].tabIndex = index === current ? 0 : -1;
        links[index].setAttribute('aria-current', String(index === current));
        card.setAttribute('aria-hidden', String(index !== current));
      });
    }
    function schedule() {
      clearTimeout(timer);
      if (
        enabled &&
        visible &&
        !hovered &&
        !focused &&
        !document.hidden &&
        !reducedMotion.matches &&
        !document.querySelector('dialog[open]') &&
        failed.size < cards.length - 1
      ) {
        timer = setTimeout(() => void move(1), 6000);
      }
    }
    async function show(index: number, manual: boolean) {
      if (busy) return;
      if (manual) enabled = false;
      const focusedPhoto =
        manual && links.includes(document.activeElement as HTMLAnchorElement)
          ? document.activeElement
          : null;
      busy = true;
      let decoded = false;
      try {
        await images[index].decode();
        decoded = true;
        if (
          !document.querySelector('dialog[open]') &&
          (manual ||
            (enabled &&
              visible &&
              !hovered &&
              !focused &&
              !document.hidden &&
              !reducedMotion.matches))
        ) {
          current = index;
          if (manual)
            announcement.textContent = `Photo ${current + 1} of ${cards.length}`;
        }
      } catch {
        failed.add(index);
        if (manual)
          announcement.textContent = 'Photo unavailable. Try the next photo.';
      }
      busy = false;
      render();
      if (focusedPhoto && document.activeElement === focusedPhoto)
        links[current].focus({ preventScroll: true });
      schedule();
      return decoded;
    }
    async function move(direction: number, manual = false) {
      if (busy) return;
      let next = current;
      for (let attempt = 0; attempt < cards.length - 1; attempt++) {
        next = (next + direction + cards.length) % cards.length;
        if (next === current) return;
        if (!failed.has(next) && (await show(next, manual))) return;
      }
    }
    root
      .querySelector('[data-event-prev]')
      ?.addEventListener('click', () => void move(-1, true));
    root
      .querySelector('[data-event-next]')
      ?.addEventListener('click', () => void move(1, true));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        void move(event.key === 'ArrowLeft' ? -1 : 1, true);
      }
    });
    root.addEventListener(
      'click',
      (event) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>(
          '[data-event-photo]',
        );
        if (
          !link ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (suppressClick) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        const index = links.indexOf(link);
        if (index !== current) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void show(index, true);
        }
      },
      true,
    );
    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse')
        gesture = { x: event.clientX, y: event.clientY };
    });
    root.addEventListener('pointerup', (event) => {
      if (!gesture) return;
      const x = event.clientX - gesture.x;
      const y = event.clientY - gesture.y;
      gesture = undefined;
      if (Math.abs(x) < 40 || Math.abs(x) <= Math.abs(y)) return;
      suppressClick = true;
      clearTimeout(hideClickTimer);
      hideClickTimer = setTimeout(() => {
        suppressClick = false;
      }, 300);
      void move(x < 0 ? 1 : -1, true);
    });
    root.addEventListener('pointercancel', () => {
      gesture = undefined;
    });
    root.addEventListener('mouseenter', () => {
      hovered = true;
      schedule();
    });
    root.addEventListener('mouseleave', () => {
      hovered = false;
      schedule();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      schedule();
    });
    root.addEventListener('focusout', () =>
      queueMicrotask(() => {
        focused = root.contains(document.activeElement);
        schedule();
      }),
    );
    images.forEach((image, index) => {
      function markFailed() {
        failed.add(index);
        image
          .closest('a')
          ?.querySelector('.event-image-error')
          ?.removeAttribute('hidden');
      }
      image.addEventListener('error', markFailed);
      if (image.complete && image.naturalWidth === 0) markFailed();
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.2 },
    );
    observer.observe(root);
    document.addEventListener('visibilitychange', schedule);
    document
      .querySelectorAll('dialog')
      .forEach((dialog) => dialog.addEventListener('close', schedule));
    reducedMotion.addEventListener('change', () => {
      render();
      schedule();
    });
    addEventListener('storage', () => {
      enabled = automaticPhotos();
      render();
      schedule();
    });
    addEventListener('pagehide', () => {
      clearTimeout(timer);
      clearTimeout(hideClickTimer);
      observer.disconnect();
    });
    addEventListener('pageshow', () => observer.observe(root));
    render();
    root.classList.add('is-enhanced');
    controls.hidden = false;
  });
