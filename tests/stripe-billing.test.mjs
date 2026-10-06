import {test} from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {paymentHandlers} from '../src/lib/stripe-payments.mjs';
import {commercePlans,stripePrice,integrationPrice} from '../src/config/commerce.mjs';
const secret='whsec_TEST_ONLY_NOT_REAL';
const env={STRIPE_SECRET_KEY:'rk_test_TEST_ONLY_NOT_REAL',STRIPE_WEBHOOK_SECRET:secret};
const signer=new Stripe('sk_test_TEST_ONLY');
function fixture({plan=commercePlans[0],cycle='monthly'}={}){
 const metadata={source:'gauna-website',plan:plan.id,billing:cycle};
 const subscription={id:'sub_fixture',customer:'cus_fixture',status:'active',metadata:{...metadata},items:{data:[{quantity:1,price:{id:stripePrice(env,plan.id,cycle)},current_period_end:1800000000}]}};
 const invoice={id:'in_fixture',parent:{type:'subscription_details',subscription_details:{subscription:subscription.id}},customer:subscription.customer,currency:'eur',status:'paid',billing_reason:'subscription_cycle',amount_paid:plan[cycle],amount_remaining:0,attempt_count:1,metadata:{}};
 const session={id:'cs_test_fixture',subscription:subscription.id,customer:subscription.customer,customer_details:{email:'test@example.com'},currency:'eur',metadata:{...metadata},status:'complete',payment_status:'paid',amount_total:plan[cycle]+plan.integration};
 const delivered=new Map(),attempts=[],reads=[];
 const state={failMerchant:false,failInvoiceUpdate:false};
 const stripe={webhooks:signer.webhooks,
  subscriptions:{retrieve:async id=>{reads.push(['subscription',id]);return structuredClone(subscription);},update:async(id,data)=>Object.assign(subscription.metadata,data.metadata)},
  invoices:{retrieve:async id=>{reads.push(['invoice',id]);return structuredClone(invoice);},update:async(id,data)=>{if(state.failInvoiceUpdate)throw new Error('Mock write failure');Object.assign(invoice.metadata,data.metadata);}},
  customers:{retrieve:async id=>{reads.push(['customer',id]);return{id,email:'test@example.com'};}},
  checkout:{sessions:{retrieve:async()=>structuredClone(session),list:async()=>({data:[structuredClone(session)]}),listLineItems:async()=>({data:[{quantity:1,price:{id:stripePrice(env,plan.id,cycle)}},...(plan.integration?[{quantity:1,price:{id:integrationPrice(env)}}]:[])]}),update:async(id,data)=>Object.assign(session.metadata,data.metadata)}},
 };
 const handler=paymentHandlers({env,stripe,sendEmail:async message=>{
  attempts.push(message);if(state.failMerchant&&message.to[0]==='hola@gauna.es')throw new Error('Mock delivery failure');
  if(delivered.has(message.idempotencyKey))assert.deepEqual(message,delivered.get(message.idempotencyKey),'Provider retries keep the same message');
  else delivered.set(message.idempotencyKey,message);
 }});
 const webhook=async(type,options={})=>{
  const payload=JSON.stringify({id:options.eventId||'evt_fixture',type,livemode:options.live??false,...(options.account?{account:options.account}:{}),data:{object:{id:type.startsWith('invoice.')?invoice.id:type.startsWith('customer.subscription.')?subscription.id:session.id,...options.payload}}});
  const signature=options.unsigned?'invalid':signer.webhooks.generateTestHeaderString({payload,secret});
  return handler.webhook(new Request('https://gauna.es/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload}));
 };
 return{subscription,invoice,session,delivered,attempts,reads,state,webhook};
}

test('monthly and annual renewals resolve the real subscription and notify without charging implantation',async()=>{
 for(const plan of commercePlans)for(const cycle of ['monthly','annual']){
  const f=fixture({plan,cycle});assert.equal((await f.webhook('invoice.paid')).status,200);
  assert.deepEqual(f.reads.slice(0,2),[['invoice','in_fixture'],['subscription','sub_fixture']]);
  assert.equal(f.delivered.size,2);assert.ok([...f.delivered.values()][0].subject.includes('Renovación pagada'));
  assert.equal(f.invoice.metadata.gauna_billing_notice,'paid');
  assert.equal((await f.webhook('invoice.paid',{eventId:'evt_duplicate'})).status,200);assert.equal(f.delivered.size,2);
 }
});
test('failed payment and authentication notices are retryable, deduplicated and never grant access',async()=>{
 for(const type of ['invoice.payment_failed','invoice.payment_action_required']){
  const f=fixture();f.invoice.status='open';f.invoice.amount_remaining=16900;f.subscription.status='past_due';
  assert.equal((await f.webhook(type)).status,200);assert.equal(f.delivered.size,2);
  assert.ok([...f.delivered.values()][0].subject.includes('Pago pendiente'));assert.equal(f.session.metadata.gauna_notified,undefined);
  await f.webhook(type);assert.equal(f.delivered.size,2);
  f.invoice.attempt_count=2;await f.webhook(type);assert.equal(f.delivered.size,4);
 }
});
test('late failure after a successful invoice cannot report the paid invoice as unpaid',async()=>{
 const f=fixture();await f.webhook('invoice.paid');const reads=f.reads.length;
 assert.equal((await f.webhook('invoice.payment_failed',{payload:{status:'open'}})).status,200);assert.equal(f.delivered.size,2);assert.ok(f.reads.length>reads);
});
test('initial invoice and Checkout events share one receipt in either event order',async()=>{
 for(const order of [['invoice.paid','checkout.session.completed'],['checkout.session.completed','invoice.paid']]){
  const f=fixture();f.invoice.billing_reason='subscription_create';
  for(const type of order)assert.equal((await f.webhook(type)).status,200);
  assert.equal(f.delivered.size,2);assert.equal(f.session.metadata.gauna_notified,'yes');assert.equal(f.invoice.metadata.gauna_billing_notice,'paid');
 }
});
test('a paid initial invoice waits for a complete Checkout before fulfilling',async()=>{
 const f=fixture();f.invoice.billing_reason='subscription_create';f.session.status='open';f.session.payment_status='unpaid';
 assert.equal((await f.webhook('invoice.paid')).status,500);assert.equal(f.delivered.size,0);assert.deepEqual(f.invoice.metadata,{});
});
test('subscription cancellation, cancellation scheduling and pauses use current Stripe state',async()=>{
 const f=fixture();await f.webhook('customer.subscription.created');assert.equal(f.delivered.size,0);
 f.subscription.cancel_at_period_end=true;await f.webhook('customer.subscription.updated');assert.equal(f.delivered.size,1);
 f.subscription.status='canceled';await f.webhook('customer.subscription.deleted');assert.equal(f.delivered.size,2);
 await f.webhook('customer.subscription.updated',{payload:{status:'active'}});assert.equal(f.delivered.size,2,'An older payload cannot restore an active state');
 f.subscription.status='paused';await f.webhook('customer.subscription.paused');assert.equal(f.delivered.size,3);
 assert.equal(f.session.metadata.gauna_notified,undefined);
});
test('metadata writes caused by the handler do not create recursive notifications',async()=>{
 const f=fixture();f.subscription.status='past_due';await f.webhook('customer.subscription.updated');
 await f.webhook('customer.subscription.updated',{eventId:'evt_metadata_write'});assert.equal(f.delivered.size,1);
});
test('returning to a previous subscription state still sends a new notification',async()=>{
 const f=fixture();await f.webhook('customer.subscription.created');
 for(const status of ['past_due','active','past_due']){f.subscription.status=status;await f.webhook('customer.subscription.updated');}
 assert.equal(f.delivered.size,3);assert.equal(f.subscription.metadata.gauna_billing_revision,'4');
});
test('partial email or metadata failures retry without duplicate customer delivery',async()=>{
 for(const failure of ['failMerchant','failInvoiceUpdate']){
  const f=fixture();f.state[failure]=true;assert.equal((await f.webhook('invoice.paid')).status,500);assert.deepEqual(f.invoice.metadata,{});
  f.state[failure]=false;assert.equal((await f.webhook('invoice.paid')).status,200);assert.equal(f.delivered.size,2);assert.equal(f.invoice.metadata.gauna_billing_notice,'paid');
 }
});
test('signed events from another environment/account and unsigned events are rejected before reads',async()=>{
 for(const options of [{live:true},{account:'acct_other'},{unsigned:true}]){
  const f=fixture();assert.equal((await f.webhook('invoice.paid',options)).status,400);assert.equal(f.reads.length,0);assert.equal(f.delivered.size,0);
 }
});
test('unrelated or mismatched subscription/customer cannot trigger website fulfillment',async()=>{
 const unrelated=fixture();unrelated.subscription.metadata.source='other';assert.equal((await unrelated.webhook('invoice.paid')).status,200);assert.equal(unrelated.delivered.size,0);
 for(const change of ['price','customer','currency']){
  const f=fixture();if(change==='price')f.subscription.items.data[0].price.id='price_other';else f.invoice[change]=change==='customer'?'cus_other':'usd';
  assert.equal((await f.webhook('invoice.paid')).status,500);assert.equal(f.delivered.size,0);
 }
});
test('asynchronous payment failures notify once and never mark a payment as received',async()=>{
 const f=fixture();f.session.payment_status='unpaid';await f.webhook('checkout.session.async_payment_failed');await f.webhook('checkout.session.async_payment_failed');
 assert.equal(f.delivered.size,2);assert.equal(f.session.metadata.gauna_failure_notified,'yes');assert.equal(f.session.metadata.gauna_notified,undefined);
});
