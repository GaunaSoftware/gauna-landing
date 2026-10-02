// Preview build entrypoint. render-pages retains the production/main safety guards.
import './render-pages.mjs';
import {applyBranding} from './branding.mjs';
applyBranding(new URL('./', import.meta.url));
