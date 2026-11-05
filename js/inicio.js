/* =====================================================================
   Arranque: precarga de fotos, pantalla de entrada y modo edición.
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;
  const D = C.D;
  const cargando = document.getElementById('cargando');
  const barra = document.getElementById('cargando-barra');

  function precargar() {
    const fotos = Object.keys(C.escenas).map((k) => C.escenas[k].imagen && C.escenas[k].imagen.src).filter(Boolean);
    return new Promise((resolver) => {
      let hechas = 0, listo = false;
      const fin = () => { if (!listo) { listo = true; resolver(); } };
      const avanzar = () => {
        hechas++;
        barra.style.width = Math.round((hechas / fotos.length) * 100) + '%';
        if (hechas >= fotos.length) fin();
      };
      if (!fotos.length) return fin();
      fotos.forEach((src) => { const i = new Image(); i.onload = avanzar; i.onerror = avanzar; i.src = src; });
      setTimeout(fin, 8000);
    });
  }

  function arrancar() {
    const params = new URLSearchParams(window.location.search);
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

  precargar().then(arrancar);
})();
