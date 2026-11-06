/* =====================================================================
   Datos del recorrido. Es el único archivo que hace falta editar para
   cambiar textos, nombres de salas o el contenido de cada ficha.

   escenas      cada foto del recorrido (entrada, hall, salas y sus alas)
   puntos       lo que se puede tocar dentro de una escena
                tipo "ir"      lleva a otra escena (flecha con nombre)
                tipo "objeto"  abre una ficha y cuenta para el sorteo
                tipo "info"    abre una ficha pero no cuenta para el sorteo
   x, y         posición del punto sobre la foto, en % (0 a 100)
   direccion    hacia dónde apunta una flecha: adelante, izquierda, derecha o atras
   destino      escena a la que lleva una flecha ("entrada" vuelve a la puerta)
   ficha.tipo   "foto", "infografia", "video" o "texto"
   ficha.media  foto o infografia: {"src": "images/fichas/archivo.jpg", "alt": "descripción"}
                (con {"recorte": true} se muestra un acercamiento de la propia escena)
                video: {"youtube": "ID_DEL_VIDEO"} o {"mp4": "images/fichas/video.mp4"}
   sorteo.endpoint  dirección que recibe los datos del formulario (ver README)
   intro        pantalla de bienvenida: segundos que permanece, indicaciones y botón
   sonido       archivos de audio, volúmenes (0 a 1) y texto de créditos que se muestra al pie

   Para mover los puntos con el mouse: abrí el sitio con ?editar=1 al final
   de la dirección, acomodalos y usá "Copiar datos". Pegá el resultado acá.
   ===================================================================== */
