/* =====================================================================
   Sonido: música ambiente y pasos.
   - Nada suena hasta el primer toque del visitante (los navegadores lo exigen).
   - La música entra y sale suave, se repite sola y baja un poco mientras se camina.
   - Los pasos se sincronizan con los acercamientos (puerta y salas).
   - El botón del sonido recuerda la elección. Si la pestaña pasa a segundo plano, todo se pausa.
   Los archivos y los volúmenes se configuran en datos/muestra.js (bloque "sonido").
   ===================================================================== */
(() => {
  'use strict';
  const C = window.CRILAR;
  if (!C) return;
  const cfg = (C.D && C.D.sonido) || {};
  const memoria = C.util.memoria;
  const boton = document.getElementById('btn-sonido');
  const creditos = document.getElementById('creditos');

  if (creditos) {
    if (cfg.creditos) creditos.textContent = cfg.creditos;
    else creditos.hidden = true;
  }
  if (!cfg.musica && !cfg.pasos) { if (boton) boton.hidden = true; return; }

  /* Con http(s) se usa Web Audio, que permite controlar el volumen también en iPhone.
     Al abrir index.html desde la carpeta (file://) se usa el volumen del propio elemento. */
  const AC = window.AudioContext || window.webkitAudioContext;
  const conWebAudio = !!AC && /^https?:$/.test(window.location.protocol);
  let encendido = memoria.leer('sonido', true) !== false;
  let ctx = null, iniciado = false, tPasos = 0, pasosSonando = false;

  function canal(url, max) {
    if (!url) return null;
    const el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.src = url;
    return { el: el, nivel: 0, max: max, gain: null, anim: 0 };
  }
  const musica = canal(cfg.musica, cfg.volumenMusica == null ? 0.7 : cfg.volumenMusica);
  const pasos = canal(cfg.pasos, cfg.volumenPasos == null ? 0.6 : cfg.volumenPasos);

  function aplicar(c) {
    const v = Math.max(0, Math.min(1, c.nivel * c.max));
    if (c.gain) c.gain.gain.value = v;
    else { try { c.el.volume = v; } catch (e) { /* sin control de volumen */ } }
  }
  function fundir(c, hasta, ms, fin) {
    cancelAnimationFrame(c.anim);
    const desde = c.nivel, t0 = performance.now();
    const paso = (t) => {
      const k = ms <= 0 ? 1 : Math.min(1, (t - t0) / ms);
      c.nivel = desde + (hasta - desde) * k;
      aplicar(c);
      if (k < 1) c.anim = requestAnimationFrame(paso);
      else if (fin) fin();
    };
    c.anim = requestAnimationFrame(paso);
  }
  function jugar(c) {
    if (!c) return;
    const p = c.el.play();
    if (p && p.catch) p.catch(() => { /* bloqueado por el navegador: se reintenta con el próximo toque */ });
  }

  function arrancarMusica() {
    if (!musica || !encendido) return;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    musica.nivel = 0;
    aplicar(musica);
    jugar(musica);
    fundir(musica, 1, 3500);
  }

  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    if (conWebAudio) {
      try {
        ctx = new AC();
        [musica, pasos].forEach((c) => {
          if (!c) return;
          c.gain = ctx.createGain();
          c.gain.gain.value = 0;
          ctx.createMediaElementSource(c.el).connect(c.gain);
          c.gain.connect(ctx.destination);
        });
      } catch (e) {
        ctx = null;
        [musica, pasos].forEach((c) => { if (c) c.gain = null; });
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    /* Los pasos se "desbloquean" dentro del toque (iPhone lo exige) y quedan listos. */
    if (pasos) {
      pasos.nivel = 0;
      aplicar(pasos);
      const quieto = () => { if (pasosSonando) return; pasos.el.pause(); try { pasos.el.currentTime = 0; } catch (e) { /* nada */ } };
      const p = pasos.el.play();
      if (p && p.then) p.then(quieto, () => { /* nada */ }); else quieto();
    }
    if (encendido) arrancarMusica();
  }

  /* Pasos durante "ms" milisegundos; la música baja un poco y vuelve al terminar. */
  function caminar(ms) {
    if (!iniciado || !encendido || !pasos) return;
    pasosSonando = true;
    clearTimeout(tPasos);
    try { pasos.el.currentTime = 0; } catch (e) { /* nada */ }
    pasos.nivel = 0;
    aplicar(pasos);
    jugar(pasos);
    fundir(pasos, 1, 150);
    if (musica && !musica.el.paused) fundir(musica, 0.4, 600);
    const dur = Math.max(800, ms || 2500);
    tPasos = setTimeout(() => {
      fundir(pasos, 0, 500, () => { pasos.el.pause(); pasosSonando = false; });
      if (musica && encendido && !musica.el.paused) fundir(musica, 1, 1500);
    }, dur - 500);
  }

  /* La música se repite sola, con entrada suave en cada vuelta. */
  if (musica) {
    musica.el.addEventListener('ended', () => {
      if (!encendido || document.hidden) return;
      try { musica.el.currentTime = 0; } catch (e) { /* nada */ }
      musica.nivel = 0;
      aplicar(musica);
      jugar(musica);
      fundir(musica, 1, 2500);
    });
  }

  /* ---------- botón de silencio ---------- */
  function pintar() {
    if (!boton) return;
    boton.classList.toggle('apagado', !encendido);
    const t = encendido ? 'Silenciar el sonido' : 'Activar el sonido';
    boton.setAttribute('aria-label', t);
    boton.title = t;
  }
  function alternar() {
    encendido = !encendido;
    memoria.guardar('sonido', encendido);
    pintar();
    if (!iniciado) { iniciar(); return; }
    if (encendido) { arrancarMusica(); return; }
    clearTimeout(tPasos);
    pasosSonando = false;
    [musica, pasos].forEach((c) => { if (c) fundir(c, 0, 300, () => c.el.pause()); });
  }
  pintar();
  if (boton) boton.addEventListener('click', alternar);

  /* ---------- primer toque y segundo plano ---------- */
  function gesto(ev) {
    if (boton && ev && ev.target && boton.contains(ev.target)) return;
    if (!iniciado) iniciar();
    else if (encendido && musica && musica.el.paused && !musica.el.ended && !document.hidden) arrancarMusica();
  }
  ['click', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, gesto, true));

  document.addEventListener('visibilitychange', () => {
    if (!iniciado) return;
    if (document.hidden) {
      [musica, pasos].forEach((c) => { if (c) c.el.pause(); });
    } else if (encendido && musica) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      jugar(musica);
      fundir(musica, 1, 1200);
    }
  });

  C.sonido = {
    pasos: caminar,
    alternar: alternar,
    activo: () => encendido,
    diagnostico: () => ({
      iniciado: iniciado, encendido: encendido, webAudio: !!ctx, ctx: ctx ? ctx.state : null,
      musica: musica ? { pausada: musica.el.paused, t: +musica.el.currentTime.toFixed(2), nivel: +musica.nivel.toFixed(2), error: !!musica.el.error } : null,
      pasos: pasos ? { pausado: pasos.el.paused, t: +pasos.el.currentTime.toFixed(2), nivel: +pasos.nivel.toFixed(2), error: !!pasos.el.error } : null
    })
  };
})();
