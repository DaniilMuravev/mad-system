(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesk = function () { return window.innerWidth >= 900; };

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------------- */
  /* Language                                                          */
  /* ---------------------------------------------------------------- */
  var lang = 'ru';
  try { lang = localStorage.getItem('mad-lang') || 'ru'; } catch (e) {}
  var onLang = [];

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-ru]').forEach(function (el) { el.textContent = el.getAttribute('data-' + lang); });
    $$('[data-ru-label]').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-' + lang + '-label')); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    onLang.forEach(function (fn) { fn(); });
  }
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      try { localStorage.setItem('mad-lang', lang); } catch (e) {}
      applyLang();
    });
  });
  /* ---------------------------------------------------------------- */
  /* Sound: tiny synth, no audio files                                 */
  /* ---------------------------------------------------------------- */
  var ac = null, soundOn = true;
  function audio() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ac = new C(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise(dur) {
    var n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ac.createBufferSource(); src.buffer = buf; return src;
  }
  function env(peak, dur) {
    var g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(ac.destination); return g;
  }
  var sfx = {
    click: function () {            // metal snap
      if (!soundOn || !audio()) return;
      var t = ac.currentTime, o = ac.createOscillator(), n = noise(0.03), hp = ac.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(650, t + 0.04);
      o.connect(env(0.32, 0.07)); o.start(t); o.stop(t + 0.08);
      hp.type = 'highpass'; hp.frequency.value = 2800; n.connect(hp); hp.connect(env(0.28, 0.035)); n.start(t);
    },
    pop: function () {              // cartoon "collapsed into a point"
      if (!soundOn || !audio()) return;
      var t = ac.currentTime, o = ac.createOscillator();
      o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1250, t + 0.07);
      o.connect(env(0.4, 0.16)); o.start(t); o.stop(t + 0.18);
    },
    whoosh: function () {           // fabric through the air
      if (!soundOn || !audio()) return;
      var t = ac.currentTime, n = noise(0.42), bp = ac.createBiquadFilter(), g = ac.createGain();
      bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(1700, t + 0.36);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      n.connect(bp); bp.connect(g); g.connect(ac.destination); n.start(t);
    },
    step: function () {             // soft footstep
      if (!soundOn || !audio()) return;
      var t = ac.currentTime, n = noise(0.08), lp = ac.createBiquadFilter(), o = ac.createOscillator();
      lp.type = 'lowpass'; lp.frequency.value = 220; n.connect(lp); lp.connect(env(0.5, 0.09)); n.start(t);
      o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.08);
      o.connect(env(0.3, 0.1)); o.start(t); o.stop(t + 0.11);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Smooth scroll                                                     */
  /* ---------------------------------------------------------------- */
  if (window.Lenis && !reduced) {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------------- */
  /* 1. Hero: tear the pocket off the tee                              */
  /* ---------------------------------------------------------------- */
  function initHero() {
    var tee = $('#tee-img'), pocket = $('#hero-pocket'), guy = $('.hero-guy'), say = $('#hero-say');
    var slot = $('#bag-slot'), count = $('#bag-count'), pull = $('#pull');
    if (!pocket) return;
    var SAY = {
      a: ['Йо. Оторви себе кусочек', 'Yo. Tear a piece off for yourself'],
      b: ['Вот так. Теперь он твой', 'There. It is yours now'],
      c: ['Забрал. Их тут восемь. Или листай дальше', 'Got it. There are eight here. Or keep scrolling'],
      d: ['Все восемь твои. Теперь листай', 'All eight are yours. Now scroll']
    };
    var SKINS = ['assets/ink/pocket-front.webp'], skin = 0;
    for (var s = 1; s <= 8; s++) SKINS.push('assets/pockets/v' + s + '.webp');
    SKINS.slice(1).forEach(function (u) { var p = new Image(); p.src = u; });
    function speak(k) {
      say.setAttribute('data-ru', SAY[k][0]); say.setAttribute('data-en', SAY[k][1]);
      say.textContent = SAY[k][lang === 'ru' ? 0 : 1];
      gsap.fromTo(say, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.45)' });
    }

    gsap.set(pocket, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    var dragging = false, detached = false, busy = false, got = 0, p0 = null, base = { x: 0, y: 0 };
    var REST = { x: 0, y: 0, skewX: 0, scaleY: 1, duration: 1.1, ease: 'elastic.out(1,0.35)' };

    function down(e) {
      if (busy) return;
      audio();
      dragging = true; p0 = { x: e.clientX, y: e.clientY };
      base = { x: gsap.getProperty(pocket, 'x'), y: gsap.getProperty(pocket, 'y') };
      gsap.killTweensOf([pocket, tee]);
      if (pocket.setPointerCapture) { try { pocket.setPointerCapture(e.pointerId); } catch (err) {} }
      pull.style.opacity = '0';
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      var dx = e.clientX - p0.x, dy = e.clientY - p0.y, d = Math.sqrt(dx * dx + dy * dy);
      if (!detached) {
        // the fabric holds: pocket follows at half speed, tee leans after it
        gsap.set(pocket, { x: dx * 0.5, y: dy * 0.5, rotation: dx * 0.03 });
        gsap.set(tee, { x: dx * 0.07, y: dy * 0.07, skewX: clamp(-dx * 0.03, -6, 6), scaleY: 1 + clamp(dy, 0, 200) * 0.0004 });
        if (d > pocket.offsetWidth * 0.8) {
          detached = true; sfx.click();
          base = { x: dx * 0.5, y: dy * 0.5 }; p0 = { x: e.clientX, y: e.clientY };
          gsap.to(tee, REST);
          guy.classList.add('has-face');
          speak('b');
        }
      } else {
        gsap.to(pocket, { x: base.x + dx, y: base.y + dy, rotation: clamp((e.movementX || 0) * 0.9, -16, 16), duration: 0.22, ease: 'power2.out', overwrite: true });
      }
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      if (!detached) {
        gsap.to(pocket, { x: 0, y: 0, rotation: 0, duration: 0.9, ease: 'elastic.out(1,0.4)' });
        gsap.to(tee, REST);
        return;
      }
      busy = true;
      var a = pocket.getBoundingClientRect(), b = count.getBoundingClientRect();
      gsap.to(pocket, {
        x: '+=' + (b.left + b.width / 2 - a.left - a.width / 2),
        y: '+=' + (b.top + b.height / 2 - a.top - a.height / 2),
        scale: 0.16, rotation: 24, duration: 0.75, ease: 'power2.in', overwrite: true,
        onComplete: function () {
          got = Math.min(got + 1, 8); count.textContent = String(got); slot.classList.add('got');
          skin = skin % 8 + 1;                      // drawn one first, then the eight variations in a loop
          pocket.src = SKINS[skin]; pocket.classList.add('is-photo');
          gsap.fromTo(count, { scale: 1.4 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1,0.4)' });
          sfx.pop(); speak(got >= 8 ? 'd' : 'c');
          gsap.set(pocket, { x: 0, y: 0, scale: 0.5, rotation: 0, opacity: 0 });
          gsap.to(pocket, { scale: 1, opacity: 1, duration: 0.7, delay: 1, ease: 'back.out(2)', onComplete: function () { detached = false; busy = false; } });
        }
      });
    }
    pocket.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    // a quiet nudge so the pocket reads as something you can grab
    if (!reduced) gsap.to(pocket, { rotation: -3, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 3, delay: 1.2 });
  }

  /* ---------------------------------------------------------------- */
  /* 2. Load: things drift at different depths                         */
  /* ---------------------------------------------------------------- */
  function initLoad() {
    if (reduced) return;
    $$('.thing').forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-depth')) || 1;
      gsap.fromTo(el, { y: 70 * d }, { y: -70 * d, ease: 'none', scrollTrigger: { trigger: '#load', start: 'top bottom', end: 'bottom top', scrub: 0.9 } });
    });
  }

  /* ---------------------------------------------------------------- */
  /* 3. Pocket scene                                                   */
  /* ---------------------------------------------------------------- */
  var WORDS = [
    'телефон', 'ключи', 'паспорт', 'карта', 'наличка', 'наушники', 'зажигалка', 'жвачка', 'проездной', 'зарядка', 'пропуск',
    'phone', 'keys', 'passport', 'cash', 'cards', 'earbuds', 'lighter', 'gum', 'ticket', 'charger', 'pass',
    'teléfono', 'llaves', 'pasaporte', 'efectivo', 'tarjetas', 'auriculares', 'mechero', 'chicle', 'billete', 'cargador', 'gafas'
  ];

  function initPocket() {
    var sec = $('#pk'), cv = $('#pk-words'), obj = $('#pk-obj'), rot = $('#pk-rot');
    if (!sec) return;
    var ctx = cv.getContext('2d'), rctx = rot.getContext('2d');
    var S = { gather: 0, frame: 0 }, W = 0, H = 0, dpr = 1, items = [], live = false;
    var FR = 25, frames = [], drawn = -1;

    for (var i = 0; i < FR; i++) {
      var im = new Image();
      im.onload = function () { drawn = -1; drawRot(); };
      im.src = 'assets/rot/' + (i < 10 ? '0' : '') + i + '.webp';
      frames.push(im);
    }
    function drawRot() {
      var f = clamp(Math.round(S.frame), 0, FR - 1);
      if (f === drawn || !frames[f].complete || !frames[f].naturalWidth) return;
      rctx.clearRect(0, 0, rot.width, rot.height);
      rctx.drawImage(frames[f], 0, 0, rot.width, rot.height);
      drawn = f;
    }

    function build() {
      W = cv.clientWidth; H = cv.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var small = W < 700, n = small ? 30 : 56;
      var pool = WORDS.slice().sort(function () { return Math.random() - 0.5; });
      items = [];
      for (var k = 0; k < n; k++) {
        items.push({
          text: pool[k % pool.length],
          x: lerp(0.08, 0.92, Math.random()) * W, y: lerp(0.1, 0.9, Math.random()) * H,
          size: small ? lerp(14, 23, Math.random()) : lerp(16, 36, Math.random()),
          ph: Math.random() * 6.283, sp: lerp(0.3, 0.8, Math.random()), delay: Math.random() * 0.45
        });
      }
    }
    function drawWords() {
      if (!live) return;
      var t = performance.now() / 1000, cx = W / 2, cy = H / 2, g = S.gather;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (g >= 0.999) return;
      ctx.fillStyle = '#F5E6CF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var fam = getComputedStyle(document.documentElement).getPropertyValue('--body') || 'sans-serif';
      for (var k = 0; k < items.length; k++) {
        var o = items[k], gi = clamp(g * 1.45 - o.delay, 0, 1);
        gi = gi * gi * (3 - 2 * gi);
        var x = lerp(o.x + Math.sin(t * o.sp + o.ph) * 20, cx, gi);
        var y = lerp(o.y + Math.cos(t * o.sp * 0.8 + o.ph) * 14, cy, gi);
        var glow = 0.5 + 0.5 * Math.sin(t * 0.7 + o.ph * 3);          // soft breathing, no hard blink
        var a = lerp(0.22, 1, glow * glow) * (1 - gi);
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        ctx.font = '500 ' + (o.size * (1 - gi * 0.7)).toFixed(1) + 'px ' + fam;
        ctx.fillText(o.text, x, y);
      }
      ctx.globalAlpha = 1;
    }

    gsap.set(obj, { xPercent: -50, yPercent: -50, scale: 0.82, opacity: 0 });
    $$('.pk-item', obj).forEach(function (el) { gsap.set(el, { xPercent: -50, yPercent: -50 }); });
    var bams = $$('.bam', obj), side = $('.it-side', obj), tops = $$('.it-top', obj);
    var ow = function () { return obj.offsetWidth; }, oh = function () { return obj.offsetHeight; };

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
        onToggle: function (self) { live = self.isActive; }
      }
    });
    tl.to('#pk-cap', { autoAlpha: 0, duration: 0.6 }, 1.1)
      .to(S, { gather: 1, duration: 1.6, ease: 'power2.inOut' }, 1.2)
      .to(obj, { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' }, 2.2)
      .to(S, { frame: FR - 1, duration: 1.9, ease: 'sine.inOut', onUpdate: drawRot }, 3.3);
    bams.forEach(function (b, k) {
      tl.fromTo(b, { scale: 0.2, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.5, ease: 'power2.out' }, 5.25 + k * 0.16);
    });
    tl.to(obj, {
      x: function () { return isDesk() ? window.innerWidth * 0.21 : 0; },
      y: function () { return isDesk() ? 0 : -window.innerHeight * 0.13; },
      scale: function () { return isDesk() ? 0.9 : 0.92; },
      duration: 1.0, ease: 'power2.inOut'
    }, 5.9)
      .to('#pk-t1', { autoAlpha: 1, duration: 0.5 }, 6.3)
      .to('#pk-t1', { autoAlpha: 0, duration: 0.4 }, 7.5)
      .to(S, { frame: 0, duration: 1.5, ease: 'sine.inOut', onUpdate: drawRot }, 7.6)
      .to('#pk-t2', { autoAlpha: 1, duration: 0.5 }, 8.8);

    // phone: in from the side. everything else: dropped in from the top
    tl.fromTo(side, { x: function () { return ow() * 0.75; }, y: function () { return oh() * 0.08; }, rotation: 90, opacity: 0, scale: 1 },
      { x: function () { return ow() * 0.36; }, opacity: 1, duration: 0.6, ease: 'power2.out' }, 9.0)
      .to(side, { x: function () { return ow() * 0.16; }, opacity: 0, scale: 0.8, duration: 0.4, ease: 'power2.in' }, 9.6);
    tops.forEach(function (el, k) {
      var off = [-0.13, 0.0, 0.12, 0.05][k % 4], at = 9.3 + k * 0.28;
      tl.fromTo(el, { x: function () { return ow() * off; }, y: function () { return -oh() * 1.05; }, rotation: [-18, 12, -8, 20][k % 4], opacity: 0, scale: 0.8 },
        { y: function () { return -oh() * 0.46; }, opacity: 1, duration: 0.5, ease: 'power2.in' }, at)
        .to(el, { y: function () { return -oh() * 0.12; }, opacity: 0, scale: 0.55, duration: 0.3, ease: 'power1.in' }, at + 0.5);
    });
    tl.to({}, { duration: 0.6 });

    build(); drawRot();
    gsap.ticker.add(drawWords);
    window.addEventListener('resize', build);
  }

  /* ---------------------------------------------------------------- */
  /* 4. Film                                                           */
  /* ---------------------------------------------------------------- */
  function initFilm() {
    var player = $('#player'), stage = $('#stage');
    if (!player) return;
    var shorts = $('#f-shorts'), tee = $('#f-tee'), pocket = $('#f-pocket'), flip = $('#f-flip');
    var pf = $('.pf', pocket), pb = $('.pb', pocket), ring = $('#f-ring'), dots = $$('#f-logo i');
    var SW = 337, TW = 323, FPS = 7;
    // where the four snaps sit, in stage units
    var SH = { x: 790, y: 400, s: 1.55 }, TE = { x: 420, y: 390, s: 1.6 };
    var P_SH = { x: SH.x + (0.868 - 0.5) * SW * SH.s, y: SH.y + (0.77 - 0.5) * 293 * SH.s };
    var P_TE = { x: TE.x + (0.27 - 0.5) * TW * TE.s, y: TE.y + (0.845 - 0.5) * 293 * TE.s };

    function fit() { stage.style.transform = 'scale(' + (player.clientWidth / 1200) + ')'; }
    fit(); window.addEventListener('resize', fit);

    gsap.set([shorts, tee, pocket], { xPercent: -50, yPercent: -50 });
    gsap.set(ring, { x: 0, y: 0 });

    var tl = gsap.timeline({ paused: true, onUpdate: tick, onComplete: icons });
    tl.set(shorts, { x: 1560, y: SH.y, scale: SH.s, skewX: 0, opacity: 1 }, 0)
      .set(tee, { x: -360, y: TE.y, scale: TE.s, opacity: 1 }, 0)
      .set(pocket, { x: 600, y: 380, scale: 1.5, rotation: -4, opacity: 1 }, 0)
      .set(flip, { scaleX: 1 }, 0).set(pf, { opacity: 1 }, 0).set(pb, { opacity: 0 }, 0)
      .set(dots, { scale: 0 }, 0)
      // pocket alone
      .to(pocket, { rotation: 4, duration: 1.3, ease: 'sine.inOut' }, 0)
      // shorts walk in, pocket goes to its four snaps
      .to(shorts, { x: SH.x, duration: 1.8, ease: 'power2.out' }, 0.8)
      .to(pocket, { x: P_SH.x, scale: 0.9, rotation: 0, duration: 0.9, ease: 'power3.inOut' }, 1.9)
      .to(pocket, { y: 250, duration: 0.42, ease: 'sine.out' }, 1.9)
      .to(pocket, { y: P_SH.y, duration: 0.48, ease: 'sine.in' }, 2.32)
      .call(sfx.click, null, 2.8)
      .fromTo(pocket, { scaleX: 1.02, scaleY: 0.8 }, { scaleX: 0.9, scaleY: 0.9, duration: 0.6, ease: 'elastic.out(1,0.4)', immediateRender: false }, 2.8)
      .fromTo(ring, { x: P_SH.x, y: P_SH.y, scale: 0.4, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 2.8)
      // tear it off: fabric follows, then lets go
      .to(pocket, { x: P_SH.x + 78, y: P_SH.y + 22, rotation: 8, duration: 0.9, ease: 'power2.in' }, 5.0)
      .to(shorts, { skewX: -5, x: SH.x + 14, duration: 0.9, ease: 'power2.in' }, 5.0)
      .call(sfx.click, null, 5.9)
      .to(shorts, { skewX: 0, x: SH.x, duration: 1.0, ease: 'elastic.out(1,0.3)' }, 5.9)
      .call(sfx.whoosh, null, 5.95)
      .to(pocket, { x: 600, y: 320, scale: 1.3, rotation: 0, duration: 1.0, ease: 'power2.out' }, 5.9)
      .to(flip, { scaleX: 0, duration: 0.2, ease: 'sine.in' }, 6.0)
      .set(pf, { opacity: 0 }, 6.2).set(pb, { opacity: 1 }, 6.2)
      .to(flip, { scaleX: 1, duration: 0.3, ease: 'sine.out' }, 6.2)
      .to(shorts, { x: 1560, duration: 1.1, ease: 'power2.in' }, 6.4)
      // tee walks in, pocket flips back and lands on it
      .to(tee, { x: TE.x, duration: 1.6, ease: 'power2.out' }, 6.7)
      .call(sfx.whoosh, null, 7.7)
      .to(flip, { scaleX: 0, duration: 0.2, ease: 'sine.in' }, 7.7)
      .set(pf, { opacity: 1 }, 7.9).set(pb, { opacity: 0 }, 7.9)
      .to(flip, { scaleX: 1, duration: 0.3, ease: 'sine.out' }, 7.9)
      .to(pocket, { x: P_TE.x, scale: 0.86, duration: 0.9, ease: 'power3.inOut' }, 7.8)
      .to(pocket, { y: 230, duration: 0.42, ease: 'sine.out' }, 7.8)
      .to(pocket, { y: P_TE.y, duration: 0.48, ease: 'sine.in' }, 8.22)
      .call(sfx.click, null, 8.7)
      .fromTo(pocket, { scaleX: 0.98, scaleY: 0.76 }, { scaleX: 0.86, scaleY: 0.86, duration: 0.6, ease: 'elastic.out(1,0.4)', immediateRender: false }, 8.7)
      .fromTo(ring, { x: P_TE.x, y: P_TE.y, scale: 0.4, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 8.7)
      // finale: back to the middle, collapses into the four dots
      .call(sfx.click, null, 10.1)
      .to(pocket, { x: 600, y: 380, scale: 1.7, rotation: -3, duration: 0.9, ease: 'power3.inOut' }, 10.1)
      .to(tee, { x: -360, duration: 1.0, ease: 'power2.in' }, 10.1)
      .to(pocket, { scale: 0, duration: 0.3, ease: 'back.in(2.5)' }, 11.1)
      .call(sfx.pop, null, 11.36)
      .to(dots, { scale: 1, duration: 0.8, ease: 'elastic.out(1,0.45)', stagger: 0.05 }, 11.36)
      .to({}, { duration: 0.6 });

    var lastStep = -1;
    function tick() {
      var t = tl.time();
      var sWalk = (t > 0.8 && t < 5.0) || (t > 6.4 && t < 7.5), tWalk = t > 6.7 && t < 10.1 || t > 10.1 && t < 11.1;
      var f = Math.floor(t * FPS) % 9;
      shorts.style.backgroundPosition = (-(sWalk ? f : 0) * SW) + 'px 0';
      tee.style.backgroundPosition = (-(tWalk ? f : 0) * TW) + 'px 0';
      var cyc = Math.floor(t * FPS / 4.5);
      if ((sWalk || tWalk) && cyc !== lastStep && !tl.paused()) { lastStep = cyc; sfx.step(); }
      $('#ring-fg').style.strokeDashoffset = String(50.27 * (1 - tl.progress()));
    }
    function icons() {
      var playing = !tl.paused() && tl.progress() < 1;
      $('#ico-pause').toggleAttribute('hidden', !playing);
      $('#ico-play').toggleAttribute('hidden', playing);
      $('#btn-play').setAttribute('aria-label', playing ? (lang === 'ru' ? 'Пауза' : 'Pause') : (lang === 'ru' ? 'Играть' : 'Play'));
    }
    $('#cover').addEventListener('click', function () { audio(); player.classList.add('is-live'); lastStep = -1; tl.restart(); icons(); });
    $('#btn-play').addEventListener('click', function () {
      audio();
      if (tl.progress() >= 1) { lastStep = -1; tl.restart(); } else tl.paused(!tl.paused());
      icons();
    });
    $('#btn-restart').addEventListener('click', function () { audio(); lastStep = -1; tl.restart(); icons(); });
    $('#btn-sound').addEventListener('click', function () {
      soundOn = !soundOn; this.setAttribute('aria-pressed', String(soundOn));
    });
    onLang.push(icons);
    tl.progress(0.045).pause();
    tick(); icons();
  }

  /* ---------------------------------------------------------------- */
  /* 5. Comic: a booklet with soft page turns                          */
  /* ---------------------------------------------------------------- */
  var PAGES = [
    [['Комикс', 'Три страницы о том, как носить вещи. Тяни страницу за уголок'], ['The comic', 'Three pages on carrying your stuff. Drag a page by its corner']],
    [['Плохо', 'Сумка цепляется, рюкзак за спиной, пакет рвется, карманы не держат'], ['Bad', 'The bag snags, the backpack is behind you, the bag rips, pockets spill']],
    [['Решение', 'Карман на четырех кнопках. Лица он тоже хранит там'], ['The fix', 'A pocket on four snaps. He keeps his faces in there too']],
    [['Хорошо', 'Те же места. Руки свободны, все при себе'], ['Good', 'Same places. Hands free, everything on you']],
    [['Скоро', 'Пока это прототипы. Хочешь такой, напиши'], ['Soon', 'Prototypes for now. Want one? Message me']],
    [['Конец', 'Можно листать назад'], ['The end', 'You can flip back']]
  ];
  function initBook() {
    var el = $('#book');
    if (!el || !window.St) return;
    var book = new St.PageFlip(el, {
      width: 440, height: 660, size: 'stretch',
      minWidth: 250, maxWidth: 490, minHeight: 375, maxHeight: 735,
      showCover: true, usePortrait: true, mobileScrollSupport: true,
      maxShadowOpacity: 0.35, flippingTime: 950, drawShadow: true
    });
    book.loadFromHTML($$('.page', el));
    var title = $('#page-title'), text = $('#page-text'), num = $('#page-num'), prev = $('#prev'), next = $('#next');
    function update() {
      var i = book.getCurrentPageIndex(), n = book.getPageCount(), land = book.getOrientation() === 'landscape';
      var L = lang === 'ru' ? 0 : 1, c = PAGES[i][L], t = c[0], x = c[1];
      if (land && i > 0 && i < n - 1 && PAGES[i + 1]) { t = c[0] + ' → ' + PAGES[i + 1][L][0]; }
      title.textContent = t; text.textContent = x;
      num.textContent = land ? (Math.ceil(i / 2) + 1) + ' / ' + (n / 2 + 1) : (i + 1) + ' / ' + n;
      prev.disabled = i === 0; next.disabled = i >= n - 1;
      prev.setAttribute('aria-label', lang === 'ru' ? 'Назад' : 'Previous page');
      next.setAttribute('aria-label', lang === 'ru' ? 'Вперед' : 'Next page');
    }
    function peek() {
      var fc = book.getFlipController && book.getFlipController();
      if (!fc || reduced || book.getCurrentPageIndex() !== 0) return;
      var w = el.offsetWidth, h = el.offsetHeight, p = { x: w - 6, y: h - 6 };
      gsap.timeline()
        .to(p, { x: w * 0.8, y: h * 0.8, duration: 0.9, ease: 'sine.inOut', onUpdate: function () { try { fc.fold({ x: p.x, y: p.y }); } catch (e) {} } })
        .to(p, { x: w * 0.86, y: h * 0.84, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1, onUpdate: function () { try { fc.fold({ x: p.x, y: p.y }); } catch (e) {} } })
        .call(function () { try { fc.stopMove(); } catch (e) {} });
    }
    ScrollTrigger.create({ trigger: el, start: 'top 55%', once: true, onEnter: function () { setTimeout(peek, 350); } });
    book.on('flip', update);
    book.on('changeOrientation', update);
    prev.addEventListener('click', function () { book.flipPrev(); });
    next.addEventListener('click', function () { book.flipNext(); });
    onLang.push(update);
    update();
  }

  /* ---------------------------------------------------------------- */
  /* 6. Pieces: the pocket hops between tee and shorts                 */
  /* ---------------------------------------------------------------- */
  function initSwap() {
    var wrap = $('#swap'), pocket = $('#sw-pocket');
    if (!wrap) return;
    var el = { tee: $('#sw-tee'), shorts: $('#sw-shorts') };
    var AT = { tee: [0.313, 0.845, 0.31], shorts: [0.862, 0.733, 0.36] };
    var where = 'tee', moving = false, ring = $('#sw-target'), pulse = null;
    function hint() {
      var t = target(where === 'tee' ? 'shorts' : 'tee');
      gsap.set(ring, { x: t.x, y: t.y });
      if (!pulse && !reduced) pulse = gsap.fromTo(ring, { scale: 0.45, opacity: 0.9 }, { scale: 1.7, opacity: 0, duration: 1.5, ease: 'power2.out', repeat: -1, repeatDelay: 0.3 });
    }
    function target(k) {
      var r = el[k].getBoundingClientRect(), c = wrap.getBoundingClientRect();
      return { x: r.left - c.left + r.width * AT[k][0], y: r.top - c.top + r.height * AT[k][1], w: r.width * AT[k][2] };
    }
    function place() {
      var t = target(where);
      gsap.set(pocket, { xPercent: -50, yPercent: -50, x: t.x, y: t.y, width: t.w, rotation: 0, scaleX: 1, scaleY: 1 });
      hint();
    }
    function go(k) {
      audio();
      if (moving) return;
      if (k === where) {
        gsap.fromTo(pocket, { rotation: -7 }, { rotation: 0, duration: 0.8, ease: 'elastic.out(1,0.3)' });
        return;
      }
      moving = true; where = k; gsap.set(ring, { opacity: 0 }); if (pulse) pulse.pause();
      var t = target(k), dir = k === 'shorts' ? 1 : -1;
      sfx.click();
      gsap.timeline({ onComplete: function () { moving = false; hint(); if (pulse) pulse.restart(); } })
        .to(pocket, { x: t.x, width: t.w, duration: 0.8, ease: 'power2.inOut' }, 0)
        .to(pocket, { y: Math.min(t.y, gsap.getProperty(pocket, 'y')) - 90, rotation: 10 * dir, duration: 0.42, ease: 'sine.out' }, 0)
        .to(pocket, { y: t.y, rotation: 0, duration: 0.38, ease: 'sine.in' }, 0.42)
        .call(sfx.click)
        .fromTo(pocket, { scaleX: 1.14, scaleY: 0.88 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1,0.4)' });
    }
    el.tee.addEventListener('click', function () { go('tee'); });
    el.shorts.addEventListener('click', function () { go('shorts'); });
    window.addEventListener('resize', place);
    window.addEventListener('load', place);
    place();
  }

  /* ---------------------------------------------------------------- */
  initHero();
  initLoad();
  initPocket();
  initFilm();
  initBook();
  initSwap();
  applyLang();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
