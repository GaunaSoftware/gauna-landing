# Gauna — Landing oficial

Landing de Gauna y TransGest, con protección anti-spam integrada (Cloudflare Turnstile + honeypot + rate limiting).

Dominio principal: **gauna.es**
Despliegue: **Vercel**

---

## 🚀 Cómo arrancar en local

Necesitas Node.js 20 o superior.

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar plantilla de variables de entorno
cp .env.example .env
# Edita .env con tus credenciales reales (ver secciones abajo)

# 3. Arrancar servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:4321
```

**Nota importante:** puedes arrancar en local SIN configurar Airtable ni Turnstile. Los formularios no llegarán a guardar nada, pero la web se navega perfectamente para revisar el diseño.

---

## 🗂️ Configurar Airtable

Sigue los pasos en orden:

### 1. Crear cuenta
Ve a [airtable.com](https://airtable.com), regístrate gratis.

### 2. Crear base "Gauna CRM" → tabla "BetaTesters"

Campos exactos:

| Campo | Tipo | Notas |
|---|---|---|
| `Nombre` | Single line text | |
| `Empresa` | Single line text | |
| `Email` | Email | |
| `Telefono` | Phone number | |
| `Perfil` | Single select | Opciones: Autónomo, Pyme pequeña, Pyme mediana, Empresa grande, Gestoría |
| `Vehiculos` | Number | |
| `HerramientasActuales` | Single line text | |
| `Motivacion` | Long text | |
| `Estado` | Single select | Opciones: **Pendiente**, **Aceptado**, **Rechazado** |
| `FechaSolicitud` | Date | |

### 3. Obtener credenciales

**API Key (Personal Access Token):**
- Ve a [airtable.com/create/tokens](https://airtable.com/create/tokens)
- Create new token → nombre "Gauna Landing"
- Scopes: `data.records:read` + `data.records:write`
- Access: añade la base "Gauna CRM"

**Base ID:**
- Ve a [airtable.com/api](https://airtable.com/api) → selecciona tu base → Base ID arriba (empieza por `app...`)

### 4. Rellenar `.env`

```
AIRTABLE_API_KEY=patXXXXX
AIRTABLE_BASE_ID=appXXXXX
AIRTABLE_BETA_TABLE=BetaTesters
```

### 5. Automatización de email (recomendado)

En Airtable → Automations → "When a record is created in BetaTesters" → "Send email a tu dirección". Así te enteras al instante de nuevas solicitudes sin mirar el panel.

---

## 🛡️ Configurar Cloudflare Turnstile (protección anti-bots)

**Por qué:** sin esto tu formulario va a recibir decenas de envíos de bots al mes. Turnstile bloquea el 99% sin molestar al usuario legítimo (validación invisible).

### 1. Crear cuenta en Cloudflare

Ve a [cloudflare.com](https://www.cloudflare.com/). Cuenta gratis, sin tarjeta.

### 2. Añadir un sitio en Turnstile

- Dashboard → **Turnstile** (menú izquierdo)
- **Add Site**
- Nombre: "Gauna Landing"
- Dominios:
  - `gauna.es`
  - `www.gauna.es`
  - `localhost` (para desarrollo local)
- Widget Mode: **Managed** (recomendado, invisible la mayoría del tiempo)
- Crea el sitio

Cloudflare te da dos claves:
- **Site Key** (pública, empieza por `0x4AAAA...`)
- **Secret Key** (privada, empieza por `0x4AAAA...`)

### 3. Rellenar `.env`

```
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAABXXXXXXXXX
TURNSTILE_SECRET_KEY=0x4AAAAAAABXXXXXXXXX_XXXXXX
```

**Importante:** `PUBLIC_` es obligatorio en la primera variable (así Astro la expone al frontend). La segunda NO lleva PUBLIC_ (secreta, solo servidor).

---

## 🛡️ Niveles de protección activa

La landing tiene 4 capas anti-spam:

1. **Cloudflare Turnstile** — CAPTCHA invisible. El usuario no lo ve salvo comportamiento sospechoso.
2. **Honeypot** — campo oculto que solo los bots rellenan. Si viene relleno, descartamos la solicitud silenciosamente (el bot cree que tuvo éxito).
3. **Rate limiting por IP** — máximo 3 envíos cada 10 minutos por misma IP.
4. **Lista de dominios bloqueados** — emails de dominios temporales (mailinator, tempmail, etc.) se rechazan automáticamente.
5. **Detección de envíos rápidos** — si un formulario se envía en menos de 3 segundos, es un bot. Se descarta.

---

## 📊 Cómo funciona el flujo de Beta Tester

```
Usuario rellena formulario en /beta-tester/
            ↓
Validaciones anti-spam (5 capas)
            ↓
API /api/beta-signup recibe los datos
            ↓
Se crea registro en Airtable con Estado = "Pendiente"
            ↓
Usuario ve "Solicitud recibida en 24-48h"
            ↓
Tú abres Airtable, revisas la candidatura
            ↓
