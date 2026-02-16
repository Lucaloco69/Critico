# Critico

**Critico** ist eine moderne, Echtzeit-Marktplatz-Plattform, auf der Nutzer Produkte entdecken, anbieten und bewerten können, während sie direkt mit Verkäufern kommunizieren. Gebaut mit SolidJS für eine schnelle, reaktive UI und powered by Supabase für nahtlose Echtzeit-Nachrichten und Authentifizierung.

## Features

- **Produkt-Marktplatz** — Produkte durchsuchen, filtern und detaillierte Listings mit Bildern und Verkäuferinformationen ansehen
- **Benutzerprofile** — Verkäuferprofil erstellen, eigene Produkte verwalten und Bewertungen sammeln
- **Echtzeit-Messaging** — Direkter Chat zwischen Käufern und Verkäufern mit sofortigen Benachrichtigungen
- **Produktverwaltung** — Neue Produkte mit Bildern, Beschreibungen und Tags erstellen
- **Bewertungssystem** — Produkte bewerten und Durchschnittsbewertungen in Echtzeit anzeigen
- **Öffentliche Profile** — Verkäuferinformationen und Produktkataloge für vertrauenswürdigen Handel

## Technologie-Stack

- **Frontend:** SolidJS, TypeScript
- **Backend:** Supabase (PostgreSQL, Realtime, Authentication, Storage)
- **Styling:** Tailwind CSS
- **Routing:** @solidjs/router
- **Internationalisierung:** @solid-primitives/i18n
- **Build Tool:** Vite

## KI-Unterstützung

**Wichtiger Hinweis:** Die UI-Komponenten und das Design dieser Anwendung wurden mit Unterstützung von künstlicher Intelligenz (KI) generiert. Dies umfasst:
- SolidJS Komponenten
- Tailwind CSS Styling
- Layout und Design-Patterns
- Responsive Design-Implementierungen

Die Geschäftslogik, Datenbankstruktur und Architektur wurden manuell entwickelt und implementiert.

## Voraussetzungen

- Node.js (Version 18 oder höher)
- npm, pnpm oder yarn

## Setup für Bewertung

### Schritt 1: Dependencies installieren

```bash
npm install
```

### Schritt 2: Production Build erstellen und starten

```bash
npm run build
node dist/server/entry.mjs
```

## Verfügbare Scripts

- `npm run dev` - Startet den Astro Development Server
- `npm run build` - Erstellt einen Production Build
- `npm run preview` - Startet einen lokalen Server für den Production Build
- `npm run check` - Führt Astro Type-Checking durch

## Projektstruktur

```
Critico/
├── src/
│   ├── components/     # SolidJS UI-Komponenten
│   ├── routes/         # Seiten-Routen
│   ├── hooks/          # Custom Hooks
│   ├── i18n/           # Internationalisierung (DE/EN)
│   ├── lib/            # Utilities und Supabase Client
│   └── pages/          # Astro Pages
├── public/             # Statische Assets
└── astro.config.mjs    # Astro Konfiguration
```