window.MUESTRA = {
  "evento": {
    "nombre": "La Noche de los Museos",
    "subtitulo": "Visita virtual a la muestra del CRILAR",
    "institucion": "CRILAR"
  },
  "intro": {
    "segundos": 9,
    "indicaciones": [
      "Abrí la puerta y elegí una sala tocando su cartel.",
      "En las salas, mové la linterna con el mouse o con el dedo para descubrir los objetos.",
      "Tocá los puntos dorados para ver la ficha de cada objeto.",
      "Arrastrá la foto para mirar hacia los costados."
    ],
    "sonido": "Para vivir la visita completa, activá el sonido de tu dispositivo.",
    "boton": "Comenzar la visita"
  },
  "sonido": {
    "musica": "sounds/ambiente-museo.mp3",
    "pasos": "sounds/pasos.mp3",
    "volumenMusica": 0.7,
    "volumenPasos": 0.95,
    "creditos": "Música: “Museums”, de Silent Partner. Biblioteca de audio de YouTube."
  },
  "inicio": "entrada",
  "sorteo": {
    "endpoint": "",
    "bases": "",
    "titulo": "Participá del sorteo",
    "gracias": "Ya estás participando. ¡Mucha suerte!"
  },
  "escenas": {
    "entrada": {
      "tipo": "puerta",
      "titulo": "Entrada",
      "imagen": {
        "src": "images/escenas/Entrada.jpeg",
        "w": 1600,
        "h": 1200
      },
      "puerta": {
        "x": 50,
        "y": 60
      },
      "siguiente": "hall"
    },
    "hall": {
      "tipo": "panorama",
      "titulo": "Hall principal",
      "corto": "Hall",
      "luz": true,
      "padre": null,
      "imagen": {
        "src": "images/escenas/hall-panoramica.jpg",
        "w": 4096,
        "h": 2199
      },
      "puntos": [
        {
          "id": "ir-sala1",
          "tipo": "ir",
          "x": 40.1,
          "y": 37.5,
          "compacto": true,
          "destino": "sala1",
          "direccion": "izquierda",
          "titulo": "Sala 1",
          "detalle": "Paleontología"
        },
        {
          "id": "ir-sala2",
          "tipo": "ir",
          "x": 67.8,
          "y": 38.6,
          "compacto": true,
          "destino": "sala2",
          "direccion": "derecha",
          "titulo": "Sala 2",
          "detalle": "Entomología, Botánica, Geociencias y más"
        },
        {
          "id": "ir-auditorio",
          "tipo": "entrar",
          "x": 53.3,
          "y": 50.4,
          "destino": "auditorio",
          "titulo": "el auditorio"
        },
        {
          "id": "dino-hall",
          "tipo": "info",
          "x": 19.2,
          "y": 59.3,
          "titulo": "Dinosaurio",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Dinosaurio del hall",
            "tipo": "foto",
            "media": {
              "recorte": true,
              "alt": "Detalle del dinosaurio del hall"
            },
            "texto": "Texto de ejemplo. Acá va la descripción del dinosaurio: qué especie representa, de dónde viene y por qué está en el hall.",
            "credito": ""
          }
        },
        {
          "id": "mesa-hall",
          "tipo": "objeto",
          "x": 8.6,
          "y": 79.6,
          "titulo": "Mapa de La Rioja en 3D",
          "ficha": {
            "titulo": "Rompecabezas de La Rioja",
            "tipo": "juego",
            "juego": {
              "texto": "Modelo de Elevación de la Provincia de La Rioja, reproducido en impresión 3D. Cada pieza del rompecabezas corresponde a los departamentos de la provincia."
            }
          }
        },
        {
          "id": "vitrina-hall",
          "tipo": "info",
          "x": 90.6,
          "y": 47.1,
          "titulo": "Estante de reconocimientos",
          "ficha": {
            "area": "Institucional",
            "titulo": "Estante de reconocimientos",
            "tipo": "foto",
            "media": {
              "recorte": true,
              "alt": "Estante con placas y reconocimientos del instituto"
            },
            "texto": "Texto de ejemplo. Acá va la descripción de lo que se exhibe en este estante.",
            "credito": ""
          }
        },
        {
          "id": "ir-entrada",
          "tipo": "ir",
          "x": 50,
          "y": 91,
          "destino": "entrada",
          "direccion": "atras",
          "titulo": "Entrada"
        }
      ]
    },
    "sala1": {
      "tipo": "recorrido",
      "titulo": "Sala 1, Paleontología",
      "corto": "Sala 1",
      "luz": true,
      "padre": "hall",
      "puntos": [
        {
          "id": "s1L-1",
          "tipo": "objeto",
          "x": 48.7,
          "y": 51.2,
          "titulo": "Fósil de ejemplo 1",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 1",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de fósil de ejemplo 1"
            }
          },
          "parada": 0
        },
        {
          "id": "s1L-2",
          "tipo": "objeto",
          "x": 61.9,
          "y": 49.3,
          "titulo": "Fósil de ejemplo 2",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 2",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          },
          "parada": 1
        },
        {
          "id": "s1L-3",
          "tipo": "objeto",
          "x": 50.2,
          "y": 51.7,
          "titulo": "Fósil de ejemplo 3",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 3",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del video.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          },
          "parada": 2
        },
        {
          "id": "s1R-1",
          "tipo": "objeto",
          "x": 41.2,
          "y": 50.2,
          "titulo": "Fósil de ejemplo 1",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 1",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de fósil de ejemplo 1"
            }
          },
          "parada": 3
        },
        {
          "id": "s1R-2",
          "tipo": "objeto",
          "x": 53.6,
          "y": 55.9,
          "titulo": "Fósil de ejemplo 2",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 2",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          },
          "parada": 4
        },
        {
          "id": "s1R-3",
          "tipo": "objeto",
          "x": 38.6,
          "y": 46.1,
          "titulo": "Fósil de ejemplo 3",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 3",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          },
          "parada": 5
        },
        {
          "id": "s1R-4",
          "tipo": "objeto",
          "x": 38.5,
          "y": 56.2,
          "titulo": "Fósil de ejemplo 4",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 4",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de fósil de ejemplo 1"
            }
          },
          "parada": 6
        }
      ],
      "video": {
        "src720": "videos/sala1-720.mp4",
        "src480": "videos/sala1-480.mp4",
        "w": 720,
        "h": 1280,
        "velocidad": 1,
        "duracion": 21.33
      },
      "paradas": [0.0, 4.9667, 7.9667, 11.6333, 14.3, 18.4, 21.3333]
    },
    "sala2": {
      "tipo": "recorrido",
      "titulo": "Sala 2",
      "corto": "Sala 2",
      "luz": true,
      "padre": "hall",
      "puntos": [
        {
          "id": "s2L-1",
          "tipo": "objeto",
          "x": 55.4,
          "y": 40.8,
          "titulo": "Descubre qué es la Entomología",
          "ficha": {
            "area": "Entomología",
            "titulo": "Descubre qué es la Entomología",
            "tipo": "video",
            "texto": "Te invitamos a conocer qué estudian los entomólogos y la importancia de sus investigaciones.",
            "credito": "",
            "media": {
              "mp4": "videos/entomo-720.mp4",
              "poster": "videos/entomo-poster.jpg"
            }
          },
          "parada": 0
        },
        {
          "id": "s2L-3",
          "tipo": "objeto",
          "x": 54.3,
          "y": 52.3,
          "titulo": "Objeto de ejemplo de Entomología médica",
          "ficha": {
            "area": "Entomología médica",
            "titulo": "Objeto de ejemplo de Entomología médica",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          },
          "parada": 2
        },
        {
          "id": "s2L-2",
          "tipo": "objeto",
          "x": 63.5,
          "y": 59.3,
          "titulo": "Tablero de luz",
          "ficha": {
            "area": "Tablero de luz",
            "titulo": "¿Cuánto sabes sobre los insectos?",
            "tipo": "tablero",
            "tablero": {
              "fondo": "images/tablero/fondo.webp",
              "barra": "La luz se enciende cuando unís las preguntas con las respuestas correctas. ¡Éxitos!",
              "ayuda": "Elegí una pregunta y después su respuesta.",
              "final": "¡Completaste el tablero! Las 11 luces están encendidas.",
              "pares": [
                { "pt": "¿Cuántas especies de insectos se describieron hasta hoy?", "p": "Los insectos son el grupo de animales más diversos del mundo. ¿Cuántas especies fueron descriptas hasta el momento?", "pc": [159.5, 274.5, 247.0], "r": "1.000.000", "rc": [1240.5, 775.5, 149] },
                { "pt": "¿Cuántos cm de ala a ala mide la mariposa más grande del mundo?", "p": "Las mariposas, además de ser bellas, pueden llegar a ser de gran tamaño. ¿Cuántos centímetros de una punta a la otra de las alas mide la mariposa más grande del mundo?", "pc": [510.0, 422.0, 300.0], "r": "29,8", "rc": [1038, 1264, 150] },
                { "pt": "¿Cuántas veces pica una abeja?", "p": "Las abejas son conocidas por la rica miel que producen, pero también por sus picaduras. ¿Cuántas veces puede picarnos una abeja?", "pc": [224.0, 518.0, 262.0], "r": "1 sola vez", "rc": [1455, 253, 150] },
                { "pt": "¿Cuántas veces pica una avispa?", "p": "Una avispa también podría picarnos. ¿Cuántas veces podría picarnos?", "pc": [419.5, 663.5, 195.0], "r": "Más de 1 vez", "rc": [1460, 1269, 150] },
                { "pt": "¿Cuántos cm de altura alcanza una pulga en un salto vertical?", "p": "Las pulgas pueden llegar a ser molestas, pero... ¡no dejan de ser asombrosas! Pueden saltar hasta 130 veces su propia altura. ¿Cuántos centímetros de altura alcanzan en un salto vertical?", "pc": [198.0, 808.0, 294.0], "r": "20", "rc": [1038, 308, 150] },
                { "pt": "¿Cuántos cm mide el bicho palo?", "p": "El insecto más grande del mundo es un bicho palo. ¡Es realmente grande! ¿Cuántos centímetros mide?", "pc": [509.0, 868.0, 216.0], "r": "62,4", "rc": [1455, 572, 150] },
                { "pt": "¿Cuántos km por día se desplazan las mariposas monarca?", "p": "Las mariposas monarcas vuelan gran cantidad de kilómetros entre Canadá y México para reproducirse. ¿Cuántos km se desplazan por día?", "pc": [314.5, 1066.5, 249.0], "r": "120", "rc": [1038, 1001, 150] },
                { "pt": "¿Cuántos billones de hormigas hay en el mundo?", "p": "Se calcula que todas las hormigas del mundo pesan una quinta parte de todos los humanos juntos. ¿Cuántos billones de hormigas se calcula que hay en el mundo?", "pc": [566.0, 1130.0, 256.0], "r": "20.000", "rc": [1038, 619, 150] },
                { "pt": "¿Desde hace cuántos años existen los insectos?", "p": "¡Los insectos aparecieron en la faz de la Tierra antes que los dinosaurios! ¿A cuántos millones de años se remonta su origen?", "pc": [133.5, 1245.5, 237.0], "r": "480.000.000", "rc": [1298.5, 1099.5, 173] },
                { "pt": "¿Cómo se llaman las alas duras del escarabajo?", "p": "Las alas anteriores de los escarabajos son duras y no se usan para el vuelo. ¿Cómo se llama este tipo de alas?", "pc": [348.5, 1374.5, 223.0], "r": "Élitros", "rc": [1237.5, 429.5, 149] },
                { "pt": "¿Cómo se llaman las alas reducidas de moscas y mosquitos?", "p": "Las alas posteriores de las moscas y mosquitos se reducen a unas estructuras en forma de clava. ¿Cómo se llaman estas estructuras?", "pc": [595.0, 1385.0, 236.0], "r": "Halterios", "rc": [1455, 885, 150] }
              ],
              "ordenRespuestas": [9, 2, 5, 7, 4, 0, 10, 6, 8, 1, 3]
            }
          },
          "parada": 1
        },
        {
          "id": "s2L-4",
          "tipo": "objeto",
          "x": 40.4,
          "y": 40.3,
          "titulo": "Objeto de ejemplo de Micología",
          "ficha": {
            "area": "Micología",
            "titulo": "Objeto de ejemplo de Micología",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de micología"
            }
          },
          "parada": 3
        },
        {
          "id": "s2L-5",
          "tipo": "objeto",
          "x": 50.8,
          "y": 41.2,
          "titulo": "Objeto de ejemplo de Cronobiología",
          "ficha": {
            "area": "Cronobiología",
            "titulo": "Objeto de ejemplo de Cronobiología",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          },
          "parada": 4
        },
        {
          "id": "s2L-6",
          "tipo": "objeto",
          "x": 41.3,
          "y": 44.8,
          "titulo": "Objeto de ejemplo de Ecología",
          "ficha": {
            "area": "Ecología",
            "titulo": "Objeto de ejemplo de Ecología",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          },
          "parada": 5
        },
        {
          "id": "s2L-7",
          "tipo": "objeto",
          "x": 36.8,
          "y": 49.3,
          "titulo": "Objeto de ejemplo de Paleobotánica",
          "ficha": {
            "area": "Paleobotánica",
            "titulo": "Objeto de ejemplo de Paleobotánica",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de paleobotánica"
            }
          },
          "parada": 6
        },
        {
          "id": "s2R-1",
          "tipo": "objeto",
          "x": 48.3,
          "y": 56.8,
          "titulo": "Objeto de ejemplo de Botánica",
          "ficha": {
            "area": "Botánica",
            "titulo": "Objeto de ejemplo de Botánica",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de botánica"
            }
          },
          "parada": 7
        },
        {
          "id": "s2R-2",
          "tipo": "objeto",
          "x": 50.5,
          "y": 52.8,
          "titulo": "Objeto de ejemplo de Geociencias",
          "ficha": {
            "area": "Geociencias",
            "titulo": "Objeto de ejemplo de Geociencias",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          },
          "parada": 8
        },
        {
          "id": "s2R-3",
          "tipo": "objeto",
          "x": 50.0,
          "y": 53.2,
          "titulo": "Objeto de ejemplo de Entomología (2)",
          "ficha": {
            "area": "Entomología",
            "titulo": "Objeto de ejemplo de Entomología (2)",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de entomología"
            }
          },
          "parada": 9
        }
      ],
      "video": {
        "src720": "videos/sala2-720.mp4",
        "src480": "videos/sala2-480.mp4",
        "w": 720,
        "h": 1280,
        "velocidad": 1,
        "duracion": 21.87
      },
      "paradas": [0.0, 2.4333, 4.4333, 7.2667, 10.1333, 11.8333, 12.8, 16.1667, 18.7333, 21.3667]
    },
    "auditorio": {
      "tipo": "video",
      "titulo": "Auditorio",
      "corto": "Auditorio",
      "luz": false,
      "padre": "hall",
      "video": {
        "src1080": "videos/auditorio-1080-web.mp4",
        "src480": "videos/auditorio480.mp4",
        "inicio": "videos/auditorio-inicio.jpg",
        "final": "videos/auditorio-final.jpg",
        "w": 1920,
        "h": 1080,
        "duracion": 21.3,
        "pasosSeg": 10
      },
      "pantalla": {
        "x": 28.9,
        "y": 6.9,
        "w": 36.7,
        "h": 52.8,
        "youtube": "p9ovj7YuJns"
      },
      "puntos": [
        {
          "id": "ir-hall-auditorio",
          "tipo": "ir",
          "x": 50,
          "y": 86,
          "destino": "hall",
          "direccion": "atras",
          "titulo": "Hall"
        }
      ]
    }
  },
  "version": 8
};
