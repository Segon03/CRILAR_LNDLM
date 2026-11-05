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
    "creditos": "Música: “Museums”, de Silent Partner. Pasos: “Soggy Steps”. Biblioteca de audio de YouTube."
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
          "x": 34,
          "y": 33,
          "destino": "sala1",
          "direccion": "izquierda",
          "titulo": "Sala 1",
          "detalle": "Paleontología"
        },
        {
          "id": "ir-sala2",
          "tipo": "ir",
          "x": 76,
          "y": 33,
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
          "x": 21.9,
          "y": 47.5,
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
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
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
        "velocidad": 3,
        "duracion": 60.39,
        "velocidadContinuo": 1.8
      },
      "paradas": [
        0.0,
        14.91,
        23.92,
        30.5,
        38.51,
        50.78,
        59.59
      ],
      "continuos": [
        [
          23.92,
          30.5
        ]
      ]
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
          "titulo": "Objeto de ejemplo de Entomología",
          "ficha": {
            "area": "Entomología",
            "titulo": "Objeto de ejemplo de Entomología",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de entomología"
            }
          },
          "parada": 0
        },
        {
          "id": "s2L-2",
          "tipo": "objeto",
          "x": 63.5,
          "y": 59.3,
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
          "parada": 1
        },
        {
          "id": "s2L-3",
          "tipo": "objeto",
          "x": 54.3,
          "y": 52.3,
          "titulo": "Objeto de ejemplo de Mastozoología",
          "ficha": {
            "area": "Mastozoología",
            "titulo": "Objeto de ejemplo de Mastozoología",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          },
          "parada": 2
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
        "velocidad": 3,
        "duracion": 61.93,
        "velocidadContinuo": 1.8
      },
      "paradas": [
        0.53,
        7.81,
        13.78,
        22.32,
        30.96,
        36.1,
        38.97,
        45.01,
        52.75,
        60.66
      ],
      "continuos": [
        [
          38.97,
          45.01
        ]
      ]
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
  "version": 5
};
