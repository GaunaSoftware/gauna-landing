import type {APIRoute} from 'astro';
import {payments} from '../../../lib/stripe-server.mjs';
export const prerender=false;
export const POST:APIRoute=({request})=>payments.webhook(request);
