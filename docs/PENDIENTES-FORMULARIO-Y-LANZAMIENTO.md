# Guía DeCA, formularios y próximos materiales

## Decisión comercial definitiva

NO publicar precios, tarifas ni importes comerciales, ni en contenido visible ni en datos estructurados. No es una tarea pendiente. Se comparan versiones y funcionalidades; Pro Intelligence sigue como único recomendado. No reintroducir esta tarea desde planes antiguos.

## Entrega de la guía: rama feat/guia-deca-pdf-20260919

Implementación directa de /api/guia-deca, /api/informacion-deca, formulario con nombre/email obligatorios para la guía y empresa/perfil opcionales. Contacto comercial separado y opcional; ninguna suscripción automática. Avisos y correo transaccional mediante las variables Resend existentes. La petición comercial DeCA no envía la guía por defecto. No se modifican /api/contact ni los formularios demo/contacto.

La entrega no debe fusionarse hasta incorporar el PDF aprobado en public/guias/guia-deca-2026-gauna-v2.1.pdf. Su SHA-256, tamaño y 28 páginas se comprueban mediante scripts/verify-guide.mjs. No regenerar el documento, no utilizar la antigua guía DCD y no cambiar los logos. Un preview que compila no acredita la publicación de un archivo ausente.

El backend valida origen, tipos, límite de cuerpo, solicitud/consentimiento y Turnstile en servidor (fallo seguro sin claves, hostname y action). Resend recibe una clave de idempotencia estable por correo/petición. Los resultados del correo al visitante y del aviso interno son independientes; no confundir aceptación del proveedor con recepción en el buzón. El rate limit en memoria es defensa básica por instancia, no un límite distribuido; para mayor volumen debe configurarse una solución persistente.

Los formularios de newsletter simulados del componente antiguo se sustituyen por enlaces reales a la guía. Los cierres particulares de los dos artículos SEO se preservan. El PDF es público, la descarga directa no es un control de acceso ni una promesa de capturar todos los lectores.

Antes de publicar: pruebas, compilación, validación del PDF y preview. Tras publicar: HTTP 200, Content-Type application/pdf, SHA-256 del archivo descargado, CAPTCHA real y correo de prueba claramente identificado. La recepción en hola@gauna.es y en el correo del solicitante debe confirmarse; los tests simulan proveedores.

## Pendientes que requieren acceso o materiales del titular

- Capturas/grabaciones reales del programa con datos de demostración, y confirmación funcional DeCA antes de modificar cautelas comerciales.
- Cuenta de analítica, gestión del consentimiento y verificación real en su panel. El puente actual de intenciones continúa inactivo, sin proveedor ni cookies.
- Webinar: hora, duración, ponentes, plataforma y destino de inscripción.
- Validación final de los textos y proveedores de privacidad al activar cualquier nueva finalidad de tratamiento; nunca suscribir solicitantes automáticamente a publicidad.

## Cambios anteriores preservados

Recursos DeCA, comparativa, navegación al portal, imágenes para compartir, títulos y canonical. El noindex de transgest.app se aplicó en el repositorio de la app únicamente a la raíz del host: no modificarlo desde esta landing.
