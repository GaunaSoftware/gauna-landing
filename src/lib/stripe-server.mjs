import Stripe from 'stripe';
import {paymentHandlers} from './stripe-payments.mjs';
export const paymentEnv={...import.meta.env,...process.env};
const stripe=paymentEnv.STRIPE_SECRET_KEY?new Stripe(paymentEnv.STRIPE_SECRET_KEY,{maxNetworkRetries:2,timeout:15000}):null;
export const payments=paymentHandlers({env:paymentEnv,stripe,sendEmail:async({idempotencyKey,...message})=>{
 if(!paymentEnv.RESEND_API_KEY)throw new Error('Email unavailable');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${paymentEnv.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},signal:AbortSignal.timeout(15000),body:JSON.stringify({from:paymentEnv.CONTACT_FROM_EMAIL||'TransGest <formularios@gauna.es>',...message})});
 const body=await response.json();if(!response.ok||!body.id)throw new Error('Email delivery failed');
}});
