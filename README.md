# La Noche de los Museos: visita virtual a la muestra del CRILAR

Micrositio para recorrer la muestra del CRILAR desde el celular o la computadora. El visitante abre la puerta, pasa al hall, elige una sala y explora con una linterna. Cada objeto abre una ficha con foto, infografía o video. Al terminar el recorrido se abre el formulario del sorteo.

Es un sitio estático (HTML, CSS y JavaScript, sin instalar nada), así que funciona en GitHub Pages.

## Verlo en tu computadora

Hacé doble clic en `index.html`. Para abrir una sala directamente, agregá `?escena=sala2_L` a la dirección (los nombres de escena están en `datos/muestra.js`).

## Carpetas

```
index.html          página principal
css/estilos.css     colores, tipografías y animaciones
js/nucleo.js        escenas, linterna, puerta y barras
js/ventanas.js      fichas, mapa y sorteo
js/inicio.js        arranque y carga de fotos
js/editor.js        modo edición (solo se carga con ?editar=1)
datos/muestra.js    textos, salas, puntos y fichas: el archivo que más vas a tocar
images/escenas/     las fotos del recorrido (entrada y hall panorámico)
videos/             los videos del auditorio y de las salas 1 y 2
images/fichas/      fotos, infografías y videos de cada objeto
images/logo/        logo del CRILAR en SVG y PDF (el original, una versión a trazos y una clara)
fonts/              tipografías del sitio, con sus licencias
```

## Cambiar las fotos

Reemplazá los archivos de `images/escenas/` conservando el nombre. El sitio se adapta solo al tamaño de cada foto. Para que cargue rápido en el celular, conviene que cada panorámica mida unos 2500 px de ancho y pese menos de 500 KB.

Las salas 1 y 2 ya no usan fotos: se recorren en video (ver más abajo). Los archivos `.HEIC` del iPhone y los `.MOV` no se pueden usar en la web: hay que pasarlos a `.jpg` y `.mp4`, y los originales pesados quedan en carpetas `originales/`, que no se suben a GitHub.

## Acomodar los puntos sobre las fotos

Los puntos de partida están en posiciones aproximadas. Para ubicarlos bien:

1. Abrí `index.html?editar=1` (o, para ir directo a una sala, `index.html?editar=1&escena=sala2`).
2. Arrastrá cada punto hasta su vitrina u objeto. Con "Nuevo objeto" agregás uno tocando la foto. Con Supr quitás el que tengas seleccionado.
3. Tocá "Copiar datos", abrí `datos/muestra.js`, borrá todo y pegá.

Los cambios quedan guardados en ese navegador hasta que los pegues en el archivo. Si no querés conservarlos, usá "Descartar cambios".

## Completar las fichas

Cada objeto tiene su `ficha` en `datos/muestra.js`:

- `tipo: "foto"` con `media: {"src": "images/fichas/vitrina1.jpg", "alt": "descripción"}`. Si dejás `{"recorte": true}`, muestra un acercamiento de la propia foto de la sala.
- `tipo: "infografia"` con `media: {"src": "images/fichas/infografia1.png", "alt": "..."}`.
- `tipo: "video"` con `media: {"youtube": "ID_DEL_VIDEO"}` o `media: {"mp4": "images/fichas/video1.mp4"}`. Para videos largos conviene YouTube, porque GitHub limita el tamaño de los archivos.

Los textos que dicen "de ejemplo" son provisorios.

## Sorteo

El formulario solo se abre cuando se visitaron todos los objetos que figuran como `"tipo": "objeto"`. Los de tipo `"info"` no cuentan.

Mientras `sorteo.endpoint` esté vacío, los datos de cada participante quedan solo en el navegador de quien los cargó y vos no los recibís. Para recibirlos en una planilla de Google:

1. Creá una hoja de cálculo nueva y abrí Extensiones, Apps Script.
2. Pegá este código:

```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSheet().appendRow([new Date(), d.nombre, d.email, d.telefono, d.codigo, d.objetos]);
  return ContentService.createTextOutput('ok');
}
```

3. Elegí Implementar, Nueva implementación, tipo Aplicación web. Ejecutar como "Yo" y acceso para "Cualquier persona".
4. Copiá la dirección que te da y pegala en `sorteo.endpoint`, dentro de `datos/muestra.js`.
5. Si tenés las bases y condiciones en línea, pegá su dirección en `sorteo.bases` y el formulario enlazará el texto.

