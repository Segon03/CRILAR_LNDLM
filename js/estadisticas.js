/* =====================================================================
   Estadísticas de uso anónimas del micrositio: cuántas visitas, cuánto tiempo se queda
   cada una y a qué hora. Ver estadisticas/LEEME.md.

   APAGADAS mientras ENDPOINT esté vacío. Para encenderlas, poné la
   dirección de la recepción de Cloudflare terminada en /api/e, por ejemplo
   'https://micrositio-recepcion.TU-SUBDOMINIO.workers.dev/api/e'.

   No guarda datos personales: usa dos identificadores al azar guardados en
   el propio navegador. Cualquier fallo se ignora: nunca afecta la visita.

   No se cuentan:
     ?previa, ?cuenta, ?editar   accesos de prueba del equipo
     ?sinstats=1                 marca este navegador para no contarlo nunca
                                 (?sinstats=0 lo vuelve a contar)
     localhost o el archivo abierto con doble clic
   ===================================================================== */
(function () {
  'use strict';

  var ENDPOINT = '';

  var INTERVALO_MS = 15000;             /* aviso de "sigue acá" mientras la página está visible */
  var INACTIVIDAD_MS = 30 * 60 * 1000;  /* pasado este tiempo sin avisos, es una visita nueva */
  /* claves en el navegador, propias del micrositio */
  var CLAVE_SID = 'micrositio_est_visita', CLAVE_T = 'micrositio_est_ultimo';
  var CLAVE_VID = 'micrositio_est_visitante', CLAVE_EXCLUIR = 'micrositio_est_excluir';
  var PARAMS_PRUEBA = ['previa', 'cuenta', 'editar'];

  var NADA = { getItem: function () { return null; }, setItem: function () {} };

  function azar() {
    try { return crypto.randomUUID(); } catch (e) { /* navegador viejo */ }
    var p = [];
    for (var i = 0; i < 4; i++) p.push((Math.random().toString(16).slice(2, 10) + '00000000').slice(0, 8));
    return p.join('-');
  }
  function leer(alm, k) { try { return alm.getItem(k); } catch (e) { return null; } }
  function guardar(alm, k, v) { try { alm.setItem(k, v); } catch (e) { /* modo privado */ } }

  /* ¿Corresponde contar esta visita? */
  function debeContar(o) {
    if (!o.endpoint) return false;
    if (!/^https?:$/.test(o.protocolo || '')) return false;
    if (o.host === 'localhost' || o.host === '127.0.0.1' || o.host === '[::1]') return false;
    if (o.marcaExcluir === '1') return false;
    for (var i = 0; i < PARAMS_PRUEBA.length; i++) if (o.params.has(PARAMS_PRUEBA[i])) return false;
    return true;
  }

  /* Identificador de la visita: se mantiene en la pestaña y se renueva tras mucho tiempo sin actividad. */
  function idDeVisita(alm, ahora) {
    var sid = leer(alm, CLAVE_SID), ultimo = Number(leer(alm, CLAVE_T));
    if (sid && ahora - ultimo < INACTIVIDAD_MS) return sid;
    var nuevo = azar();
    guardar(alm, CLAVE_SID, nuevo);
    return nuevo;
  }

  function iniciar(win, endpoint) {
    try {
      var local = NADA, sesion = NADA;
      try { local = win.localStorage || NADA; } catch (e) { /* bloqueado */ }
      try { sesion = win.sessionStorage || NADA; } catch (e) { /* bloqueado */ }
      var params = new URLSearchParams(win.location.search);
      if (params.has('sinstats')) guardar(local, CLAVE_EXCLUIR, params.get('sinstats') === '0' ? '0' : '1');
      if (!debeContar({
        endpoint: endpoint, params: params, protocolo: win.location.protocol,
        host: win.location.hostname, marcaExcluir: leer(local, CLAVE_EXCLUIR)
      })) return false;

      var vid = leer(local, CLAVE_VID);
      if (!vid) { vid = azar(); guardar(local, CLAVE_VID, vid); }
      var sid = idDeVisita(sesion, Date.now());
      var doc = win.document;

      var enviar = function (t, beacon) {
        try {
          guardar(sesion, CLAVE_T, String(Date.now()));
          var cuerpo = JSON.stringify({ t: t, s: sid, v: vid });
          if (beacon && win.navigator && win.navigator.sendBeacon) {
            win.navigator.sendBeacon(endpoint, new win.Blob([cuerpo], { type: 'text/plain' }));
          } else if (win.fetch) {
            win.fetch(endpoint, { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'cors', credentials: 'omit' })
              .catch(function () {});
          }
        } catch (e) { /* se ignora */ }
      };
      var latido = function () {
        var actual = idDeVisita(sesion, Date.now());
        if (actual !== sid) { sid = actual; enviar('i'); } else enviar('l');
      };

      enviar('i');
      win.setInterval(function () { if (doc.visibilityState === 'visible') latido(); }, INTERVALO_MS);
      doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') latido(); else enviar('l', true); });
      win.addEventListener('pagehide', function () { enviar('l', true); });

      var aviso = doc.getElementById('aviso-estadisticas');
      if (aviso) aviso.hidden = false;
      return true;
    } catch (e) {
      return false;
    }
  }

  var api = { debeContar: debeContar, idDeVisita: idDeVisita, iniciar: iniciar };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  window.CRILAR_ESTADISTICAS = api;
  iniciar(window, ENDPOINT);
})();
