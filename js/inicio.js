/* =====================================================================
   Arranque: pantalla de bienvenida, precarga de fotos, puerta de entrada
   y modo edición. Los textos de la bienvenida y su duración se cambian en
   datos/muestra.js (bloque "intro").
   Atajos para probar: ?sinintro=1 salta la bienvenida; ?escena=ID abre una sala.

   Cuenta regresiva: hasta la fecha de evento.apertura (datos/muestra.js) la
   portada muestra solo el reloj. A esa hora se habilita sola.
     ?previa=1   entra igual antes de la apertura y lo recuerda en ese navegador
     ?previa=0   vuelve a mostrar la cuenta regresiva en ese navegador
     ?cuenta=30  prueba la cuenta regresiva: abre en 30 segundos
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

  function iniciarVisita() {
    pintarIntro();
    /* la barra se reinicia por si estuvo oculta durante la cuenta regresiva */
    barra.style.animation = 'none';
    void barra.offsetWidth;
    barra.style.animation = '';
    barra.style.animationDuration = (saltar ? 0.2 : SEGUNDOS) + 's';
    const cargado = precargar().then(() => {
      boton.disabled = false;
      boton.textContent = intro.boton || 'Comenzar la visita';
      try { boton.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    });
    const pulsado = new Promise((resolver) => boton.addEventListener('click', resolver, { once: true }));
    const tiempo = new Promise((resolver) => setTimeout(resolver, saltar ? 0 : SEGUNDOS * 1000));
    Promise.all([cargado, Promise.race([tiempo, pulsado])]).then(arrancar);
  }

  /* ---------- cuenta regresiva hasta la apertura ---------- */
  const CLAVE_PREVIA = 'crilar-previa';
  const guardar = (fn) => { try { fn(); } catch (e) { /* sin almacenamiento */ } };
  if (params.get('previa') === '0') guardar(() => localStorage.removeItem(CLAVE_PREVIA));
  else if (params.has('previa')) guardar(() => localStorage.setItem(CLAVE_PREVIA, '1'));
  let previa = false;
  guardar(() => { previa = localStorage.getItem(CLAVE_PREVIA) === '1'; });

  const prueba = params.has('cuenta');
  let desfase = 0;   /* diferencia entre el reloj del dispositivo y el del servidor */
  const ahora = () => Date.now() + desfase;
  const objetivo = prueba
    ? Date.now() + (Math.max(1, parseFloat(params.get('cuenta')) || 20) * 1000)
    : Date.parse((D.evento && D.evento.apertura) || '');

  function mostrarCuenta() {
    const caja = document.getElementById('cuenta');
    const introEl = cargando.querySelector('.intro');
    const poner = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t || ''; };
    poner('cuenta-aviso', (D.evento && D.evento.aperturaTexto) || 'La visita todavía no está abierta.');
    poner('cuenta-nota', D.evento && D.evento.aperturaNota);
    const titulo = document.getElementById('intro-titulo');
    if (titulo && D.evento && D.evento.nombre) titulo.textContent = D.evento.nombre;
    const sub = document.getElementById('intro-sub');
    if (sub && D.evento && D.evento.subtitulo) sub.textContent = D.evento.subtitulo;
    introEl.classList.add('intro--espera');
    caja.hidden = false;
    const celdas = ['d', 'h', 'm', 's'].map((k) => document.getElementById('cuenta-' + k));
    const dos = (n) => String(n).padStart(2, '0');
    let reloj = 0;
    const tic = () => {
      const falta = objetivo - (prueba ? Date.now() : ahora());
      if (falta <= 0) {
        clearInterval(reloj);
        caja.hidden = true;
        introEl.classList.remove('intro--espera');
        iniciarVisita();
        return;
      }
      const seg = Math.floor(falta / 1000);
      const v = [Math.floor(seg / 86400), Math.floor(seg / 3600) % 24, Math.floor(seg / 60) % 60, seg % 60];
      celdas.forEach((c, i) => { if (c) c.textContent = dos(v[i]); });
    };
    tic();
    reloj = setInterval(tic, 250);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tic(); });
    /* se toma la hora del servidor de GitHub para no depender del reloj del dispositivo */
    if (!prueba && /^https?:$/.test(location.protocol) && window.fetch) {
      fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' })
        .then((r) => { const t = Date.parse(r.headers.get('Date') || ''); if (t) { desfase = t - Date.now(); tic(); } })
        .catch(() => { /* se usa el reloj del dispositivo */ });
    }
  }

  const esperar = Number.isFinite(objetivo) && (prueba || !previa) && objetivo > Date.now();
  if (esperar) mostrarCuenta();
  else iniciarVisita();
})();
