/* =====================================================================
   Ventanas del recorrido: aviso, ficha, mapa y sorteo.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;
  const $ = C.util.$, crear = C.util.crear, esc = C.util.esc, memoria = C.util.memoria;
  const D = C.D, escenas = C.escenas, estado = C.estado;

  /* ---------- aviso breve ---------- */
  const avisoEl = $('#aviso');
  let tAviso = 0;
  C.aviso = (texto, ms) => {
    avisoEl.textContent = texto;
    avisoEl.classList.add('visible');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => avisoEl.classList.remove('visible'), ms || 4500);
  };

  /* ---------- ventanas: abrir, cerrar, foco ---------- */
  const modFicha = $('#mod-ficha'), modMapa = $('#mod-mapa'), modSorteo = $('#mod-sorteo');
  const fichaCont = $('#ficha-contenido'), sorteoCont = $('#sorteo-contenido');
  let focoPrevio = null;

  function abrirModal(m) {
    focoPrevio = document.activeElement;
    estado.modal = m.id;
    m.classList.add('abierto');
    m.setAttribute('aria-hidden', 'false');
    setTimeout(() => { const b = m.querySelector('button, input'); if (b) b.focus({ preventScroll: true }); }, 60);
  }
  function cerrarModal(m) {
    if (!m.classList.contains('abierto')) return;
    m.classList.remove('abierto');
    m.setAttribute('aria-hidden', 'true');
    estado.modal = null;
    if (focoPrevio && focoPrevio.focus) { try { focoPrevio.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  }
  function cerrar(m) { if (m === modFicha) cerrarFicha(); else cerrarModal(m); }

  [modFicha, modMapa, modSorteo].forEach((m) => {
    m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.closest('[data-cerrar]')) cerrar(m); });
  });
  window.addEventListener('keydown', (ev) => {
    if (!estado.modal) return;
    const m = document.getElementById(estado.modal);
    if (!m) return;
    if (ev.key === 'Escape') { cerrar(m); return; }
    if (ev.key === 'Tab') {
      const f = Array.prototype.filter.call(m.querySelectorAll('a[href], button, input, textarea, select'), (n) => !n.disabled && n.tabIndex >= 0 && n.offsetParent !== null);
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    }
  });

  /* ---------- ficha de cada objeto ---------- */
  function vacio(titulo, ayuda) {
    return '<div class="media media--vacio"><strong>' + esc(titulo) + '</strong><span>' + esc(ayuda) + '</span></div>';
  }

  function recorteHTML(p, m) {
    const e = escenas[estado.escena];
    const z = m.zoom || 3.2, asp = 16 / 10, ch = 1 / asp;
    const zh = z * (estado.dims.h / estado.dims.w);
    const pos = (centro, tam, cont, punto) => {
      const den = cont - tam;
      if (Math.abs(den) < 1e-6) return 50;
      return Math.max(0, Math.min(100, ((cont / 2 - (punto / 100) * tam) / den) * 100));
    };
    const d = crear('div', 'media media--recorte');
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', m.alt || ('Detalle de ' + (p.titulo || 'objeto')));
    d.style.backgroundImage = 'url("' + e.imagen.src + '")';
    d.style.backgroundSize = (z * 100) + '% auto';
    d.style.backgroundPosition = pos(0, z, 1, p.x).toFixed(1) + '% ' + pos(0, zh, ch, p.y).toFixed(1) + '%';
    return d.outerHTML;
  }

  function mediaHTML(p, f) {
    const m = f.media || {}, t = f.tipo || 'texto';
    if (t === 'foto' || t === 'infografia') {
      if (m.src) return '<figure class="media media--' + t + '"><img src="' + esc(m.src) + '" alt="' + esc(m.alt || f.titulo || '') + '" loading="lazy"></figure>';
      if (t === 'foto' && m.recorte) return recorteHTML(p, m);
      return vacio(t === 'foto' ? 'Foto de ejemplo' : 'Infografía de ejemplo', 'Subí el archivo a images/fichas/ y escribí su ruta en media.src, dentro de datos/muestra.js.');
    }
    if (t === 'tablero') return '<div class="media media--tablero" id="tablero-raiz"></div>';
    if (t === 'juego') return '<div class="media media--juego" id="juego-raiz"></div>';
    if (t === 'video') {
      if (m.youtube) return '<div class="media media--video"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(m.youtube) + '?rel=0" title="' + esc(f.titulo || 'Video') + '" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
      if (m.mp4) return '<div class="media media--video"><video src="' + esc(m.mp4) + '"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : '') + ' controls playsinline preload="metadata"></video></div>';
      return vacio('Video de ejemplo', 'Pegá el ID de YouTube en media.youtube, o la ruta de un archivo en media.mp4, dentro de datos/muestra.js.');
    }
    return '';
  }

  function abrirFicha(p) {
    const f = p.ficha || {};
    fichaCont.innerHTML =
      (f.area ? '<p class="ficha__area">' + esc(f.area) + '</p>' : '') +
      '<h2 class="ficha__titulo" id="ficha-titulo">' + esc(f.titulo || p.titulo || '') + '</h2>' +
      (f.subtitulo ? '<p class="ficha__sub">' + esc(f.subtitulo) + '</p>' : '') +
      mediaHTML(p, f) +
      (f.texto ? '<p class="ficha__texto">' + esc(f.texto) + '</p>' : '') +
      (f.credito ? '<p class="ficha__credito">' + esc(f.credito) + '</p>' : '');
    estado.fichaActual = p;
    abrirModal(modFicha);
    const vid = fichaCont.querySelector('.media--video video');
    if (vid && C.sonido) {
      const baja = (si) => () => C.sonido.musicaBaja(si);
      vid.addEventListener('play', baja(true)); vid.addEventListener('pause', baja(false)); vid.addEventListener('ended', baja(false));
    }
    if (f.tipo === 'tablero' && C.tablero) C.tablero.iniciar(document.getElementById('tablero-raiz'), f.tablero);
    if (f.tipo === 'juego' && C.juego) C.juego.iniciar(document.getElementById('juego-raiz'), f.juego);
    if (p.tipo === 'objeto') C.marcarVisto(p.id);
  }

  function cerrarFicha() {
    cerrarModal(modFicha);
    estado.fichaActual = null;
    if (C.juego) C.juego.detener();
    const vid = fichaCont.querySelector('video');
    if (vid) { vid.pause(); if (C.sonido) C.sonido.musicaBaja(false); }
    if (C.tablero) C.tablero.detener();
    setTimeout(() => { if (!estado.fichaActual) fichaCont.innerHTML = ''; }, 320);
    if (C.completo() && !estado.sorteoOfrecido && !estado.registrado) setTimeout(abrirSorteo, 550);
  }

  /* ---------- mapa del museo ---------- */
  function cuenta(id) {
    let v = 0, t = 0;
    const rec = (k) => {
      (escenas[k].puntos || []).forEach((p) => { if (p.tipo === 'objeto') { t++; if (estado.visto.has(p.id)) v++; } });
      Object.keys(escenas).filter((x) => escenas[x].padre === k).forEach(rec);
    };
    rec(id);
    return { v: v, t: t };
  }
  function nodoMapa(id) {
    const e = escenas[id];
    const hijos = Object.keys(escenas).filter((k) => escenas[k].padre === id);
    const c = cuenta(id);
    return '<li><button type="button" class="mapa__lugar" data-ir="' + esc(id) + '"' + (id === estado.escena ? ' aria-current="true"' : '') + '>' +
      '<span>' + esc(e.corto || e.titulo) + '</span>' + (c.t ? '<span class="mapa__cuenta">' + c.v + ' de ' + c.t + '</span>' : '') + '</button>' +
      (hijos.length ? '<ul>' + hijos.map(nodoMapa).join('') + '</ul>' : '') + '</li>';
  }
  function abrirMapa() {
    const raices = Object.keys(escenas).filter((k) => escenas[k].tipo !== 'puerta' && !escenas[k].padre);
    $('#mapa-lista').innerHTML = raices.map(nodoMapa).join('');
    abrirModal(modMapa);
  }
  modMapa.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ir]');
    if (!b) return;
    cerrarModal(modMapa);
    if (b.dataset.ir !== estado.escena) C.irA(b.dataset.ir);
  });
  $('#btn-reiniciar').addEventListener('click', () => {
    if (!window.confirm('¿Empezar de nuevo? Se borra lo que ya recorriste.')) return;
    estado.visto = new Set();
    memoria.guardar('visto', []);
    estado.sorteoOfrecido = false;
    memoria.guardar('sorteoOfrecido', false);
    estado.luzApagada = false;
    cerrarModal(modMapa);
    const vieja = estado.puerta;
    if (vieja) vieja.remove();
    estado.puerta = null;
    estado.abriendo = false;
    C.mostrarEntrada();
  });

  /* ---------- sorteo ---------- */
  function codigo() {
    const s = Array.from(estado.visto).sort().join('|') + '|crilar';
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    const t = (h >>> 0).toString(36).toUpperCase();
    return 'CR-' + ('000000' + t).slice(-6);
  }
  const campo = (id, etiqueta, tipo, extra) =>
    '<div class="campo" id="campo-' + id + '"><label for="f-' + id + '">' + etiqueta + '</label>' +
    '<input id="f-' + id + '" name="' + id + '" type="' + tipo + '" aria-describedby="err-' + id + '" ' + (extra || '') + '>' +
    '<span class="campo__error" id="err-' + id + '"></span></div>';

  function formulario() {
    const s = D.sorteo || {};
    const bases = s.bases ? '<a href="' + esc(s.bases) + '" target="_blank" rel="noopener">bases del sorteo</a>' : 'bases del sorteo';
    return '<p class="ficha__area">Terminaste el recorrido</p>' +
      '<h2 class="ficha__titulo" id="sorteo-titulo">' + esc(s.titulo || 'Participá del sorteo') + '</h2>' +
      '<p class="ficha__texto">Pasaste por todos los objetos de la muestra. Dejá tus datos para participar del sorteo.</p>' +
      '<div class="boleto"><span>Tu número de recorrido</span><strong>' + codigo() + '</strong></div>' +
      '<form id="form-sorteo" novalidate>' +
        campo('nombre', 'Nombre y apellido', 'text', 'autocomplete="name" required') +
        campo('email', 'Correo electrónico', 'email', 'autocomplete="email" inputmode="email" required') +
        campo('telefono', 'Teléfono (opcional)', 'tel', 'autocomplete="tel" inputmode="tel"') +
        '<div class="trampa" aria-hidden="true"><label>No completar<input name="web" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="campo" id="campo-acepto"><label class="acepto"><input type="checkbox" name="acepto" aria-describedby="err-acepto"><span>Acepto las ' + bases + ' y que el CRILAR use estos datos solo para este sorteo.</span></label>' +
        '<span class="campo__error" id="err-acepto"></span></div>' +
        '<p class="estado-form" id="estado-form" role="alert"></p>' +
        '<button class="boton boton--tinta" type="submit">Participar del sorteo</button>' +
      '</form>';
  }
  function gracias() {
    const s = D.sorteo || {};
    return '<p class="ficha__area">Listo</p>' +
      '<h2 class="ficha__titulo" id="sorteo-titulo">Ya estás participando</h2>' +
      '<p class="ficha__texto">' + esc(s.gracias || 'Ya estás participando. ¡Mucha suerte!') + '</p>' +
      '<div class="boleto"><span>Tu número de recorrido</span><strong>' + codigo() + '</strong></div>' +
      '<button class="boton boton--tinta" type="button" data-cerrar>Seguir recorriendo</button>';
  }

  function poner(id, msg) {
    const c = $('#campo-' + id), e = $('#err-' + id);
    if (c) c.classList.toggle('error', !!msg);
    if (e) e.textContent = msg || '';
    return !msg;
  }
  function validar(f) {
    const nombre = f.elements.nombre.value.trim(), email = f.elements.email.value.trim();
    const a = poner('nombre', nombre.length < 3 ? 'Escribí tu nombre y apellido.' : '');
    const b = poner('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Revisá el correo: parece incompleto.');
    const c = poner('acepto', f.elements.acepto.checked ? '' : 'Para participar tenés que aceptar las bases.');
    return a && b && c;
  }
  async function enviar(datos) {
    const url = (D.sorteo && D.sorteo.endpoint) || '';
    if (!url) {
      const cola = memoria.leer('pendientes', []);
      cola.push(datos);
      memoria.guardar('pendientes', cola);
      console.info('[sorteo] No hay "endpoint" configurado en datos/muestra.js: los datos quedaron solo en este navegador.', datos);
      return;
    }
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) });
  }

  function abrirSorteo() {
    if (!C.completo() && !estado.registrado) {
      const f = C.listarObjetos().length - C.vistos();
      C.aviso(f === 1 ? 'Te falta 1 objeto para participar del sorteo.' : 'Te faltan ' + f + ' objetos para participar del sorteo.');
      return;
    }
    estado.sorteoOfrecido = true;
    memoria.guardar('sorteoOfrecido', true);
    sorteoCont.innerHTML = estado.registrado ? gracias() : formulario();
    abrirModal(modSorteo);
    const form = $('#form-sorteo');
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msg = $('#estado-form'), btn = form.querySelector('button[type="submit"]');
      msg.textContent = '';
      if (!validar(form)) return;
      if (form.elements.web.value) { estado.registrado = true; sorteoCont.innerHTML = gracias(); return; }
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        await enviar({
          evento: D.evento.nombre, nombre: form.elements.nombre.value.trim(), email: form.elements.email.value.trim(),
          telefono: form.elements.telefono.value.trim(), codigo: codigo(), objetos: C.vistos(), fecha: new Date().toISOString()
        });
        estado.registrado = true;
        memoria.guardar('registrado', true);
        C.actualizarHUD();
        sorteoCont.innerHTML = gracias();
        const b = sorteoCont.querySelector('button'); if (b) b.focus({ preventScroll: true });
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Participar del sorteo';
        msg.textContent = 'No pudimos enviar tus datos. Revisá la conexión y probá de nuevo.';
      }
    });
  }

  /* ---------- botones de las barras ---------- */
  $('#btn-mapa').addEventListener('click', abrirMapa);
  $('#btn-sorteo').addEventListener('click', abrirSorteo);

  C.abrirFicha = abrirFicha;
  C.abrirSorteo = abrirSorteo;
  C.abrirMapa = abrirMapa;
})();
