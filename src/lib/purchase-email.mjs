import {money} from '../config/commerce.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]);

// Called only after the signed webhook has verified the paid Checkout and plan.
// Amounts are the actual Stripe payment, never an estimate of the customer's tax.
export function purchaseEmail({session,plan,cycle,portalUrl,replyTo}) {
 const product=plan.id==='planner'?'Planner':`TransGest ${plan.name}`;
 const period=cycle==='annual'?'Anual':'Mensual';
 const total=session.amount_total,tax=session.total_details?.amount_tax;
 if(!Number.isSafeInteger(total)||total<0)throw new Error('Invalid paid amount');
 const rows=[['Producto',product],['Periodicidad',period]];
 if(Number.isSafeInteger(tax)&&tax>=0&&tax<=total)rows.push(['Importe sin impuestos',money(total-tax)],['IVA / impuestos pagados',money(tax)]);
 rows.push(['Total pagado (impuestos incluidos)',money(total)],['Implantación estándar','Incluida']);
 const next='Contactaremos contigo para coordinar la implantación y preparar los accesos. Si ya tienes una cuenta, coordinaremos la puesta en marcha contigo.';
 const extras='Las integraciones y los trabajos especiales se realizan bajo presupuesto.';
 const subject=`Gracias por tu compra · ${product}`;
 const text=`Gracias por confiar en ${product}.\n\nHemos recibido tu pago correctamente.\n\n${rows.map(([label,value])=>`${label}: ${value}`).join('\n')}\n\n${next}\n${extras}\n\nConsulta tus facturas y gestiona tu suscripción: ${portalUrl}\n\nSi necesitas ayuda, responde a este correo o escribe a ${replyTo}.\n\nReferencia de pago: ${session.id}\nGauna Software · https://gauna.es`;
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#f2f5f3;color:#16382d;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:600px;border-collapse:collapse;background:#fff"><tr><td style="padding:28px 24px;border-bottom:4px solid #dba343">
<p style="margin:0 0 18px;font-size:14px">Gauna Software</p><img src="https://gauna.es/logo-transgest.png" alt="TransGest" width="180" style="display:block;width:180px;max-width:100%;height:auto"></td></tr>
<tr><td style="padding:28px 24px"><h1 style="margin:0 0 18px;font-size:28px;line-height:1.25">Gracias por tu compra.</h1>
<p style="font-size:16px;line-height:1.6">Gracias por confiar en ${escape(product)}. Hemos recibido tu pago correctamente.</p>
<table width="100%" style="border-collapse:collapse;table-layout:fixed;font-size:14px;line-height:1.5">${rows.map(([label,value])=>`<tr><th scope="row" align="left" style="width:58%;padding:12px 10px 12px 0;border-bottom:1px solid #dfe7e2;vertical-align:top;font-weight:400;overflow-wrap:anywhere">${escape(label)}</th><td align="right" style="padding:12px 0;border-bottom:1px solid #dfe7e2;vertical-align:top;font-weight:700;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join('')}</table>
<h2 style="margin:28px 0 10px;font-size:19px">¿Qué ocurre ahora?</h2><p style="font-size:15px;line-height:1.6">${next}</p><p style="font-size:14px;line-height:1.6">${extras}</p>
<p style="margin:26px 0"><a href="${escape(portalUrl)}" style="display:inline-block;max-width:100%;box-sizing:border-box;padding:14px 18px;background:#153e2e;color:#fff;text-decoration:none;border-radius:5px;font-size:15px;line-height:1.5">Ver facturas y gestionar suscripción</a></p>
<p style="font-size:14px;line-height:1.6">Si necesitas ayuda, responde a este correo o escribe a <a href="mailto:${escape(replyTo)}" style="color:#175440">${escape(replyTo)}</a>.</p>
<p style="font-size:12px;line-height:1.6;color:#65786f;overflow-wrap:anywhere;word-break:break-all">Referencia de pago: ${escape(session.id)}</p></td></tr>
<tr><td style="padding:20px 24px;background:#f7f9f7;font-size:12px;line-height:1.6;color:#65786f">Confirmación de la compra realizada en gauna.es. Este correo no te suscribe a comunicaciones publicitarias.<br><a href="https://gauna.es/politica-privacidad/" style="color:#175440">Privacidad</a> · Gauna Software</td></tr></table>
</td></tr></table></body></html>`;
 return {subject,text,html,reply_to:replyTo};
}
