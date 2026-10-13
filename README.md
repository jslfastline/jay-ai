# Jay AI

A modern, video-first AI creation platform built with **React Native + Expo SDK 57 (Expo Go compatible) + TypeScript + Expo Router**.

- **Product name:** Jay AI
- **Primary feature:** AI Video Studio (text prompt → script → multi-scene video)
- **Also included:** AI Chat, AI Image Generation, AI Image Analysis

## Official logo

- Source URL: <https://res.cloudinary.com/dlsr1yu7v/image/upload/v1791835511/pnmqnute6hnx2ypx3hjg.png>
- Local copy: `assets/branding/jay-ai-logo.png` (downloaded, used at runtime)
- Showcased on: splash/onboarding screen, home dashboard, and headers.

## Requirements

- Node.js >= 20 (tested on v22)
- npm 9+
- An Android phone with **Expo Go** installed, on the same Wi-Fi as this computer
- Internet connection for first-time dependency installs

## Project structure

```
~/AI
├── app.json                  # Expo config (name, splash, plugins, icons)
├── .env.example              # Public env template (no secrets)
├── assets/branding/          # Official logo
├── server/                   # Node + TypeScript backend (holds provider keys)
│   ├── src/index.ts          # Express app: /health, /chat (SSE), /vision, /video, /images
│   ├── src/provider.ts       # OpenAI-compatible chat provider (streaming + multimodal)
│   ├── src/attachments.ts    # Data-URL parsing + PDF/DOCX/text extraction
│   └── .env.example          # Server env template (OPENAI_API_KEY, etc.)
└── src/
    ├── app/                  # Expo Router screens
    │   ├── _layout.tsx       # Root stack + AppProvider
    │   ├── index.tsx         # Splash + onboarding
    │   ├── (tabs)/           # Home, Chat, Creations, Profile
    │   ├── video-studio.tsx  # PRIMARY feature — video form
    │   ├── video/[id].tsx    # Generation progress + preview
    │   ├── image-studio.tsx  # Image generation
    │   ├── image-analysis.tsx# Image analysis
    │   └── settings.tsx      # Env, security, cost rules
    ├── components/           # Feature components (chat/, ui/ primitives, Icon.tsx)
    ├── constants/theme.ts    # Brand design system
    ├── config/index.ts       # Public env config + mock detection
    ├── services/             # api.ts (SSE chat), attachments.ts, mockProvider, storage
    ├── store/AppContext.tsx  # Credits, creations, profile, settings
    ├── types/                # Shared domain types
    ├── utils/                # Credit estimation, formatting
    └── i18n/                 # English + Kiswahili scaffold
```

Icons come from **lucide-react-native** via a semantic registry (`src/components/ui/Icon.tsx`);
call sites use stable names like `Icon name="videocam"`.

## Install

```bash
cd ~/AI
npm install
# optional: create local env
cp .env.example .env
```

## Run with Expo Go (LAN mode)

```bash
cd ~/AI
npm start
```

Then:

1. Connect your Android phone and computer to the **same Wi-Fi network**.
2. Open Expo Go on the phone.
3. Scan the QR code shown in the terminal (Android scans inside Expo Go, or the system camera).
4. Wait for the JavaScript bundle to load.

For the exact workflow and troubleshooting, see [TESTING.md](TESTING.md).

## Backend (`server/`)

The app talks to a small Node + TypeScript service that keeps provider keys server-side.

```bash
cd ~/AI/server
cp .env.example .env      # then set OPENAI_API_KEY (and optionally OPENAI_BASE_URL)
npm install
npm run dev               # listens on http://0.0.0.0:8787
```

Endpoints: `GET /health`, `POST /chat` (Server-Sent Events by default; `{"stream": false}` for a
single JSON reply), `POST /vision/analyze`, `POST /video/jobs`, `GET /video/jobs/:id`,
`POST /images`. `POST /images` and video jobs return an honest **503 `not_configured`** until a
provider that supports them is wired up — the app never fakes success.

Point the app at it by setting `EXPO_PUBLIC_API_BASE_URL` in `~/AI/.env` to your computer's LAN IP:

```bash
# find it, e.g. 192.168.1.42
hostname -I
# then in ~/AI/.env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8787
```