Cambias Estado a "Aceptado" o "Rechazado"
            ↓
El contador de la web se actualiza en 60s
```

---

## 📁 Estructura del proyecto

```
gauna-landing/
├── public/                     # Archivos estáticos
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Logo.astro
│   │   ├── BetaCounter.astro   # Contador dinámico
│   │   ├── LeadMagnetForm.astro
│   │   ├── Turnstile.astro     # CAPTCHA Cloudflare
│   │   └── Honeypot.astro      # Campo oculto anti-bots
│   ├── config/
│   │   └── beta.ts             # Lógica del estado beta
│   ├── content/blog/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── airtable.ts         # Cliente Airtable
│   │   └── security.ts         # Turnstile + honeypot + rate limit
│   ├── pages/
│   │   ├── api/
│   │   │   ├── beta-signup.ts  # POST con 5 capas de protección
│   │   │   └── beta-status.ts  # GET estado del contador
│   │   ├── beta-tester.astro
│   │   ├── dcd-2026/
│   │   ├── transgest/
│   │   ├── blog/
│   │   └── ...
│   └── styles/global.css
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## 🚀 Despliegue en Vercel

### Primera vez

1. Sube el proyecto a GitHub (repo privado recomendado).
2. Entra en [vercel.com](https://vercel.com) y logueate con GitHub.
3. **Add New... → Project** → selecciona `gauna-landing` → **Import**.
4. Vercel detecta Astro automáticamente.
5. **Variables de entorno:** antes de Deploy, expande "Environment Variables" y añade **las 5**:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
   - `AIRTABLE_BETA_TABLE` (valor: `BetaTesters`)
   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
6. Clic en **Deploy**.

### Conectar el dominio gauna.es

1. En Vercel: **Settings → Domains**
2. Añade `gauna.es` y `www.gauna.es`
3. Vercel te dará los registros DNS a poner en DonDominio

### Actualizaciones

`git push` → Vercel redespliega automáticamente en 30-60 segundos.

---

## 🗺️ Cómo editar el roadmap de TransGest

El estado de cada funcionalidad (Listo / En desarrollo / Próximamente) se gestiona desde un único archivo JSON fácil de editar:

**Archivo:** `src/data/roadmap.json`

### Cambiar el estado de una funcionalidad

Abre el archivo. Verás algo así:

```json
{
  "items": [
    { "status": "done", "label": "Gestión de pedidos y rutas" },
    { "status": "progress", "label": "Optimización de rutas con IA" },
    { "status": "pending", "label": "App móvil para conductores" }
  ]
}
```

Los tres estados posibles son:

| Estado | Significado | Se ve como |
|---|---|---|
| `done` | Funcionalidad terminada | Verde con tick · "Listo" |
| `progress` | En desarrollo activo | Naranja pulsante · "En desarrollo" |
| `pending` | Planificada sin empezar | Gris · "Próximamente" |

### Pasos para actualizar en producción

Cuando termines una funcionalidad o quieras mover otra a "en desarrollo":

1. Abre `src/data/roadmap.json` en tu editor
2. Cambia `"status": "progress"` por `"status": "done"` (o el cambio que corresponda)
3. Guarda el archivo
4. Desde la terminal, ejecuta:

```bash
git add src/data/roadmap.json
git commit -m "Roadmap: marcar X como done"
git push
```

5. Vercel detecta el push y redespliega en 30-60 segundos
6. Refresca la web y verás el cambio reflejado

### Añadir una funcionalidad nueva al roadmap

Añade un objeto más al array `items` en el mismo archivo. Se mostrará automáticamente en la web al redesplegar.

---

## 🔓 Activar el portal de clientes

Cuando TransGest esté operativo y tus clientes necesiten acceder al SaaS desde la landing:

1. Abre `src/components/Header.astro`
2. Busca esta línea:

```typescript
const CLIENT_PORTAL_ENABLED = false;
```

3. Cámbiala a:

```typescript
const CLIENT_PORTAL_ENABLED = true;
const CLIENT_PORTAL_URL = 'https://app.gauna.es';
```

(Ajusta la URL al dominio real donde esté el SaaS)

4. Guarda, haz `git push`, y en 30-60 segundos aparece el botón "Acceso clientes" en el header y el menú móvil.

---

## 📋 Pendientes antes de lanzar

- [ ] Crear base y tabla en Airtable
- [ ] Configurar Cloudflare Turnstile
- [ ] Rellenar `.env` local y variables en Vercel
- [ ] Actualizar datos fiscales reales en avisos legales
- [ ] Configurar automatización de email en Airtable
- [ ] Configurar dominio gauna.es en Vercel
- [ ] Preparar imagen Open Graph (1200x630px) en `public/og-default.jpg`
- [ ] Preparar guía PDF del lead magnet DCD
- [ ] Conectar lead magnet con MailerLite o Brevo
- [ ] Dar de alta en Google Search Console

---

## 📞 Contacto técnico

Landing construida por Manuel · `hola@gauna.es`
