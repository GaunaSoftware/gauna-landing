import {createHash} from 'node:crypto';
import {commercePlan,money,stripePrice} from '../config/commerce.mjs';

export const billingEvents = [
 'invoice.paid','invoice.payment_failed','invoice.payment_action_required',
 'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
 'customer.subscription.paused','customer.subscription.resumed',
 'customer.subscription.collection_paused','customer.subscription.collection_resumed',
];
const resourceId = value => typeof value==='string'?value:value?.id;

function ownedSubscription(subscription,env){
 // This marketing site has no application-account database. The ownership fallback
 // is metadata set only by our server, checked against the real subscription price.
 if(subscription.metadata?.source!=='gauna-website')return null;
 const plan=commercePlan(subscription.metadata.plan),cycle=subscription.metadata.billing;
 const items=subscription.items?.data;
 if(!plan||!['monthly','annual'].includes(cycle)||items?.length!==1||subscription.items.has_more||items[0].quantity!==1||items[0].price?.id!==stripePrice(env,plan.id,cycle))throw new Error('Unrecognized website subscription');
 return {plan,cycle,item:items[0]};
}

export async function handleBillingEvent({event,env,stripe,sendEmail,portalUrl,fulfillInitial}){
 const subscriptionEvent=event.type.startsWith('customer.subscription.');
 const invoice=subscriptionEvent?null:await stripe.invoices.retrieve(event.data.object.id);
 // Current Stripe versions expose this relationship on the invoice parent.
 const subscriptionId=subscriptionEvent?event.data.object.id:resourceId(invoice.parent?.subscription_details?.subscription);
 if(!subscriptionId)return;
 const subscription=await stripe.subscriptions.retrieve(subscriptionId);
 const owned=ownedSubscription(subscription,env);if(!owned)return;
 const {plan,cycle,item}=owned;
 const merchant=env.CONTACT_TO_EMAIL||'hola@gauna.es';
 if(subscriptionEvent){
  const state={status:subscription.status,cancelAt:subscription.cancel_at||(subscription.cancel_at_period_end?item.current_period_end:null),paused:subscription.pause_collection?.behavior||null,price:item.price.id};
  const fingerprint=createHash('sha256').update(JSON.stringify(state)).digest('hex');
  if(subscription.metadata.gauna_billing_state===fingerprint)return;
  const revision=Number(subscription.metadata.gauna_billing_revision||0)+1;
  const baseline=!subscription.metadata.gauna_billing_state;
  // Always retrieve the current object: delayed events cannot restore stale access.
  if(!baseline||state.cancelAt||['canceled','past_due','unpaid','paused','incomplete_expired'].includes(state.status)){
   const text=`Estado de TransGest ${plan.name}: ${state.status}.\nSuscripción: ${subscription.id}.\nCliente Stripe: ${resourceId(subscription.customer)}.\nPeriodicidad: ${cycle==='annual'?'anual':'mensual'}.\nCancelación programada: ${state.cancelAt?new Date(state.cancelAt*1000).toISOString():'no'}.\nCobros pausados: ${state.paused||'no'}.\nRevisar la continuidad del servicio y los accesos en TransGest. Este aviso no concede ni revoca accesos automáticamente.`;
   await sendEmail({to:[merchant],subject:`Suscripción actualizada · TransGest ${plan.name}`,text,idempotencyKey:`gauna-sub-${subscription.id}-${revision}-${fingerprint.slice(0,20)}`});
  }
  await stripe.subscriptions.update(subscription.id,{metadata:{gauna_billing_state:fingerprint,gauna_billing_revision:String(revision)}});
  return;
 }
 if(invoice.currency!=='eur'||resourceId(invoice.customer)!==resourceId(subscription.customer))throw new Error('Invoice ownership mismatch');
 const paid=invoice.status==='paid';
 if(event.type==='invoice.paid'&&!paid)return;
 if(event.type!=='invoice.paid'&&(paid||invoice.status!=='open'))return;
 const notice=event.type==='invoice.paid'?'paid':`${event.type.split('.').at(-1)}_${invoice.attempt_count||0}`;
 if(invoice.metadata?.gauna_billing_notice===notice)return;
 if(event.type==='invoice.paid'&&invoice.billing_reason==='subscription_create'){
  // Use the same Checkout receipt and deduplication regardless of event order.
  if(!await fulfillInitial(subscription.id))throw new Error('Initial checkout not yet complete');
 }else{
  const customer=await stripe.customers.retrieve(resourceId(subscription.customer));
  const email=customer.deleted?null:customer.email;
  if(!email)throw new Error('Missing billing customer email');
  const subject=paid?`Renovación pagada · TransGest ${plan.name}`:`Pago pendiente · TransGest ${plan.name}`;
  const text=paid?`Hemos recibido el pago de tu suscripción TransGest ${plan.name}: ${money(invoice.amount_paid)}, impuestos incluidos según Stripe.\nFactura: ${invoice.number||invoice.id}.`:`El pago de tu suscripción TransGest ${plan.name} está pendiente. Revisa el método de pago y completa la autenticación si se solicita.\nFactura: ${invoice.number||invoice.id}.\nImporte pendiente: ${money(invoice.amount_remaining)}.`;
  const customerText=`${text}\nConsulta tus facturas y gestiona tu suscripción: ${portalUrl}\nSi necesitas ayuda, escribe a hola@gauna.es.`;
  await sendEmail({to:[email],subject,text:customerText,idempotencyKey:`gauna-invoice-customer-${invoice.id}-${notice}`});
  await sendEmail({to:[merchant],subject,text:`${text}\nSuscripción: ${subscription.id}.\nCliente Stripe: ${resourceId(subscription.customer)}.\nEstado actual: ${subscription.status}.\nRevisar la continuidad del servicio y los accesos.`,idempotencyKey:`gauna-invoice-merchant-${invoice.id}-${notice}`});
 }
 // Persist only after both deliveries; provider idempotency protects partial retries.
 await stripe.invoices.update(invoice.id,{metadata:{gauna_billing_notice:notice}});
}
