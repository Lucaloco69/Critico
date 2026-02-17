<!-- Copilot instructions tailored to the Critico Solid.js app -->
# Project snapshot

* Framework: Solid.js (Vite + `vite-plugin-solid`).
* Styling: Tailwind CSS via PostCSS.
* Backend & realtime: Supabase (`src/lib/supabaseClient.ts`).
* Routing: file-based routes under `src/routes/`.
* Pattern: feature folders for components and hooks (e.g. `src/components/createProduct`, `src/hooks/home`).

# What to know up-front

* Run the app: `npm install` then `npm run dev` (Vite dev server).
* Build: `npm run build`; preview with `npm run serve`.
* Environment: the app expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in an `.env` file. See `src/lib/supabaseClient.ts` for runtime checks.
* TypeScript path alias: `~/*` → `src/*` (configured in `tsconfig.json`).

# Architecture & data flow (concise)

* Client SPA in Solid — UI components live in `src/components/` split by feature.
* Business logic & data hooks are in `src/hooks/`, organized per feature (e.g. `hooks/home`, `hooks/profile`). Prefer adding new hooks inside the feature folder.
* Realtime and auth use Supabase. `src/lib/supabaseClient.ts` initializes the client and sets `localStorage`-based auth persistence and realtime params.
* Pages / routes are in `src/routes/`. Route components use hooks to fetch and subscribe to data.
* Shared lightweight state (stores) live in `src/lib/` (e.g. `messagesStore.ts`, `sessionStore.ts`). Mutate these stores instead of sprinkling global variables.

# Project-specific conventions

* Feature-first organization: add UI components under `src/components/<feature>/` and related hooks under `src/hooks/<feature>/`.
* Hook naming: `useX`, `useRealtimeX`, `useCurrentUser`, `useProductFilter` — follow existing verb-based names and return objects with reactive signals where appropriate.
* Realtime subscriptions: use `useRealtime*` hooks and the Supabase client; when adding realtime listeners, unsubscribe on cleanup.
* Types: place shared types in `src/types/` and import them in hooks/components.
* i18n: translations are nested under `src/i18n/<locale>/` (see `de/` and `en/`). New UI copy should add keys there and use the existing i18n primitives.

# Files to inspect when making changes

* App entry & routing: `src/index.tsx`, `src/app.tsx`.
* Supabase setup: `src/lib/supabaseClient.ts` (env checks, auth, realtime config).
* Example feature: `src/components/createProduct/` and `src/hooks/createProduct/` show the pattern for forms, uploads, and submit flows.
* Protected routes: `src/components/ProtectedRoute.tsx` — check auth expectations before adding restricted pages.

# Helpful snippets (copy-paste)

* Start dev server:

```
npm install
npm run dev
```

# If you need more context

* Read `README.md` for general Solid/Vite workflow, and inspect `package.json` scripts.
* Ask about missing environment values, or whether new realtime channels should be added to `supabaseClient`'s `realtime.params`.
