# PDF y correo DeCA: diagnóstico de apertura y presentación

## Hechos del diagnóstico previo

El 19/09/2026, el run 35468268278 probó mediante GET el PDF de producción: respuesta normal, Accept-Encoding identity y User-Agent de iPhone. Las tres devolvieron HTTP 200 y los mismos 974002 bytes/SHA-256 del PDF aprobado. También funcionaron los rangos de inicio/final (206). No se descargó HTML por error ni se observó truncamiento.

El artefacto pdf-viewer-diagnostic incluye la captura de Chrome con interfaz: portada y miniaturas de las 28 páginas visibles. El mismo archivo se abrió en el servidor local con la política CSP antigua, una política solo PDF y sin CSP. No se reprodujo la pantalla en blanco. Por tanto, NO se atribuye el fallo a corrupción, a CSP o a caché sin evidencia y no se relajan las cabeceras globales.

## Cambio propuesto

Se distingue abrir del navegador de descargar de verdad. El parámetro fijo download=1 fuerza Content-Disposition: attachment en el PDF aprobado, conservando las cabeceras de seguridad, la URL antigua y todos los bytes del archivo. Se añade una alternativa de apertura en otra pestaña y la guía web.

El correo transaccional usa una plantilla HTML de tablas, estilos inline, texto alternativo y versión de texto plano. Emplea el PNG oficial de TransGest ya publicado mediante CID; el nombre Gauna Software se escribe como texto, sin inventar un logotipo. El PDF aprobado también se adjunta por Resend desde su URL fija. El correo interno mantiene la distinción entre entrega de recurso y contacto comercial expresamente solicitado.

No se añaden precios, suscripciones automáticas, rastreadores o promesas nuevas del producto. Las pruebas simulan Resend. La verificación visual en un navegador no acredita la apariencia en todas las versiones de Outlook/Gmail/Apple Mail ni la recepción de un correo real.

Si el titular sigue viendo el documento en blanco, solicitar navegador/aplicación, dispositivo y el archivo realmente descargado para compararlo con el PDF aprobado. No declarar resuelto su visor particular hasta comprobarlo.

Referencias de implementación: https://resend.com/docs/api-reference/emails/send-email y https://resend.com/docs/send-with-attachments; https://vercel.com/docs/project-configuration/vercel-json; https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition.
