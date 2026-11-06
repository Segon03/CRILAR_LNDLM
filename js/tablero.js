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

  const S = 1600;                        // lado del tablero (cuadrado) en las coordenadas de datos/muestra.js
  const ANCHO_PIZARRA = 700;             // por debajo de este ancho se usa la lista
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
    const orden = (cfg.ordenRespuestas && cfg.ordenRespuestas.length === pares.length) ? cfg.ordenRespuestas.slice() : pares.map((_, i) => i);
    return { hechos: new Set(), orden: orden, sel: -1, ocupado: false, final: false, n: pares.length };
  }

  function iniciar(raiz, cfg) {
    detener();
    if (!raiz) return;
    const c = cfg || {};
    const pares = c.pares || [];
    if (!est || est.n !== pares.length) est = nuevoEstado(c);
    raiz.innerHTML =
      '<div class="tab" role="group" aria-label="Tablero de luz con preguntas y respuestas sobre insectos">' +
        '<div class="tab__stage">' +
          '<div class="tab__qs" role="list"></div>' +
          '<div class="tab__rs" role="list"></div>' +
          '<div class="tab__estado"><div class="tab__luces" aria-hidden="true"></div><p class="tab__cuenta"></p>' +
            '<button type="button" class="tab__reiniciar">Volver a empezar</button></div>' +
          '<p class="tab__msg" aria-live="polite"></p>' +
          '<p class="tab__barra">' + esc(c.barra || '') + '</p>' +
          '<div class="tab__fin" hidden><p class="tab__fin-txt"></p><button type="button" class="tab__fin-otra">Volver a jugar</button><button type="button" class="tab__fin-ver">Ver el tablero</button></div>' +
        '</div>' +
        '<canvas class="tab__confeti" aria-hidden="true"></canvas>' +
      '</div>';
    const tab = raiz.querySelector('.tab'), stage = raiz.querySelector('.tab__stage');
    if (c.fondo) tab.style.setProperty('--fondo', 'url("' + new URL(c.fondo, document.baseURI).href + '")');
    const qs = raiz.querySelector('.tab__qs'), rs = raiz.querySelector('.tab__rs');
    const luces = raiz.querySelector('.tab__luces'), cuenta = raiz.querySelector('.tab__cuenta');
    const msg = raiz.querySelector('.tab__msg'), btn = raiz.querySelector('.tab__reiniciar');
    const fin = raiz.querySelector('.tab__fin'), finTxt = raiz.querySelector('.tab__fin-txt');
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

    vista = { raiz: raiz, tab: tab, stage: stage, cv: cv, bq: bq, br: br, pares: pares, cfg: c, k: 1, modo: '', fin: fin };

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
      cuenta.textContent = est.hechos.size + ' de ' + pares.length;
      cuenta.setAttribute('aria-label', est.hechos.size + ' de ' + pares.length + ' luces encendidas');
      btn.hidden = !est.hechos.size;
      tab.classList.toggle('tab--completo', est.final);
      if (!msg.dataset.fijo) msg.textContent = est.final ? '' : '';
    }
    function mostrarFin() {
      finTxt.textContent = c.final || '¡Completaste el tablero!';
      fin.hidden = false;
    }

    function centro(el) {
      const r = el.getBoundingClientRect(), t = tab.getBoundingClientRect();
      return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2 };
    }
    function avisar(texto, ms) {
      msg.textContent = texto; msg.dataset.fijo = '1'; msg.classList.add('ver');
      clearTimeout(vista && vista.tMsg);
      if (vista) vista.tMsg = setTimeout(() => { if (!vista) return; delete msg.dataset.fijo; msg.classList.remove('ver'); }, ms || 1800);
    }

    function elegirPregunta(i) {
      if (est.ocupado || est.hechos.has(i)) return;
      if (est.sel === i) { est.sel = -1; pintar(); return; }
      est.sel = i; sonido.elegir(); pintar();
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
        const a = centro(q), b = centro(r), k = cv._k || 1;
        if (est.hechos.size === pares.length) {
          est.final = true; pintar();
          sonido.acierto(); setTimeout(sonido.final, 380);
          confeti(cv, [{ x: cv.width / 2, y: cv.height * 0.45, ang: -Math.PI / 2, abre: 3.4 },
            { x: 20 * k, y: cv.height * 0.85, ang: -1.1, abre: 0.9 }, { x: cv.width - 20 * k, y: cv.height * 0.85, ang: -2.04, abre: 0.9 }], 260, 15 * k);
          setTimeout(() => { if (vista && vista.cv === cv) confeti(cv, [{ x: cv.width * 0.3, y: -10, ang: Math.PI / 2, abre: 2.6 }, { x: cv.width * 0.7, y: -10, ang: Math.PI / 2, abre: 2.6 }], 160, 5 * k); }, 700);
          setTimeout(() => { if (vista && vista.cv === cv && est.final) mostrarFin(); }, 1300);
        } else {
          sonido.acierto();
          confeti(cv, [{ x: a.x * k, y: a.y * k, ang: -Math.PI / 2, abre: 2.8 }, { x: b.x * k, y: b.y * k, ang: -Math.PI / 2, abre: 2.8 }], 90, 9 * k);
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
    const reiniciar = () => { est = nuevoEstado(c); fin.hidden = true; delete msg.dataset.fijo; pintar(); };
    btn.addEventListener('click', reiniciar);
    raiz.querySelector('.tab__fin-otra').addEventListener('click', reiniciar);
    raiz.querySelector('.tab__fin-ver').addEventListener('click', () => { fin.hidden = true; });

    pintar();
    if (est.final) mostrarFin();
    ajustar();
    window.addEventListener('resize', ajustar);
  }

  /* ---------- tamaño y modo ---------- */
  function caber(carta, min, max, caja) {
    const t = carta.querySelector('.tab__txt');
    let f = max;
    carta.style.fontSize = f + 'px';
    while (f > min && (t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1)) { f -= 0.5; carta.style.fontSize = f + 'px'; }
    return f;
  }
  function colocar(modo) {
    const v = vista;
    const todas = v.bq.concat(v.br);
    if (modo === 'pizarra') {
      v.pares.forEach((p, i) => {
        [[v.bq[i], p.pc], [v.br[i], p.rc]].forEach((par) => {
          const b = par[0], g = par[1] || [0, 0, 150], d = g[2];
          b.style.cssText = 'left:' + (g[0] - d / 2) + 'px;top:' + (g[1] - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px;--d:' + d + 'px';
        });
      });
      const fq = Math.min.apply(null, v.bq.map((b) => caber(b, 8, 22)));
      const fr = Math.min.apply(null, v.br.map((b) => caber(b, 8, 30)));
      v.bq.forEach((b) => { b.style.fontSize = fq + 'px'; });
      v.br.forEach((b) => { b.style.fontSize = caber(b, 8, 34) + 'px'; });
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
      const lado = Math.min(ancho, 1100);
      const k = lado / S;
      v.k = k;
      v.tab.style.width = lado + 'px'; v.tab.style.height = lado + 'px';
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
    if (est) { est.ocupado = false; est.sel = -1; }
    vista = null;
  }

  C.tablero = { iniciar: iniciar, detener: detener, _est: () => est, _vista: () => vista };
})();
