/* =====================================================================
   Tablero de luz: une cada pregunta con su respuesta.
   - Se elige una pregunta (queda "encendida") y después una respuesta.
   - Si es correcta, las dos se encienden en verde, suena un aviso y cae confeti.
   - Si no, las dos se ponen rojas, suena un error y se puede volver a elegir.
   Las preguntas y respuestas se escriben en datos/muestra.js (ficha tipo "tablero").
   Los sonidos se generan con el navegador, no hace falta ningún archivo de audio.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;

  const W = 1600, H = 1000;              // medidas del tablero en modo "pizarra"
  const ANCHO_PIZARRA = 760;             // por debajo de este ancho se usa la lista
  const reducir = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let vista = null;                      // lo que está abierto ahora
  let est = null;                        // progreso (se conserva mientras no se recargue la página)

  /* ---------- sonido ---------- */
  let ac = null;
  function audio() {
    if (C.sonido && C.sonido.activo && !C.sonido.activo()) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac) { try { ac = new AC(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tono(f, t0, dur, tipo, vol, f2) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sonido = {
    elegir() { tono(660, 0, 0.09, 'triangle', 0.13); tono(880, 0.05, 0.09, 'triangle', 0.1); },
    error() { tono(230, 0, 0.2, 'square', 0.09, 150); tono(160, 0.22, 0.3, 'square', 0.09, 95); },
    acierto() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, i * 0.085, 0.32, 'triangle', 0.17)); },
    final() {
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tono(f, i * 0.13, 0.45, 'triangle', 0.18));
      [1046.5, 1318.5, 1568].forEach((f) => tono(f, 0.95, 0.9, 'sine', 0.12));
    }
  };

  /* ---------- confeti ---------- */
  const COLORES = ['#ff3b5c', '#ffd23a', '#2ee86a', '#3aa8ff', '#b36bff', '#ff8a2a', '#ffffff'];
  function confeti(cv, orig, cant, fuerza) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const n = reducir ? Math.min(cant, 24) : cant;
    const ps = [];
    orig.forEach((o) => {
      for (let i = 0; i < n / orig.length; i++) {
        const a = (o.ang == null ? -Math.PI / 2 : o.ang) + (Math.random() - 0.5) * (o.abre == null ? 2.4 : o.abre);
        const v = (0.45 + Math.random() * 0.75) * fuerza;
        ps.push({
          x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          c: COLORES[(Math.random() * COLORES.length) | 0], t: 0, vida: 90 + Math.random() * 70
        });
      }
    });
    const prev = cv._ps || [];
    cv._ps = prev.concat(ps);
    if (cv._anim) return;
    const paso = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const k = cv._k || 1;
      cv._ps = cv._ps.filter((p) => p.t < p.vida && p.y < cv.height + 30);
      cv._ps.forEach((p) => {
        p.t++; p.vy += 0.22 * k; p.vx *= 0.992; p.vy *= 0.992;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.vida - p.t) / 30));
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2 * k, -p.h / 2 * k, p.w * k, p.h * k);
        ctx.restore();
      });
      if (cv._ps.length) cv._anim = requestAnimationFrame(paso);
      else { cv._anim = 0; ctx.clearRect(0, 0, cv.width, cv.height); }
    };
    cv._anim = requestAnimationFrame(paso);
  }

  /* ---------- armado ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const BOMBILLA = '<svg class="tab__bombilla" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/><path class="base" d="M9 20h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/></svg>';

  function nuevoEstado(cfg) {
    const pares = cfg.pares || [];
    let orden = (cfg.ordenRespuestas && cfg.ordenRespuestas.length === pares.length) ? cfg.ordenRespuestas.slice() : pares.map((_, i) => i);
    return { hechos: new Set(), orden: orden, sel: -1, ocupado: false, final: false };
  }

  function iniciar(raiz, cfg) {
    detener();
    if (!raiz) return;
    const c = cfg || {};
    const pares = c.pares || [];
    if (!est || est.n !== pares.length) { est = nuevoEstado(c); est.n = pares.length; }
    const fotos = (c.fotos || []).map((f) => '<img src="' + esc(f.src) + '" alt="' + esc(f.alt || '') + '" loading="lazy" draggable="false">').join('');
    raiz.innerHTML =
      '<div class="tab" role="group" aria-label="Tablero de luz con preguntas y respuestas sobre insectos">' +
        '<div class="tab__stage">' +
          '<div class="tab__qs" role="list"></div>' +
          '<div class="tab__rs" role="list"></div>' +
          '<div class="tab__centro">' +
            '<div class="tab__estado"><div class="tab__luces" aria-hidden="true"></div><p class="tab__cuenta"></p></div>' +
            '<div class="tab__fotos" aria-hidden="true">' + fotos + '</div>' +
            '<div class="tab__ayuda"><p class="tab__msg" aria-live="polite"></p>' +
              '<button type="button" class="tab__reiniciar">Volver a empezar</button></div>' +
          '</div>' +
        '</div>' +
        '<canvas class="tab__confeti" aria-hidden="true"></canvas>' +
      '</div>';
    const tab = raiz.querySelector('.tab'), stage = raiz.querySelector('.tab__stage');
    const qs = raiz.querySelector('.tab__qs'), rs = raiz.querySelector('.tab__rs');
    const luces = raiz.querySelector('.tab__luces'), cuenta = raiz.querySelector('.tab__cuenta');
    const msg = raiz.querySelector('.tab__msg'), btn = raiz.querySelector('.tab__reiniciar');
    const cv = raiz.querySelector('.tab__confeti');

    const bq = [], br = [];
    pares.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab__carta tab__carta--p'; b.setAttribute('role', 'listitem');
      b.setAttribute('aria-pressed', 'false'); b.dataset.i = i;
      b.innerHTML = BOMBILLA + '<span class="tab__txt">' + esc(p.p) + '</span>';
      qs.appendChild(b); bq[i] = b;
      luces.appendChild(Object.assign(document.createElement('i'), { className: 'tab__luz' }));
    });
    est.orden.forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab__carta tab__carta--r'; b.setAttribute('role', 'listitem'); b.dataset.i = i;
      b.innerHTML = BOMBILLA + '<span class="tab__txt">' + esc(pares[i].r) + '</span>';
      rs.appendChild(b); br[i] = b;
    });

    vista = { raiz: raiz, tab: tab, stage: stage, qs: qs, rs: rs, cv: cv, bq: bq, br: br, luces: luces, cuenta: cuenta, msg: msg, cfg: c, pares: pares, k: 1, modo: '' };

    function pintar() {
      bq.forEach((b, i) => {
        const ok = est.hechos.has(i);
        b.classList.toggle('bien', ok);
        br[i].classList.toggle('bien', ok);
        b.disabled = ok; br[i].disabled = ok;
        const on = est.sel === i;
        b.classList.toggle('elegida', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(luces.children, (l, i) => l.classList.toggle('on', i < est.hechos.size));
      cuenta.textContent = est.hechos.size + ' de ' + pares.length + ' luces encendidas';
      tab.classList.toggle('tab--completo', est.final);
      if (est.final) msg.textContent = c.final || '¡Completaste el tablero!';
      else if (!msg.dataset.fijo) msg.textContent = c.ayuda || '';
      btn.hidden = !est.hechos.size;
    }

    function centro(el) {
      const r = el.getBoundingClientRect(), t = tab.getBoundingClientRect();
      return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2 };
    }
    function avisar(texto, ms) {
      msg.textContent = texto; msg.dataset.fijo = '1';
      clearTimeout(vista && vista.tMsg);
      if (vista) vista.tMsg = setTimeout(() => { if (!vista) return; delete msg.dataset.fijo; pintar(); }, ms || 1800);
    }

    function elegirPregunta(i) {
      if (est.ocupado || est.hechos.has(i)) return;
      if (est.sel === i) { est.sel = -1; pintar(); return; }
      est.sel = i; sonido.elegir(); pintar();
      avisar('Ahora elegí la respuesta.', 2600);
    }
    function elegirRespuesta(j) {
      if (est.ocupado || est.hechos.has(j)) return;
      if (est.sel < 0) {
        sonido.elegir();
        avisar('Primero elegí una pregunta.', 1800);
        qs.classList.remove('tab__aviso'); void qs.offsetWidth; qs.classList.add('tab__aviso');
        return;
      }
      const i = est.sel, q = bq[i], r = br[j];
      if (i === j) {
        est.hechos.add(i); est.sel = -1;
        pintar();
        [q, r].forEach((e) => { e.classList.remove('prende'); void e.offsetWidth; e.classList.add('prende'); });
        const a = centro(q), b = centro(r);
        const fin = est.hechos.size === pares.length;
        if (fin) {
          est.final = true; pintar();
          sonido.acierto(); setTimeout(sonido.final, 380);
          const ch = cv.height / (cv._k || 1);
          confeti(cv, [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, ang: -Math.PI / 2, abre: 3 },
            { x: 20 * cv._k, y: cv.height * 0.85, ang: -1.1, abre: 0.9 }, { x: cv.width - 20 * cv._k, y: cv.height * 0.85, ang: -2.04, abre: 0.9 }], 240, 15 * cv._k);
          setTimeout(() => { if (vista && vista.cv === cv) confeti(cv, [{ x: cv.width * 0.3, y: -10, ang: Math.PI / 2, abre: 2.6 }, { x: cv.width * 0.7, y: -10, ang: Math.PI / 2, abre: 2.6 }], 160, 5 * cv._k); }, 700);
        } else {
          sonido.acierto();
          confeti(cv, [{ x: a.x, y: a.y, ang: -Math.PI / 2, abre: 2.8 }, { x: b.x, y: b.y, ang: -Math.PI / 2, abre: 2.8 }], 90, 9 * cv._k);
          avisar('¡Correcto! Se encendió una luz.', 1700);
        }
        return;
      }
      est.ocupado = true;
      q.classList.add('mal'); r.classList.add('mal');
      sonido.error();
      setTimeout(() => {
        q.classList.remove('mal', 'elegida'); r.classList.remove('mal');
        est.sel = -1; est.ocupado = false;
        if (vista) pintar();
      }, 900);
    }

    qs.addEventListener('click', (e) => { const b = e.target.closest('.tab__carta'); if (b) elegirPregunta(+b.dataset.i); });
    rs.addEventListener('click', (e) => { const b = e.target.closest('.tab__carta'); if (b) elegirRespuesta(+b.dataset.i); });
    btn.addEventListener('click', () => {
      est = nuevoEstado(c); est.n = pares.length;
      delete msg.dataset.fijo; pintar();
    });

    vista.pintar = pintar;
    pintar();
    ajustar();
    window.addEventListener('resize', ajustar);
  }

  /* ---------- tamaño y modo ---------- */
  function ajustarTexto(carta) {
    const t = carta.querySelector('.tab__txt');
    const esR = carta.classList.contains('tab__carta--r');
    let f = esR ? 34 : 23;
    const min = esR ? 22 : 14;
    carta.style.fontSize = f + 'px';
    while (f > min && (t.offsetHeight > carta.clientHeight - 20 || t.scrollWidth > t.clientWidth + 1)) { f -= 1; carta.style.fontSize = f + 'px'; }
  }
  function colocar(modo) {
    const v = vista;
    const todas = v.bq.concat(v.br);
    if (modo === 'pizarra') {
      const n = v.bq.length;
      const filasA = Math.ceil(n / 2), filasB = n - filasA;
      const h = 148, paso = 160, x1 = 18, x2 = 408, w = 372;
      v.bq.forEach((b, i) => {
        const col = i < filasA ? 0 : 1, fila = col ? i - filasA : i;
        const y0 = col ? 24 + (filasA - filasB) * paso / 2 : 24;
        b.style.cssText = 'left:' + (col ? x2 : x1) + 'px;top:' + (y0 + fila * paso) + 'px;width:' + w + 'px;height:' + h + 'px';
      });
      const m = v.br.length, ph = 74, pp = (H - 40 - ph) / Math.max(1, m - 1);
      let k = 0;
      Array.prototype.forEach.call(v.rs.children, (b) => { b.style.cssText = 'left:' + (W - 18 - 360) + 'px;top:' + (20 + k * pp) + 'px;width:360px;height:' + ph + 'px'; k++; });
      todas.forEach(ajustarTexto);
      [v.bq, v.br].forEach((g) => {
        const m = Math.min.apply(null, g.map((b) => parseFloat(b.style.fontSize)));
        g.forEach((b) => { b.style.fontSize = m + 'px'; });
      });
    } else {
      todas.forEach((b) => { b.style.cssText = ''; });
    }
  }
  function ajustar() {
    const v = vista; if (!v) return;
    const ancho = Math.max(220, v.raiz.clientWidth);
    const modo = ancho >= ANCHO_PIZARRA ? 'pizarra' : 'lista';
    if (modo !== v.modo) {
      v.modo = modo;
      v.tab.classList.toggle('tab--pizarra', modo === 'pizarra');
      v.tab.classList.toggle('tab--lista', modo === 'lista');
      colocar(modo);
    }
    if (modo === 'pizarra') {
      const altoMax = Math.max(260, Math.min(innerHeight - v.raiz.offsetTop - 40, 1000));
      const k = Math.min(ancho / W, Math.max(altoMax / H, 0.72));
      v.k = k;
      v.tab.style.width = (W * k) + 'px'; v.tab.style.height = (H * k) + 'px';
      v.stage.style.transform = 'scale(' + k + ')';
    } else {
      v.k = 1;
      v.tab.style.width = ''; v.tab.style.height = '';
      v.stage.style.transform = '';
    }
    const r = v.tab.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    v.cv.width = Math.round(r.width * dpr); v.cv.height = Math.round(r.height * dpr);
    v.cv.style.width = r.width + 'px'; v.cv.style.height = r.height + 'px';
    v.cv._k = dpr;
  }

  function detener() {
    window.removeEventListener('resize', ajustar);
    if (vista) { clearTimeout(vista.tMsg); if (vista.cv) { cancelAnimationFrame(vista.cv._anim); vista.cv._anim = 0; vista.cv._ps = []; } }
    if (est) est.ocupado = false;
    if (est) est.sel = -1;
    vista = null;
  }

  C.tablero = { iniciar: iniciar, detener: detener, _est: () => est, _vista: () => vista };
})();
