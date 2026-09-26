const root = document.documentElement;
const THEME_KEY = 'portfolio:theme';
const ACCENT_KEY = 'portfolio:accent';

const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (private mode); the site still works without it.
    }
  },
};

/* ---------- Theme ---------- */

const themeToggle = document.querySelector('#theme-toggle');

function applyTheme(theme) {
  root.dataset.theme = theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0b0d12' : '#f7f7fb');
}

applyTheme(root.dataset.theme || 'dark');
themeToggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  store.set(THEME_KEY, theme);
});

/* ---------- Header: scroll state, mobile menu, active section ---------- */

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('#menu-toggle');
const navLinks = [...document.querySelectorAll('.site-nav a')];

const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

function setMenu(open) {
  header.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

menuToggle.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
document.querySelectorAll('main section[id]').forEach((section) => sectionObserver.observe(section));

/* ---------- Scroll reveal ---------- */

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
);
document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element));

/* ---------- Accent palette ---------- */

const hexToRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgbToHex([channel(0), channel(8), channel(4)].map((v) => v * 255));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

function setAccent(hex, { save = true } = {}) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const accent2 = hslToHex((h + 40) % 360, s, l);
  const onAccent = contrast(hex, '#ffffff') >= contrast(hex, '#0b0d12') ? '#ffffff' : '#0b0d12';
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-2', accent2);
  root.style.setProperty('--on-accent', onAccent);
  if (save) store.set(ACCENT_KEY, JSON.stringify({ accent: hex, accent2, onAccent }));
  markActiveSwatch(hex);
}

function resetAccent() {
  ['--accent', '--accent-2', '--on-accent'].forEach((property) => root.style.removeProperty(property));
  store.set(ACCENT_KEY, null);
  markActiveSwatch(null);
  toast('Colors reset');
}

const swatchesEl = document.querySelector('#swatches');

function markActiveSwatch(hex) {
  swatchesEl.querySelectorAll('.swatch').forEach((swatch) => {
    const active = hex !== null && swatch.dataset.color === hex;
    swatch.classList.toggle('is-active', active);
    swatch.setAttribute('aria-pressed', String(active));
  });
}

// Vivid, readable colors built from a random base hue and a harmony pattern.
const HARMONIES = [
  [0, 25, 50, 180, 205],
  [0, 120, 240, 30, 150],
  [0, 150, 210, 20, 170],
  [0, 30, 60, 90, 120],
];

function randomPalette() {
  const base = Math.random() * 360;
  const offsets = HARMONIES[Math.floor(Math.random() * HARMONIES.length)];
  return offsets.map((offset) => {
    const saturation = 0.62 + Math.random() * 0.22;
    const lightness = 0.48 + Math.random() * 0.1;
    return hslToHex((base + offset) % 360, saturation, lightness);
  });
}

function renderSwatches(colors) {
  swatchesEl.querySelectorAll('.swatch').forEach((swatch, index) => {
    const color = colors[index];
    swatch.dataset.color = color;
    swatch.style.setProperty('--swatch', color);
    swatch.setAttribute('aria-label', `Use ${color.toUpperCase()} as accent`);
  });
}

swatchesEl.addEventListener('click', (event) => {
  const swatch = event.target.closest('.swatch');
  if (!swatch) return;
  setAccent(swatch.dataset.color);
  toast(`Accent set to ${swatch.dataset.color.toUpperCase()}`);
});

document.querySelector('#shuffle').addEventListener('click', () => renderSwatches(randomPalette()));
document.querySelector('#reset-accent').addEventListener('click', resetAccent);

const savedAccent = (() => {
  try {
    return JSON.parse(store.get(ACCENT_KEY));
  } catch {
    return null;
  }
})();
if (savedAccent?.accent) markActiveSwatch(savedAccent.accent);

/* ---------- Copy email & toast ---------- */

const toastEl = document.querySelector('#toast');
let toastTimer;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2000);
}

document.querySelector('#copy-email').addEventListener('click', async (event) => {
  const email = event.currentTarget.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    toast('Email copied to clipboard');
  } catch {
    toast(email);
  }
});

document.querySelector('#year').textContent = String(new Date().getFullYear());
