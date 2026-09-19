# Guía: acceso después de introducir el correo

Cambio solicitado tras confirmar el funcionamiento del PDF corregido 2.1.1. No se modifica su contenido, estructura, diseño, enlaces o logos, ni el diseño del correo.

## Funcionamiento

Se retiran las opciones de descarga/apertura previa al formulario, no solo su visibilidad CSS. El formulario mantiene nombre y correo obligatorios, validación de email, CAPTCHA y consentimiento para entregar el recurso. El contacto comercial sigue siendo separado, opcional y desmarcado.

Después de validar los datos y el CAPTCHA, el servidor crea un permiso temporal firmado. El correo maquetado contiene ese enlace y adjunta el PDF a través del mismo acceso. La interfaz muestra descarga y apertura solo cuando el proveedor ha aceptado al menos uno de los dos envíos. Si ambos fallan no devuelve enlace; conserva los datos para reintentar.

Los dos nombres conocidos v2.1/v2.1.1 dejan de ser ficheros estáticos. Sin permiso válido, sus rutas GET/HEAD, también con download/view, redirigen al formulario. El contenido del PDF reside dentro de la función de servidor, no en el directorio público. No se necesita una variable nueva: se utiliza una clave derivada por HMAC con contexto propio desde RESEND_API_KEY, únicamente en servidor. Rotar esa clave revoca los permisos existentes.

El permiso dura hasta siete días desde la apertura del formulario y no contiene correo ni nombre. Es estable durante los reintentos para conservar la idempotencia. Se admiten formularios abiertos como máximo un día; después se pide recargar. Las respuestas privadas no se cachean y excluyen indexación y envío de Referer. Se mantienen HEAD y rangos de bytes para los visores Apple.

## Límites

Es un control de acceso de la web para captación, no DRM: quien reciba un enlace firmado puede compartirlo mientras siga vigente. El formato de correo se valida, pero no se añade una verificación de titularidad por doble opt-in. No se revocan archivos o adjuntos ya descargados. El repositorio es público y conserva la fuente y el historial: no se pretende convertir en confidencial un documento previamente público ni se reescribe el historial del repositorio.

## Validación

Pruebas de firmas, caducidad, manipulación, métodos, rutas antiguas, rangos, hash exacto del PDF y ausencia de ficheros públicos. El navegador comprueba que no aparece un enlace antes de enviar, y que después descarga el documento correcto usando el permiso del servidor simulado. Los proveedores de correo/CAPTCHA se simulan en CI. Producción verifica sin correo real los bloqueos anónimos y el formulario. Las pruebas PDFKit/CoreGraphics y comparación visual se mantienen sobre los mismos bytes 2.1.1.
