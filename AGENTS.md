# Guide Agents - ShinedeWake

Ce depot contient le frontend React/Vite du panel Wake-on-LAN. Il doit rester deployable dans `P:\PROD\ShinedeWake` uniquement sous forme d'artefacts `dist\`.

## Lecture de demarrage

1. Lire `P:\AGENTS.md`.
2. Lire `P:\ECOSYSTEM.md`.
3. Lire `P:\DEV\GitHub\README.md`.
4. Lire `P:\DEV\GitHub\AGENTS.md`.
5. Lire ce fichier.
6. Lire `README.md`.
7. Lire `P:\DEV\GitHub\App-ShinedeWake-API\README.md` si le changement touche les endpoints, permissions, DB ou Mercure.

## Source de verite

- Frontend DEV: `P:\DEV\GitHub\App-ShinedeWake`
- Frontend PROD: `P:\PROD\ShinedeWake`
- Backend DEV: `P:\DEV\GitHub\App-ShinedeWake-API`
- Backend PROD: `P:\PROD\API\wake`
- Endpoint API: `https://api.shinederu.ch/wake/`
- Code projet: `wake`

## Structure

- `src\`: application React.
- `src\lib\api.ts`: client API Wake.
- `src\lib\authClient.ts`: client auth commun.
- `src\components\`: composants UI.
- `public\`: assets publics copies au build.
- `dist\`: artefacts generes, a deployer en PROD.

Ne pas modifier directement `P:\PROD\ShinedeWake` sauf verification rapide; les changements durables se font en DEV puis build.

## Auth, permissions et DB

- Auth via `Module-Auth-Core` et `Module-Auth-React`.
- Le backend Wake valide `sid`, `auth_sessions`, `users` et `core_*`.
- Le frontend ne doit jamais implementer une permission comme source de verite; il ne fait que refleter `status.can_wake` et `status.can_manage`.
- Aucune connexion DB cote frontend.

## Temps reel

- Rafraichissement HTTP silencieux toutes les 15 secondes quand l'onglet est visible.
- L'API Wake publie des evenements Mercure `wake.device.*`, mais le frontend ne s'y abonne pas encore.
- Toute future integration temps reel doit garder une resynchronisation HTTP via `status` et `listDevices`.

## Verifications

```powershell
cd P:\DEV\GitHub\App-ShinedeWake
npm run build
git -c safe.directory=* diff --check
rg -n "password|passwd|secret|BEGIN (RSA|OPENSSH|PRIVATE)|api_key|token" P:\DEV\GitHub\App-ShinedeWake
```

## Deploiement

Copier uniquement le contenu de `dist\` vers `P:\PROD\ShinedeWake`.

Ne pas deployer:

- `.git`, `.github`
- `README.md`, `AGENTS.md`
- `.env*`
- `src\`
- `node_modules\`
- `package*.json`
- `tsconfig*.json`, `vite.config.ts`
- tests, caches, brouillons, exports temporaires

Preserver uniquement les artefacts publics necessaires (`index.html`, `assets\`, `favicon.png`).
