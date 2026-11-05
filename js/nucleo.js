/* =====================================================================
   Núcleo del recorrido: escenas, panorámicas, linterna, entrada y barras.
   ===================================================================== */
(() => {
  'use strict';
  const D = window.MUESTRA;
  if (!D || !D.escenas) { console.error('No se encontró datos/muestra.js'); return; }

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const crear = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const consulta = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);
  const memoria = {
    leer(k, def) { try { const v = localStorage.getItem('crilar:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    guardar(k, v) { try { localStorage.setItem('crilar:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const reducir = consulta('(prefers-reduced-motion: reduce)');
  const tactil = consulta('(pointer: coarse)');
  const escenas = D.escenas;

  const ICONOS = {
    mano: '<svg class="punto__mano" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#efe6cf" stroke="#0a1128" stroke-width="1.2" stroke-linejoin="round" d="M9 3.2a1.6 1.6 0 0 1 3.2 0V11l.9-.3a1.5 1.5 0 0 1 1.9.9l.1.2.5-.2a1.4 1.4 0 0 1 1.8.9l.2.5.4-.1a1.4 1.4 0 0 1 1.7 1.3V17c0 3-2.2 5.2-5.2 5.2h-1.4c-1.6 0-3-.7-4-1.9L5 16.7a1.5 1.5 0 0 1 2.3-1.9L9 16.5z"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#fdbe0f" stroke="#0a1128" stroke-width="1.3" stroke-linejoin="round" d="M12 3.5 20 13h-5v7.5H9V13H4z"/></svg>',
    izq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  /* ---------- estado ---------- */
  const estado = {
    escena: null, enEntrada: false, abriendo: false, cambiando: false, modal: null, puerta: null,
    visto: new Set(memoria.leer('visto', [])), registrado: !!memoria.leer('registrado', false),
    sorteoOfrecido: !!memoria.leer('sorteoOfrecido', false),
    pan: 0, panObj: 0, lx: 0, ly: 0, lxObj: 0, lyObj: 0, r: 170, tLuz: 0, luzApagada: false,
    vw: 0, vh: 0, mundo: { W: 0, H: 0, top: 0, max: 0, offX: 0 }, dims: { w: 1, h: 1 },
    ptr: { x: -1, y: -1, tipo: '', dentro: false }, arrastre: null, ultimoArrastre: 0,
    vista: null, mundos: [], puntosDatos: []
  };

  const escenario = $('#escenario'), cortina = $('#cortina');
  const hudArriba = $('#hud-arriba'), hudAbajo = $('#hud-abajo'), lugar = $('#lugar');
  const btnLuz = $('#btn-luz'), btnLuzTxt = $('#btn-luz-txt'), btnVolver = $('#btn-volver'), btnSorteo = $('#btn-sorteo');
  const pines = $('#pines'), progresoTxt = $('#progreso-txt');

  const bloqueado = () => estado.enEntrada || estado.abriendo;
  const edicion = () => !!(window.CRILAR_EDICION && window.CRILAR_EDICION.activo);

  /* ---------- objetos y progreso ---------- */
  const listarObjetos = () => {
    const l = [];
    Object.keys(escenas).forEach((id) => (escenas[id].puntos || []).forEach((p) => { if (p.tipo === 'objeto') l.push({ id: p.id, escena: id }); }));
    return l;
  };
  const vistos = () => listarObjetos().filter((o) => estado.visto.has(o.id)).length;
  const completo = () => { const l = listarObjetos(); return l.length > 0 && l.every((o) => estado.visto.has(o.id)); };

  function marcarVisto(id) {
    if (!estado.visto.has(id)) { estado.visto.add(id); memoria.guardar('visto', Array.from(estado.visto)); }
    const b = estado.vista && estado.vista.querySelector('[data-id="' + id + '"]');
    if (b) b.classList.add('visto');
    actualizarHUD();
  }

  /* ---------- barras ---------- */
  function actualizarHUD() {
    const e = escenas[estado.escena];
    const ocultar = bloqueado() || !e;
    hudArriba.classList.toggle('hud--oculto', ocultar);
    hudAbajo.classList.toggle('hud--oculto', ocultar);
    if (!e) return;
    lugar.textContent = e.titulo || '';
    const padre = e.padre && escenas[e.padre];
    btnVolver.hidden = !padre;
    if (padre) btnVolver.setAttribute('aria-label', 'Volver a ' + (padre.titulo || padre.corto || ''));
    btnLuz.hidden = !e.luz;
    btnLuz.setAttribute('aria-pressed', String(estado.luzApagada));
    btnLuzTxt.textContent = estado.luzApagada ? 'Usar linterna' : 'Encender luces';
    const total = listarObjetos().length, v = vistos();
    if (pines.children.length !== total) { pines.innerHTML = ''; for (let i = 0; i < total; i++) pines.appendChild(crear('i', 'pin')); }
    Array.prototype.forEach.call(pines.children, (n, i) => n.classList.toggle('on', i < v));
    progresoTxt.textContent = v + ' de ' + total + ' objetos';
    const fin = completo();
    btnSorteo.classList.toggle('bloqueado', !fin && !estado.registrado);
    btnSorteo.classList.toggle('pulsa', fin && !estado.registrado);
    btnSorteo.setAttribute('aria-disabled', String(!fin && !estado.registrado));
    btnSorteo.textContent = estado.registrado ? 'Ya participás' : 'Sorteo';
  }

  /* ---------- puntos dentro de una escena ---------- */
  function crearPunto(p) {
    let b;
    if (p.tipo === 'ir') {
      const dir = p.direccion || 'adelante';
      b = crear('button', 'salto salto--' + dir);
      b.innerHTML = '<span class="salto__flecha">' + ICONOS.flecha + '</span><span class="salto__cartela"><span class="salto__nombre">' + esc(p.titulo) + '</span>' +
        (p.detalle ? '<span class="salto__detalle">' + esc(p.detalle) + '</span>' : '') + '</span>';
      b.setAttribute('aria-label', 'Ir a ' + p.titulo + (p.detalle ? ': ' + p.detalle : ''));
    } else {
      b = crear('button', 'punto punto--' + p.tipo + (estado.visto.has(p.id) ? ' visto' : ''));
      b.innerHTML = '<span class="punto__aro"></span><span class="punto__nucleo"></span>' + ICONOS.mano;
      b.setAttribute('aria-label', 'Ver ' + (p.titulo || 'objeto'));
    }
    b.type = 'button';
    b.style.left = p.x + '%';
    b.style.top = p.y + '%';
    b.dataset.id = p.id;
    b.addEventListener('click', () => {
      if (edicion() || bloqueado() || estado.cambiando) return;
      if (performance.now() - estado.ultimoArrastre < 280) return;
      const r = b.getBoundingClientRect();
      activar(p, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
    b.addEventListener('focus', () => { if (!bloqueado()) centrarEn(p.x); });
    return b;
  }

  function activar(p, origen) {
    if (p.tipo === 'ir') irA(p.destino, p.direccion && p.direccion !== 'atras' ? { origen: origen } : null);
    else if (CR.abrirFicha) CR.abrirFicha(p);
  }

  function botonPan(dir) {
    const b = crear('button', 'pan ' + (dir < 0 ? 'pan--izq' : 'pan--der'), dir < 0 ? ICONOS.izq : ICONOS.der);
    b.type = 'button';
    b.setAttribute('aria-label', dir < 0 ? 'Mirar hacia la izquierda' : 'Mirar hacia la derecha');
    b.addEventListener('click', () => { estado.panObj = limitar(estado.panObj + dir * estado.vw * 0.55, 0, estado.mundo.max); });
    return b;
  }

  function polvo() {
    const d = crear('div', 'polvo');
    d.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 16; i++) {
      const m = crear('i');
      m.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      m.style.setProperty('--y', (Math.random() * 100).toFixed(1) + '%');
      m.style.setProperty('--t', (7 + Math.random() * 7).toFixed(1) + 's');
      m.style.setProperty('--d', (-Math.random() * 10).toFixed(1) + 's');
      d.appendChild(m);
    }
    return d;
  }

  /* ---------- escenas ---------- */
  function montarEscena(id) {
    const e = escenas[id];
    if (!e || e.tipo === 'puerta') return;
    estado.escena = id;
    if (estado.vista) estado.vista.remove();
    const luz = !!e.luz;
    const v = crear('div', 'vista vista--' + e.tipo + (luz ? ' vista--luz' : ' vista--noche') + (luz && estado.luzApagada ? ' vista--apagada' : ''));
    v.dataset.escena = id;

    const fondo = crear('div', 'fondo');
    fondo.style.backgroundImage = 'url("' + e.imagen.src + '")';
    const mundoFoto = crear('div', 'mundo mundo--foto');
    const img = crear('img', 'foto');
    img.src = e.imagen.src;
    img.alt = e.titulo || '';
    img.draggable = false;
    mundoFoto.appendChild(img);

    v.appendChild(fondo);
    v.appendChild(mundoFoto);
    v.appendChild(crear('div', 'tinte'));
    if (luz) { v.appendChild(crear('div', 'oscuridad')); v.appendChild(crear('div', 'haz')); v.appendChild(polvo()); }
    v.appendChild(crear('div', 'vineta'));

    const mundoPuntos = crear('div', 'mundo mundo--puntos');
    estado.puntosDatos = [];
    (e.puntos || []).forEach((p) => {
      const b = crearPunto(p);
      mundoPuntos.appendChild(b);
      if (p.tipo !== 'ir') estado.puntosDatos.push({ el: b, x: p.x, y: p.y, cerca: false });
    });
    v.appendChild(mundoPuntos);
    v.appendChild(botonPan(-1));
    v.appendChild(botonPan(1));

    escenario.insertBefore(v, escenario.firstChild);
    estado.vista = v;
    estado.mundos = [mundoFoto, mundoPuntos];
    estado.dims = { w: e.imagen.w || 1600, h: e.imagen.h || 900 };
    img.addEventListener('load', () => {
      if (estado.vista !== v) return;
      if (img.naturalWidth && (img.naturalWidth !== estado.dims.w || img.naturalHeight !== estado.dims.h)) {
        estado.dims = { w: img.naturalWidth, h: img.naturalHeight };
        calcular();
      }
    });

    estado.lx = estado.lxObj = innerWidth / 2;
    estado.ly = estado.lyObj = innerHeight / 2;
    estado.tLuz = performance.now();
    estado.pan = estado.panObj = 0;
    calcular();
    estado.pan = estado.panObj = estado.mundo.max / 2;
    aplicar();
    actualizarHUD();
  }

  function calcular() {
    const e = escenas[estado.escena];
    if (!e || e.tipo === 'puerta' || !estado.vista) return;
    const vw = innerWidth, vh = innerHeight;
    estado.vw = vw; estado.vh = vh;
    const iw = estado.dims.w, ih = estado.dims.h;
    const libre = Math.max(200, vh - 170);
    let s, top;
    if (e.tipo === 'panorama') {
      const alto = vh * (vw < vh ? 0.5 : 0.68);
      s = Math.max(vw / iw, alto / ih);
    } else {
      s = Math.min((vw * 0.96) / iw, libre / ih);
    }
    const W = iw * s, H = ih * s;
    top = e.tipo === 'panorama' ? (vh - H) / 2 : 78 + (libre - H) / 2;
    const max = Math.max(0, W - vw);
    estado.mundo = { W: W, H: H, top: top, max: max, offX: W < vw ? (vw - W) / 2 : 0 };
    estado.mundos.forEach((m) => { m.style.width = W + 'px'; m.style.height = H + 'px'; });
    estado.esc = Math.max(s, 1);
    if (estado.mundos[1]) estado.mundos[1].style.setProperty('--esc', estado.esc.toFixed(3));
    estado.r = limitar(Math.min(vw, vh) * 0.3, 150, 300);
    estado.panObj = limitar(estado.panObj, 0, max);
    estado.pan = limitar(estado.pan, 0, max);
    Array.prototype.forEach.call(estado.vista.querySelectorAll('.pan'), (b) => { b.hidden = max <= 0; });
    aplicar();
  }

  function aplicar() {
    const m = estado.mundo;
    const t = 'translate3d(' + (m.offX - estado.pan) + 'px,' + m.top + 'px,0)';
    estado.mundos.forEach((n) => { n.style.transform = t; });
  }

  function centrarEn(xPct) {
    const m = estado.mundo;
    estado.panObj = limitar((xPct / 100) * m.W - estado.vw / 2, 0, m.max);
  }

  /* Acercamiento hacia el cartel tocado: la escena se agranda desde ese punto, suenan los pasos
     y al final aparece la sala nueva asentándose. Con "reducir movimiento" se usa el fundido simple. */
  const ACERCAR_MS = 2300;
  function irConAcercamiento(id, o) {
    const v = estado.vista;
    if (CR.sonido) CR.sonido.pasos(ACERCAR_MS + 600);
    v.classList.add('vista--caminando');
    v.style.transformOrigin = Math.round(o.x) + 'px ' + Math.round(o.y) + 'px';
    v.style.transition = 'transform ' + ACERCAR_MS + 'ms cubic-bezier(.4,.1,.55,1)';
    void v.offsetWidth;
    v.style.transform = 'scale(3.4)';
    setTimeout(() => cortina.classList.add('activa'), ACERCAR_MS - 600);
    setTimeout(() => {
      montarEscena(id);
      const nueva = estado.vista;
      nueva.classList.add('vista--llegando');
      mostrarPistas();
      requestAnimationFrame(() => cortina.classList.remove('activa'));
      setTimeout(() => { nueva.classList.remove('vista--llegando'); estado.cambiando = false; }, 1250);
    }, ACERCAR_MS);
  }

  function irA(id, opc) {
    if (!escenas[id] || estado.cambiando) return;
    estado.cambiando = true;
    if (opc && opc.origen && !reducir && estado.vista && escenas[id].tipo !== 'puerta') { irConAcercamiento(id, opc.origen); return; }
    cortina.classList.add('activa');
    setTimeout(() => {
      if (escenas[id].tipo === 'puerta') {
        if (estado.puerta) { estado.puerta.remove(); estado.puerta = null; }
        estado.abriendo = false;
        mostrarEntrada();
      } else {
        montarEscena(id);
        mostrarPistas();
      }
      requestAnimationFrame(() => cortina.classList.remove('activa'));
      setTimeout(() => { estado.cambiando = false; }, 420);
    }, reducir ? 0 : 380);
  }

  /* ---------- pistas ---------- */
  function mostrarPistas() {
    const e = escenas[estado.escena];
    if (!e || bloqueado() || !CR.aviso) return;
    const vistas = memoria.leer('pistas', {});
    const clave = e.luz ? 'luz' : 'flechas';
    if (!vistas[clave]) {
      vistas[clave] = true;
      memoria.guardar('pistas', vistas);
      CR.aviso(e.luz
        ? (tactil ? 'Arrastrá el dedo para iluminar la sala y mirar hacia los costados.' : 'Mové el mouse para iluminar la sala. Acercalo a los bordes o arrastrá para mirar hacia los costados.')
        : 'Tocá una flecha para pasar a otra sala. Arrastrá para mirar hacia los costados.', 6500);
    } else if (tactil && e.tipo === 'panorama' && innerHeight > innerWidth && !vistas.giro) {
      vistas.giro = true;
      memoria.guardar('pistas', vistas);
      CR.aviso('Si girás el celular a horizontal, la sala se ve mejor.', 5500);
    }
  }

  /* ---------- movimiento: puntero, rueda y teclado ---------- */
  function mirarLuz(x, y) {
    const e = escenas[estado.escena];
    if (e && e.luz) { estado.lxObj = x; estado.lyObj = y; }
  }

  escenario.addEventListener('pointerenter', () => { estado.ptr.dentro = true; });
  escenario.addEventListener('pointerleave', () => { estado.ptr.dentro = false; });
  escenario.addEventListener('pointerdown', (ev) => {
    if (bloqueado() || estado.cambiando || estado.modal) return;
    estado.ptr = { x: ev.clientX, y: ev.clientY, tipo: ev.pointerType, dentro: true };
    mirarLuz(ev.clientX, ev.clientY);
    if (ev.pointerType === 'touch') { estado.lx = ev.clientX; estado.ly = ev.clientY; }
    estado.arrastre = { id: ev.pointerId, x0: ev.clientX, xPrev: ev.clientX, moviendo: false };
  });
  window.addEventListener('pointermove', (ev) => {
    estado.ptr.x = ev.clientX; estado.ptr.y = ev.clientY; estado.ptr.tipo = ev.pointerType;
    if (bloqueado() || estado.modal) return;
    mirarLuz(ev.clientX, ev.clientY);
    const a = estado.arrastre;
    if (!a || a.id !== ev.pointerId) return;
    const dx = ev.clientX - a.xPrev;
    a.xPrev = ev.clientX;
    if (!a.moviendo && Math.abs(ev.clientX - a.x0) > 6) { a.moviendo = true; escenario.classList.add('arrastrando'); }
    if (a.moviendo) { estado.panObj = limitar(estado.panObj - dx, 0, estado.mundo.max); estado.pan = estado.panObj; aplicar(); }
  });
  const soltar = () => {
    if (estado.arrastre && estado.arrastre.moviendo) estado.ultimoArrastre = performance.now();
    estado.arrastre = null;
    escenario.classList.remove('arrastrando');
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  escenario.addEventListener('wheel', (ev) => {
    if (bloqueado() || estado.modal) return;
    ev.preventDefault();
    const k = ev.deltaMode === 1 ? 16 : 1;
    const d = (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY) * k;
    estado.panObj = limitar(estado.panObj + d, 0, estado.mundo.max);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    if (estado.modal || bloqueado()) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (ev.key === 'ArrowLeft') estado.panObj = limitar(estado.panObj - 140, 0, estado.mundo.max);
    else if (ev.key === 'ArrowRight') estado.panObj = limitar(estado.panObj + 140, 0, estado.mundo.max);
  });

  let tResize = 0;
  window.addEventListener('resize', () => {
    clearTimeout(tResize);
    tResize = setTimeout(() => { calcular(); ajustarPuerta(); }, 90);
  });

  /* ---------- bucle de animación (desplazamiento y linterna) ---------- */
  let uX = -1, uY = -1, uR = -1;
  function bucle(t) {
    requestAnimationFrame(bucle);
    const e = escenas[estado.escena];
    if (!e || !estado.vista) return;
    const m = estado.mundo, p = estado.ptr;
    if (m.max > 0 && p.tipo === 'mouse' && p.dentro && !estado.arrastre && !estado.modal && !bloqueado()) {
      const z = 90;
      if (p.x < z) estado.panObj = limitar(estado.panObj - (1 - p.x / z) * 13, 0, m.max);
      else if (p.x > estado.vw - z) estado.panObj = limitar(estado.panObj + (1 - (estado.vw - p.x) / z) * 13, 0, m.max);
    }
    const dp = estado.panObj - estado.pan;
    if (dp) { estado.pan = Math.abs(dp) < 0.4 ? estado.panObj : estado.pan + dp * 0.16; aplicar(); }
    if (!e.luz) return;

    estado.lx += (estado.lxObj - estado.lx) * 0.25;
    estado.ly += (estado.lyObj - estado.ly) * 0.25;
    const k = limitar((t - estado.tLuz) / 900, 0, 1);
    const suave = 1 - Math.pow(1 - k, 3);
    const parpadeo = (!reducir && k < 1) ? 1 + (Math.sin(t / 37) * 0.07 + (Math.random() - 0.5) * 0.07) * (1 - k) : 1;
    const r = Math.max(0, estado.r * suave * parpadeo);
    if (Math.abs(estado.lx - uX) > 0.2 || Math.abs(estado.ly - uY) > 0.2 || Math.abs(r - uR) > 0.2) {
      uX = estado.lx; uY = estado.ly; uR = r;
      const s = estado.vista.style;
      s.setProperty('--lx', uX.toFixed(1) + 'px');
      s.setProperty('--ly', uY.toFixed(1) + 'px');
      s.setProperty('--r', uR.toFixed(1) + 'px');
    }
    if (!estado.luzApagada) {
      estado.puntosDatos.forEach((d) => {
        const sx = m.offX - estado.pan + (d.x / 100) * m.W;
        const sy = m.top + (d.y / 100) * m.H;
        const cerca = Math.hypot(sx - estado.lx, sy - estado.ly) < r;
        if (cerca !== d.cerca) { d.cerca = cerca; d.el.classList.toggle('cerca', cerca); }
      });
    }
  }

  /* ---------- entrada con puerta ---------- */
  function mostrarEntrada() {
    const e = escenas[D.inicio];
    if (!e || e.tipo !== 'puerta') { montarEscena(escenas[D.inicio] ? D.inicio : Object.keys(escenas)[0]); return; }
    estado.enEntrada = true;
    montarEscena(e.siguiente);
    const src = e.imagen.src, pu = e.puerta || { x: 50, y: 60 };
    const p = crear('div', 'puerta');
    p.innerHTML =
      '<div class="puerta__fondo" style="background-image:url(\'' + src + '\')"></div>' +
      '<header class="puerta__cabecera">' +
        '<img class="puerta__logo" src="images/logo/logo_CRILAR_CONICET_claro.svg" alt="CRILAR, CONICET">' +
        '<h1 class="puerta__titulo">' + esc(D.evento.nombre) + '</h1>' +
        '<p class="puerta__sub">' + esc(D.evento.subtitulo) + '</p>' +
      '</header>' +
      '<div class="puerta__zona"><div class="puerta__caja" role="button" tabindex="0" aria-label="Abrir la puerta">' +
        '<span class="puerta__luz"></span>' +
        '<span class="hoja hoja--izq" style="background-image:url(\'' + src + '\')"></span>' +
        '<span class="hoja hoja--der" style="background-image:url(\'' + src + '\')"></span>' +
        '<span class="punto punto--puerta" style="left:' + pu.x + '%;top:' + pu.y + '%"><span class="punto__aro"></span><span class="punto__nucleo"></span>' + ICONOS.mano + '</span>' +
      '</div></div>' +
      '<footer class="puerta__pie">' +
        '<button class="boton boton--oro puerta__entrar" type="button">Abrir la puerta</button>' +
        '<p class="puerta__nota">Si girás el celular a horizontal, la visita se ve mejor.</p>' +
      '</footer>';
    escenario.appendChild(p);
    estado.puerta = p;
    const caja = $('.puerta__caja', p);
    caja.style.transformOrigin = pu.x + '% ' + pu.y + '%';
    caja.addEventListener('click', abrirPuerta);
    caja.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirPuerta(); } });
    $('.puerta__entrar', p).addEventListener('click', abrirPuerta);
    ajustarPuerta();
    requestAnimationFrame(ajustarPuerta);
    const pre = new Image();
    pre.onload = () => {
      if (pre.naturalWidth && (pre.naturalWidth !== e.imagen.w || pre.naturalHeight !== e.imagen.h)) {
        e.imagen.w = pre.naturalWidth; e.imagen.h = pre.naturalHeight; ajustarPuerta();
      }
    };
    pre.src = src;
    actualizarHUD();
  }

  function ajustarPuerta() {
    const p = estado.puerta;
    if (!p) return;
    const e = escenas[D.inicio];
    const zona = $('.puerta__zona', p), caja = $('.puerta__caja', p);
    const r = zona.getBoundingClientRect();
    let aw = r.width - 8, ah = r.height - 8;
    if (aw < 40 || ah < 40) { aw = innerWidth - 40; ah = innerHeight * 0.5; }
    const s = Math.min(aw / e.imagen.w, ah / e.imagen.h);
    caja.style.width = Math.floor(e.imagen.w * s) + 'px';
    caja.style.height = Math.floor(e.imagen.h * s) + 'px';
  }

  const PUERTA_MS = 3400;
  function abrirPuerta() {
    const p = estado.puerta;
    if (!p || estado.abriendo) return;
    estado.abriendo = true;
    p.classList.add('abierta');
    if (!reducir && CR.sonido) CR.sonido.pasos(PUERTA_MS);
    const hall = estado.vista;
    setTimeout(() => { if (hall && hall === estado.vista) hall.classList.add('vista--llegando'); }, reducir ? 0 : 2000);
    setTimeout(() => {
      p.remove();
      estado.puerta = null;
      estado.abriendo = false;
      estado.enEntrada = false;
      if (hall) hall.classList.remove('vista--llegando');
      actualizarHUD();
      mostrarPistas();
    }, reducir ? 60 : PUERTA_MS);
  }

  /* ---------- botones de las barras ---------- */
  btnLuz.addEventListener('click', () => {
    estado.luzApagada = !estado.luzApagada;
    if (estado.vista) estado.vista.classList.toggle('vista--apagada', estado.luzApagada);
    actualizarHUD();
  });
  btnVolver.addEventListener('click', () => {
    const e = escenas[estado.escena];
    if (e && e.padre) irA(e.padre);
  });

  /* ---------- interfaz para las otras partes ---------- */
  const CR = window.CRILAR = {
    D: D, estado: estado, escenas: escenas, util: { $: $, crear: crear, esc: esc, limitar: limitar, memoria: memoria, consulta: consulta },
    tactil: tactil, reducir: reducir, escenario: escenario,
    listarObjetos: listarObjetos, vistos: vistos, completo: completo, marcarVisto: marcarVisto,
    actualizarHUD: actualizarHUD, montarEscena: montarEscena, calcular: calcular, centrarEn: centrarEn,
    irA: irA, mostrarEntrada: mostrarEntrada, mostrarPistas: mostrarPistas, bucle: bucle,
    recargar: () => { if (estado.escena) montarEscena(estado.escena); }
  };
})();
