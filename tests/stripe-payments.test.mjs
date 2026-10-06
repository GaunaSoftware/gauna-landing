// Exercise real handler decisions and real Stripe webhook signatures without
// network requests, live checkout sessions, customer charges or outgoing email.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {paymentHandlers} from '../src/lib/stripe-payments.mjs';
import {commercePlans,stripePrice,integrationPrice,paymentReady} from '../src/config/commerce.mjs';
import {stripeCatalog} from '../src/config/stripe-catalog.mjs';
import {readFileSync} from 'node:fs';
const secret='whsec_TEST_ONLY_NOT_A_REAL_KEY';
const env={STRIPE_PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_TEST_ONLY_NOT_A_REAL_KEY',PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_live_TEST_ONLY_NOT_A_REAL_KEY',STRIPE_WEBHOOK_SECRET:secret,RESEND_API_KEY:'TEST_ONLY'};
const signer=new Stripe('sk_test_TEST_ONLY');
const nonce='00000000-0000-4000-8000-000000000001';
function fixture(options={}){
 const calls=[],emails=[];let session;
 const stripe={accounts:{retrieve:async()=>({id:options.wrongAccount?'acct_other':stripeCatalog.account,charges_enabled:!options.disabledAccount})},tax:{settings:{retrieve:async()=>({status:options.pendingTax?'pending':'active',head_office:{address:{country:'ES'}}})},registrations:{list:async()=>({data:options.missingRegistration?[]:[{country:'ES'}]})}},prices:{retrieve:async id=>{
  for(const plan of commercePlans)for(const cycle of ['monthly','annual'])if(stripePrice(env,plan.id,cycle)===id)return{id,active:true,currency:'eur',tax_behavior:'exclusive',unit_amount:plan[cycle]+(options.wrongAmount?1:0),recurring:{interval:cycle==='annual'?'year':'month',interval_count:1}};
  return{id,active:true,currency:'eur',unit_amount:150000,tax_behavior:'exclusive',recurring:null};
 }},checkout:{sessions:{create:async(data,key)=>{calls.push({data,key});session={id:'cs_live_fixture',client_secret:'test_checkout_client_secret',metadata:data.metadata,status:'complete',payment_status:'paid',currency:'eur',customer_details:{email:'test@example.com'},customer:'cus_fixture',subscription:'sub_fixture',amount_total:201949,line_items:data.line_items};return session;},retrieve:async()=>({...session,...options.session}),listLineItems:async()=>({data:session.line_items.map(x=>({quantity:1,price:{id:x.price}}))}),update:async(id,data)=>{session.metadata={...session.metadata,...data.metadata};}}},subscriptions:{retrieve:async()=>({status:options.inactive?'incomplete':'active'})},webhooks:signer.webhooks};
 const handler=paymentHandlers({env:options.noConfig?{}:env,stripe,allowRequest:()=>!options.limited,sendEmail:async message=>{if(options.emailFailure)throw new Error('Mock delivery failure');emails.push(message);}});
 const post=(data={})=>handler.checkout(new Request('https://gauna.es/api/stripe/checkout',{method:'POST',headers:{Origin:options.crossOrigin?'https://other.example':'https://gauna.es','Content-Type':'application/json'},body:JSON.stringify({plan:'go',billing:'monthly',consent:true,requestId:nonce,...data})}));
 const webhook=async(type='checkout.session.completed',signed=true)=>{const payload=JSON.stringify({id:'evt_fixture',type,livemode:true,data:{object:{id:session.id}}});const header=signed?signer.webhooks.generateTestHeaderString({payload,secret}):'invalid';return handler.webhook(new Request('https://gauna.es/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':header},body:payload}));};
 return{handler,post,webhook,calls,emails};
}
test('approved tariff has four plans, exact annual discount and one-time implantation',()=>{
 assert.deepEqual(commercePlans.map(p=>[p.id,p.monthly,p.annual,p.integration]),[['go',16900,172380,150000],['pro',34900,355980,150000],['intelligence',47900,488580,0],['planner',65900,672180,150000]]);
 for(const p of commercePlans)assert.equal(p.annual,p.monthly*12*.85);
 assert.equal(paymentReady({...env,PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_wrong_mode'},commercePlans[0]),false);
});
test('Stripe content policy is confined to checkout and keeps the original protections',()=>{
 const rules=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')).headers;
 const base=rules[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.ok(!base.includes('stripe.com'));
 const checkout=rules.find(rule=>rule.source==='/transgest/contratar/(.*)');
 const policy=checkout.headers.find(h=>h.key==='Content-Security-Policy').value;
 for(const directive of base.split('; ')){
  const name=directive.split(' ')[0],updated=policy.split('; ').find(value=>value.split(' ')[0]===name);
  for(const token of directive.split(' '))assert.ok(updated.split(' ').includes(token),directive);
 }
 for(const domain of ['https://js.stripe.com','https://checkout.stripe.com','https://hooks.stripe.com'])assert.ok(policy.includes(domain));
 assert.ok(checkout.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
});
test('all eight subscriptions use server-side price IDs; initial integration never recurs',async()=>{
 for(const plan of commercePlans)for(const billing of ['monthly','annual']){
  const f=fixture(),response=await f.post({plan:plan.id,billing});assert.equal(response.status,200);
  const {data,key}=f.calls[0];assert.equal(data.mode,'subscription');assert.equal(data.ui_mode,'embedded_page');assert.equal(data.automatic_tax.enabled,true);assert.equal(data.tax_id_collection.enabled,true);assert.equal(data.billing_address_collection,'required');
  assert.deepEqual(data.line_items,[{price:stripePrice(env,plan.id,billing),quantity:1},...(plan.integration?[{price:integrationPrice(env),quantity:1}]:[])]);
  assert.equal(data.subscription_data.billing_mode.type,'flexible');assert.equal(key.idempotencyKey,`gauna-${plan.id}-${billing}-${nonce}`);assert.ok(response.headers.get('set-cookie').includes('HttpOnly'));assert.ok(response.headers.get('set-cookie').includes('Secure'));
 }
});
test('invalid plans, amount injection, consent and cross-origin calls never create checkout',async()=>{
 for(const data of [{plan:'control'},{billing:'weekly'},{amount:1},{price:'price_attacker'},{consent:false},{requestId:'invalid'}]){const f=fixture();assert.equal((await f.post(data)).status,400);assert.equal(f.calls.length,0);}
 const cross=fixture({crossOrigin:true});assert.equal((await cross.post()).status,403);assert.equal(cross.calls.length,0);
});
test('unconfigured merchant, pending tax, wrong prices/account and rate limit fail closed',async()=>{
 for(const [option,status]of [['noConfig',503],['pendingTax',503],['missingRegistration',502],['wrongAmount',502],['wrongAccount',502],['disabledAccount',502],['limited',429]]){const f=fixture({[option]:true});assert.equal((await f.post()).status,status,option);assert.equal(f.calls.length,0);}
});
test('payment status requires the signed owning browser cookie and exposes no customer data',async()=>{
 const f=fixture(),response=await f.post(),url='https://gauna.es/api/stripe/status?session_id=cs_live_fixture';
 assert.equal((await f.handler.status(new Request(url))).status,403);
 const cookie=response.headers.get('set-cookie').split(';')[0];
 const status=await f.handler.status(new Request(url,{headers:{cookie}}));assert.equal(status.status,200);assert.deepEqual(await status.json(),{status:'complete',paymentStatus:'paid',plan:'go'});
 assert.equal((await f.handler.status(new Request(url,{headers:{cookie:cookie+'tamper'}}))).status,403);
});
test('real SDK rejects unsigned webhooks; paid confirmation delivers twice and deduplicates',async()=>{
 const f=fixture();await f.post();assert.equal((await f.webhook('checkout.session.completed',false)).status,400);assert.equal(f.emails.length,0);
 assert.equal((await f.webhook()).status,200);assert.equal(f.emails.length,2);assert.equal(f.emails[0].to[0],'test@example.com');assert.equal(f.emails[1].to[0],'hola@gauna.es');
 assert.equal((await f.webhook()).status,200);assert.equal(f.emails.length,2);
});
test('unpaid or unrelated sessions never fulfill; delivery errors return retryable failure',async()=>{
 for(const session of [{payment_status:'unpaid'},{metadata:{source:'other'}}]){const f=fixture({session});await f.post();assert.equal((await f.webhook()).status,200);assert.equal(f.emails.length,0);}
 for(const option of ['emailFailure','inactive']){const f=fixture({[option]:true});await f.post();assert.equal((await f.webhook()).status,500);assert.equal(f.emails.length,0);}
});
