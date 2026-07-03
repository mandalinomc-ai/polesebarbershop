(function () {
  'use strict';

  var cfg = window.SITE_CONFIG;
  if (!cfg) return;

  function setMeta(name, content, isProperty) {
    if (!content) return;
    var attr = isProperty ? 'property' : 'name';
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setLink(rel, href) {
    if (!href) return;
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  }

  var isSoon = !!cfg.IS_COMING_SOON;
  var title = isSoon
    ? cfg.name + ' — Prossimamente | Barbiere d\'Élite ' + cfg.city
    : cfg.name + ' — ' + cfg.tagline + ' | ' + cfg.city;
  var description = isSoon ? cfg.seo.comingSoonDescription : cfg.seo.liveDescription;
  var url = cfg.siteUrl || window.location.href.split('?')[0];
  var ogImage = (cfg.siteUrl || '') + '/assets/images/og-cover.svg';

  document.title = title;
  setMeta('description', description);
  setMeta('keywords', cfg.seo.keywords);
  setMeta('author', cfg.brand);
  setMeta('robots', isSoon ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  setMeta('geo.region', 'IT-' + cfg.province);
  setMeta('geo.placename', cfg.city);
  setMeta('geo.position', cfg.latitude + ';' + cfg.longitude);
  setMeta('ICBM', cfg.latitude + ', ' + cfg.longitude);

  setMeta('og:type', 'website', true);
  setMeta('og:locale', 'it_IT', true);
  setMeta('og:site_name', cfg.name, true);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', url, true);
  setMeta('og:image', ogImage, true);
  setMeta('og:image:alt', cfg.name + ' — ' + cfg.brand, true);

  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', ogImage);

  setLink('canonical', url);

  var schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': url + '#website',
        url: url,
        name: cfg.name,
        description: description,
        inLanguage: 'it-IT',
        publisher: { '@id': url + '#business' },
      },
      {
        '@type': 'HairSalon',
        '@id': url + '#business',
        name: cfg.name,
        alternateName: cfg.legalName,
        description: description,
        url: url,
        telephone: cfg.phone,
        email: cfg.email,
        image: ogImage,
        logo: (cfg.siteUrl || '') + '/assets/images/logo.svg',
        priceRange: '€€',
        address: {
          '@type': 'PostalAddress',
          streetAddress: cfg.address,
          addressLocality: cfg.city,
          addressRegion: cfg.province,
          postalCode: cfg.postalCode,
          addressCountry: 'IT',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: cfg.latitude,
          longitude: cfg.longitude,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: '09:30',
            closes: '20:00',
          },
        ],
        sameAs: [cfg.instagram].filter(Boolean),
        founder: {
          '@type': 'Person',
          name: 'Felice Polese',
        },
        areaServed: {
          '@type': 'City',
          name: cfg.city,
        },
      },
    ],
  };

  var script = document.getElementById('schema-json');
  if (!script) {
    script = document.createElement('script');
    script.id = 'schema-json';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
})();
