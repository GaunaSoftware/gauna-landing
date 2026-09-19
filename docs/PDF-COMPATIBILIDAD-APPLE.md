# Reparación estructural del PDF (revisión de archivo 2.1.1)

## Defecto reproducido, no una hipótesis de navegador

El PDF editorial 2.1, SHA-256 74b1e666580a019ab0ce76718226ea84f06b496f99fc738dc4297071368baf62, contiene en el objeto Catalog 127 la entrada inválida `/Lang es-ES`. Debe ser una cadena PDF: `/Lang (es-ES)`. El lector estricto pypdf rechaza el original con `Cannot find Root object in pdf` y `Invalid Elementary Object`. Ghostscript también rechaza su sintaxis. Por eso la comprobación anterior de HTTP/hash y la apertura permisiva en Chromium no demostraban validez estructural.

Se detectaron además tres CMaps ToUnicode con bloques de 128 entradas bfchar; se dividen en 100 y 28 sin cambiar un solo mapeo. Después de ambas correcciones, Ghostscript procesa las 28 páginas sin advertencias de reparación.

## Preservación

No se remaqueta ni rasteriza la guía. Se preservan todos los objetos, imágenes, fuentes incrustadas, contenido, enlaces, marcadores y metadatos editoriales. Solo se reparan Catalog, agrupación de tres CMaps y offsets xref. La comparación automática verifica píxeles idénticos en las 28 páginas, texto y enlaces intactos.

Edición del contenido: 2.1, revisión documental 19/09/2026. Revisión técnica de archivo: 2.1.1. No es una nueva revisión jurídica.

## Publicación reproducible

El blob original se conserva como entrada editorial en `assets/guides/deca-2026-v2.1-original.pdf`, fuera de public. `scripts/prepare-guide.mjs` solo admite ese hash y produce exactamente 977515 bytes, SHA-256 bf07fbde73bb249739f30b68ea40a1544c3be281fd641c5c6169107dc78854d3.

Los scripts predev, prestart y prebuild generan los archivos públicos antes de Astro. `scripts/verify-guide.mjs` también prepara y valida los archivos para CI. Los cambios de fuente deben realizarse conscientemente: este reparador no acepta otros PDF ni silenciosamente ignora errores.

URL nueva: `/guias/guia-deca-2026-gauna-v2.1.1.pdf`. La URL antigua v2.1 también entrega los bytes corregidos, para no romper enlaces. Los correos y adjuntos nuevos toman la configuración central y apuntan a v2.1.1. Los adjuntos ya enviados no pueden modificarse: hay que descargarlos de nuevo.

## Validación ampliada

Además de los tests de email, formularios y descarga existentes: lectura estricta pypdf, procesamiento Ghostscript, comparación de las 28 páginas y prueba nativa PDFKit/CoreGraphics en macOS. No llamar a una simulación User-Agent iPhone una prueba iOS. La confirmación en el iPhone del titular sigue siendo la comprobación final de su caso.

Fuente sobre el tipo de /Lang: https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF16

Se mantienen el correo maquetado, privacidad, CAPTCHA, precios no públicos, contenido y logos. No se debilita la CSP ni se cambia la API de envío.
