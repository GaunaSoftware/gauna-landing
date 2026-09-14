---
title: "Resolución de 5 de junio de 2026: qué exige al DeCA"
description: "Resumen práctico de la Resolución de 5 de junio de 2026 sobre el DeCA: sistemas, PDF, QR, URL, firmas, modificaciones, agrupación de servicios y eFTI."
pubDate: 2026-09-14
author: "Manuel Gauna"
category: "normativa"
tags: ["DeCA", "Resolución 5 junio 2026", "BOE", "normativa transporte"]
---

La **Resolución de 5 de junio de 2026**, publicada en el BOE del 12 de junio de 2026, establece las características que deben reunir los sistemas y los documentos electrónicos de control administrativo exigidos en los transportes por carretera.

Es, en la práctica, la norma técnica clave para entender **cómo debe funcionar el DeCA**.

A continuación resumimos sus puntos principales.

## 1. El sistema debe generar el documento desde datos estructurados

El software debe ser capaz de transformar los datos del transporte en un fichero electrónico legible y almacenar ese fichero en un repositorio.

Esto deja fuera el enfoque de "hacer el documento en papel y escanearlo después". El fichero debe ser **nativo digital**.

## 2. El documento debe ser PDF y no superar 5 MB

La Resolución fija el formato PDF y un tamaño máximo de **5 MB**.

El fichero debe incorporar también como metadatos la fecha y hora de creación y la fecha y hora de modificación.

## 3. Cada PDF debe incorporar un QR

El DeCA debe incluir un **código QR** que contenga la dirección web única y específica del documento.

Además, el QR puede proporcionarse como archivo independiente para facilitar su uso por el conductor.

## 4. La URL debe ser única, segura y permitir descarga directa

Cada fichero almacenado necesita una URL propia.

La dirección debe utilizar **HTTPS bajo TLS 1.2 o superior** y debe permitir que, durante el transporte, los agentes habilitados puedan descargar directamente el PDF.

La norma deja claro que no es válido enviar al inspector a una página que exija credenciales, autenticación, botones de descarga o pasos manuales intermedios.

## 5. La URL no tiene que permanecer activa indefinidamente

La descarga asociada a la URL puede desactivarse **siete días naturales después de terminar el servicio**.

Esto no elimina la obligación de conservar el fichero durante el periodo legal correspondiente.

## 6. Conservación mínima de un año

Los documentos deben conservarse durante **al menos un año**.

En mercancías, cargador contractual y transportista efectivo pueden utilizar repositorios distintos. Si uno genera los ficheros, basta con que el otro pueda descargarlos durante el periodo exigido.

## 7. Qué ocurre si cambian datos durante el viaje

La Resolución contempla dos opciones.

### Modificar el fichero existente

Se incorporan los nuevos datos y el motivo del cambio, manteniendo los anteriores claramente identificados como no vigentes. La URL y el QR pueden seguir siendo los mismos.

### Crear un fichero nuevo

Se genera un nuevo PDF, con nueva URL y nuevo QR. El documento anterior debe conservarse para mantener la trazabilidad.

En cualquiera de los dos casos, el conductor debe recibir la versión actualizada.

## 8. Firma electrónica cuando el documento tenga finalidad contractual

La firma no aparece como requisito general para que el DeCA sea válido administrativamente.

Sin embargo, si el documento también se utiliza con finalidad contractual y debe incorporar firmas, la Resolución exige al menos una **firma electrónica avanzada (AdES)**. También admite firma electrónica cualificada (QES).

## 9. Se pueden agrupar varios servicios en un mismo DeCA

La Resolución permite agrupar varios servicios bajo determinadas condiciones.

En transporte público de mercancías, cargador contractual y transportista efectivo deben ser los mismos en todos los envíos agrupados. Además, debe quedar claramente identificada la información correspondiente a cada envío individual.

## 10. Otros documentos pueden servir como DeCA

La norma admite utilizar formatos empleados para otros documentos de transporte, como cartas de porte, documentación ADR, residuos o SANDACH, siempre que se incluyan todos los datos exigidos para el documento de control.

Esto abre la puerta a evitar duplicidades documentales cuando el sistema está bien diseñado.

Puedes ampliar esta cuestión en nuestro artículo sobre [DeCA y eCMR](/blog/deca-ecmr-diferencias/).

## 11. eFTI puede sustituir este mecanismo cuando sea aplicable

El apartado noveno de la Resolución prevé que, cuando los datos se gestionen y presenten conforme al esquema del Reglamento **eFTI** y sus normas de desarrollo, no sea necesario presentar el DeCA mediante el mecanismo de PDF, URL y QR descrito en la Resolución.

Este punto es especialmente importante a medio plazo porque muestra hacia dónde va la digitalización del transporte: datos estructurados e interoperables.

## Qué significa para una empresa de transporte

La consecuencia práctica es que no basta con contratar una herramienta que "haga PDFs".

Conviene comprobar que el sistema cubra:

- Generación nativa digital.
- Datos estructurados.
- Repositorio documental.
- QR.
- URL única.
- HTTPS y descarga directa.
- Conservación.
- Gestión de modificaciones.
- Trazabilidad.
- Entrega al conductor.

Nuestra [guía DeCA 2026](/deca-2026/) reúne todos estos puntos desde una perspectiva operativa y la página de [software DeCA](/software-deca/) explica cómo estamos planteando su integración dentro de TransGest.

## Texto oficial

Puedes consultar el texto completo en el [BOE: Resolución de 5 de junio de 2026](https://www.boe.es/buscar/act.php?id=BOE-A-2026-12784).

Este resumen es informativo y no sustituye la lectura de la norma oficial ni el asesoramiento aplicable a un caso concreto.
