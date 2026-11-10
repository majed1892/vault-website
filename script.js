/* =========================================================
   Vault Logistics Solutions — Site Script
   Shared by index.html and contact.html. No dependencies.

   Production notes:
   - Tailwind is precompiled into tailwind.css (see tools/). Re-run the
     build after adding new Tailwind classes to the HTML.
   - The contact form has no backend. Wire submitForm() to your API,
     CRM or email service, and replace the simulated reCAPTCHA with
     Google reCAPTCHA or Cloudflare Turnstile (verified server-side).
   ========================================================= */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year (auto-updating) ---------- */
  function initYear() {
    const year = new Date().getFullYear();
    $$('[data-year]').forEach((el) => { el.textContent = year; });
  }

  /* ---------- Navbar: shadow/solid on scroll ---------- */
  function initNavbarScroll() {
    const nav = $('#siteNav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile hamburger menu ---------- */
  function initMobileMenu() {
    const toggle = $('#menuToggle');
    const menu = $('#mobileMenu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));

    // Close when a link is chosen
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Close when clicking outside the header
    document.addEventListener('click', (e) => {
      if (menu.classList.contains('is-open') && !e.target.closest('#siteNav')) setOpen(false);
    });

    // Reset when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) setOpen(false);
    });
  }

  /* ---------- Smooth scrolling for in-page anchors ---------- */
  function navOffset() {
    const nav = $('#siteNav');
    return nav ? nav.offsetHeight : 0;
  }

  function scrollToTarget(target) {
    const top = target.getBoundingClientRect().top + window.scrollY - navOffset() + 1;
    window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="#"]');
      if (!link) return;

      const url = new URL(link.href, window.location.href);
      const samePage = url.pathname === window.location.pathname;
      if (!samePage || !url.hash || url.hash === '#') return;

      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      e.preventDefault();
      scrollToTarget(target);
      history.pushState(null, '', url.hash);
    });

    // Arriving from another page with a hash (e.g. contact.html -> index.html#services)
    if (window.location.hash) {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target) {
        window.addEventListener('load', () => setTimeout(() => scrollToTarget(target), 50));
      }
    }
  }

  /* ---------- Active nav pill based on visible section ---------- */
  function initScrollSpy() {
    const links = $$('[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const sections = [...new Set(links.map((l) => l.getAttribute('href')))]
      .map((href) => document.querySelector(href))
      .filter(Boolean);

    const setActive = (id) => {
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`));
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- Reveal-on-scroll animations ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
      observer.observe(el);
    });
  }

  /* ---------- Animated stat counters ---------- */
  function initCounters() {
    const counters = $$('[data-counter]');
    if (!counters.length) return;

    const format = (n) => n.toLocaleString('en-US');

    const animate = (el) => {
      const end = parseInt(el.dataset.counter, 10);
      if (Number.isNaN(end)) return;
      if (prefersReducedMotion) { el.textContent = format(end); return; }

      const duration = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((el) => observer.observe(el));
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- News "Read more" modal ---------- */
  function initNewsModal() {
    const modal = $('#newsModal');
    if (!modal) return;

    const img = $('#newsModalImg');
    const meta = $('#newsModalMeta');
    const title = $('#newsModalTitle');
    const body = $('#newsModalBody');
    let lastTrigger = null;

    const open = (card, trigger) => {
      const cardImg = $('.news-img', card);
      const badge = $('.news-badge', card);
      const time = $('time', card);
      img.src = cardImg ? cardImg.getAttribute('src') : '';
      img.alt = cardImg ? cardImg.alt : '';
      img.hidden = !cardImg;
      meta.textContent = [badge && badge.textContent, time && time.textContent].filter(Boolean).join(' · ');
      title.textContent = $('h3', card).textContent;
      body.innerHTML = $('.news-full', card).innerHTML;

      lastTrigger = trigger;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      $('.news-modal-close', modal).focus();
    };

    const close = () => {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      if (lastTrigger) lastTrigger.focus();
    };

    $$('.news-more').forEach((btn) => {
      btn.addEventListener('click', () => open(btn.closest('.news-card'), btn));
    });

    // Clicking the image also opens the story
    $$('.news-card .news-thumb').forEach((thumb) => {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', () => {
        const card = thumb.closest('.news-card');
        open(card, $('.news-more', card));
      });
    });

    $$('[data-modal-close]', modal).forEach((el) => el.addEventListener('click', close));

    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') close();
      // Keep focus inside the dialog
      if (e.key === 'Tab') {
        const focusables = $$('button, a[href]', modal);
        const first = focusables[0];
        const last = focusables.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* =========================================================
     CONTACT FORM
     ========================================================= */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;

    const fields = {
      fullName: $('#fullName'),
      email: $('#email'),
      mobile: $('#mobile'),
      service: $('#service'),
      inquiry: $('#inquiryText')
    };
    const captchaBox = $('#captchaBox');
    const captchaCheck = $('#captchaCheck');
    const captchaError = $('#captcha-error');
    const submitBtn = $('#submitBtn');
    const btnLabel = $('[data-btn-label]', submitBtn);
    const success = $('#formSuccess');
    const charCount = $('[data-char-count]');
    let captchaVerified = false;

    /* Pre-select service from ?service=... (links on service cards) */
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('service');
    if (preset && fields.service.querySelector(`option[value="${CSS.escape(preset)}"]`)) {
      fields.service.value = preset;
    }

    /* Validation rules */
    const rules = {
      fullName: (v) => v.trim().length >= 3 && /^[\p{L}\s.'-]+$/u.test(v.trim()),
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      // Saudi mobile: 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX or 009665XXXXXXXX
      mobile: (v) => /^(?:\+966|00966|0)?5\d{8}$/.test(v.replace(/[\s-]/g, '')),
      service: (v) => v !== '',
      inquiry: (v) => v.trim().length >= 10
    };

    const errorIds = {
      fullName: 'fullName-error',
      email: 'email-error',
      mobile: 'mobile-error',
      service: 'service-error',
      inquiry: 'inquiry-error'
    };

    const validateField = (key) => {
      const input = fields[key];
      const valid = rules[key](input.value);
      input.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      document.getElementById(errorIds[key]).classList.toggle('is-visible', !valid);
      return valid;
    };

    // Validate on blur; re-validate on input once a field has been flagged
    Object.keys(fields).forEach((key) => {
      const input = fields[key];
      input.addEventListener('blur', () => { if (input.value) validateField(key); });
      input.addEventListener(key === 'service' ? 'change' : 'input', () => {
        if (input.classList.contains('is-invalid')) validateField(key);
      });
    });

    // Character counter
    if (charCount) {
      const update = () => { charCount.textContent = fields.inquiry.value.length; };
      fields.inquiry.addEventListener('input', update);
      update();
    }

    /* Simulated reCAPTCHA */
    const setCaptchaError = (show) => {
      captchaBox.classList.toggle('is-invalid', show);
      captchaError.classList.toggle('is-visible', show);
    };

    const runCaptcha = () => {
      if (captchaVerified || captchaCheck.classList.contains('is-loading')) return;
      captchaCheck.classList.add('is-loading');
      captchaCheck.setAttribute('aria-busy', 'true');
      setTimeout(() => {
        captchaCheck.classList.remove('is-loading');
        captchaCheck.classList.add('is-checked');
        captchaCheck.removeAttribute('aria-busy');
        captchaCheck.setAttribute('aria-checked', 'true');
        captchaVerified = true;
        setCaptchaError(false);
      }, 1100);
    };

    captchaCheck.addEventListener('click', runCaptcha);
    captchaCheck.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); runCaptcha(); }
    });

    const resetCaptcha = () => {
      captchaVerified = false;
      captchaCheck.classList.remove('is-checked', 'is-loading');
      captchaCheck.setAttribute('aria-checked', 'false');
    };

    /* Submission — replace the body of this function with a real API call */
    const submitForm = (data) => new Promise((resolve) => {
      // Example:
      // return fetch('/api/inquiries', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // }).then((r) => { if (!r.ok) throw new Error('Request failed'); return r.json(); });
      setTimeout(() => resolve({ ok: true, data }), 900);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const results = Object.keys(fields).map(validateField);
      const allValid = results.every(Boolean);
      setCaptchaError(!captchaVerified);

      if (!allValid || !captchaVerified) {
        const firstInvalid = Object.keys(fields).find((k, i) => !results[i]);
        if (firstInvalid) fields[firstInvalid].focus();
        else captchaCheck.focus();
        return;
      }

      const payload = {
        fullName: fields.fullName.value.trim(),
        email: fields.email.value.trim(),
        mobile: fields.mobile.value.replace(/[\s-]/g, ''),
        service: fields.service.value,
        inquiry: fields.inquiry.value.trim(),
        submittedAt: new Date().toISOString()
      };

      submitBtn.disabled = true;
      btnLabel.textContent = 'Sending…';

      try {
        await submitForm(payload);
        $('[data-success-name]').textContent = payload.fullName.split(' ')[0];
        form.hidden = true;
        success.classList.add('is-visible');
        success.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      } catch (err) {
        btnLabel.textContent = 'Try again';
        // eslint-disable-next-line no-console
        console.error('Inquiry submission failed:', err);
        return;
      } finally {
        submitBtn.disabled = false;
      }

      btnLabel.textContent = 'Submit Inquiry';
    });

    // Reset for another inquiry
    $('#newInquiry').addEventListener('click', () => {
      form.reset();
      Object.values(fields).forEach((f) => {
        f.classList.remove('is-invalid');
        f.removeAttribute('aria-invalid');
      });
      $$('.field-error', form).forEach((el) => el.classList.remove('is-visible'));
      if (charCount) charCount.textContent = '0';
      resetCaptcha();
      setCaptchaError(false);
      success.classList.remove('is-visible');
      form.hidden = false;
      fields.fullName.focus();
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initYear();
    initNavbarScroll();
    initMobileMenu();
    initSmoothScroll();
    initScrollSpy();
    initReveal();
    initCounters();
    initBackToTop();
    initNewsModal();
    initContactForm();
  });
})();
