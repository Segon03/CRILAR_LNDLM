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
  const NS = 'http://www.w3.org/2000/svg';
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
  const FOCO = '<path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/><path class="base" d="M9 20h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/>';

  function nuevoEstado(cfg) {
    const pares = cfg.pares || [];
    const orden = (cfg.ordenRespuestas && cfg.ordenRespuestas.length === pares.length) ? cfg.ordenRespuestas.slice() : pares.map((_, i) => i);
    return { hechos: new Set(), orden: orden, sel: -1, ocupado: false, final: false, n: pares.length };
  }

  /* Renglones ya calculados (datos/tablero-lineas.js). Si faltan, se corta por palabras. */
  function renglones(L, tipo, i, texto) {
    if (L && L[tipo] && L[tipo][i]) return L[tipo][i];
    const pal = String(texto).split(/\s+/), out = []; let a = '';
    pal.forEach((w) => { if (a && (a + ' ' + w).length > 14) { out.push(a); a = w; } else a = a ? a + ' ' + w : w; });
    if (a) out.push(a);
    return out;
  }
  function textoSVG(lineas, cx, cy, t, ih) {
    const lh = t * ih, y0 = cy - (lineas.length * lh) / 2 + lh / 2 + t * 0.34;
    return '<text class="tab__t" x="' + cx + '" font-size="' + t + '" text-anchor="middle">' +
      lineas.map((l, n) => '<tspan x="' + cx + '" y="' + (y0 + n * lh).toFixed(1) + '">' + esc(l) + '</tspan>').join('') + '</text>';
  }
  function circuloSVG(tipo, i, g, lineas, t, ih, etiqueta) {
    const cx = g[0], cy = g[1], R = g[2] / 2, sw = tipo === 'p' ? 12 : 10;
    const fx = cx + R * 0.66 - 22, fy = cy - R * 0.78 - 22;
    return '<g class="tab__c tab__c--' + tipo + '" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(etiqueta) + '">' +
      '<circle class="tab__aro" cx="' + cx + '" cy="' + cy + '" r="' + (R - sw / 2) + '" stroke-width="' + sw + '"/>' +
      textoSVG(lineas, cx, cy, t, ih) +
      '<g class="tab__foco" transform="translate(' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ') scale(1.9)">' + FOCO + '</g>' +
      '</g>';
  }

  function iniciar(raiz, cfg) {
    detener();
    if (!raiz) return;
    const c = cfg || {};
    const pares = c.pares || [];
    const L = window.TABLERO_LINEAS || null;
    const ih = (L && L.interlinea) || 1.16, tp = (L && L.letraP) || 22, tr = (L && L.letraR) || 20;
    if (!est || est.n !== pares.length) est = nuevoEstado(c);

    /* ----- tablero (SVG): el texto queda fijo y escala junto con la imagen ----- */
    let svg = '<svg class="tab__svg" viewBox="0 0 ' + S + ' ' + S + '" xmlns="' + NS + '" aria-label="Tablero de luz con preguntas y respuestas sobre insectos">';
    if (c.fondo) svg += '<image href="' + esc(c.fondo) + '" x="0" y="0" width="' + S + '" height="' + S + '" preserveAspectRatio="none"/>';
    const lb = (L && L.barra) || [c.barra || ''], tb = (L && L.letraBarra) || 34;
    svg += '<g class="tab__sbarra" aria-hidden="true"><rect x="3" y="1505" width="1351" height="95" fill="#00ff00"/>' +
      '<text class="tab__tb" font-size="' + tb + '">' + lb.map((l, n) => '<tspan x="24" y="' + (1552 - (lb.length - 1) * tb * 0.56 + n * tb * 1.12 + tb * 0.34).toFixed(1) + '">' + esc(l) + '</tspan>').join('') + '</text></g>';
    svg += '<g class="tab__sestado" aria-hidden="true"><rect x="880" y="118" width="700" height="64" rx="32" class="tab__pill"/>';
    for (let n = 0; n < pares.length; n++) svg += '<circle class="tab__sluz" cx="' + (1180 + n * 25) + '" cy="150" r="10"/>';
    svg += '<text class="tab__scuenta" x="1562" y="161" text-anchor="end" font-size="30"></text>' +
      '<g class="tab__sreini" tabindex="0" role="button" aria-label="Volver a empezar"><rect x="896" y="128" width="250" height="44" rx="22"/><text x="1021" y="158" text-anchor="middle" font-size="22">Volver a empezar</text></g></g>';
    pares.forEach((p, i) => { svg += circuloSVG('p', i, p.pc || [200, 200, 240], renglones(L, 'p', i, p.pt || p.p), tp, ih, p.p); });
    est.orden.forEach((i) => { const p = pares[i]; svg += circuloSVG('r', i, p.rc || [1300, 200, 150], renglones(L, 'r', i, p.r), tr, ih, p.r); });
    svg += '</svg>';

    raiz.innerHTML =
      '<div class="tab tab--svg">' + svg + '</div>' +
      '<div class="tab tab--lista" hidden>' +
        '<div class="tab__stage">' +
          '<div class="tab__qs" role="list"></div><div class="tab__rs" role="list"></div>' +
          '<div class="tab__estado"><div class="tab__luces" aria-hidden="true"></div><p class="tab__cuenta"></p>' +
            '<button type="button" class="tab__reiniciar">Volver a empezar</button></div>' +
          '<p class="tab__barra">' + esc(c.barra || '') + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="tab__msg" aria-live="polite"></p>' +
      '<div class="tab__fin" hidden><p class="tab__fin-txt"></p><button type="button" class="tab__fin-otra">Volver a jugar</button><button type="button" class="tab__fin-ver">Ver el tablero</button></div>';
    const tabS = raiz.querySelector('.tab--svg'), tabL = raiz.querySelector('.tab--lista');
    const qs = raiz.querySelector('.tab__qs'), rs = raiz.querySelector('.tab__rs');
    const luces = raiz.querySelector('.tab__luces'), cuenta = raiz.querySelector('.tab__cuenta');
    const msg = raiz.querySelector('.tab__msg'), btn = raiz.querySelector('.tab__reiniciar');
    const fin = raiz.querySelector('.tab__fin'), finTxt = raiz.querySelector('.tab__fin-txt');
    const sCuenta = raiz.querySelector('.tab__scuenta'), sReini = raiz.querySelector('.tab__sreini');
    const sLuces = raiz.querySelectorAll('.tab__sluz');
    const cv = document.createElement('canvas'); cv.className = 'tab__confeti'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);

    /* cada pregunta y cada respuesta existe dos veces: círculo del tablero y botón de la lista */
    const bq = [], br = [];
    raiz.querySelectorAll('.tab__c--p').forEach((g) => { bq[+g.getAttribute('data-i')] = [g]; });
    raiz.querySelectorAll('.tab__c--r').forEach((g) => { br[+g.getAttribute('data-i')] = [g]; });
    pares.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab__carta tab__carta--p'; b.setAttribute('role', 'listitem'); b.dataset.i = i;
      b.innerHTML = BOMBILLA + '<span class="tab__txt">' + esc(p.p) + '</span>';
      qs.appendChild(b); bq[i].push(b);
      luces.appendChild(Object.assign(document.createElement('i'), { className: 'tab__luz' }));
    });
    est.orden.forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tab__carta tab__carta--r'; b.setAttribute('role', 'listitem'); b.dataset.i = i;
      b.innerHTML = BOMBILLA + '<span class="tab__txt">' + esc(pares[i].r) + '</span>';
      rs.appendChild(b); br[i].push(b);
    });

    const lector = document.createElement('p');
    lector.className = 'tab__lector'; lector.hidden = true; lector.setAttribute('aria-hidden', 'true');
    raiz.after(lector);

    vista = { raiz: raiz, tabS: tabS, tabL: tabL, cv: cv, lector: lector, modo: '' };

    const cls = (arr, n, on) => arr.forEach((e) => e.classList.toggle(n, on));
    function leer(i) {
      const t = i >= 0 ? (pares[i] && pares[i].p) : '';
      lector.textContent = t || ''; lector.hidden = !t || vista.modo === 'lista';
    }
    function pintar() {
      pares.forEach((_, i) => {
        const ok = est.hechos.has(i), on = est.sel === i;
        cls(bq[i], 'bien', ok); cls(br[i], 'bien', ok); cls(bq[i], 'elegida', on);
        bq[i][1].disabled = ok; br[i][1].disabled = ok;
        bq[i].forEach((e) => e.setAttribute('aria-pressed', on ? 'true' : 'false'));
      });
      const h = est.hechos.size;
      Array.prototype.forEach.call(luces.children, (l, i) => l.classList.toggle('on', i < h));
      Array.prototype.forEach.call(sLuces, (l, i) => l.classList.toggle('on', i < h));
      cuenta.textContent = h + ' de ' + pares.length;
      sCuenta.textContent = h + ' de ' + pares.length;
      btn.hidden = !h; sReini.style.display = h ? '' : 'none';
      leer(est.sel);
    }
    function mostrarFin() { finTxt.textContent = c.final || '¡Completaste el tablero!'; fin.hidden = false; }
    function centro(el) {
      const r = el.getBoundingClientRect(), k = cv._k || 1;
      return { x: (r.left + r.width / 2) * k, y: (r.top + r.height / 2) * k };
    }
    function avisar(texto, ms) {
      msg.textContent = texto; msg.classList.add('ver');
      clearTimeout(vista.tMsg);
      vista.tMsg = setTimeout(() => { if (vista) msg.classList.remove('ver'); }, ms || 1800);
    }
    const visible = (arr) => arr[vista.modo === 'lista' ? 1 : 0];
    const golpe = (e) => { e.classList.remove('prende'); void e.getBoundingClientRect(); e.classList.add('prende'); };

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
        bq.forEach((a) => a.forEach((e) => { if (!e.classList.contains('bien')) { e.classList.remove('avisa'); void e.getBoundingClientRect(); e.classList.add('avisa'); } }));
        return;
      }
      const i = est.sel;
      if (i === j) {
        est.hechos.add(i); est.sel = -1;
        pintar();
        bq[i].concat(br[j]).forEach(golpe);
        const a = centro(visible(bq[i])), b = centro(visible(br[j])), k = cv._k || 1;
        if (est.hechos.size === pares.length) {
          est.final = true; pintar();
          sonido.acierto(); setTimeout(sonido.final, 380);
          confeti(cv, [{ x: cv.width / 2, y: cv.height * 0.45, ang: -Math.PI / 2, abre: 3.4 },
            { x: 20 * k, y: cv.height * 0.85, ang: -1.1, abre: 0.9 }, { x: cv.width - 20 * k, y: cv.height * 0.85, ang: -2.04, abre: 0.9 }], 260, 15 * k);
          setTimeout(() => { if (vista && vista.cv === cv) confeti(cv, [{ x: cv.width * 0.3, y: -10, ang: Math.PI / 2, abre: 2.6 }, { x: cv.width * 0.7, y: -10, ang: Math.PI / 2, abre: 2.6 }], 160, 5 * k); }, 700);
          setTimeout(() => { if (vista && vista.cv === cv && est.final) mostrarFin(); }, 1300);
        } else {
          sonido.acierto();
          confeti(cv, [{ x: a.x, y: a.y, ang: -Math.PI / 2, abre: 2.8 }, { x: b.x, y: b.y, ang: -Math.PI / 2, abre: 2.8 }], 90, 9 * k);
        }
        return;
      }
      est.ocupado = true;
      cls(bq[i], 'mal', true); cls(br[j], 'mal', true);
      sonido.error();
      setTimeout(() => {
        cls(bq[i], 'mal', false); cls(br[j], 'mal', false);
        est.sel = -1; est.ocupado = false;
        if (vista) pintar();
      }, 900);
    }

    const accion = (e) => {
      const g = e.target.closest('.tab__c, .tab__carta, .tab__sreini');
      if (!g) return;
      if (g.classList.contains('tab__sreini')) { reiniciar(); return; }
      const i = +g.getAttribute('data-i');
      if (g.classList.contains('tab__c--p') || g.classList.contains('tab__carta--p')) elegirPregunta(i); else elegirRespuesta(i);
    };
    raiz.addEventListener('click', accion);
    raiz.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.tab__c, .tab__sreini')) { e.preventDefault(); accion(e); } });
    tabS.addEventListener('mouseover', (e) => { const g = e.target.closest('.tab__c--p'); if (g) leer(+g.getAttribute('data-i')); });
    tabS.addEventListener('mouseout', () => leer(est.sel));
    tabS.addEventListener('focusin', (e) => { const g = e.target.closest('.tab__c--p'); if (g) leer(+g.getAttribute('data-i')); });
    tabS.addEventListener('focusout', () => leer(est.sel));
    const reiniciar = () => { est = nuevoEstado(c); fin.hidden = true; pintar(); };
    btn.addEventListener('click', reiniciar);
    raiz.querySelector('.tab__fin-otra').addEventListener('click', reiniciar);
    raiz.querySelector('.tab__fin-ver').addEventListener('click', () => { fin.hidden = true; });

    vista.leer = leer;
    pintar();
    if (est.final) mostrarFin();
    ajustar();
    window.addEventListener('resize', ajustar);
  }

  function ajustar() {
    const v = vista; if (!v) return;
    const modo = v.raiz.clientWidth >= ANCHO_PIZARRA ? 'pizarra' : 'lista';
    if (modo !== v.modo) {
      v.modo = modo;
      v.tabS.hidden = modo !== 'pizarra';
      v.tabL.hidden = modo !== 'lista';
      if (v.leer) v.leer(est.sel);
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    v.cv.width = Math.round(window.innerWidth * dpr); v.cv.height = Math.round(window.innerHeight * dpr);
    v.cv._k = dpr;
  }

  function detener() {
    window.removeEventListener('resize', ajustar);
    if (vista) {
      clearTimeout(vista.tMsg);
      if (vista.cv) { cancelAnimationFrame(vista.cv._anim); vista.cv._anim = 0; vista.cv._ps = []; vista.cv.remove(); }
      if (vista.lector) vista.lector.remove();
    }
    if (est) { est.ocupado = false; est.sel = -1; }
    vista = null;
  }

  C.tablero = { iniciar: iniciar, detener: detener, _est: () => est, _vista: () => vista };
})();
