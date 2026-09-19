import { DECA_GUIDE } from '../config/deca-guide.mjs';

const SITE = 'https://gauna.es';
export const GUIDE_DOWNLOAD_URL = `${SITE}${DECA_GUIDE.path}?download=1`;
export const GUIDE_OPEN_URL = `${SITE}${DECA_GUIDE.path}?view=1`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const font = 'font-family:Arial,Helvetica,sans-serif;';
const paragraph = 'margin:0 0 18px;font-size:16px;line-height:26px;color:#485c56;';
const linkStyle = 'color:#175440;text-decoration:underline;';
const logo = () => ({ path: `${SITE}/logo-transgest.png`, filename: 'transgest.png', content_type: 'image/png', content_id: 'transgest-brand' });

function shell({ title, preheader, body, internal = false }) {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><title>${escape(title)}</title>
<style>body{margin:0!important;padding:0!important}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0;outline:none;text-decoration:none}a{color:#175440}p,h1,h2{margin-top:0}@media only screen and (max-width:480px){.outer{padding:12px 8px!important}.pad{padding-left:22px!important;padding-right:22px!important}.headline{font-size:28px!important;line-height:35px!important}.brand-image{width:138px!important}.label-column{width:105px!important}}</style>
</head><body style="${font}margin:0;padding:0;background-color:#f2f5f3;color:#16382d;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none!important;font-size:1px;color:#f2f5f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escape(preheader)}</div>
<table role="presentation" width="100%" bgcolor="#f2f5f3" style="width:100%;background-color:#f2f5f3"><tr><td class="outer" align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dfe7e2">
<tr><td class="pad" style="padding:27px 36px 25px"><table role="presentation" width="100%"><tr>
<td style="${font}font-size:14px;line-height:21px;color:#16382d;font-weight:700;vertical-align:middle">Gauna<br><span style="font-size:10px;letter-spacing:1.4px;font-weight:400;color:#65786f">SOFTWARE</span></td>
<td align="right" style="vertical-align:middle"><img class="brand-image" src="cid:transgest-brand" alt="TransGest" width="165" style="display:block;width:165px;max-width:100%;height:auto"></td>
</tr></table></td></tr>
<tr><td height="4" bgcolor="#dba343" style="height:4px;line-height:4px;font-size:1px;background-color:#dba343">&nbsp;</td></tr>
${body}
<tr><td class="pad" style="padding:24px 36px;background-color:#f7f9f7;border-top:1px solid #e2e9e5">
<p style="${font}margin:0 0 9px;font-size:13px;line-height:21px;color:#16382d;font-weight:700">Gauna Software · TransGest</p>
<p style="${font}margin:0 0 12px;font-size:12px;line-height:20px;color:#67796f">${internal ? 'Notificación interna de una solicitud realizada en gauna.es. Respeta la finalidad y las preferencias indicadas.' : 'Recibes este correo porque has solicitado la guía en gauna.es. Esta solicitud no te suscribe a una newsletter ni a comunicaciones publicitarias.'}</p>
<p style="${font}margin:0;font-size:12px;line-height:20px"><a href="mailto:hola@gauna.es" style="${linkStyle}">hola@gauna.es</a> &nbsp;·&nbsp; <a href="${SITE}/politica-privacidad/" style="${linkStyle}">Privacidad</a></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

function visitorHtml(data, wantsContact) {
  const body = `<tr><td class="pad" style="padding:34px 36px 10px">
<p style="${font}margin:0 0 14px;font-size:11px;line-height:18px;letter-spacing:1.7px;color:#42715b;font-weight:700">GUÍA TÉCNICA Y OPERATIVA</p>
<h1 class="headline" style="${font}margin:0 0 22px;font-size:34px;line-height:41px;font-weight:700;color:#16382d">Tu Guía DeCA 2026,<br>lista para consultar.</h1>
<p style="${font}${paragraph}overflow-wrap:anywhere;word-break:break-word">Hola ${escape(data.name)}.</p>
<p style="${font}${paragraph}">Aquí tienes la guía que has solicitado: requisitos, responsabilidades y comprobaciones prácticas para preparar tu operativa documental.</p>
<table role="presentation" width="100%" bgcolor="#edf3ef" style="background-color:#edf3ef;margin-bottom:24px"><tr><td style="${font}padding:18px 20px;font-size:14px;line-height:23px;color:#284b3b"><strong>Edición ${DECA_GUIDE.version} · ${DECA_GUIDE.pages} páginas · PDF</strong><br><span style="color:#61766a;font-size:12px">Revisión documental: ${DECA_GUIDE.reviewed}</span></td></tr></table>
<table role="presentation" style="margin:0 0 16px"><tr><td align="center" bgcolor="#153e2e" style="background-color:#153e2e;border-radius:5px"><a href="${GUIDE_DOWNLOAD_URL}" target="_blank" style="${font}display:inline-block;padding:16px 24px;border:1px solid #153e2e;border-radius:5px;font-size:16px;line-height:22px;color:#ffffff;text-decoration:none;font-weight:700;mso-padding-alt:0"><!--[if mso]>&nbsp;&nbsp;<![endif]-->Descargar la guía en PDF<!--[if mso]>&nbsp;&nbsp;<![endif]--></a></td></tr></table>
<p style="${font}margin:0 0 25px;font-size:14px;line-height:24px"><a href="${GUIDE_OPEN_URL}" target="_blank" style="${linkStyle}">Abrir el PDF en el navegador</a><br><a href="${SITE}/deca-2026/" style="${linkStyle}">Consultar la guía en formato web</a></p>
</td></tr>
<tr><td class="pad" style="padding:0 36px 30px">
<h2 style="${font}margin:0 0 8px;font-size:16px;line-height:24px;color:#16382d">También la tienes adjunta</h2>
<p style="${font}margin:0 0 20px;font-size:14px;line-height:23px;color:#53685b">Guarda el PDF adjunto para consultarlo sin conexión. Si el visor de tu correo no lo muestra, utiliza el botón de descarga y abre el archivo guardado.</p>
${wantsContact ? `<table role="presentation" width="100%" style="margin-bottom:22px;border-left:3px solid #dba343"><tr><td style="${font}padding:4px 0 4px 16px;font-size:14px;line-height:23px;color:#485c56"><strong style="color:#16382d">Tu solicitud de contacto</strong><br>También has solicitado que contactemos contigo sobre DeCA y TransGest. Nuestro equipo revisará tu solicitud.</td></tr></table>` : ''}
<p style="${font}margin:0 0 7px;font-size:12px;line-height:20px;color:#67796f">Si el botón no funciona, copia este enlace en tu navegador:</p>
<p style="${font}margin:0;font-size:12px;line-height:20px;overflow-wrap:anywhere;word-break:break-all"><a href="${GUIDE_DOWNLOAD_URL}" style="${linkStyle}">${GUIDE_DOWNLOAD_URL}</a></p>
</td></tr>`;
  return shell({ title: 'Tu Guía DeCA 2026 de Gauna', preheader: `Tu guía de ${DECA_GUIDE.pages} páginas, adjunta y lista para descargar.`, body });
}

function internalHtml(details, kind, wantsContact) {
  const title = kind === 'guide' ? 'Nueva solicitud de guía' : 'Nueva consulta sobre DeCA';
  const body = `<tr><td class="pad" style="padding:30px 36px 14px"><p style="${font}margin:0 0 12px;font-size:11px;line-height:18px;letter-spacing:1.6px;color:#42715b;font-weight:700">SOLICITUD WEB · DeCA</p><h1 class="headline" style="${font}margin:0 0 20px;font-size:29px;line-height:37px;color:#16382d">${title}</h1>
<table role="presentation" width="100%" bgcolor="${wantsContact ? '#edf3ef' : '#fff6e5'}"><tr><td style="${font}padding:16px;font-size:14px;line-height:23px;color:#384d3d"><strong>${wantsContact ? 'Contacto comercial solicitado' : 'Solo entrega de la guía'}</strong><br>${wantsContact ? 'La persona ha pedido expresamente que contactemos con ella.' : 'No iniciar seguimiento comercial. No es una solicitud de demo ni una suscripción.'}</td></tr></table></td></tr>
<tr><td class="pad" style="padding:0 36px 30px"><table width="100%" style="${font}width:100%;table-layout:fixed;font-size:13px;line-height:21px">${details.map(([key, value]) => `<tr><th class="label-column" scope="row" align="left" width="150" style="padding:13px 12px 13px 0;vertical-align:top;border-bottom:1px solid #e5ebe7;font-weight:600;color:#526c5d;width:150px">${escape(key)}</th><td style="padding:13px 0;vertical-align:top;border-bottom:1px solid #e5ebe7;color:#203c2d;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${escape(value)}</td></tr>`).join('')}</table><p style="${font}margin:20px 0 0;font-size:13px;line-height:21px;color:#67796f">La dirección de respuesta está configurada para contestar directamente al solicitante.</p></td></tr>`;
  return shell({ title, preheader: wantsContact ? 'Solicitud con contacto expresamente autorizado.' : 'Solicitud de recurso, sin seguimiento comercial.', body, internal: true });
}

export function buildDeCAMails(data, kind, config) {
  const wantsContact = kind === 'information' || data.contactRequested === true;
  const details = [
    ['Solicitud', kind === 'guide' ? 'Guía DeCA 2026 (no es una solicitud de demo)' : 'Información comercial DeCA / TransGest'],
    ['Nombre', data.name], ['Email', data.email], ['Empresa', data.company || 'No facilitada'],
    ['Perfil', data.profile || 'No facilitado'], ['Teléfono', data.phone || 'No facilitado'],
    ['Contacto comercial solicitado', wantsContact ? 'Sí, expresamente' : 'No. Solo entrega de la guía; no iniciar seguimiento comercial.'],
    ['Aviso de privacidad', 'Aceptado para esta solicitud. Versión del formulario: 2026-09-19'],
    ['Mensaje', data.message || 'Sin comentario'], ['Referencia', data.requestId],
  ];
  return {
    visitor: {
      from: config.from, to: [data.email], reply_to: config.to, subject: 'Tu Guía DeCA 2026 de Gauna',
      html: visitorHtml(data, wantsContact),
      text: `Hola ${data.name}.\n\nAquí tienes la Guía DeCA 2026, edición ${DECA_GUIDE.version}, ${DECA_GUIDE.pages} páginas. Revisión: ${DECA_GUIDE.reviewed}.\n\nDescargar: ${GUIDE_DOWNLOAD_URL}\nAbrir PDF: ${GUIDE_OPEN_URL}\nGuía web: ${SITE}/deca-2026/\n\nTambién encontrarás el PDF adjunto. Guarda el archivo si el visor de tu correo no lo muestra.\n\nHas solicitado esta guía en gauna.es. Esta solicitud no te suscribe a una newsletter.\n${wantsContact ? 'También has solicitado que contactemos contigo sobre DeCA y TransGest.\n' : ''}\nGauna Software · hola@gauna.es`,
      attachments: [logo(), { path: `${SITE}${DECA_GUIDE.path}`, filename: DECA_GUIDE.filename, content_type: 'application/pdf' }],
    },
    internal: {
      from: config.from, to: [config.to], reply_to: data.email,
      subject: kind === 'guide' ? 'Nueva solicitud de guía DeCA 2026' : 'Nueva solicitud de información DeCA / TransGest',
      html: internalHtml(details, kind, wantsContact),
      text: details.map(([key, value]) => `${key}: ${value}`).join('\n'),
      attachments: [logo()],
    },
  };
}
