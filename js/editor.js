/* =====================================================================
   Modo edición. Se activa agregando ?editar=1 a la dirección del sitio.
   Sirve para acomodar los puntos sobre las fotos con el mouse.
   Los cambios quedan en este navegador hasta que copies los datos y los
   pegues en datos/muestra.js.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;
  const D = C.D, escenas = C.escenas, estado = C.estado;
  const crear = C.util.crear, limitar = C.util.limitar;
  const E = window.CRILAR_EDICION = { activo: true };
  const CLAVE = 'crilar:edicion';
  let modo = null, sel = null;

  /* ---------- cambios guardados en este navegador ---------- */
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && g.v === D.version && g.e) Object.keys(g.e).forEach((k) => { if (escenas[k] && Array.isArray(g.e[k])) escenas[k].puntos = g.e[k]; });
  } catch (e) { /* sin cambios previos */ }
  function guardar() {
    try {
      const o = {};
      Object.keys(escenas).forEach((k) => { if (escenas[k].puntos) o[k] = escenas[k].puntos; });
      localStorage.setItem(CLAVE, JSON.stringify({ v: D.version, e: o }));
    } catch (e) { /* sin almacenamiento */ }
  }

  /* ---------- panel ---------- */
  const css = crear('style');
  css.textContent =
    '.editor{position:fixed;left:12px;top:86px;z-index:50;width:min(300px,calc(100vw - 24px));padding:12px 14px;border:1px solid #3197d7;border-radius:3px;background:rgba(5,8,20,.92);color:#d9e5f6;font:14px/1.45 "Atkinson Hyperlegible",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.6)}' +
    '.editor strong{font-family:"IM Fell English",Georgia,serif;font-size:1.3rem;font-weight:400;color:#fdbe0f}' +
    '.editor p{margin:.35rem 0}.editor small{color:#9db2d3}' +
    '.editor__fila{display:flex;flex-wrap:wrap;gap:6px;margin-top:.6rem}' +
    '.editor button{min-height:38px;padding:.3rem .65rem;border:1px solid #3197d7;border-radius:3px;background:#0a1128;color:#efe6cf;font:inherit;cursor:pointer}' +
    '.editor button:hover,.editor button.on{background:#3197d7;color:#050814}' +
    '.editor__estado{min-height:1.4em;color:#fdbe0f}' +
    'body.editando .punto,body.editando .salto__cartela{outline:1px dashed rgba(255,255,255,.55);outline-offset:2px;cursor:move}' +
    'body.editando .punto.sel,body.editando .salto.sel .salto__cartela{outline:2px solid #3197d7}' +
    'body.editando .escenario.modo-nuevo{cursor:crosshair}' +
    '.editor__texto{position:fixed;inset:10% 6%;z-index:60;display:grid;grid-template-rows:auto 1fr auto;gap:8px;padding:12px;background:#0a1128;border:1px solid #3197d7;color:#d9e5f6}' +
    '.editor__texto textarea{width:100%;height:100%;background:#050814;color:#d9e5f6;border:1px solid #1c2d5a;font:12px/1.4 ui-monospace,Consolas,monospace}';
  document.head.appendChild(css);
  document.body.classList.add('editando');

  const panel = crear('aside', 'editor');
  panel.setAttribute('aria-label', 'Modo edición');
  panel.innerHTML =
    '<strong>Modo edición</strong>' +
    '<p>Arrastrá los puntos para moverlos. Para quitar uno, tocalo y apretá Supr.</p>' +
    '<p class="editor__estado" id="ed-estado" aria-live="polite"></p>' +
    '<div class="editor__fila">' +
      '<button type="button" data-a="nuevo">Nuevo objeto</button>' +
      '<button type="button" data-a="copiar">Copiar datos</button>' +
      '<button type="button" data-a="descartar">Descartar cambios</button>' +
      '<button type="button" data-a="salir">Salir</button>' +
    '</div>' +
    '<p><small>Los cambios quedan en este navegador. Para publicarlos, copiá los datos y pegalos en datos/muestra.js.</small></p>';
  document.body.appendChild(panel);
  const info = panel.querySelector('#ed-estado');
  const dec = (t) => { info.textContent = t; };

  /* ---------- utilidades ---------- */
  const puntoPorId = (id) => (escenas[estado.escena].puntos || []).find((p) => p.id === id);
  function marcar(id) {
    sel = id;
    Array.prototype.forEach.call(estado.vista.querySelectorAll('.sel'), (n) => n.classList.remove('sel'));
    const b = id && estado.vista.querySelector('[data-id="' + id + '"]');
    if (b) b.classList.add('sel');
    const p = id && puntoPorId(id);
    dec(p ? estado.escena + ': ' + p.id + ' (x ' + p.x + ', y ' + p.y + ')' : 'Escena: ' + estado.escena);
  }
  function aMundo(ev) {
    const m = estado.mundo;
    return {
      x: +limitar(((ev.clientX + estado.pan - m.offX) / m.W) * 100, 0, 100).toFixed(1),
      y: +limitar(((ev.clientY - m.top) / m.H) * 100, 0, 100).toFixed(1)
    };
  }

  /* ---------- mover y agregar puntos (fase de captura: va antes que el recorrido) ---------- */
  C.escenario.addEventListener('pointerdown', (ev) => {
    if (estado.enEntrada || estado.abriendo) return;
    const b = ev.target.closest('.punto, .salto');
    if (modo === 'nuevo' && !b) {
      ev.stopPropagation(); ev.preventDefault();
      const pos = aMundo(ev);
      const titulo = window.prompt('Nombre del objeto');
      modo = null;
      C.escenario.classList.remove('modo-nuevo');
      panel.querySelector('[data-a="nuevo"]').classList.remove('on');
      if (!titulo) return;
      const area = window.prompt('Área o colección (opcional)', '') || '';
      const id = 'obj-' + Date.now().toString(36);
      escenas[estado.escena].puntos = escenas[estado.escena].puntos || [];
      escenas[estado.escena].puntos.push({
        id: id, tipo: 'objeto', x: pos.x, y: pos.y, titulo: titulo,
        ficha: { area: area, titulo: titulo, tipo: 'foto', media: { recorte: true, alt: '' }, texto: 'Texto de ejemplo. Acá va la descripción del objeto.', credito: '' }
      });
      guardar();
      C.recargar();
      estado.luzApagada = true;
      estado.vista.classList.add('vista--apagada');
      marcar(id);
      return;
    }
    if (!b) return;
    ev.stopPropagation(); ev.preventDefault();
    const p = puntoPorId(b.dataset.id);
    if (!p) return;
    marcar(p.id);
    const mover = (e2) => {
      const pos = aMundo(e2);
      p.x = pos.x; p.y = pos.y;
      b.style.left = p.x + '%'; b.style.top = p.y + '%';
      dec(estado.escena + ': ' + p.id + ' (x ' + p.x + ', y ' + p.y + ')');
    };
    const fin = () => { window.removeEventListener('pointermove', mover); guardar(); };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fin, { once: true });
  }, true);

  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Delete' || !sel || /^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
    const lista = escenas[estado.escena].puntos || [];
    const i = lista.findIndex((p) => p.id === sel);
    if (i < 0 || !window.confirm('¿Quitar este punto?')) return;
    lista.splice(i, 1);
    guardar();
    C.recargar();
    estado.vista.classList.toggle('vista--apagada', estado.luzApagada);
    marcar(null);
  });

  /* ---------- botones del panel ---------- */
  function textoDatos() {
    return '/* Datos del recorrido, generados con el modo edición. Las instrucciones están en el README. */\n' +
      'window.MUESTRA = ' + JSON.stringify(D, null, 2) + ';\n';
  }
  function verTexto(t) {
    const caja = crear('div', 'editor__texto');
    caja.innerHTML = '<p>Seleccioná todo (Ctrl+A), copiá (Ctrl+C) y pegalo en datos/muestra.js.</p><textarea readonly></textarea><button type="button">Cerrar</button>';
    caja.querySelector('textarea').value = t;
    caja.querySelector('button').addEventListener('click', () => caja.remove());
    document.body.appendChild(caja);
    caja.querySelector('textarea').select();
  }
  panel.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'nuevo') {
      modo = modo === 'nuevo' ? null : 'nuevo';
      b.classList.toggle('on', modo === 'nuevo');
      C.escenario.classList.toggle('modo-nuevo', modo === 'nuevo');
      dec(modo === 'nuevo' ? 'Tocá el lugar de la foto donde va el objeto.' : '');
    } else if (a === 'copiar') {
      const t = textoDatos();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(() => dec('Datos copiados. Pegalos en datos/muestra.js.'), () => verTexto(t));
      } else verTexto(t);
    } else if (a === 'descartar') {
      if (!window.confirm('¿Descartar los cambios hechos en este navegador?')) return;
      try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
      window.location.reload();
    } else if (a === 'salir') {
      const u = new URL(window.location.href);
      u.searchParams.delete('editar');
      window.location.href = u.toString();
    }
  });

  /* ---------- arranque: escena iluminada para ver todos los puntos ---------- */
  estado.luzApagada = true;
  if (estado.enEntrada) dec('Abrí la puerta para empezar a editar.');
  else { C.recargar(); marcar(null); }
  C.actualizarHUD();
})();
