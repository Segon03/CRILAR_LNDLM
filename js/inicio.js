/* =====================================================================
   Arranque: pantalla de bienvenida, precarga de fotos, puerta de entrada
   y modo edición. Los textos de la bienvenida y su duración se cambian en
   datos/muestra.js (bloque "intro").
   Atajos para probar: ?sinintro=1 salta la bienvenida; ?escena=ID abre una sala.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;
  const D = C.D;
  const intro = D.intro || {};
  const cargando = document.getElementById('cargando');
  const barra = document.getElementById('cargando-barra');
  const boton = document.getElementById('intro-boton');
  const params = new URLSearchParams(window.location.search);
  const saltar = params.has('escena') || params.has('editar') || params.has('sinintro');
  const SEGUNDOS = intro.segundos > 0 ? intro.segundos : 9;

  function pintarIntro() {
    const poner = (id, t) => { const n = document.getElementById(id); if (n && t) n.textContent = t; };
    poner('intro-titulo', D.evento && D.evento.nombre);
    poner('intro-sub', D.evento && D.evento.subtitulo);
    poner('intro-sonido', intro.sonido);
    const lista = document.getElementById('intro-lista');
    if (lista) (intro.indicaciones || []).forEach((t) => { const li = document.createElement('li'); li.textContent = t; lista.appendChild(li); });
    barra.style.animationDuration = (saltar ? 0.2 : SEGUNDOS) + 's';
  }

  function precargar() {
    const fotos = Object.keys(C.escenas).map((k) => C.escenas[k].imagen && C.escenas[k].imagen.src).filter(Boolean);
    return new Promise((resolver) => {
      let hechas = 0, listo = false;
      const fin = () => { if (!listo) { listo = true; resolver(); } };
      const avanzar = () => { hechas++; if (hechas >= fotos.length) fin(); };
      if (!fotos.length) return fin();
      fotos.forEach((src) => { const i = new Image(); i.onload = avanzar; i.onerror = avanzar; i.src = src; });
      setTimeout(fin, 8000);
    });
  }

  function arrancar() {
    const directa = params.get('escena');
    if (directa && C.escenas[directa] && C.escenas[directa].tipo !== 'puerta') C.montarEscena(directa);
    else C.mostrarEntrada();
    cargando.classList.add('listo');
    requestAnimationFrame(C.bucle);
    if (params.has('editar')) {
      const s = document.createElement('script');
      s.src = 'js/editor.js';
      document.body.appendChild(s);
    }
  }

  pintarIntro();
  const cargado = precargar().then(() => {
    boton.disabled = false;
    boton.textContent = intro.boton || 'Comenzar la visita';
    try { boton.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
  });
  const pulsado = new Promise((resolver) => boton.addEventListener('click', resolver, { once: true }));
  const tiempo = new Promise((resolver) => setTimeout(resolver, saltar ? 0 : SEGUNDOS * 1000));
  Promise.all([cargado, Promise.race([tiempo, pulsado])]).then(arrancar);
})();
