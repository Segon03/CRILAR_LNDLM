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
    btnLuz.setAttribute('aria-label', btnLuzTxt.textContent);
    btnLuz.title = btnLuzTxt.textContent;
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
      b = crear('button', 'salto salto--' + dir + (p.compacto ? ' salto--compacto' : ''));
      b.innerHTML = '<span class="salto__flecha">' + ICONOS.flecha + '</span><span class="salto__cartela"><span class="salto__nombre">' + esc(p.titulo) + '</span>' +
        (p.detalle ? '<span class="salto__detalle">' + esc(p.detalle) + '</span>' : '') + '</span>';
      b.setAttribute('aria-label', 'Ir a ' + p.titulo + (p.detalle ? ': ' + p.detalle : ''));
    } else {
      b = crear('button', 'punto punto--' + p.tipo + (estado.visto.has(p.id) ? ' visto' : ''));
      b.innerHTML = '<span class="punto__aro"></span><span class="punto__nucleo"></span>' + ICONOS.mano;
      b.setAttribute('aria-label', (p.tipo === 'entrar' ? 'Entrar a ' : 'Ver ') + (p.titulo || 'objeto'));
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
    else if (p.tipo === 'entrar') irA(p.destino, { origen: origen });
    else if (CR.abrirFicha) CR.abrirFicha(p);
  }

  function botonPan(dir) {
    const b = crear('button', 'pan ' + (dir < 0 ? 'pan--izq' : 'pan--der'), dir < 0 ? ICONOS.izq : ICONOS.der);
    b.type = 'button';
    b.setAttribute('aria-label', dir < 0 ? 'Mirar hacia la izquierda' : 'Mirar hacia la derecha');
    b.addEventListener('click', () => {
      if (estado.rec) { moverParada(dir); return; }
      estado.panObj = limitar(estado.panObj + dir * estado.vw * 0.55, 0, estado.mundo.max);
    });
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
  /* Quita la escena actual; si era un video, lo detiene y devuelve el sonido a su estado normal. */
  function limpiarVista() {
    const v = estado.vista;
    if (!v) return;
    quitarAviso();
    const vid = $('video', v);
    if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (err) { /* nada */ } }
    if (estado.rec) { cancelAnimationFrame(estado.rec.raf); estado.rec = null; estado.parada = null; }
    if (v._yt) { window.removeEventListener('message', v._yt); v._yt = null; }
    if (v.classList.contains('vista--video') && CR.sonido) { CR.sonido.parar(); CR.sonido.musicaBaja(false); }
    v.remove();
  }

  /* ---------- escena de video: caminata hacia el auditorio y pantalla con YouTube ---------- */
  function montarVideo(id, e, opc) {
    const vd = e.video, pa = e.pantalla || { x: 30, y: 10, w: 36, h: 50 };
    estado.escena = id;
    limpiarVista();
    const v = crear('div', 'vista vista--video vista--noche');
    v.dataset.escena = id;
    const fondo = crear('div', 'fondo');
    fondo.style.backgroundImage = 'url("' + (vd.inicio || vd.final) + '")';
    const caja = crear('div', 'mundo mundo--video');
    const fuente = fuenteAuditorio(vd);
    caja.innerHTML =
      '<img class="video__final" src="' + esc(vd.final) + '" alt="' + esc(e.titulo || '') + '" draggable="false">' +
      '<video class="video__cam" muted playsinline preload="auto"' + (vd.inicio ? ' poster="' + esc(vd.inicio) + '"' : '') + ' aria-label="Recorrido hacia el auditorio"></video>' +
      '<div class="video__luz" style="left:' + (pa.x + pa.w / 2) + '%;top:' + (pa.y + pa.h / 2) + '%"></div>' +
      '<div class="pantalla" style="left:' + pa.x + '%;top:' + pa.y + '%;width:' + pa.w + '%;height:' + pa.h + '%"><div class="pantalla__video"></div></div>' +
      (pa.youtube ? '<a class="video__yt" style="left:' + pa.x + '%;top:' + (pa.y + pa.h + 1.5) + '%" href="https://www.youtube.com/watch?v=' + esc(pa.youtube) + '" target="_blank" rel="noopener">Ver en YouTube</a>' : '');
    const mundoPuntos = crear('div', 'mundo mundo--puntos');
    (e.puntos || []).forEach((p) => mundoPuntos.appendChild(crearPunto(p)));
    const saltar = crear('button', 'boton video__saltar', 'Saltar el recorrido');
    saltar.type = 'button';
    v.appendChild(fondo);
    v.appendChild(caja);
    v.appendChild(crear('div', 'vineta'));
    v.appendChild(mundoPuntos);
    v.appendChild(saltar);
    escenario.insertBefore(v, escenario.firstChild);
    estado.vista = v;
    estado.mundos = [caja, mundoPuntos];
    estado.puntosDatos = [];
    estado.dims = { w: vd.w || 1920, h: vd.h || 1080 };
    estado.pan = estado.panObj = 0;
    calcular();
    actualizarHUD();

    const vid = $('video', caja);
    let fin = false;
    const terminar = () => {
      if (fin || estado.vista !== v) return;
      fin = true;
      saltar.hidden = true;
      v.classList.add('video--fin');
      if (CR.sonido) CR.sonido.parar();
      mostrarPantalla(v, pa);
    };
    vid.addEventListener('ended', terminar);
    vid.addEventListener('error', terminar);
    saltar.addEventListener('click', () => {
      try { vid.pause(); vid.currentTime = Math.max(0, (vid.duration || 0) - 0.05); } catch (err) { /* nada */ }
      vid.addEventListener('seeked', terminar, { once: true });
      setTimeout(terminar, 700);
    });
    /* No se arranca hasta tener el video listo: así la imagen, la música y los pasos van juntos. */
    let arranco = false;
    const arrancar = () => {
      if (arranco || fin || estado.vista !== v) return;
      arranco = true;
      quitarAviso();
      const jugar = vid.play();
      if (jugar && jugar.catch) jugar.catch(terminar);
      if (!opc || opc.pasos !== false) { if (CR.sonido) CR.sonido.pasos((vd.pasosSeg || 10) * 1000); }
      setTimeout(() => { if (!fin && estado.vista === v && vid.currentTime < 0.05) terminar(); }, 9000);
    };
    const esperarListo = () => {
      const t0 = performance.now();
      const sondeo = setInterval(() => {
        if (estado.vista !== v || arranco || fin) { clearInterval(sondeo); quitarAviso(); return; }
        const pc = avance[fuente];
        if (vid.readyState >= 4 || (vid.duration && cubierto(vid, 0, vid.duration))) { clearInterval(sondeo); arrancar(); return; }
        if (performance.now() - t0 > 20000 && vid.readyState >= 3) { clearInterval(sondeo); arrancar(); return; }
        if (performance.now() - t0 > 40000) { clearInterval(sondeo); arrancar(); return; }
        avisoCarga('Preparando el recorrido…' + (pc && pc < 1 ? ' ' + Math.round(pc * 100) + ' %' : ''));
      }, 150);
    };
    avisoCarga('Preparando el recorrido…');
    bajarVideo(fuente).then((u) => {
      if (estado.vista !== v) return;
      vid.src = u || fuente;
      esperarListo();
    });
  }

  /* Al llegar al final se enciende la pantalla: el video de YouTube y la luz suave sobre la sala. */
  function mostrarPantalla(v, pa) {
    const marco = $('.pantalla__video', v);
    if (!marco || !pa.youtube) return;
    const origen = /^https?:$/.test(location.protocol) ? '&origin=' + encodeURIComponent(location.origin) : '';
    const ifr = crear('iframe');
    ifr.title = 'Video institucional: Ciencia es Cultura';
    ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    ifr.setAttribute('allowfullscreen', '');
    ifr.referrerPolicy = 'strict-origin-when-cross-origin';
    ifr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(pa.youtube) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1' + origen;
    /* Mientras el video de YouTube suena, la música de ambiente se apaga. */
    v._yt = (ev) => {
      if (ev.source !== ifr.contentWindow || typeof ev.data !== 'string') return;
      let d; try { d = JSON.parse(ev.data); } catch (err) { return; }
      let st = null;
      if (d.event === 'onStateChange') st = d.info;
      else if (d.event === 'infoDelivery' && d.info && d.info.playerState != null) st = d.info.playerState;
      if (st != null && CR.sonido) CR.sonido.musicaBaja(st === 1 || st === 3);
    };
    window.addEventListener('message', v._yt);
    ifr.addEventListener('load', () => {
      try {
        ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
      } catch (err) { /* sin conexión con el reproductor */ }
    });
    marco.appendChild(ifr);
  }

  /* ---------- recorrido en video (salas): el video avanza por tramos con las flechas laterales ---------- */
  /* Los videos de las salas se bajan enteros a la memoria: así el avance rápido y el retroceso no se
     traban esperando datos de la red. Mientras tanto el video arranca igual, directo desde el servidor. */
  const blobs = {}, avance = {};
  function bajarVideo(src) {
    if (!blobs[src]) {
      blobs[src] = (window.fetch && /^https?:$/.test(location.protocol))
        ? fetch(src).then((r) => {
          if (!r.ok) throw new Error('video');
          const total = +r.headers.get('content-length') || 0;
          if (!r.body || !r.body.getReader || !total) return r.blob();
          const lector = r.body.getReader(), trozos = [];
          let n = 0;
          const leer = () => lector.read().then((x) => {
            if (x.done) return new Blob(trozos, { type: 'video/mp4' });
            trozos.push(x.value); n += x.value.length; avance[src] = n / total;
            return leer();
          });
          return leer();
        }).then((b) => { avance[src] = 1; return URL.createObjectURL(b); }).catch(() => null)
        : Promise.resolve(null);
    }
    return blobs[src];
  }
  /* Aviso "Preparando…" con el porcentaje de descarga. */
  function avisoCarga(texto) {
    let el = $('.carga');
    if (!el) { el = crear('div', 'carga'); el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.hidden = false; el.textContent = texto;
    return el;
  }
  function quitarAviso() { const el = $('.carga'); if (el) el.remove(); }
  function cubierto(vid, a, b) {
    const bf = vid.buffered;
    for (let i = 0; i < bf.length; i++) if (bf.start(i) <= a + 0.15 && bf.end(i) >= b - 0.05) return true;
    return false;
  }
  function fuenteAuditorio(vd) {
    const liviano = tactil || innerWidth < 900 || (navigator.connection && navigator.connection.saveData);
    return liviano && vd.src480 ? vd.src480 : vd.src1080;
  }
  function fuenteRecorrido(vd) {
    const px = Math.min(innerHeight, innerWidth / ((vd.w || 720) / (vd.h || 1280))) * (window.devicePixelRatio || 1);
    const ahorro = navigator.connection && navigator.connection.saveData;
    return (!vd.src480 || (px > 960 && !ahorro && !tactil && innerWidth >= 900)) ? vd.src720 : vd.src480;
  }
  /* En el hall, con la red libre, se adelanta la descarga de los videos de las salas. */
  function adelantarVideos() {
    if (navigator.connection && navigator.connection.saveData) return;
    Object.keys(escenas).forEach((k) => {
      if (escenas[k].tipo === 'recorrido' && escenas[k].video) bajarVideo(fuenteRecorrido(escenas[k].video));
      if (escenas[k].tipo === 'video' && escenas[k].video) bajarVideo(fuenteAuditorio(escenas[k].video));
    });
  }

  function montarRecorrido(id, e) {
    const vd = e.video, P = e.paradas && e.paradas.length ? e.paradas : [0];
    estado.escena = id;
    limpiarVista();
    const luz = !!e.luz;
    const v = crear('div', 'vista vista--recorrido' + (luz ? ' vista--luz' : ' vista--noche') + (luz && estado.luzApagada ? ' vista--apagada' : ''));
    v.dataset.escena = id;
    const bruma = crear('canvas', 'fondo bruma');
    bruma.width = 40; bruma.height = 40;
    const mundoVideo = crear('div', 'mundo mundo--foto');
    const vid = crear('video', 'foto');
    vid.muted = true; vid.defaultMuted = true; vid.playsInline = true; vid.preload = 'auto'; vid.disablePictureInPicture = true;
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.setAttribute('aria-label', e.titulo || 'Recorrido');
    mundoVideo.appendChild(vid);
    v.appendChild(bruma);
    v.appendChild(mundoVideo);
    v.appendChild(crear('div', 'tinte'));
    if (luz) { v.appendChild(crear('div', 'oscuridad')); v.appendChild(crear('div', 'haz')); v.appendChild(polvo()); }
    v.appendChild(crear('div', 'vineta'));

    const mundoPuntos = crear('div', 'mundo mundo--puntos');
    estado.puntosDatos = [];
    const lista = [];
    (e.puntos || []).forEach((p) => {
      const b = crearPunto(p);
      mundoPuntos.appendChild(b);
      const d = { el: b, x: p.x, y: p.y, cerca: false, parada: p.parada || 0 };
      lista.push(d);
      if (p.tipo !== 'ir') estado.puntosDatos.push(d);
    });
    v.appendChild(mundoPuntos);
    const izq = botonPan(-1), der = botonPan(1);
    izq.setAttribute('aria-label', 'Retroceder por la sala');
    der.setAttribute('aria-label', 'Avanzar por la sala');
    v.appendChild(izq);
    v.appendChild(der);

    escenario.insertBefore(v, escenario.firstChild);
    estado.vista = v;
    estado.mundos = [mundoVideo, mundoPuntos];
    estado.dims = { w: vd.w || 720, h: vd.h || 1280 };
    estado.lx = estado.lxObj = innerWidth / 2;
    estado.ly = estado.lyObj = innerHeight / 2;
    estado.tLuz = performance.now();
    estado.pan = estado.panObj = 0;
    const r = { e: e, vid: vid, i: 0, jugando: false, raf: 0, bruma: bruma, lista: lista, izq: izq, der: der, P: P };
    estado.rec = r;
    estado.parada = 0;
    calcular();
    actualizarHUD();
    actualizarParada();

    const fuente = fuenteRecorrido(vd);
    r.fuente = fuente;
    vid.src = fuente;
    /* cuando el video ya está entero en memoria, se cambia (en una parada) para que no haya esperas */
    r.cambiarAMemoria = () => {
      if (r.enMemoria || r.jugando || estado.rec !== r || !r.blob) return;
      r.enMemoria = true;
      const t = r.P[r.i];
      vid.addEventListener('loadedmetadata', () => { try { vid.currentTime = t; } catch (err) { /* nada */ } }, { once: true });
      vid.src = r.blob;
    };
    bajarVideo(fuente).then((u) => { if (u && estado.rec === r) { r.blob = u; r.cambiarAMemoria(); } });
    vid.addEventListener('loadedmetadata', () => {
      try { vid.currentTime = P[0]; } catch (err) { /* nada */ }
      const j = vid.play();   /* en iPhone hace falta arrancar el video una vez para que muestre el primer cuadro */
      if (j && j.then) j.then(() => { vid.pause(); try { vid.currentTime = P[0]; } catch (err) { /* nada */ } }).catch(() => {});
    }, { once: true });
    vid.addEventListener('loadeddata', () => { if (estado.vista === v) { v.classList.add('video--listo'); pintarBruma(); } });
    vid.addEventListener('seeked', () => { if (estado.vista === v) pintarBruma(); });
  }

  function pintarBruma() {
    const r = estado.rec;
    if (!r || !r.vid.videoWidth) return;
    try {
      const c = r.bruma.getContext('2d'), cw = r.bruma.width, ch = r.bruma.height;
      const s = Math.max(cw / r.vid.videoWidth, ch / r.vid.videoHeight);
      const dw = r.vid.videoWidth * s, dh = r.vid.videoHeight * s;
      c.drawImage(r.vid, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    } catch (err) { /* sin lienzo */ }
  }

  /* Muestra solo los puntos de la parada actual y las flechas que corresponden. */
  function actualizarParada() {
    const r = estado.rec;
    if (!r) return;
    estado.parada = r.i;
    r.lista.forEach((d) => {
      const fuera = r.jugando || d.parada !== r.i;
      d.el.classList.toggle('punto--fuera', fuera);
      if (fuera && d.cerca) { d.cerca = false; d.el.classList.remove('cerca'); }
    });
    r.izq.hidden = r.i <= 0;
    r.der.hidden = r.i >= r.P.length - 1;
    estado.vista.classList.toggle('recorriendo', r.jugando);
  }

  function moverParada(delta) {
    const r = estado.rec;
    if (!r || r.jugando || r.cargando || estado.cambiando || bloqueado() || estado.modal) return;
    const j = r.i + delta;
    if (j < 0 || j >= r.P.length) return;
    const e = r.e, vid = r.vid, v = estado.vista;
    const desde = r.P[r.i], hasta = r.P[j];
    const lo = Math.min(desde, hasta), hi = Math.max(desde, hasta);
    const continuo = (e.continuos || []).some((c) => lo >= c[0] - 0.05 && hi <= c[1] + 0.05);
    const vel = continuo ? (e.video.velocidadContinuo || 1.8) : (e.video.velocidad || 3);
    const dur = Math.abs(hasta - desde) / vel;

    /* Antes de mover: el tramo tiene que estar ya descargado. Si no, se espera y se avisa. */
    const listo = () => (r.enMemoria ? vid.readyState >= 3 : cubierto(vid, lo, hi + 0.3));
    const iniciar = () => {
      if (estado.vista !== v || estado.rec !== r) return;
      r.jugando = true;
      r.i = j;
      actualizarParada();
      if (CR.sonido) CR.sonido.pasos(dur * 1000 + 300);
      let hecho = false;
      const fin = () => {
        if (hecho || estado.vista !== v) return;
        hecho = true;
        cancelAnimationFrame(r.raf);
        r.jugando = false;
        vid.pause();
        try { vid.currentTime = hasta; } catch (err) { /* nada */ }
        pintarBruma();
        actualizarParada();
        r.cambiarAMemoria();
      };
      setTimeout(fin, dur * 1000 * 1.6 + 9000);
      let ultBruma = 0;
      const bruma = (ts) => { if (ts - ultBruma > 160) { ultBruma = ts; pintarBruma(); } };
      if (delta > 0) {
        if (Math.abs(vid.currentTime - desde) > 0.05) { try { vid.currentTime = desde; } catch (err) { /* nada */ } }
        vid.playbackRate = vel;
        const jg = vid.play();
        if (jg && jg.catch) jg.catch(fin);
        const paso = (ts) => {
          if (estado.vista !== v || hecho) return;
          bruma(ts);
          if (vid.currentTime >= hasta - 0.03 || vid.ended) { fin(); return; }
          r.raf = requestAnimationFrame(paso);
        };
        r.raf = requestAnimationFrame(paso);
      } else {
        /* hacia atrás: el navegador no reproduce al revés, así que se retrocede cuadro a cuadro */
        vid.pause();
        let t = desde, ult = performance.now();
        const paso = (ts) => {
          if (estado.vista !== v || hecho) return;
          const dt = Math.min(0.1, (ts - ult) / 1000);
          ult = ts;
          t = Math.max(hasta, t - dt * vel);
          if (!vid.seeking) { try { vid.currentTime = t; } catch (err) { /* nada */ } }
          bruma(ts);
          if (t <= hasta) { fin(); return; }
          r.raf = requestAnimationFrame(paso);
        };
        r.raf = requestAnimationFrame(paso);
      }
    };

    if (listo()) { iniciar(); return; }
    r.cargando = true;
    const t0 = performance.now();
    const sondeo = setInterval(() => {
      if (estado.vista !== v || estado.rec !== r) { clearInterval(sondeo); quitarAviso(); return; }
      if (r.blob && !r.enMemoria) r.cambiarAMemoria();
      if (listo() || performance.now() - t0 > 30000) { clearInterval(sondeo); r.cargando = false; quitarAviso(); iniciar(); return; }
      const pc = avance[r.fuente];
      avisoCarga('Cargando el recorrido…' + (pc && pc < 1 ? ' ' + Math.round(pc * 100) + ' %' : ''));
    }, 150);
  }

  function montarEscena(id, opc) {
    const e = escenas[id];
    if (!e || e.tipo === 'puerta') return;
    if (e.tipo === 'video') { montarVideo(id, e, opc); return; }
    if (e.tipo === 'recorrido') { montarRecorrido(id, e); return; }
    estado.escena = id;
    limpiarVista();
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
    if (id === 'hall') setTimeout(adelantarVideos, 1500);
  }

  function calcular() {
    const e = escenas[estado.escena];
    if (!e || e.tipo === 'puerta' || !estado.vista) return;
    const vw = innerWidth, vh = innerHeight;
    estado.vw = vw; estado.vh = vh;
    if (e.tipo === 'video') { calcularVideo(e, vw, vh); return; }
    if (e.tipo === 'recorrido') { calcularRecorrido(vw, vh); return; }
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
    estado.mundos.forEach((m) => m.style.setProperty('--W', W.toFixed(0) + 'px'));
    estado.r = limitar(Math.min(vw, vh) * 0.3, 150, 300);
    estado.panObj = limitar(estado.panObj, 0, max);
    estado.pan = limitar(estado.pan, 0, max);
    Array.prototype.forEach.call(estado.vista.querySelectorAll('.pan'), (b) => { b.hidden = max <= 0; });
    aplicar();
  }

  /* El video se ve entero. En celular vertical se agranda y se centra en la pantalla del auditorio. */
  function calcularVideo(e, vw, vh) {
    const ar = estado.dims.w / estado.dims.h, pa = e.pantalla || { x: 30, w: 36 };
    let H, W, left;
    if (vw < vh) {
      H = Math.max(240, (vh - 170) * 0.8);
      W = H * ar;
      left = vw / 2 - W * ((pa.x + pa.w / 2) / 100);
    } else {
      H = Math.min(vh, vw / ar);
      W = H * ar;
      left = (vw - W) / 2;
    }
    const top = (vh - H) / 2;
    estado.mundo = { W: W, H: H, top: top, max: 0, offX: left };
    estado.mundos.forEach((m) => { m.style.width = W + 'px'; m.style.height = H + 'px'; });
    estado.esc = 1;
    if (estado.mundos[1]) estado.mundos[1].style.setProperty('--esc', '1');
    estado.pan = estado.panObj = 0;
    aplicar();
  }

  /* El video vertical se ve entero, centrado; a los costados queda una bruma con sus propios colores. */
  function calcularRecorrido(vw, vh) {
    const ar = estado.dims.w / estado.dims.h;
    const H = Math.min(vh, vw / ar), W = H * ar;
    estado.mundo = { W: W, H: H, top: (vh - H) / 2, max: 0, offX: (vw - W) / 2 };
    estado.mundos.forEach((m) => { m.style.width = W + 'px'; m.style.height = H + 'px'; });
    estado.esc = 1;
    if (estado.mundos[1]) estado.mundos[1].style.setProperty('--esc', '1');
    estado.r = limitar(Math.min(vw, vh) * 0.3, 150, 300);
    estado.pan = estado.panObj = 0;
    const r = estado.rec;
    if (r) {
      r.izq.style.left = Math.round((vw - W) / 2 + 8) + 'px';
      r.der.style.left = Math.round((vw + W) / 2 - 8 - (r.der.offsetWidth || 46)) + 'px';
      r.der.style.right = 'auto';
    }
    if (r) { r.bruma.width = 40; r.bruma.height = Math.max(24, Math.round(40 * vh / vw)); pintarBruma(); }
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
     y al final aparece la sala nueva asentándose. Se muestra también con "reducir movimiento" (en Windows suele venir activado sin que se sepa): es el movimiento central de la visita y es breve. */
  const ACERCAR_MS = 2300;
  function irConAcercamiento(id, o) {
    const v = estado.vista;
    const aVideo = escenas[id].tipo === 'video';
    if (CR.sonido) CR.sonido.pasos(ACERCAR_MS + 600 + (aVideo ? ((escenas[id].video.pasosSeg || 10) * 1000) : 0));
    v.classList.add('vista--caminando');
    v.style.transformOrigin = Math.round(o.x) + 'px ' + Math.round(o.y) + 'px';
    v.style.transition = 'transform ' + ACERCAR_MS + 'ms cubic-bezier(.4,.1,.55,1)';
    void v.offsetWidth;
    v.style.transform = 'scale(3.4)';
    setTimeout(() => cortina.classList.add('activa'), ACERCAR_MS - 600);
    setTimeout(() => {
      montarEscena(id, { pasos: false });
      const nueva = estado.vista;
      if (!aVideo) nueva.classList.add('vista--llegando');
      mostrarPistas();
      requestAnimationFrame(() => cortina.classList.remove('activa'));
      setTimeout(() => { nueva.classList.remove('vista--llegando'); estado.cambiando = false; }, 1250);
    }, ACERCAR_MS);
  }

  function irA(id, opc) {
    if (!escenas[id] || estado.cambiando) return;
    estado.cambiando = true;
    if (opc && opc.origen && estado.vista && escenas[id].tipo !== 'puerta') { irConAcercamiento(id, opc.origen); return; }
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
    if (!e || e.tipo === 'video' || bloqueado() || !CR.aviso) return;
    const vistas = memoria.leer('pistas', {});
    const clave = e.tipo === 'recorrido' ? 'recorrido' : (e.luz ? 'luz' : 'flechas');
    if (!vistas[clave]) {
      vistas[clave] = true;
      memoria.guardar('pistas', vistas);
      CR.aviso(e.tipo === 'recorrido'
        ? (tactil ? 'Deslizá el dedo hacia los costados (o usá las flechas) para recorrer la sala. Tocá los puntos dorados.' : 'Arrastrá hacia los costados, usá la rueda del mouse o las flechas para recorrer la sala. Tocá los puntos dorados.')
        : e.luz
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
    a.dx = ev.clientX - a.x0;
    if (a.moviendo) { estado.panObj = limitar(estado.panObj - dx, 0, estado.mundo.max); estado.pan = estado.panObj; aplicar(); }
  });
  const soltar = () => {
    if (estado.arrastre && estado.arrastre.moviendo) {
      estado.ultimoArrastre = performance.now();
      if (estado.rec && Math.abs(estado.arrastre.dx || 0) > 50 && !edicion()) moverParada(estado.arrastre.dx < 0 ? 1 : -1);
    }
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
    if (estado.rec) {
      /* en las salas, la rueda (o el deslizar de dos dedos) avanza o retrocede un tramo */
      const r = estado.rec;
      if (r.jugando || performance.now() - (r.tRueda || 0) < 450) return;
      r.acum = (r.acum || 0) + d;
      if (Math.abs(r.acum) > 50) { const sentido = r.acum > 0 ? 1 : -1; r.acum = 0; r.tRueda = performance.now(); moverParada(sentido); }
      return;
    }
    estado.panObj = limitar(estado.panObj + d, 0, estado.mundo.max);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    if (estado.modal || bloqueado()) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (estado.rec) { if (ev.key === 'ArrowLeft') moverParada(-1); else if (ev.key === 'ArrowRight') moverParada(1); return; }
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
        if (estado.rec && d.parada !== estado.rec.i) return;
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
    if (CR.sonido) CR.sonido.pasos(PUERTA_MS);
    const hall = estado.vista;
    setTimeout(() => { if (hall && hall === estado.vista) hall.classList.add('vista--llegando'); }, 2000);
    setTimeout(() => {
      p.remove();
      estado.puerta = null;
      estado.abriendo = false;
      estado.enEntrada = false;
      if (hall) hall.classList.remove('vista--llegando');
      actualizarHUD();
      mostrarPistas();
    }, PUERTA_MS);
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