> Use the LAN IP, **not** `localhost`/`127.0.0.1` — the phone runs on a different device.

## Accounts & authentication

Users sign in so the studio knows who is creating. The backend owns identity:

- `POST /auth/register` → `{ verificationRequired, email }` (bcrypt-hashed password)
- `POST /auth/verify` `{ email, code }` → `{ token, user }` (email verification)
- `POST /auth/resend` `{ email }` → `{ verificationRequired }`
- `POST /auth/login` → `{ token, user }` (403 `email_not_verified` until verified)
- `GET /auth/me` (Bearer token) → `{ user }`

**Email verification.** Sign-up emails a 6-digit code that stays valid for `VERIFY_TTL_MINUTES`
(default 10) and is invalidated when a new code is requested (max 5 attempts). Emails are sent
through EmailJS (`EMAILJS_SERVICE_ID` / `EMAILJS_TEMPLATE_ID` / `EMAILJS_PUBLIC_KEY`, optional
`EMAILJS_PRIVATE_KEY`) — all server-side only. When EmailJS is unconfigured the code is printed to
the server console and, outside production, returned to the app as a development code. After
verifying (and on every sign-in) the app shows the splash for five seconds before the dashboard.

Sessions are signed JWTs; the app stores the token in the OS keychain (`expo-secure-store`).
Set a strong `JWT_SECRET` in `server/.env` for production (otherwise an ephemeral secret is
generated at boot and sessions reset on restart). User records persist in `server/data/users.json`
(git-ignored). The whole app is gated behind sign-in: `(tabs)` redirects to `(auth)/sign-in`
when signed out. In mock mode (no backend), a clearly-labelled **local device account** is used
instead so the app stays usable.

## Typography

The UI uses **Tinos**, a metric-compatible substitute for Times New Roman (which is absent on
Android). Font files live in `assets/fonts/` and are registered with `expo-font` in
`src/app/_layout.tsx`; weights are wired through `Serif` / `Typography` in `src/constants/theme.ts`.

## Mock mode vs real AI providers

- **Mock mode (default):** active until `EXPO_PUBLIC_API_BASE_URL` is set. Replies are simulated,
  streamed locally, and explicitly labelled **“Simulated response · mock mode”**. No paid provider
  is ever called automatically.
- **Live mode:** Chat streams token-by-token over SSE (`POST /chat`); other actions route through
  the backend. The frontend never holds provider keys and never deducts credits authoritatively —
  the backend owns billing, job IDs, polling, refunds, rate limits, and file storage.
- **Attachments:** Chat supports photos, video, and documents (PDF/DOCX/text) up to the configured
  size/count limits. Images are sent as multimodal parts; documents and PDFs are extracted to text
  server-side; unsupported video input gets an honest error instead of a fabricated answer.

Check current mode on the **Profile** tab, in **Settings**, and via the connection dot in the Chat
header.

## Costs (estimates, client-side only)

| Item | Credits |
| --- | --- |
| Video base (10s, 2 scenes) | 40 |
| Per extra second | 3 |
| Per extra scene | 15 |
| 9:16 / 1:1 surcharge | 5 |
| Cinematic style premium | 4 |
| Image base | 6 |

Example: 15s · 3 scenes · cinematic · 16:9 ≈ **74 cr**. The backend is the single source of truth.

## Testing

```bash
npx tsc --noEmit                    # TypeScript check (app)
npx expo lint                       # Lint
npx expo-doctor                     # SDK/dependency diagnostics
(cd server && npx tsc --noEmit)     # TypeScript check (backend)
```

## Limitations & next steps

- A real backend exists (`server/`) and proxies chat/vision to any OpenAI-compatible provider.
  It needs a provider key to produce **real** output; without one it reports `not_configured`
  rather than pretending.
- Image generation and video generation still need a provider that supports them (or a self-hosted
  open-weight model) wired behind the backend; both return honest 503s for now.
- In mock mode, image previews are public placeholder photos, clearly labeled.
- Credits ledger is local-only; server-side ledger + refunds still to be built.
- Kiswahili UI strings are scaffolded, not fully translated.

## Troubleshooting

See **TESTING.md** for common Expo Go connection issues (same network, firewall, `--tunnel`,
cache clears, verifying SDK 57 support).