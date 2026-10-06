import {createHash,createHmac, timingSafeEqual} from 'node:crypto';
import {commercePlan, stripePrice, integrationPrice, paymentReady, money} from '../config/commerce.mjs';
import {stripeCatalog} from '../config/stripe-catalog.mjs';
import {billingEvents,handleBillingEvent} from './stripe-billing.mjs';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Robots-Tag':'noindex',...headers}});
const signature=(value,key)=>createHmac('sha256',key).update(value).digest('base64url');
const cookieName='tg_checkout';
export function checkoutCookie(id,key){const value=`${id}.${Date.now()+86400000}`;return `${value}.${signature(value,key)}`;}
export function ownsCheckout(request,id,key){
 const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token)return false;const parts=token.split('.');if(parts.length!==3||parts[0]!==id||Number(parts[1])<Date.now())return false;
 const expected=Buffer.from(signature(`${parts[0]}.${parts[1]}`,key)),actual=Buffer.from(parts[2]);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function validatePrice(price,amount,interval){
 if(!price.active||price.currency!=='eur'||price.unit_amount!==amount||price.tax_behavior!=='exclusive'||(interval?price.recurring?.interval!==interval||price.recurring?.interval_count!==1:Boolean(price.recurring)))throw new Error('Price configuration mismatch');
}
const requestLimits=new Map();
function rateAllowed(request){
 const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local';
 const now=Date.now();if(requestLimits.size>1000)for(const [key,item]of requestLimits)if(item.until<now)requestLimits.delete(key);
 const item=requestLimits.get(ip);if(!item||item.until<now){requestLimits.set(ip,{count:1,until:now+600000});return true;}return ++item.count<=8;
}
export function paymentHandlers({env,stripe,sendEmail,allowRequest=rateAllowed}){
 const origin='https://gauna.es';
 const fulfillCheckout=async id=>{
  const session=await stripe.checkout.sessions.retrieve(id);
  if(session.metadata?.source!=='gauna-website'||session.payment_status!=='paid'||session.status!=='complete')return false;
  if(session.metadata.gauna_notified==='yes')return true;
  const plan=commercePlan(session.metadata.plan),cycle=session.metadata.billing;
  if(!plan||!['monthly','annual'].includes(cycle)||session.currency!=='eur')throw new Error('Unexpected paid session');
  const subscription=await stripe.subscriptions.retrieve(session.subscription);
  if(subscription.status!=='active')throw new Error('Subscription not active');
  const lines=await stripe.checkout.sessions.listLineItems(session.id,{limit:10});
  const expected=[stripePrice(env,plan.id,cycle),...(plan.integration?[integrationPrice(env)]:[])].sort();
  if(lines.has_more||lines.data.some(item=>item.quantity!==1)||JSON.stringify(lines.data.map(item=>item.price?.id).sort())!==JSON.stringify(expected))throw new Error('Unexpected payment lines');
  const email=session.customer_details?.email;
  if(!email)throw new Error('Missing customer email');
  const amount=money(session.amount_total);
  const text=`Pago recibido de TransGest ${plan.name}.\nPeriodicidad: ${cycle==='annual'?'anual':'mensual'}.\nTotal pagado: ${amount}, impuestos incluidos según Stripe.\nReferencia: ${session.id}.\nContactaremos contigo para preparar la implantación y los accesos.\nConsulta tus facturas y gestiona tu suscripción: ${stripeCatalog.billingPortal}\nSi necesitas ayuda, escribe a hola@gauna.es.`;
  await sendEmail({to:[email],subject:`Pago recibido · TransGest ${plan.name}`,text,idempotencyKey:`gauna-customer-${session.id}`});
  await sendEmail({to:[env.CONTACT_TO_EMAIL||'hola@gauna.es'],subject:`Nueva contratación · TransGest ${plan.name}`,text:`${text}\nCliente: ${email}\nCliente Stripe: ${session.customer}\nSuscripción: ${session.subscription}\nRevisar y preparar la implantación.`,idempotencyKey:`gauna-merchant-${session.id}`});
  await stripe.checkout.sessions.update(session.id,{metadata:{gauna_notified:'yes'}});
  return true;
 };
 return {
  async checkout(request){
   const requestOrigin=new URL(request.url).origin;
   if(request.headers.get('origin')!==requestOrigin)return json({error:'Solicitud no válida.'},403);
   if(!allowRequest(request))return json({error:'Demasiados intentos. Espera unos minutos.'},429,{'Retry-After':'600'});
   let data;try{data=await request.json();}catch{return json({error:'Solicitud no válida.'},400);}
   const plan=commercePlan(data?.plan),cycle=data?.billing;
   if(!plan||!['monthly','annual'].includes(cycle)||data.consent!==true||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(data.requestId||'')||Object.keys(data).some(k=>!['plan','billing','consent','requestId'].includes(k)))return json({error:'Selecciona una versión y periodicidad válidas y revisa las condiciones.'},400);
   if(!paymentReady(env,plan)||!stripe)return json({error:'La contratación online todavía no está disponible. Contacta con hola@gauna.es.'},503);
   try{
    const account=await stripe.accounts.retrieve();
    if(account.id!==(env.STRIPE_ACCOUNT_ID||stripeCatalog.account)||!account.charges_enabled)throw new Error('Merchant account unavailable');
    const tax=await stripe.tax.settings.retrieve();
    if(tax.status!=='active')return json({error:'La contratación online todavía no está disponible. Contacta con hola@gauna.es.'},503);
    const registrations=await stripe.tax.registrations.list({status:'active',limit:100});
    if(!registrations.data.some(registration=>registration.country===tax.head_office?.address?.country))throw new Error('Home tax registration missing');
    const price=stripePrice(env,plan.id,cycle);
    validatePrice(await stripe.prices.retrieve(price),plan[cycle],cycle==='annual'?'year':'month');
    const line_items=[{price,quantity:1}];
    if(plan.integration){validatePrice(await stripe.prices.retrieve(integrationPrice(env)),plan.integration,null);line_items.push({price:integrationPrice(env),quantity:1});}
    const metadata={source:'gauna-website',plan:plan.id,billing:cycle,tariff:'2026-09',consent:'plan-and-renewal-reviewed'};
    const session=await stripe.checkout.sessions.create({
     ui_mode:'embedded_page',mode:'subscription',line_items,locale:'es',
     integration_identifier:'gauna-'+createHash('sha256').update(data.requestId).digest().subarray(0,8).reduce((text,byte)=>text+String.fromCharCode(97+byte%26),''),
     automatic_tax:{enabled:true},
     billing_address_collection:'required',tax_id_collection:{enabled:true},
     return_url:origin+'/transgest/contratar/resultado/?session_id={CHECKOUT_SESSION_ID}',
     metadata,subscription_data:{metadata,billing_mode:{type:'flexible'}},
    },{idempotencyKey:`gauna-${plan.id}-${cycle}-${data.requestId}`});
    if(!session.client_secret||!session.id)throw new Error('Missing checkout session');
    return json({clientSecret:session.client_secret},200,{'Set-Cookie':`${cookieName}=${checkoutCookie(session.id,env.STRIPE_WEBHOOK_SECRET)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${requestOrigin.startsWith('https:')?'; Secure':''}`});
   }catch(error){console.error('[Stripe checkout]',error?.type||error?.name||'Configuration error');return json({error:'No se ha podido abrir el pago. Inténtalo de nuevo o contacta con hola@gauna.es.'},502);}
  },
  async status(request){
   const id=new URL(request.url).searchParams.get('session_id');
   if(!/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(id||'')||!env.STRIPE_WEBHOOK_SECRET||!ownsCheckout(request,id,env.STRIPE_WEBHOOK_SECRET))return json({error:'No se puede verificar este pago desde este navegador.'},403);
   if(!stripe)return json({error:'No se puede verificar el pago en este momento.'},503);
   try{const s=await stripe.checkout.sessions.retrieve(id);if(s.metadata?.source!=='gauna-website')return json({error:'Solicitud no válida.'},403);return json({status:s.status,paymentStatus:s.payment_status,plan:s.metadata.plan});}
   catch{return json({error:'No se puede verificar el pago en este momento.'},502);}
  },
  async webhook(request){
   if(!stripe||!env.STRIPE_WEBHOOK_SECRET)return json({error:'Servicio no disponible.'},503);
   let event;
   try{event=stripe.webhooks.constructEvent(await request.text(),request.headers.get('stripe-signature')||'',env.STRIPE_WEBHOOK_SECRET);}
   catch{return json({error:'Firma no válida.'},400);}
   const mode=env.STRIPE_SECRET_KEY?.match(/^(?:sk|rk)_(live|test)_/)?.[1];
   if((mode&&event.livemode!==(mode==='live'))||(event.account&&event.account!==(env.STRIPE_ACCOUNT_ID||stripeCatalog.account)))return json({error:'Evento de otra cuenta o entorno.'},400);
   if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',...billingEvents].includes(event.type))return json({received:true});
   try{
    if(billingEvents.includes(event.type))await handleBillingEvent({event,env,stripe,sendEmail,portalUrl:stripeCatalog.billingPortal,fulfillInitial:async subscription=>{
     const sessions=await stripe.checkout.sessions.list({subscription,limit:10});
     const session=sessions.data.find(s=>s.metadata?.source==='gauna-website'&&s.status==='complete'&&s.payment_status==='paid');
     return session?fulfillCheckout(session.id):false;
    }});
    else if(event.type==='checkout.session.async_payment_failed'){
     const session=await stripe.checkout.sessions.retrieve(event.data.object.id);
     if(session.metadata?.source==='gauna-website'&&session.payment_status!=='paid'&&session.metadata.gauna_failure_notified!=='yes'){
      await sendEmail({to:[env.CONTACT_TO_EMAIL||'hola@gauna.es'],subject:'Pago fallido · TransGest',text:`El pago de la sesión ${session.id} ha fallado. No preparar los accesos sin confirmar el cobro en Stripe.`,idempotencyKey:`gauna-checkout-failed-${session.id}`});
      if(session.customer_details?.email)await sendEmail({to:[session.customer_details.email],subject:'Pago pendiente · TransGest',text:'Tu pago no se ha confirmado. Contacta con hola@gauna.es para revisar la contratación antes de repetirlo.',idempotencyKey:`gauna-checkout-failed-customer-${session.id}`});
      await stripe.checkout.sessions.update(session.id,{metadata:{gauna_failure_notified:'yes'}});
     }
    }else await fulfillCheckout(event.data.object.id);
    return json({received:true});
   }catch(error){console.error('[Stripe webhook]',error?.type||error?.name||'Delivery error');return json({error:'No se ha confirmado la entrega.'},500);}
  },
 };
}
