# Plan: estadísticas de uso y panel privado

## Qué se construyó

Un registro anónimo de cómo se usa el micrositio de la Noche de los Museos (`https://segon03.github.io/CRILAR_LNDLM/`) y un panel privado para consultarlo. Solo se mide esto:

- Cantidad de ingresos.
- Tiempo de permanencia.
- Horarios de uso.
- Ubicación aproximada: país y provincia.

No se registra qué salas u objetos se miran, qué dispositivo usa cada persona ni nada que identifique a alguien.

Las estadísticas son solo de este micrositio. La app de realidad aumentada de la vitrina es otro proyecto y no se mezcla con este.

## Cómo funciona

GitHub Pages es estático y no puede guardar datos. Por eso la página envía avisos a un servicio aparte en Cloudflare.

1. Al abrir el micrositio, `js/estadisticas.js` avisa "ingresó alguien". Mientras la página está a la vista, avisa cada 15 segundos "sigue acá". Al ocultarse o cerrarse manda un último aviso.
2. Un Worker de **recepción**, público, guarda los avisos en una base D1. El país y la provincia salen de los datos que Cloudflare agrega a cada conexión. La IP no se guarda. Solo puede escribir.
3. Un Worker de **panel** lee la base y muestra los resultados. Se entra con una contraseña guardada como secreto en Cloudflare (`PANEL_CLAVE`), nunca en el código. Al entrar, el panel entrega una sesión firmada que dura 12 horas. Solo puede leer, y sin contraseña configurada no entrega datos a nadie.

Son dos Workers para que la recepción, que es pública, no tenga ningún acceso de lectura a los datos.

## Decisiones

- **Servicio:** Cloudflare Workers + D1, plan gratuito. Nombres: `micrositio-recepcion`, `micrositio-panel` y la base `micrositio-estadisticas`.
- **Una fila por visita:** los avisos de "sigue acá" solo actualizan la hora del último aviso. La permanencia es esa hora menos la de entrada, con un tope de una hora.
- **Reloj del servidor:** la hora la pone el Worker. Los horarios se muestran en hora de Argentina.
- **Sin cookies:** el micrositio guarda dos identificadores al azar en el propio navegador (uno del visitante y otro de la visita), con nombres propios (`micrositio_est_...`).
- **Apagadas por defecto:** mientras `ENDPOINT` esté vacío en `js/estadisticas.js`, no se envía nada ni se muestra el aviso de privacidad.
- **Un solo archivo nuevo en el micrositio:** `js/estadisticas.js`, cargado al final de `index.html`. Es un script común como los demás del sitio. Si falla, la visita sigue igual.
- **No se cuentan:** `?previa`, `?cuenta`, `?editar`, los navegadores marcados con `?sinstats=1`, `localhost` y el archivo abierto con doble clic. Los enlaces `?escena=` sí cuentan.
- **Acceso al panel:** contraseña única. Se eligió en lugar de Cloudflare Access porque Access pide cargar una tarjeta para activar Zero Trust.
- **Evento:** 27 de noviembre de 2026; la visita abre a las 18:00. Las visitas se guardan desde las 17:00 del 27 (`CONTAR_DESDE` en la recepción). El filtro "Noche de los Museos" del panel cubre del 27/11 17:00 al 28/11 06:00, hora de Argentina.

## Estructura

```
estadisticas/
  schema.sql            tabla de visitas
  compartido/           validación de pedidos y contraseña/sesión del panel
  recepcion/            Worker público (wrangler.jsonc y src/)
  panel/                Worker del panel (wrangler.jsonc, src/) y public/ con la página
  LEEME.md              pasos para publicar en Cloudflare
js/estadisticas.js      script del micrositio (ENDPOINT vacío = apagadas)
tests/estadisticas*     pruebas con Node
tests/e2e_*.cjs         pruebas en navegador con Playwright
```

La carpeta `estadisticas/` no forma parte del sitio publicado: GitHub Pages la sirve como archivos sueltos, pero la página no la usa y no contiene secretos.

## Estado

### Hecho
- [x] Recepción: valida identificadores, tamaño y origen; no guarda IP ni ciudad; un aviso cada 5 s como máximo por visita.
- [x] Script del micrositio, apagado hasta configurar la dirección, con las exclusiones de arriba y aviso de privacidad en la portada.
- [x] Panel: ingresos, visitantes únicos, permanencia mediana y promedio, porcentaje de más de un minuto, hora pico, gráficos por hora, día, tramo de permanencia, provincia, país y mapa de calor; CSV; informe imprimible; conectados ahora.
- [x] Pruebas automáticas de la recepción, el login, el script y el panel, y recorrido completo del sitio en navegador sin errores ni archivos faltantes.

### Falta (lo hace el equipo, ver `estadisticas/LEEME.md`)
- [x] Cuenta de Cloudflare, base `micrositio-estadisticas` y los dos Workers, publicados desde la rama `pruebas`.
- [x] Panel con contraseña (`micrositio-panel.segundoricardo.workers.dev`).
- [ ] Cargar el secreto `PANEL_CLAVE` en Cloudflare (lo hace el equipo).
- [x] Rama unida a `pruebas` y dirección de la recepción en `js/estadisticas.js`: `https://micrositio-recepcion.segundoricardo.workers.dev/api/e`.
- [ ] Probar desde dos celulares (datos móviles y wifi) y con una VPN, y comparar con el panel.
- [ ] Comprobar que un pedido al panel sin sesión es rechazado.
- [ ] Marcar los equipos de prueba con `?sinstats=1`.
- [x] Base en cero (25/11) y conteo a partir del 27/11 17:00, sin fecha de cierre.
- [x] Participantes del sorteo guardados en la tabla `participantes`, con lista, CSV y sorteo en el panel.
- [ ] Al terminar el evento, descargar un CSV de respaldo y decidir cuánto tiempo se guardan los datos.

## Fuera de alcance

- Otros proyectos, como la app de la vitrina.
- En las estadísticas de visitas: qué salas u objetos se miran, dispositivo, ciudad y cualquier dato personal. Los únicos datos personales son los que cada participante deja voluntariamente en el formulario del sorteo.
- Cookies o herramientas de seguimiento de otras empresas.
- Seguimiento de personas entre dispositivos.
