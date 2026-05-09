# ShinedeWake

Frontend de pilotage Wake-on-LAN pour l'ecosysteme Shinederu.

## Objectif

- authentification via `@shinederu/auth-core` et `@shinederu/auth-react`
- verification des permissions metier via l'API `wake`
- reveil Wake-on-LAN des machines autorisees
- gestion des cibles WOL pour les utilisateurs ayant le droit de gestion

## Prerequis

- Node.js 20+
- npm 10+

## Installation

```bash
npm install
```

## Variables d'environnement

Copier `.env.example` vers `.env` puis ajuster si besoin:

- `VITE_SHINEDERU_API_AUTH_URL`
- `VITE_SHINEDEWAKE_API_URL`

## Lancement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Le frontend suppose que l'API `wake` partage le cookie `sid` sur `.shinederu.ch`.
- Les droits d'acces sont resolus par le backend, pas par le frontend.
