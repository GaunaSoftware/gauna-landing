import {test} from 'node:test';
import assert from 'node:assert/strict';
import {purchaseEmail} from '../src/lib/purchase-email.mjs';
import {commercePlans,vatBreakdown,money} from '../src/config/commerce.mjs';
import {stripeCatalog} from '../src/config/stripe-catalog.mjs';

function receipt(plan=commercePlans[0],cycle='monthly',overrides={}) {
 const paid=vatBreakdown(plan[cycle]);
 return purchaseEmail({plan,cycle,portalUrl:stripeCatalog.billingPortal,replyTo:'hola@gauna.es',session:{id:'cs_test_receipt',amount_total:paid.total,total_details:{amount_tax:paid.vat},...overrides}});
}

test('purchase thanks cover all plans and both cycles with the actual paid tax and included implantation',()=>{
 for(const plan of commercePlans)for(const cycle of ['monthly','annual']){
  const mail=receipt(plan,cycle),paid=vatBreakdown(plan[cycle]);
  assert.ok(mail.subject.includes('Gracias por tu compra'));
  assert.ok(mail.text.includes(cycle==='annual'?'Anual':'Mensual'));
  assert.ok(mail.text.includes(`Total pagado (impuestos incluidos): ${money(paid.total)}`));
  assert.ok(mail.text.includes(`IVA / impuestos pagados: ${money(paid.vat)}`));
  assert.ok(mail.text.includes('Implantación estándar: Incluida'));
  assert.ok(mail.text.includes('bajo presupuesto'));
  assert.ok(mail.text.includes('coordinar la implantación y preparar los accesos'));
  assert.ok(mail.html.includes(stripeCatalog.billingPortal));
  assert.equal(mail.reply_to,'hola@gauna.es');
  if(plan.id==='planner')assert.equal(mail.subject,'Gracias por tu compra · Planner');
 }
});

test('receipt uses charged amounts even when tax differs from the Spanish website preview',()=>{
 const mail=receipt(undefined,undefined,{amount_total:10000,total_details:{amount_tax:0}});
 assert.ok(mail.text.includes(`Total pagado (impuestos incluidos): ${money(10000)}`));
 assert.ok(mail.text.includes(`IVA / impuestos pagados: ${money(0)}`));
 const missing=receipt(undefined,undefined,{amount_total:10000,total_details:undefined});
 assert.ok(!missing.text.includes('IVA / impuestos pagados:'));
 assert.ok(missing.text.includes(money(10000)));
});

test('receipt rejects invalid totals and escapes any dynamic HTML content',()=>{
 for(const total of [undefined,-1,1.5,Infinity])assert.throws(()=>receipt(undefined,undefined,{amount_total:total}),/Invalid paid amount/);
 const mail=receipt(undefined,undefined,{id:'cs_test_<img src=x onerror="alert(1)">'});
 assert.ok(!mail.html.includes('<img src=x'));
 assert.ok(mail.html.includes('&lt;img src=x'));
 assert.ok(!/<script|<iframe|<form/i.test(mail.html));
});