El número de recorrido (CR-XXXXXX) se calcula con los objetos visitados. Alcanza para un sorteo informal, pero no es a prueba de personas con conocimientos técnicos. Conviene revisar con el instituto qué requisitos formales tiene un sorteo y el manejo de datos personales.

## Publicar en GitHub Pages

1. Cloná el repositorio, copiá adentro el contenido de esta carpeta (reemplazá el `README.md`) y subí los cambios:

```
git clone https://github.com/Segon03/CRILAR_LNDLM.git
cd CRILAR_LNDLM
git add .
git commit -m "Primera versión del micrositio"
git push
```

2. En GitHub, entrá a Settings, Pages. En "Build and deployment" elegí "Deploy from a branch", rama `main` y carpeta `/ (root)`.
3. En uno o dos minutos el sitio queda en `https://segon03.github.io/CRILAR_LNDLM/`. Con una cuenta gratuita, el repositorio tiene que ser público.

## Salas 1 y 2: recorrido en video por tramos

- Cada sala es un video vertical (`videos/sala1-720.mp4` y `-480.mp4` para celulares con poca conexión, lo mismo para la sala 2) que se avanza con las flechas de los costados, con el teclado (← →) o deslizando el dedo.
- En `datos/muestra.js`, cada sala tiene `paradas`: los segundos del video donde se detiene el recorrido. Cada tramo equivale a un ancho de imagen, salvo los tramos continuos de `continuos` (sala 1: 00:24 a 00:29; sala 2: 00:39 a 00:44), que se reproducen de una vez y a velocidad normal.
- `velocidad` indica qué tan rápido se reproducen los tramos comunes (1,6 = un 60 % más rápido que el video original). Para cambiar un corte, editá el número de segundos en `paradas`.
- Cada punto lleva `parada`: el número de parada en la que aparece (0 es la primera). En el modo edición (`?editar=1&escena=sala1`), avanzá hasta la parada que quieras y arrastrá o agregá los puntos ahí.
- Los videos se convirtieron de HDR (iPhone) a colores normales, sin audio, a 720×1280 y 480×854.

GitHub distingue mayúsculas de minúsculas: `Hall.jpeg` y `hall.jpeg` son archivos distintos. Si reemplazás una foto, usá exactamente el mismo nombre.

## Licencias

Las tipografías IM Fell English y Atkinson Hyperlegible se distribuyen con licencia SIL Open Font License. Los textos de cada licencia están en `fonts/`.

## Pantalla de bienvenida, acercamientos y sonido

- **Bienvenida**: el logo, las indicaciones de la visita y el botón "Comenzar la visita" se quedan unos 9 segundos (o hasta que la persona toque el botón). Textos y duración en `datos/muestra.js`, bloque `intro`. Para saltarla al probar: `?sinintro=1`.
- **Acercamientos**: al abrir la puerta y al tocar el cartel de una sala, la imagen se acerca y recién después aparece la escena nueva. Si el dispositivo tiene activado "reducir movimiento", se usa un fundido simple.
- **Sonido**: música suave de ambiente (`sounds/ambiente-museo.mp3`) y pasos durante los acercamientos (`sounds/pasos.mp3`). Botón de parlante arriba a la derecha para silenciar. Volúmenes y créditos en `datos/muestra.js`, bloque `sonido`.
- **Créditos** (al pie): Música "Museums", de Silent Partner; pasos "Soggy Steps". Biblioteca de audio de YouTube. Conviene confirmar en la biblioteca si la licencia pide atribución.
- Los archivos originales sin procesar están en `sounds/originales/` y no se suben a GitHub.

### Si el navegador muestra una versión vieja
Los archivos del `index.html` llevan `?v=5` al final. Cada vez que se cambie algo importante, subir ese número (5, 6, 7…) en las seis líneas para que Edge, Chrome y Safari descarguen la versión nueva sin tener que vaciar la caché.

## Auditorio (escena con video)

- En el hall, el cartel **Auditorio** lleva a una caminata en video (`videos/auditorio-1080-web.mp4`, o `auditorio480.mp4` en celulares). Al terminar queda el último fotograma y sobre la pantalla se reproduce el video de YouTube "Ciencia es Cultura". La flecha **Hall** vuelve; mientras camina hay un botón para saltar el recorrido.
- Todo se configura en `datos/muestra.js`, escena `auditorio`: archivos de video, `pantalla` (posición y tamaño en % sobre el fotograma final) e identificador de YouTube.
- Los videos pesados originales van en `videos/originales/`, que no se sube a GitHub. GitHub no acepta archivos de más de 100 MB (25 MB si se suben desde la web), por eso se usan versiones comprimidas.
