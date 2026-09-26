/**
 * MACCA — Premium 3D Meme-Coin Landing Page
 * src/main.js
 *
 * Tech: Three.js v0.176 · GSAP v3.12.5 + ScrollTrigger · Vite
 */

import './style.css';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const CONTRACT     = '6YqakuvZZ26Svz5SGtCV4yWymwyp1NM4M1DgBX7svRpC';
const PUMP_FUN_URL = 'https://pump.fun/coin/6YqakuvZZ26Svz5SGtCV4yWymwyp1NM4M1DgBX7svRpC';
const SOLSCAN_URL  = 'https://solscan.io/token/6YqakuvZZ26Svz5SGtCV4yWymwyp1NM4M1DgBX7svRpC';

const COIN_SCALE   = 0.95;  // hero scale
const SCROLL_SCALE = 0.62;  // non-hero sections — clearly smaller
const FOOTER_SCALE = 0.32;  // footer — far away

function getSections() {
  const isMobile = window.innerWidth <= 768;
  return isMobile
    ? {
        hero:       { x:  0.0,   y:  0.60, z:  0.0,  scale: 0.52 },
        stats:      { x:  0.38,  y:  0.55, z:  0.0,  scale: 0.40 },  // RIGHT
        tokenomics: { x: -0.38,  y:  0.55, z:  0.0,  scale: 0.40 },  // LEFT
        roadmap:    { x:  0.38,  y:  0.55, z:  0.0,  scale: 0.40 },  // RIGHT
        how:        { x: -0.38,  y:  0.55, z:  0.0,  scale: 0.40 },  // LEFT
        faq:        { x:  0.36,  y:  0.55, z:  0.0,  scale: 0.38 },  // RIGHT
        footer:     { x:  0.0,   y: -0.65, z: -1.6,  scale: 0.24 },  // BOTTOM CENTER
      }
    : {
        hero:       { x:  0.3,   y: -0.3,  z:  0.0,  scale: COIN_SCALE },
        stats:      { x:  2.6,   y:  0.1,  z:  0.0,  scale: SCROLL_SCALE }, // RIGHT
        tokenomics: { x: -2.6,   y:  0.1,  z:  0.0,  scale: SCROLL_SCALE }, // LEFT
        roadmap:    { x:  2.6,   y:  0.1,  z:  0.0,  scale: SCROLL_SCALE }, // RIGHT
        how:        { x: -2.6,   y:  0.1,  z:  0.0,  scale: SCROLL_SCALE }, // LEFT
        faq:        { x:  2.5,   y:  0.1,  z:  0.0,  scale: SCROLL_SCALE }, // RIGHT
        footer:     { x:  1.2,   y: -1.6,  z: -2.8,  scale: FOOTER_SCALE }, // FAR RIGHT
      };
}

let SECTIONS = getSections();

const ROTATION_SPEED = 0.12;  // rad/sec: slow, smooth, premium continuous vertical spin
const DAMPING        = 0.93;  // momentum damping for drag release
const clock          = new THREE.Clock();

/* ─────────────────────────────────────────
   SCENE STATE
───────────────────────────────────────── */
let coin       = null;
let coinLoaded = false;
let baseScale  = 1;

let momentumVel = { x: 0, y: 0 };

let isDragging      = false;
let prevMouse       = { x: 0, y: 0 };
let dragVelocity    = { x: 0, y: 0 };
let currentSection  = 'hero';

/* ─────────────────────────────────────────
   RENDERER
───────────────────────────────────────── */
const canvas = document.getElementById('hero-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});

renderer.setSize(window.innerWidth, window.innerHeight);
/* Cap to 1 on mobile, 1.25 on desktop — completely eliminates GPU fill bottleneck & scroll stutter */
renderer.setPixelRatio(window.innerWidth <= 768 ? 1 : Math.min(window.devicePixelRatio, 1.25));
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.64;
renderer.outputColorSpace   = THREE.SRGBColorSpace;

/* ─────────────────────────────────────────
   SCENE & CAMERA
───────────────────────────────────────── */
const scene  = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 0, 5.5);

/* ─────────────────────────────────────────
   ENVIRONMENT (RoomEnvironment + PMREM)
───────────────────────────────────────── */
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(
  new RoomEnvironment(renderer),
  0.04
).texture;

/* ─────────────────────────────────────────
   LIGHTING  — warm, premium pink/gold tones
───────────────────────────────────────── */
const ambientLight = new THREE.AmbientLight(0xfff0dd, 0.55);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.6);
dirLight.position.set(-2, 4, 5);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xf5e8d0, 0.35);
fillLight.position.set(4, 1, -2);
scene.add(fillLight);

