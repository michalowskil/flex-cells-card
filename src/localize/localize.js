const fallback = 'en';
const DICTS = {};
const pending = new Set();

// JSON files may have a top-level language key (e.g., { "en": { ... } }).
const unwrap = (lang, code) =>
  lang?.[code] ?? lang?.[fallback] ?? lang;

const preloaded = globalThis.FCC_LOCALES;
const hasPreloaded =
  preloaded && typeof preloaded === 'object' && Object.keys(preloaded).length;

if (hasPreloaded) {
  for (const [code, data] of Object.entries(preloaded)) {
    DICTS[code] = unwrap(data, code);
  }
}

const lookup = (dict, parts) => parts.reduce((n, p) => n?.[p], dict);

const loadLang = (lang) => {
  if (!lang || hasPreloaded || DICTS[lang] || pending.has(lang)) return;
  pending.add(lang);
  const url = new URL(`./lang/${lang}.json`, import.meta.url);
  fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) DICTS[lang] = unwrap(data, lang);
    })
    .catch(() => {})
    .finally(() => {
      pending.delete(lang);
      // Let listeners (card) know translations are ready.
      window.dispatchEvent(
        new CustomEvent('fcc-locales-loaded', { detail: { lang } }),
      );
    });
};

// Preload fallback so EN is available first (dev, no build).
loadLang(fallback);

export function t(hass, key) {
  const langCode = (hass?.locale?.language || fallback).toLowerCase();
  const lang = langCode.split('-')[0];

  loadLang(lang);

  const parts = key.split('.');
  const val = lookup(DICTS[lang], parts);
  if (val !== undefined) return val;

  const fallbackVal = lookup(DICTS[fallback], parts);
  return fallbackVal ?? key;
}
