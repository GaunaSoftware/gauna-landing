import {loadStripe} from '@stripe/stripe-js/pure';
export function installCheckout(doc){
 const root=doc.getElementById('checkout-page');if(!root)return;
 const form=doc.getElementById('checkout-selection'),button=doc.getElementById('checkout-start'),error=doc.getElementById('checkout-error');
 const format=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
 const cycle=()=>form.querySelector('input[name=billing]:checked').value;
 let checkout=null,busy=false,nonce=crypto.randomUUID();
 const refresh=()=>{const c=cycle(),amount=Number(root.dataset[c]);doc.getElementById('subscription-total').textContent=format(amount);doc.getElementById('initial-total').textContent=format(amount+Number(root.dataset.integration));doc.getElementById('renewal-total').textContent=format(amount)+' /'+(c==='annual'?'año':'mes');checkout?.destroy();checkout=null;nonce=crypto.randomUUID();doc.getElementById('checkout-prompt')?.removeAttribute('hidden');};
 form.querySelectorAll('input[name=billing]').forEach(input=>input.addEventListener('change',refresh));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity()||!root.dataset.key)return;
  busy=true;button.disabled=true;error.hidden=true;
  form.querySelectorAll('input').forEach(input=>input.disabled=true);
  try{
   // Card details go directly into Stripe's frame. Never collect them in this form.
   const stripe=await loadStripe(root.dataset.key);if(!stripe)throw new Error('No se ha podido abrir Stripe.');
   const response=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:root.dataset.plan,billing:cycle(),consent:doc.getElementById('checkout-consent').checked,requestId:nonce})});
   const data=await response.json();if(!response.ok||!data.clientSecret)throw new Error(data.error||'No se ha podido abrir el pago.');
   checkout?.destroy();checkout=await stripe.createEmbeddedCheckoutPage({clientSecret:data.clientSecret});checkout.mount('#stripe-checkout');
   doc.getElementById('checkout-prompt').hidden=true;doc.getElementById('stripe-checkout').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }catch(err){error.textContent=err.message||'No se ha podido abrir el pago. Inténtalo de nuevo.';error.hidden=false;}
  finally{busy=false;button.disabled=false;form.querySelectorAll('input').forEach(input=>input.disabled=false);}
 });
}
