/* =========================================================
   Vault Hero Showcase — controller
   - Cycles the 5 SVG stages with cross-fade + parallax shift
   - Pauses when hovered/focused, scrolled off-screen or tab hidden
   - Segmented progress tabs (click, keyboard, swipe), RTL-aware
   - Respects prefers-reduced-motion (no auto-play)
   No dependencies. Load with `defer`.
   ========================================================= */

(function () {
  'use strict';

  const STAGES = [
    {
      title: 'إعداد وتشييد المستودعات 2PL',
      sub: 'خدمات 2PL: تجهيز وتشييد البنية التحتية والمستودعات',
      tag: '2PL · Warehouse Construction'
    },
    {
      title: 'إدارة وتشغيل المستودعات 3PL',
      sub: 'خدمات 3PL: تشغيل وإدارة العمليات اللوجستية والتخزين',
      tag: '3PL · Warehouse Operations'
    },
    {
      title: 'النقل والأسطول البري',
      sub: 'النقل البري بأسطول شركة Vault الخاص',
      tag: 'Land Freight · Vault Fleet'
    },
    {
      title: 'إدارة ساحات الميناء وتخزين الحاويات',
      sub: 'تخزين وإدارة الحاويات في ساحات الميناء',
      tag: 'Port Yard · Container Storage'
    },
    {
      title: 'الاستيراد والتصدير عبر الشحن البحري والجوي',
      sub: 'الشحن الدولي: النقل البحري والجوي',
      tag: 'Global Sea & Air Freight'
    }
  ];

  const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

  function initShowcase(root) {
    const stages = Array.from(root.querySelectorAll('.vs-stage'));
    const segs = Array.from(root.querySelectorAll('.vs-seg'));
    const text = root.querySelector('.vs-text');
    const elIndex = root.querySelector('[data-vs-index]');
    const elTitle = root.querySelector('[data-vs-title]');
    const elSub = root.querySelector('[data-vs-sub]');
    const elTag = root.querySelector('[data-vs-tag]');
    const viewport = root.querySelector('.vs-viewport');
    if (!stages.length || stages.length !== segs.length) return;

    const duration = parseInt(root.dataset.duration, 10) || 6500;
    root.style.setProperty('--vs-duration', `${duration}ms`);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canHover = window.matchMedia('(hover: hover)');
    const isRTL = () => getComputedStyle(root).direction === 'rtl';

    let index = 0;
    let timer = null;
    let remaining = duration;
    let startedAt = 0;
    const reasons = new Set();         // why we're paused: hover, focus, offscreen, hidden
    const leaveTimers = new WeakMap();

    // Accessible names for tabs (labels are hidden on small screens)
    segs.forEach((seg, i) => {
      seg.setAttribute('aria-label', `${toArabicDigits(i + 1)}. ${STAGES[i].title}`);
      seg.tabIndex = i === 0 ? 0 : -1;
    });

    const restart = (el, cls) => {
      el.classList.remove(cls);
      void el.getBoundingClientRect(); // force style recalc so CSS animations restart
      el.classList.add(cls);
    };

    /* ---------- Caption swap ---------- */
    function renderCaption(i, animate) {
      const data = STAGES[i];
      const apply = () => {
        elIndex.textContent = toArabicDigits(i + 1);
        elTitle.textContent = data.title;
        elSub.textContent = data.sub;
        elTag.textContent = data.tag;
      };
      if (!animate || reducedMotion.matches) { apply(); return; }

      text.classList.add('is-out');
      setTimeout(() => {
        apply();
        text.classList.remove('is-out');
        text.classList.add('is-in');
        void text.offsetWidth;
        text.classList.remove('is-in');
      }, 300);
    }

    /* ---------- Stage switching ---------- */
    function goTo(next, { user = false } = {}) {
      next = (next + stages.length) % stages.length;
      if (next === index) { if (user) schedule(true); return; }

      const prev = stages[index];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      clearTimeout(leaveTimers.get(prev));
      leaveTimers.set(prev, setTimeout(() => prev.classList.remove('is-leaving'), 1000));

      const incoming = stages[next];
      clearTimeout(leaveTimers.get(incoming));
      incoming.classList.remove('is-leaving');
      restart(incoming, 'is-active');

      segs.forEach((seg, i) => {
        seg.classList.toggle('is-done', i < next);
        seg.classList.remove('is-current');
        seg.setAttribute('aria-selected', String(i === next));
        seg.tabIndex = i === next ? 0 : -1;
      });
      restart(segs[next], 'is-current');

      index = next;
      renderCaption(index, true);
      schedule(true);
    }

    /* ---------- Auto-advance timer (pausable) ---------- */
    const autoplay = () => !reducedMotion.matches;

    function schedule(reset) {
      clearTimeout(timer);
      if (reset) remaining = duration;
      if (!autoplay() || reasons.size) return;
      startedAt = performance.now();
      timer = setTimeout(() => goTo(index + 1), remaining);
    }

    function pause(reason) {
      if (reasons.has(reason)) return;
      if (!reasons.size && timer) {
        clearTimeout(timer);
        timer = null;
        remaining = Math.max(remaining - (performance.now() - startedAt), 0);
      }
      reasons.add(reason);
      root.dataset.pausedBy = [...reasons].join(' ');
      root.classList.add('is-paused');
    }

    function resume(reason) {
      if (!reasons.delete(reason)) return;
      root.dataset.pausedBy = [...reasons].join(' ');
      if (reasons.size) return;
      root.classList.remove('is-paused');
      schedule(false);
    }

    /* ---------- Controls ---------- */
    segs.forEach((seg, i) => seg.addEventListener('click', () => goTo(i, { user: true })));

    root.querySelector('.vs-segs').addEventListener('keydown', (e) => {
      const forwardKey = isRTL() ? 'ArrowLeft' : 'ArrowRight';
      const backKey = isRTL() ? 'ArrowRight' : 'ArrowLeft';
      let target = null;
      if (e.key === forwardKey) target = index + 1;
      else if (e.key === backKey) target = index - 1;
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = stages.length - 1;
      if (target === null) return;
      e.preventDefault();
      goTo(target, { user: true });
      segs[index].focus();
    });

    // Swipe on touch screens (RTL: swipe right = next)
    let touchX = null;
    viewport.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') touchX = e.clientX; });
    viewport.addEventListener('pointerup', (e) => {
      if (touchX === null) return;
      const dx = e.clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      const forward = isRTL() ? dx > 0 : dx < 0;
      goTo(index + (forward ? 1 : -1), { user: true });
    });

    // Pause while hovered (mouse) or while a control has keyboard focus
    root.addEventListener('mouseenter', () => { if (canHover.matches) pause('hover'); });
    root.addEventListener('mouseleave', () => resume('hover'));
    root.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) pause('focus'); });
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) resume('focus'); });

    // Pause when off-screen or the tab is hidden (saves CPU/battery)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) resume('offscreen');
        else pause('offscreen');
      }, { threshold: 0.15 }).observe(root);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause('hidden');
      else resume('hidden');
    });

    // Reduced motion: manual mode (full progress bar, no timer)
    const applyMotionPref = () => {
      root.classList.toggle('is-manual', reducedMotion.matches);
      schedule(true);
    };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', applyMotionPref);
    applyMotionPref();

    renderCaption(0, false);
  }

  const start = () => document.querySelectorAll('[data-vault-showcase]').forEach(initShowcase);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