const hemiLight = new THREE.HemisphereLight(0xfff0dd, 0xcfc0ae, 0.4);
scene.add(hemiLight);

/* ─────────────────────────────────────────
   LOAD GLB — /models/macca.glb
───────────────────────────────────────── */
const loadingBar = document.getElementById('loading-bar');

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
  '/models/macca.glb',
  (gltf) => {
    coin = gltf.scene;

    /* ── Centre the model ── */
    const box = new THREE.Box3().setFromObject(coin);
    coin.position.sub(box.getCenter(new THREE.Vector3()));

    /* ── Normalise scale ── */
    const size    = box.getSize(new THREE.Vector3());
    baseScale     = 2.4 / Math.max(size.x, size.y, size.z);
    coin.scale.setScalar(baseScale * SECTIONS.hero.scale);

    /* ── Place at hero waypoint (below, for entrance) ── */
    coin.position.set(
      SECTIONS.hero.x,
      SECTIONS.hero.y - 0.8,   // start lower for entrance slide
      SECTIONS.hero.z
    );

    /*
     * PRESERVE original MACCA GLB materials (pink + golden).
     * Only touch envMapIntensity for correct HDRI reflections.
     */
    coin.traverse((child) => {
      if (child.isMesh && child.material) {
        const m = child.material;
        if (m.envMapIntensity !== undefined) {
          m.envMapIntensity = 0.5;
        }
        m.needsUpdate = true;
      }
    });

    scene.add(coin);
    coinLoaded = true;

    /* Dismiss loading screen and show coin */
    dismissLoading();
    coinEntrance();

    /* Set up scroll-driven coin choreography */
    setupScrollCoin();
    ScrollTrigger.refresh();
  },
  (xhr) => {
    /* progress */
    if (xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      if (loadingBar) loadingBar.style.width = pct + '%';
    }
  },
  (err) => {
    console.error('GLB load error:', err);
    dismissLoading();
    uiEntrance();
  }
);

/* Fallback: Dismiss loading screen and show UI within 800ms max so customers never wait */
setTimeout(() => {
  dismissLoading();
  uiEntrance();
}, 800);

/* ─────────────────────────────────────────
   LOADING SCREEN DISMISS
───────────────────────────────────────── */
let loadingDismissed = false;
function dismissLoading() {
  if (loadingDismissed) return;
  loadingDismissed = true;
  const screen = document.getElementById('loading-screen');
  if (loadingBar) loadingBar.style.width = '100%';
  if (screen) {
    screen.classList.add('hidden');
    setTimeout(() => {
      if (screen.parentNode) screen.remove();
    }, 500);
  }
  uiEntrance();
}

/* ─────────────────────────────────────────
   COIN ENTRANCE ANIMATION
───────────────────────────────────────── */
function coinEntrance() {
  if (!coin) return;

  /* Scale: 25% → 100% */
  const targetScalar = baseScale * SECTIONS.hero.scale;
  coin.scale.setScalar(targetScalar * 0.25);

  const targetY = SECTIONS.hero.y;

  gsap.to(coin.scale, {
    x: targetScalar,
    y: targetScalar,
    z: targetScalar,
    duration: 1.1,
    ease: 'expo.out',
    delay: 0.1,
  });

  gsap.to(coin.position, {
    y: targetY,
    duration: 1.1,
    ease: 'expo.out',
    delay: 0.1,
    onComplete: () => {
      enableDrag();
    },
  });
}

