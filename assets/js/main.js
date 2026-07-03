(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || { IS_COMING_SOON: true };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getConfigValue(key) {
    return key.split('.').reduce(function (acc, part) {
      return acc && acc[part];
    }, cfg);
  }

  function buildMapsUrl() {
    var query = cfg.addressFull || (cfg.address + ', ' + cfg.city);
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function buildWhatsAppUrl(message) {
    var num = (cfg.whatsapp || (cfg.phone || '').replace(/\D/g, '')).replace(/\D/g, '');
    if (!num) return null;
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(message || (
      'Ciao ' + cfg.name + ', vorrei informazioni sui vostri servizi.'
    ));
  }

  function resolveHref(key) {
    if (key === 'maps') return buildMapsUrl();
    if (key === 'whatsapp') return buildWhatsAppUrl();
    if (key === 'phone') {
      var digits = (cfg.phone || '').replace(/[^\d+]/g, '');
      return digits ? 'tel:' + digits : null;
    }
    return cfg[key] || null;
  }

  function applySiteMode() {
    var isSoon = !!cfg.IS_COMING_SOON;
    document.documentElement.classList.toggle('is-coming-soon', isSoon);
    document.documentElement.classList.toggle('is-live', !isSoon);
    document.body.classList.toggle('mode-coming-soon', isSoon);
    document.body.classList.toggle('mode-live', !isSoon);
  }

  function initReveal() {
    var els = qsa('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    els.forEach(function (el) { observer.observe(el); });
  }

  function initCountdown() {
    if (!cfg.IS_COMING_SOON) return;
    var root = qs('#countdown');
    if (!root || !cfg.openingDate) return;

    var target = new Date(cfg.openingDate).getTime();

    function pad(n) {
      return String(Math.max(0, n)).padStart(2, '0');
    }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        qsa('.countdown-value', root).forEach(function (el) { el.textContent = '00'; });
        var label = qs('.countdown-done', root);
        if (label) label.hidden = false;
        return;
      }
      var daysEl = qs('[data-unit="days"]', root);
      var hoursEl = qs('[data-unit="hours"]', root);
      var minsEl = qs('[data-unit="minutes"]', root);
      var secsEl = qs('[data-unit="seconds"]', root);
      if (daysEl) daysEl.textContent = pad(Math.floor(diff / 86400000));
      if (hoursEl) hoursEl.textContent = pad(Math.floor((diff % 86400000) / 3600000));
      if (minsEl) minsEl.textContent = pad(Math.floor((diff % 3600000) / 60000));
      if (secsEl) secsEl.textContent = pad(Math.floor((diff % 60000) / 1000));
    }

    tick();
    setInterval(tick, 1000);
  }

  function initNotifyForm() {
    var form = qs('#notify-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = qs('#notify-name', form).value.trim();
      var contact = qs('#notify-contact', form).value.trim();
      if (!name || !contact) return;

      var msg =
        'Ciao, vorrei essere avvisato all\'apertura del nuovo ' + cfg.name + ' in ' + cfg.address + ', ' + cfg.city + '.\n\n' +
        'Nome: ' + name + '\n' +
        'WhatsApp: ' + contact;

      var url = buildWhatsAppUrl(msg);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        var feedback = qs('#notify-feedback', form);
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = 'Perfetto! Completa l\'invio su WhatsApp.';
        }
        form.reset();
      }
    });
  }

  function initBookingForm() {
    var form = qs('#booking-form');
    if (!form || cfg.IS_COMING_SOON) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = qs('#book-name', form).value.trim();
      var service = qs('#book-service', form).value.trim();
      var date = qs('#book-date', form).value.trim();
      var contact = qs('#book-contact', form).value.trim();
      if (!name || !contact) return;

      var msg =
        'Prenotazione ' + cfg.name + '\n\n' +
        'Nome: ' + name + '\n' +
        'Servizio: ' + (service || 'Da definire') + '\n' +
        'Data preferita: ' + (date || 'Da concordare') + '\n' +
        'Contatto: ' + contact;

      var url = buildWhatsAppUrl(msg);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else if (cfg.fresha) window.open(cfg.fresha, '_blank', 'noopener,noreferrer');
    });
  }

  function initNav() {
    var toggle = qs('#nav-toggle');
    var panel = qs('#nav-panel');
    var backdrop = qs('#nav-backdrop');
    if (!toggle || !panel) return;

    function closeNav() {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }

    toggle.addEventListener('click', function () {
      if (panel.classList.contains('open')) closeNav();
      else {
        panel.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('nav-open');
      }
    });

    backdrop && backdrop.addEventListener('click', closeNav);
    qsa('#nav-panel a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  function initHeaderScroll() {
    var header = qs('#site-header');
    if (!header) return;
    var lastY = window.scrollY;
    window.addEventListener(
      'scroll',
      function () {
        var y = window.scrollY;
        header.classList.toggle('header-scrolled', y > 24);
        header.classList.toggle('header-hidden', y > lastY && y > 120);
        lastY = y;
      },
      { passive: true }
    );
  }

  function injectConfigText() {
    qsa('[data-config]').forEach(function (el) {
      var value = getConfigValue(el.getAttribute('data-config'));
      if (value != null && value !== '') el.textContent = value;
    });
  }

  function injectConfigLinks() {
    qsa('[data-config-href]').forEach(function (el) {
      var key = el.getAttribute('data-config-href');
      var href = resolveHref(key);
      if (href) {
        el.href = href;
        el.hidden = false;
      }
    });
  }

  function initMagneticButtons() {
    if (window.matchMedia('(hover: none)').matches) return;
    qsa('.btn-magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', (e.clientX - rect.left - rect.width / 2) * 0.15 + 'px');
        btn.style.setProperty('--my', (e.clientY - rect.top - rect.height / 2) * 0.15 + 'px');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  applySiteMode();
  injectConfigText();
  injectConfigLinks();
  initReveal();
  initCountdown();
  initNotifyForm();
  initBookingForm();
  initNav();
  initHeaderScroll();
  initMagneticButtons();
})();
