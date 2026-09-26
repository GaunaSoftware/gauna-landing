---
title: "Requisitos técnicos del DeCA: PDF, QR, URL HTTPS y conservación"
description: "Resumen práctico de los requisitos técnicos del DeCA 2026: PDF nativo, QR, URL única, HTTPS, descarga directa, trazabilidad y conservación."
pubDate: 2026-09-14
author: "Gauna"
category: "normativa"
tags: ["DeCA", "PDF", "QR", "HTTPS", "transporte"]
---

La Resolución de 5 de junio de 2026 no se limita a decir que el documento de control debe ser digital. Define **cómo debe generarse, almacenarse y presentarse el DeCA**.

Esto es importante porque no cualquier PDF sirve. A continuación resumimos los requisitos técnicos que una empresa o proveedor de software debe tener en cuenta.

Para una visión general del cambio normativo, consulta antes nuestra [guía DeCA 2026](/deca-2026/).

## 1. El DeCA debe ser un PDF nativo digital

El documento debe generarse a partir de **datos estructurados contenidos en una aplicación informática**.

Eso significa que no es válido:

- Rellenar un documento en papel y escanearlo.
- Fotografiar un documento físico y guardarlo como PDF.
- Convertir una imagen del documento en PDF.

El fichero debe nacer digitalmente desde el sistema que contiene los datos del transporte.

## 2. El PDF no puede superar 5 MB

La Resolución fija un tamaño máximo de **5 MB**.

Además, la fecha y hora de creación y la fecha y hora de modificación deben estar presentes como metadatos del fichero PDF.

Esto obliga a que el sistema que genera el documento controle no solo su contenido visible, sino también determinadas propiedades técnicas del archivo.

## 3. Cada DeCA necesita un código QR

El PDF debe incluir un **código QR**.

Ese QR debe apuntar a la dirección web única y específica del documento. La norma permite, además, que el QR se facilite también como fichero independiente.

En la práctica, esto permite que el conductor pueda disponer del documento completo o simplemente del acceso que lleva al fichero correcto.

## 4. Cada documento debe tener una URL única

Cada DeCA almacenado en el repositorio debe tener su propia **URL única y específica**.

No debería existir una página genérica en la que después haya que buscar el documento. La dirección debe identificar de forma inequívoca el fichero correspondiente.

## 5. La URL debe utilizar HTTPS y TLS 1.2 o superior

La Resolución exige que la dirección utilice **HTTPS** y el estándar **TLS 1.2 o superior**.

Por tanto, una URL válida debe comenzar por `https://`.

El sistema puede aplicar medidas de seguridad, como tokens o claves de expiración, siempre que no impidan el acceso durante el tiempo que dura el servicio.

## 6. La descarga del PDF debe ser directa

Este es uno de los puntos más importantes para una inspección en carretera.

La invocación de la URL debe permitir descargar directamente el PDF. No es válido que la dirección lleve a una página que obligue a:

- Introducir usuario y contraseña.
- Identificarse.
- Pulsar un botón de descarga.
- Realizar pasos adicionales para obtener el archivo.

La lógica es sencilla: durante un control, el documento tiene que poder comprobarse de forma inmediata.

## 7. La URL puede desactivarse después del servicio

La norma permite desactivar la opción de descarga asociada a esa URL **transcurridos siete días naturales desde la finalización del servicio**.

Eso no elimina la obligación de conservar el documento. Son dos cuestiones distintas:

- La URL sirve para facilitar el acceso durante el transporte y los días inmediatamente posteriores.
- El fichero debe conservarse durante al menos un año.

## 8. El DeCA debe conservarse al menos un año

En mercancías, cargador contractual y transportista efectivo deben poder conservar o descargar los ficheros durante un mínimo de **un año**.

Pueden utilizar repositorios independientes. Si uno de ellos genera el documento, es suficiente con que el otro tenga la posibilidad de descargarlo durante el periodo exigido.

## 9. Las modificaciones deben mantener trazabilidad

Si cambia algún dato durante el transporte, la Resolución permite dos caminos.

### Modificar el mismo PDF

Se añaden los nuevos datos y el motivo del cambio, pero se conservan los anteriores señalando que ya no son válidos. La URL y el QR pueden mantenerse.

### Generar un nuevo PDF

Se crea un documento nuevo con una nueva URL y un nuevo QR. El fichero anterior debe conservarse para mantener la trazabilidad.

En ambos casos, la versión actualizada debe llegar al conductor.

## Checklist técnico DeCA 2026

Antes de considerar un sistema preparado, conviene comprobar al menos estos puntos:

- PDF generado de forma nativa digital.
- Tamaño máximo de 5 MB.
- Metadatos de creación y modificación.
- QR incorporado.
- URL única por documento.
- HTTPS con TLS 1.2 o superior.
- Descarga directa, sin login ni botones intermedios.
- Repositorio disponible durante el servicio.
- Conservación mínima de un año.
- Historial de cambios y versiones.
- Entrega de la versión vigente al conductor.

## El problema no es solo generar el PDF

Una empresa puede cumplir visualmente muchos de estos puntos y seguir teniendo una operativa ineficiente si tiene que volver a escribir manualmente los datos de cada transporte.

La mejor arquitectura es aquella en la que el DeCA se genera a partir de la información que ya existe en el servicio: cliente, cargador, transportista, origen, destino, mercancía, fecha y vehículo.

Ese es el enfoque que planteamos con el [software DeCA de TransGest](/software-deca/): vincular la documentación a los datos del servicio y reducir el trabajo duplicado.

## Fuente oficial

Los requisitos anteriores proceden de la [Resolución de 5 de junio de 2026](https://www.boe.es/buscar/act.php?id=BOE-A-2026-12784), publicada en el BOE el 12 de junio de 2026.

Este contenido es informativo y no sustituye el análisis jurídico de un caso concreto.