/* ─────────────────────────────────────────
   UI ENTRANCE SEQUENCE (GSAP timeline)
───────────────────────────────────────── */
let uiRevealed = false;
function uiEntrance() {
  if (uiRevealed) return;
  uiRevealed = true;

  const tl = gsap.timeline({ delay: 0.05 });

  tl.to('#nav-logo',    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.05)
    .to('#nav-links',   { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.1)
    .to('#nav-buy-btn', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.15)
    .to('#event-card-wrap', { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out' }, 0.2)
    .to('#hero-text',       { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out' }, 0.25)
    .to('#nav-arrow-btn',   { opacity: 1, duration: 0.4, ease: 'power2.out' },     0.5)
    .to('#signature-svg',   { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.6)
    /* Signature paths */
    .to('.sp1', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.6)
    .to('.sp2', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 1.0)
    .to('.sp3', { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 1.2);
}

/* ─────────────────────────────────────────
   DRAG CONTROLS
───────────────────────────────────────── */
function enableDrag() {
  canvas.classList.add('drag-enabled');
}

function disableDrag() {
  canvas.classList.remove('drag-enabled');
}

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

window.addEventListener('mousedown', (e) => {
  if (e.target.closest('a, button, input, select, textarea, .event-card, .event-card-wrap, .stat-card, .step-item, .footer-contract-card')) {
    return;
  }
  onDragStart(e);
});

window.addEventListener('touchstart', (e) => {
  if (e.target.closest('a, button, input, select, textarea, .event-card, .event-card-wrap, .stat-card, .step-item, .footer-contract-card')) {
    return;
  }
  onDragStart(e);
}, { passive: true });

function onDragStart(e) {
  if (currentSection !== 'hero') return;
  isDragging = true;
  const pos = getEventPos(e);
  prevMouse.x = pos.x;
  prevMouse.y = pos.y;
  dragVelocity.x = 0;
  dragVelocity.y = 0;
  momentumVel.x = 0;
  momentumVel.y = 0;
}

window.addEventListener('mousemove', onDragMove);
window.addEventListener('touchmove', onDragMove, { passive: true });

function onDragMove(e) {
  if (!isDragging || !coin) return;
  const pos = getEventPos(e);
  const deltaX = (pos.x - prevMouse.x) * 0.007;
  const deltaY = (pos.y - prevMouse.y) * 0.007;
  coin.rotation.y += deltaX;
  coin.rotation.x += deltaY;
  dragVelocity.x = deltaY;
  dragVelocity.y = deltaX;
  prevMouse.x = pos.x;
  prevMouse.y = pos.y;
  markDirty();
}

window.addEventListener('mouseup', onDragEnd);
window.addEventListener('touchend', onDragEnd);

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  /* Hand off velocity to momentum physics */
  momentumVel.x = dragVelocity.x;
  momentumVel.y = dragVelocity.y;
}

/* ─────────────────────────────────────────
   SCROLL COIN POSITIONING (ScrollTrigger)
───────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t)   { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function depthOffset(y) { return y < 0 ? y * 0.08 : 0; }

function setupScrollCoin() {
  /* Guard: called both from GLB callback (primary) and window.load
   * (fallback). Kill any existing instances before re-registering. */
  if (!coin) return;
  ScrollTrigger.getAll()
    .filter(st => st.vars._isCoinScroll)
    .forEach(st => st.kill());

  /* ── tiny helper: set coin world position + uniform scale ── */
  function setCoin(px, py, pz, sc) {
    coin.position.x = px;
    coin.position.y = py;
    coin.position.z = pz;
    coin.scale.setScalar(sc * baseScale);
    markDirty();  // position changed → needs re-render
  }

  /* ── responsive scrub: 0.35 on desktop for immediate locked-to-wheel smoothness, 0.6 on mobile ── */
  const SCRUB_SPEED = window.innerWidth <= 768 ? 0.6 : 0.35;

  /* ── Hero → About (Stats) ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#stats-section',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.hero.x,  SECTIONS.stats.x,  t),
        lerp(SECTIONS.hero.y,  SECTIONS.stats.y,  ey),
        lerp(SECTIONS.hero.z,  SECTIONS.stats.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.hero.scale, SECTIONS.stats.scale, t)
      );
    },
    onEnter()     { currentSection = 'stats'; disableDrag(); },
    onLeaveBack() { currentSection = 'hero';  enableDrag();  },
  });

  /* ── About → Tokenomics ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#tokenomics-section',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.stats.x,  SECTIONS.tokenomics.x,  t),
        lerp(SECTIONS.stats.y,  SECTIONS.tokenomics.y,  ey),
        lerp(SECTIONS.stats.z,  SECTIONS.tokenomics.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.stats.scale, SECTIONS.tokenomics.scale, t)
      );
    },
    onEnter()     { currentSection = 'tokenomics'; disableDrag(); },
    onLeaveBack() { currentSection = 'stats';      disableDrag(); },
  });

  /* ── Tokenomics → Roadmap ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#roadmap-section',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.tokenomics.x,  SECTIONS.roadmap.x,  t),
        lerp(SECTIONS.tokenomics.y,  SECTIONS.roadmap.y,  ey),
        lerp(SECTIONS.tokenomics.z,  SECTIONS.roadmap.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.tokenomics.scale, SECTIONS.roadmap.scale, t)
      );
    },
    onEnter()     { currentSection = 'roadmap';    disableDrag(); },
    onLeaveBack() { currentSection = 'tokenomics'; disableDrag(); },
  });

  /* ── Roadmap → How ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#how-section',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.roadmap.x,  SECTIONS.how.x,  t),
        lerp(SECTIONS.roadmap.y,  SECTIONS.how.y,  ey),
        lerp(SECTIONS.roadmap.z,  SECTIONS.how.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.roadmap.scale, SECTIONS.how.scale, t)
      );
    },
    onEnter()     { currentSection = 'how';     disableDrag(); },
    onLeaveBack() { currentSection = 'roadmap'; disableDrag(); },
  });

  /* ── How → FAQ ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#faq-section',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.how.x,  SECTIONS.faq.x,  t),
        lerp(SECTIONS.how.y,  SECTIONS.faq.y,  ey),
        lerp(SECTIONS.how.z,  SECTIONS.faq.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.how.scale, SECTIONS.faq.scale, t)
      );
    },
    onEnter()     { currentSection = 'faq'; disableDrag(); },
    onLeaveBack() { currentSection = 'how'; disableDrag(); },
  });

  /* ── FAQ → Footer ── */
  ScrollTrigger.create({
    vars: { _isCoinScroll: true },
    trigger: '#site-footer',
    start: 'top bottom',
    end: 'top top',
    scrub: SCRUB_SPEED,
    onUpdate(self) {
      if (!coin) return;
      const t  = self.progress;
      const ey = easeInOut(t);
      setCoin(
        lerp(SECTIONS.faq.x,  SECTIONS.footer.x,  t),
        lerp(SECTIONS.faq.y,  SECTIONS.footer.y,  ey),
        lerp(SECTIONS.faq.z,  SECTIONS.footer.z,  t) + depthOffset(coin.position.y),
        lerp(SECTIONS.faq.scale, SECTIONS.footer.scale, t)
      );
    },
    onEnter()     { currentSection = 'footer'; disableDrag(); },
    onLeaveBack() { currentSection = 'faq';    disableDrag(); },
  });
}

/* ─────────────────────────────────────────
   SCROLL-TRIGGERED SECTION ANIMATIONS
───────────────────────────────────────── */
ScrollTrigger.create({
  trigger: '#stats-section',
  start: 'top 75%',
  onEnter: () => gsap.to('.stat-card', {
    opacity: 1,
    y: 0,
    stagger: 0.1,
    duration: 0.8,
    ease: 'expo.out',
    delay: 0.1,
  }),
});

ScrollTrigger.create({
  trigger: '#tokenomics-section',
  start: 'top 75%',
  onEnter: () => gsap.to('.tok-card', {
    opacity: 1,
    y: 0,
    stagger: 0.1,
    duration: 0.8,
    ease: 'expo.out',
    delay: 0.1,
  }),
});

ScrollTrigger.create({
  trigger: '#roadmap-section',
  start: 'top 70%',
  onEnter: () => gsap.to('.phase-card', {
    opacity: 1,
    y: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: 'expo.out',
    delay: 0.1,
  }),
});

ScrollTrigger.create({
  trigger: '#how-section',
  start: 'top 70%',
  onEnter: () => gsap.to('.step-item', {
    opacity: 1,
    x: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'expo.out',
    delay: 0.1,
  }),
});

ScrollTrigger.create({
  trigger: '#faq-section',
  start: 'top 75%',
  onEnter: () => gsap.to('.faq-card', {
    opacity: 1,
    y: 0,
    stagger: 0.08,
    duration: 0.7,
    ease: 'expo.out',
    delay: 0.1,
  }),
});

/* ─────────────────────────────────────────
   FAQ ACCORDION INTERACTIVITY
───────────────────────────────────────── */
document.querySelectorAll('.faq-card').forEach((card) => {
  card.addEventListener('click', () => {
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.faq-card').forEach(c => c.classList.remove('open'));
    if (!isOpen) {
      card.classList.add('open');
    }
    /* Don't call ScrollTrigger.refresh() here — it causes scroll jank */
  });
});

/* ─────────────────────────────────────────
   NAVBAR: scroll state
───────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* Card hover is handled smoothly via CSS transitions to avoid frame drops */

/* ─────────────────────────────────────────
   PUMP.FUN & EXPLORER ACTIONS
───────────────────────────────────────── */
function openPumpFun() {
  window.open(PUMP_FUN_URL, '_blank', 'noopener,noreferrer');
}

function openSolscan() {
  window.open(SOLSCAN_URL, '_blank', 'noopener,noreferrer');
}

const navBuyBtn       = document.getElementById('nav-buy-btn');
const cardBuyBtn      = document.getElementById('card-buy-btn');
const cardContractBtn = document.getElementById('card-contract-btn');
const heroGetBtn      = document.getElementById('hero-get-btn');
const howGetBtn       = document.getElementById('how-get-btn');
const footerBuyBtn    = document.getElementById('footer-buy-btn');

if (navBuyBtn)       navBuyBtn.addEventListener('click', openPumpFun);
if (cardBuyBtn)      cardBuyBtn.addEventListener('click', openPumpFun);
if (cardContractBtn) cardContractBtn.addEventListener('click', openSolscan);
if (heroGetBtn)      heroGetBtn.addEventListener('click', openPumpFun);
if (howGetBtn)       howGetBtn.addEventListener('click', openPumpFun);
if (footerBuyBtn)    footerBuyBtn.addEventListener('click', openPumpFun);

/* ─────────────────────────────────────────
   COPY CONTRACT UTILITY
───────────────────────────────────────── */
function copyContract(btnEl, successLabel = 'COPIED ✓', restoreLabel = null) {
  const original = restoreLabel || btnEl.textContent;
  navigator.clipboard.writeText(CONTRACT).then(() => {
    btnEl.textContent = successLabel;
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.textContent = original;
      btnEl.classList.remove('copied');
    }, 2200);
  }).catch(err => {
    console.warn('Clipboard write failed:', err);
  });
}

/* Wire all copy buttons */
const cardCopyBtn    = document.getElementById('card-copy-btn');
const stripCopyBtn   = document.getElementById('strip-copy-btn');
const howCopyBtn     = document.getElementById('how-copy-btn');
const footerCopyBtn  = document.getElementById('footer-copy-btn');

if (cardCopyBtn)   cardCopyBtn.addEventListener('click',  () => copyContract(cardCopyBtn,   'COPIED ✓', 'COPY'));
if (stripCopyBtn)  stripCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(CONTRACT).then(() => {
    stripCopyBtn.classList.add('copied');
    setTimeout(() => stripCopyBtn.classList.remove('copied'), 2200);
  });
});
if (howCopyBtn)    howCopyBtn.addEventListener('click',   () => copyContract(howCopyBtn,    'COPIED ✓', 'COPY CONTRACT'));
if (footerCopyBtn) footerCopyBtn.addEventListener('click',() => copyContract(footerCopyBtn, 'COPIED ✓', 'COPY ADDRESS'));

/* Nav arrow scrolls to stats */
const navArrowBtn = document.getElementById('nav-arrow-btn');
if (navArrowBtn) {
  navArrowBtn.addEventListener('click', () => {
    document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

/* Nav logo scrolls to top */
const navLogo = document.getElementById('nav-logo');
if (navLogo) {
  navLogo.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* In-page navigation links smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ─────────────────────────────────────────
   RENDER LOOP — dirty flag to skip idle frames
───────────────────────────────────────── */
let needsRender = true;   // set to true whenever coin state changes

function markDirty() { needsRender = true; }

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (coin) {
    if (!isDragging) {
      /* Natural, continuous vertical/Y-axis coin spin */
      coin.rotation.y += delta * ROTATION_SPEED;
      needsRender = true;  // spin always needs rendering

      /* Smooth drag momentum physics */
      if (Math.abs(momentumVel.y) > 0.00005) {
        coin.rotation.y += momentumVel.y;
        momentumVel.y *= DAMPING;
        needsRender = true;
      }
      if (Math.abs(momentumVel.x) > 0.00005) {
        coin.rotation.x += momentumVel.x;
        momentumVel.x *= DAMPING;
        needsRender = true;
      } else {
        /* Smoothly ease coin X rotation back upright */
        const prev = coin.rotation.x;
        coin.rotation.x = THREE.MathUtils.lerp(prev, 0, 0.04);
        if (Math.abs(coin.rotation.x - prev) > 0.0001) needsRender = true;
      }
    } else {
      needsRender = true;
    }
  }

  if (needsRender) {
    renderer.render(scene, camera);
    needsRender = false;
  }
}

animate();

/* ─────────────────────────────────────────
   RESIZE HANDLER
───────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.innerWidth <= 768 ? 1 : Math.min(window.devicePixelRatio, 1.25));
  SECTIONS = getSections();
  setupScrollCoin();
  ScrollTrigger.refresh();
  markDirty();
});

/* ─────────────────────────────────────────
   WINDOW LOAD — refresh ScrollTrigger after
   all elements have their final sizes
───────────────────────────────────────── */
window.addEventListener('load', () => {
  setupScrollCoin();
  ScrollTrigger.refresh();
});
