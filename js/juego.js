/* =====================================================================
   Rompecabezas del mapa de La Rioja (modelo 3D de la mesa del hall).
   Las piezas se arrastran, giran y no se pueden solapar. Cuando una pieza
   queda bien puesta respecto de otra, encastran y se mueven juntas.
   Al completar el mapa aparecen los nombres de los departamentos.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  const DEF = window.ROMPECABEZAS;
  if (!C || !DEF) return;
  const W = DEF.ancho, H = DEF.alto;
  const PASO = 4;                 // tamaño de celda de las máscaras (px de escenario)
  const GIRO_RUEDA = 5, GIRO_TOQUE = 15;
  const TOL_ROT = 12, TOL_POS = 42;
  const rad = (d) => d * Math.PI / 180;
  const norm = (d) => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };

  let ses = null;      // estado del juego (se conserva mientras la página siga abierta)
  let vista = null;    // elementos de la ventana abierta

  /* ---------- datos de cada pieza ---------- */
  function crearSesion() {
    const piezas = DEF.piezas.map((d, i) => {
      const bin = atob(d.mask), bytes = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      const p = {
        d: d, id: d.id, w: d.w, h: d.h, ax: d.ax, ay: d.ay, mw: d.mw, mh: d.mh, bytes: bytes,
        x: d.ini[0], y: d.ini[1], th: 0, cos: 1, sin: 0, g: i, z: i, el: null, pts: [], r: 0
      };
      for (let j = 0; j < p.mh; j += 2) for (let c = 0; c < p.mw; c += 2) {
        if (bit(p, c, j)) {
          const px = c * PASO + PASO / 2 - p.ax, py = j * PASO + PASO / 2 - p.ay;
          p.pts.push(px, py);
          p.r = Math.max(p.r, Math.hypot(px, py));
        }
      }
      p.r += PASO;
      return p;
    });
    distribuir(piezas);
    return { piezas: piezas, completo: false, orden: piezas.slice() };
  }

  /* Reparte las piezas por la mesa, sueltas y un poco giradas, sin que se toquen. */
  function distribuir(piezas) {
    const previo = ses; ses = { piezas: piezas };
    const grandes = piezas.slice().sort((a, b) => b.r - a.r);
    const puestas = [];
    grandes.forEach((p) => {
      let ok = false;
      for (let n = 0; n < 700 && !ok; n++) {
        const m = p.r * 0.6 + 14;
        const x = m + Math.random() * (W - 2 * m), y = m + Math.random() * (H - 2 * m);
        pose(p, x, y, (Math.random() * 2 - 1) * (n < 500 ? 60 : 25));
        ok = puestas.every((q) => !chocan(p, q) && Math.hypot(p.x - q.x, p.y - q.y) > (p.r + q.r) * 0.42);
      }
      if (!ok) pose(p, p.d.ini[0], p.d.ini[1], 0);
      puestas.push(p);
    });
    ses = previo;
  }
  function bit(p, c, j) {
    if (c < 0 || j < 0 || c >= p.mw || j >= p.mh) return 0;
    const idx = j * p.mw + c;
    return (p.bytes[idx >> 3] >> (7 - (idx & 7))) & 1;
  }
  function pose(p, x, y, th) {
    p.x = x; p.y = y; p.th = th;
    const r = rad(th); p.cos = Math.cos(r); p.sin = Math.sin(r);
  }

  /* ---------- geometría ---------- */
  // ¿el punto del escenario (x, y) cae sobre la pieza p?
  function toca(p, x, y, margen) {
    const dx = x - p.x, dy = y - p.y;
    if (dx * dx + dy * dy > (p.r + 8) * (p.r + 8)) return false;
    const lx = p.cos * dx + p.sin * dy + p.ax, ly = -p.sin * dx + p.cos * dy + p.ay;
    const c = Math.floor(lx / PASO), j = Math.floor(ly / PASO);
    if (bit(p, c, j)) return true;
    if (margen) {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (bit(p, c + a, j + b)) return true;
    }
    return false;
  }
  // cuenta los puntos de "a" que caen sobre "b" y al revés; "tope" permite un roce mínimo
  function chocan(a, b, tope) {
    const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r;
    if (dx * dx + dy * dy > rr * rr) return false;
    const max = tope || 0;
    let n = 0;
    for (let k = 0; k < a.pts.length; k += 2) {
      const px = a.pts[k], py = a.pts[k + 1];
      const wx = a.x + a.cos * px - a.sin * py, wy = a.y + a.sin * px + a.cos * py;
      if (toca(b, wx, wy, false) && ++n > max) return true;
    }
    for (let k = 0; k < b.pts.length; k += 2) {
      const px = b.pts[k], py = b.pts[k + 1];
      const wx = b.x + b.cos * px - b.sin * py, wy = b.y + b.sin * px + b.cos * py;
      if (toca(a, wx, wy, false) && ++n > max) return true;
    }
    return false;
  }
  function miembros(g) { return ses.piezas.filter((p) => p.g === g); }
  // ¿el conjunto "ms" está en una posición válida (dentro de la mesa y sin tapar a las demás)?
  function valido(ms, ignorar, tope) {
    for (const p of ms) {
      if (p.x < 24 || p.x > W - 24 || p.y < 24 || p.y > H - 24) return false;
    }
    for (const p of ses.piezas) {
      if (ms.indexOf(p) >= 0 || (ignorar !== undefined && p.g === ignorar)) continue;
      for (const m of ms) if (chocan(m, p, tope)) return false;
    }
    return true;
  }
  function guardar(ms) { return ms.map((p) => [p.x, p.y, p.th]); }
  function restaurar(ms, s) { ms.forEach((p, i) => pose(p, s[i][0], s[i][1], s[i][2])); }
  function mover(ms, base, dx, dy) { ms.forEach((p, i) => pose(p, base[i][0] + dx, base[i][1] + dy, base[i][2])); }
  function girar(ms, cx, cy, d) {
    const r = rad(d), c = Math.cos(r), s = Math.sin(r);
    ms.forEach((p) => {
      const x = p.x - cx, y = p.y - cy;
      pose(p, cx + c * x - s * y, cy + s * x + c * y, p.th + d);
    });
  }

  /* ---------- dibujo ---------- */
  function ponerEl(p) {
    p.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
    p.img.style.transform = 'rotate(' + p.th.toFixed(2) + 'deg)';
  }
  function dibujarTodo() { ses.piezas.forEach(ponerEl); ses.orden.forEach((p, i) => { p.el.style.zIndex = i + 1; }); }
  function alFrente(ms) {
    ses.orden = ses.orden.filter((p) => ms.indexOf(p) < 0).concat(ms);
    ses.orden.forEach((p, i) => { p.el.style.zIndex = i + 1; });
  }

  /* ---------- encastre ---------- */
  function intentarEncaje(g) {
    const ms = miembros(g);
    if (ms.length === ses.piezas.length) return;
    let mejor = null;
    for (const a of ms) {
      const fa = a.th - a.d.rot;
      for (const b of ses.piezas) {
        if (b.g === g) continue;
        const fb = b.th - b.d.rot, er = norm(fa - fb);
        if (Math.abs(er) > TOL_ROT) continue;
        const rb = rad(fb), mx = a.d.meta[0] - b.d.meta[0], my = a.d.meta[1] - b.d.meta[1];
        const ex = b.x + Math.cos(rb) * mx - Math.sin(rb) * my, ey = b.y + Math.sin(rb) * mx + Math.cos(rb) * my;
        const dist = Math.hypot(a.x - ex, a.y - ey);
        if (dist > TOL_POS) continue;
        const sc = dist + 2 * Math.abs(er);
        if (!mejor || sc < mejor.sc) mejor = { a: a, b: b, ex: ex, ey: ey, fb: fb, sc: sc };
      }
    }
    if (!mejor) return;
    const base = guardar(ms);
    const fa = mejor.a.th - mejor.a.d.rot;
    girar(ms, mejor.a.x, mejor.a.y, norm(mejor.fb - fa));
    const dx = mejor.ex - mejor.a.x, dy = mejor.ey - mejor.a.y;
    ms.forEach((p) => pose(p, p.x + dx, p.y + dy, p.th));
    if (!valido(ms, mejor.b.g, 14)) { restaurar(ms, base); return; }
    const gb = mejor.b.g;
    ses.piezas.forEach((p) => { if (p.g === g) p.g = gb; });
    ms.forEach((p) => { ponerEl(p); p.el.classList.remove('encaja'); void p.el.offsetWidth; p.el.classList.add('encaja'); });
    revisarFinal();
  }

  function revisarFinal() {
    if (ses.completo) return;
    const g0 = ses.piezas[0].g;
    if (!ses.piezas.every((p) => p.g === g0)) return;
    ses.completo = true;
    setTimeout(mostrarFinal, 500);
  }
  function mostrarFinal() {
    if (!vista || !ses.completo) return;
    vista.mesa.classList.add('juego--listo');
    vista.final.hidden = false;
    vista.etiquetas.innerHTML = '';
    ses.piezas.forEach((p) => {
      const e = document.createElement('span');
      e.className = 'juego__nombre';
      e.textContent = p.d.nombre;
      const lx = p.d.lx, ly = p.d.ly;
      e.style.left = (p.x + p.cos * lx - p.sin * ly).toFixed(1) + 'px';
      e.style.top = (p.y + p.sin * lx + p.cos * ly).toFixed(1) + 'px';
      if (p.r < 90) e.classList.add('chico');
      vista.etiquetas.appendChild(e);
    });
  }

  /* ---------- entrada: arrastre, giro ---------- */
  function conectar() {
    const st = vista.stage;
    let arr = null;            // arrastre activo
    const punt = new Map();    // punteros activos
    let giroBase = null;       // gesto de dos dedos
    let ultimoToque = { t: 0, id: null, x: 0, y: 0 };
    let tEncaje = 0;

    const aEscenario = (ev) => {
      const r = st.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / vista.k, y: (ev.clientY - r.top) / vista.k };
    };
    const bajo = (x, y) => {
      for (let i = ses.orden.length - 1; i >= 0; i--) if (toca(ses.orden[i], x, y, true)) return ses.orden[i];
      return null;
    };
    function comenzar(p, pt) {
      const ms = miembros(p.g);
      alFrente(ms);
      ms.forEach((m) => m.el.classList.add('arriba'));
      arr = { p: p, g: p.g, ms: ms, base: guardar(ms), x0: pt.x, y0: pt.y, cx: 0, cy: 0, movio: false };
    }
    function terminar() {
      if (!arr) return;
      arr.ms.forEach((m) => m.el.classList.remove('arriba'));
      const g = arr.g;
      arr = null;
      intentarEncaje(g);
    }
    function probar(dx, dy) {
      mover(arr.ms, arr.base, dx, dy);
      if (valido(arr.ms)) { arr.cx = dx; arr.cy = dy; return true; }
      mover(arr.ms, arr.base, arr.cx, arr.cy);
      return false;
    }
    function arrastrar(pt) {
      const tx = pt.x - arr.x0, ty = pt.y - arr.y0;
      if (!arr.movio && Math.hypot(tx, ty) > 3) arr.movio = true;
      if (probar(tx, ty)) { arr.ms.forEach(ponerEl); return; }
      // buscar hasta dónde se puede llegar sobre el recorrido
      let lo = 0, hi = 1;
      const sx = arr.cx, sy = arr.cy;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (probar(sx + (tx - sx) * mid, sy + (ty - sy) * mid)) lo = mid; else hi = mid;
      }
      // deslizar sobre el borde de la pieza contra la que topa
      probar(tx, arr.cy);
      probar(arr.cx, ty);
      arr.ms.forEach(ponerEl);
    }
    function rotar(p, d) {
      const ms = miembros(p.g), base = guardar(ms);
      girar(ms, p.x, p.y, d);
      if (!valido(ms)) { restaurar(ms, base); return false; }
      ms.forEach(ponerEl);
      if (arr && arr.g === p.g) { arr.base = guardar(arr.ms); arr.cx = 0; arr.cy = 0; }
      return true;
    }
    function programarEncaje(g) {
      clearTimeout(tEncaje);
      tEncaje = setTimeout(() => { if (!arr) intentarEncaje(g); }, 380);
    }

    st.addEventListener('pointerdown', (ev) => {
      if (ses.completo) return;
      const pt = aEscenario(ev);
      punt.set(ev.pointerId, pt);
      try { st.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      if (punt.size === 2 && arr) {
        // dos dedos: giran la pieza que se está sosteniendo
        const v = Array.from(punt.values());
        giroBase = Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x) * 180 / Math.PI;
        return;
      }
      if (punt.size > 1) return;
      const p = bajo(pt.x, pt.y);
      if (p) { comenzar(p, pt); ev.preventDefault(); }
    });
    st.addEventListener('pointermove', (ev) => {
      if (!punt.has(ev.pointerId)) return;
      const pt = aEscenario(ev);
      punt.set(ev.pointerId, pt);
      if (!arr) return;
      if (punt.size === 2 && giroBase !== null) {
        const v = Array.from(punt.values());
        const ang = Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x) * 180 / Math.PI;
        const d = norm(ang - giroBase);
        if (Math.abs(d) >= 2) { if (rotar(arr.p, d)) giroBase = ang; }
        return;
      }
      if (punt.size === 1) arrastrar(pt);
    });
    const soltar = (ev) => {
      const pt = punt.get(ev.pointerId) || aEscenario(ev);
      const eraDos = punt.size === 2;
      punt.delete(ev.pointerId);
      if (eraDos) { giroBase = null; if (arr) { arr.base = guardar(arr.ms); arr.cx = arr.cy = 0; const q = Array.from(punt.values())[0]; if (q) { arr.x0 = q.x; arr.y0 = q.y; } } return; }
      if (!arr) return;
      const p = arr.p, movio = arr.movio;
      terminar();
      if (!movio && ev.type === 'pointerup') {
        // toque corto sin mover: dos toques seguidos giran la pieza
        const ahora = performance.now();
        if (ultimoToque.id === p.id && ahora - ultimoToque.t < 380 && Math.hypot(pt.x - ultimoToque.x, pt.y - ultimoToque.y) < 20) {
          rotar(p, GIRO_TOQUE); programarEncaje(p.g);
          ultimoToque.id = null;
        } else ultimoToque = { t: ahora, id: p.id, x: pt.x, y: pt.y };
      }
    };
    st.addEventListener('pointerup', soltar);
    st.addEventListener('pointercancel', soltar);
    st.addEventListener('wheel', (ev) => {
      const pt = aEscenario(ev);
      const p = arr ? arr.p : bajo(pt.x, pt.y);
      if (!p) return;
      ev.preventDefault();
      rotar(p, (ev.deltaY > 0 ? 1 : -1) * GIRO_RUEDA);
      if (!arr) programarEncaje(p.g);
    }, { passive: false });
    st.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  /* ---------- ventana ---------- */
  function ajustar() {
    if (!vista) return;
    const raiz = vista.raiz;
    const ancho = Math.max(220, raiz.clientWidth);
    const altoMax = Math.max(200, Math.min(innerHeight - raiz.offsetTop - 40, 900));
    const k = Math.min(ancho / W, altoMax / H);
    vista.k = k;
    vista.mesa.style.width = (W * k) + 'px';
    vista.mesa.style.height = (H * k) + 'px';
    vista.stage.style.transform = 'scale(' + k + ')';
  }

  function iniciar(raiz, cfg) {
    detener();
    if (!ses) ses = crearSesion();
    const c = cfg || {};
    raiz.innerHTML =
      '<div class="juego__mesa" role="group" aria-label="Mesa con las piezas del rompecabezas del mapa de La Rioja">' +
        '<div class="juego__stage"></div></div>' +
      '<p class="juego__final" hidden></p>';
    const mesa = raiz.querySelector('.juego__mesa'), stage = raiz.querySelector('.juego__stage'), final = raiz.querySelector('.juego__final');
    mesa.style.backgroundImage = 'url("' + DEF.mesa + '")';
    final.textContent = c.texto || '';
    ses.piezas.forEach((p) => {
      const el = document.createElement('div'); el.className = 'juego__pieza';
      const img = document.createElement('img');
      img.src = p.d.src; img.alt = ''; img.draggable = false; img.decoding = 'async';
      img.style.left = (-p.ax) + 'px'; img.style.top = (-p.ay) + 'px';
      img.style.width = p.w + 'px'; img.style.height = p.h + 'px';
      img.style.transformOrigin = p.ax + 'px ' + p.ay + 'px';
      el.appendChild(img); stage.appendChild(el);
      p.el = el; p.img = img;
    });
    const etiquetas = document.createElement('div'); etiquetas.className = 'juego__etiquetas'; stage.appendChild(etiquetas);
    vista = { raiz: raiz, mesa: mesa, stage: stage, final: final, etiquetas: etiquetas, k: 1 };
    ajustar();
    dibujarTodo();
    conectar();
    window.addEventListener('resize', ajustar);
    if (ses.completo) mostrarFinal();
  }
  function detener() {
    window.removeEventListener('resize', ajustar);
    vista = null;
  }

  C.juego = { iniciar: iniciar, detener: detener, _ses: () => ses, _vista: () => vista, _encajar: (g) => intentarEncaje(g), _dibujar: () => dibujarTodo() };
})();
