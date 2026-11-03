# KoraDevs

> Quand tu bloques, un développeur te rejoint. Une plateforme d'entraide entre développeurs africains.

Projet du concours CADEV 2026 (Systalink).

**Essayer en ligne : <https://koradevs.onrender.com/>** (le premier chargement peut prendre une minute, le temps que le serveur se réveille).
**Guide du jury en PDF, avec captures : [`docs/koradevs-parcours-jury.pdf`](docs/koradevs-parcours-jury.pdf).**

## Le problème, l'idée

Un développeur bloque sur une erreur. Les forums répondent tard, l'IA tourne parfois en rond, et on se sent seul.

Sur KoraDevs, on colle son erreur. Un développeur disponible reçoit l'alerte en direct et rejoint une **salle de code partagée** : même code, chat, bouton pour lancer le test. Quand le test passe au vert, la solution devient une **fiche** que les suivants retrouvent, et une **preuve** dans le **Passeport** de l'aidant, vérifiable par n'importe qui.

## Parcours guidé pour le jury (5 minutes)

Tu as besoin de **deux fenêtres** : une fenêtre normale (le demandeur) et une fenêtre de navigation privée (l'aidant). Ainsi tu vois les deux côtés, sans avoir besoin de personne d'autre.

| # | Où | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- | --- |
| 1 | Fenêtre **B** (privée) | Crée un compte « aidant » (e-mail + mot de passe), puis sur **Accueil** choisis JavaScript et clique **Me rendre disponible**. | Ta porte est ouverte : tu peux être alerté. |
| 2 | Fenêtre **A** | Crée un compte « demandeur », clique **Demander de l'aide**, colle l'erreur et le code d'exemple ci-dessous. Ajoute une ligne `DB_PASSWORD=ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8`. | À l'étape « Aperçu », la fausse clé est **masquée** avant l'envoi. |
| 3 | Fenêtre **B** | Une alerte apparaît. Clique **Accepter**. | Tu entres dans la salle, le code du demandeur est là. |
| 4 | Fenêtre **B** | Corrige la ligne 2 dans l'éditeur, écris un message dans le chat. | La fenêtre A voit **le code et le chat bouger en direct**. |
| 5 | Fenêtre **A** | Clique **Exécuter** : le code tourne dans ton navigateur (jamais sur le serveur). | Le résultat est partagé. Un résultat vert lancé par le demandeur **confirme le test**. |
| 6 | Les deux | Chacun clique **Problème résolu** puis **Valider la fiche**. | La salle se ferme, le code est effacé du serveur. |
| 7 | Fenêtre A | Ouvre **Fiches**, puis la fiche créée. | Cause, correction et **avant / après** rejouable. |
| 8 | Fenêtre B | Ouvre **Moi**, puis ton **Passeport** (ou l'adresse `#/passeport/ton-pseudo`), clique **Vérifier l'empreinte**. | Le navigateur recalcule le SHA-256 : la preuve est vérifiable sans faire confiance au serveur. |

Code d'exemple à coller (fichier `users.js`, technologie JavaScript) :

```js
export const greet = (user) =>
  `Bonjour ${user.name.toUpperCase()} !`;

console.log(greet({}));
```

Erreur à coller : `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`.
Correction à faire : ``` `Bonjour ${(user.name ?? 'ami').toUpperCase()} !` ```.

Pour aller plus vite : l'onglet **Fiches** contient 23 solutions déjà prêtes, et **Espaces** des salons par technologie.

### Captures

| | |
| --- | --- |
| ![Accueil public](docs/img/01-accueil-public.png) **Accueil** : la démonstration en direct | ![Demander de l'aide](docs/img/02-demander-aide.png) **Demander de l'aide** : l'erreur et le code |
| ![Salle de code](docs/img/03-salle-de-code.png) **Salle de code** partagée | ![Fiche](docs/img/04-fiche-solution.png) **Fiche** avec avant / après |
| ![Passeport](docs/img/05-passeport-verifiable.png) **Passeport** vérifiable (QR code, SHA-256) | ![Salons](docs/img/06-salons.png) **Salons** par technologie |

## Ce qui est réel, ce qui est préparé

| | |
| --- | --- |
| **Réel** | Comptes (e-mail ou GitHub), alertes en direct (WebSocket), salle partagée (Yjs), chat, masquage des secrets, exécution du code dans le navigateur, fiches, avant / après, Passeport et empreinte SHA-256, salons, suivi, commentaires. |
| **Préparé par l'équipe** | 23 fiches de départ (pour que la bibliothèque ne soit pas vide) et un message d'accueil dans chaque salon, signé `equipe-koradevs`. |
| **Jamais inventé** | Aucun faux compte, aucune fausse preuve, aucun aidant automatique. Les aidants et les preuves du Passeport viennent de vraies personnes et de vrais tests. |
| **Limites actuelles** | Pas d'IA : le concept initial prévoyait une « piste de l'IA », elle n'est pas dans le produit. Pas de vérification d'e-mail ni de « mot de passe oublié ». Pas de compte administrateur ni de modération. Seul le JavaScript s'exécute dans la salle. L'offre gratuite de Render s'endort après un moment d'inactivité. |

## Questions probables

**Pourquoi pas ChatGPT ou Copilot ?** KoraDevs ne prétend pas les remplacer. Il sert quand le bug dépend de ton contexte et qu'un humain doit voir ton code. Et chaque aide devient un savoir vérifié par un test, en français, que les suivants retrouvent.

**Mon code est-il en sécurité ?** Les secrets sont masqués avant l'envoi puis une seconde fois par le serveur. Seuls le demandeur et l'aidant voient le code, il est effacé à la fin de la session (24 h maximum), et le serveur n'exécute jamais de code.

**Pourquoi ce n'est pas Monaco ?** L'éditeur est **CodeMirror 6**, synchronisé avec **Yjs** : plus léger, ce qui compte sur une connexion modeste, et sous licence permissive.

**Technologies.** Serveur NestJS (Node, TypeScript) avec WebSocket, base PostgreSQL, site React + Vite, éditeur CodeMirror + Yjs. Toutes les dépendances sont sous licence permissive (aucune GPL, AGPL ou LGPL), vérifié automatiquement à chaque push.

---

# Pour les développeurs

Ce qui suit explique comment lancer, tester et déployer le projet.

## Ce qu'on peut faire sur le site

| Onglet | À quoi ça sert |
| --- | --- |
| **Accueil** | Voir qui est disponible, ouvrir sa porte pour aider, suivre ses demandes |
| **Espaces** | Discuter dans des salons par techno, suivre des développeurs, lire le fil de leurs aides |
| **Fiches** | Chercher une solution, la rejouer avant / après, dire qu'elle est « utile », la commenter |
| **Projets** | Présenter un projet et trouver des coéquipiers |
| **Moi** | Son profil, ses technos, son **Passeport** |
| **Demander de l'aide** | Colle ton erreur, un voisin te rejoint |

**Comptes.** Inscription avec e-mail et mot de passe, ou connexion avec GitHub. Tous les comptes ont les mêmes droits.

**Où sont les données.** Dans une base PostgreSQL. Sans base, tout reste en mémoire et disparaît à l'arrêt. Au démarrage, le serveur ajoute les fiches de départ et les messages d'accueil (sans doublon si on le relance).

**Déploiement.** Un `Dockerfile` et un `docker-compose.prod.yml` (application, PostgreSQL, HTTPS avec Caddy) permettent la mise en ligne sur un serveur : modèle des réglages dans `.env.prod.example`.

## Structure

| Dossier | Rôle | État |
| --- | --- | --- |
| `shared/` | Code commun : masquage des secrets, lecture des traces d'erreur, détection de la techno, format de la demande (Zod) | Étape 1 |
| `cli/` | La commande `sos` : lance ton programme, capture l'erreur, masque les secrets, affiche l'aperçu, puis fait le pont avec la salle SOS | Étapes 1 et 4 |
| `server/` | API NestJS + PostgreSQL : connexion GitHub, demandes, fiches, Radar et salle SOS temps réel (WebSocket `/ws`) | Étapes 2 à 4 |
| `web/` | Interface web (Vite + React) : accueil, demande d'aide en 3 étapes, Radar, salle de code (CodeMirror 6 + Yjs), Fiches, Espaces, Projets, Passeport public. Thème clair/sombre, mobile et ordinateur | Étapes 3 et 4 |
| `examples/demo/` | Petit programme qui plante, avec de faux secrets, pour la démo | |
| `scripts/audit-licenses.mjs` | Audit des licences (règlement, article 6) | |

## Démarrage

Node.js 20 ou plus.

```bash
npm install
npm run build
```

Essayer la commande `sos` sur le programme de démo :

```bash
cd examples/demo
node ../../cli/dist/index.js npm start
```

Pour avoir la commande `sos` partout : `npm link -w cli`, puis `sos npm start` dans n'importe quel projet.

### Lancer le serveur (étape 2)

```bash
npm run db:up                         # PostgreSQL (+ pgvector) via Docker
cp server/.env.example server/.env    # puis ajuste si besoin
npm run build && npm run server       # API sur http://localhost:4000
```

Sans `DATABASE_URL`, le serveur démarre quand même avec un stockage en mémoire (pratique pour tester, tout disparaît à l'arrêt).

Puis, dans un autre terminal :

```bash
sos login --dev awa        # mode démo, sans GitHub
cd examples/demo && sos npm start
```

### Le Radar (étape 3)

```bash
npm run web      # http://localhost:5173 (le serveur doit tourner sur :4000)
```

1. L'aidant se connecte, coche ses technos et clique sur « Me rendre disponible ».
2. Le demandeur lance `sos npm start`. `sos` cherche d'abord des fiches qui ressemblent à l'erreur ; si aucune ne règle le problème, la demande part et le terminal affiche l'avancement en direct.
3. Les aidants de la même techno sont alertés tout de suite, ceux des technos proches après 2 minutes (`SOS_WIDEN_AFTER_SECONDS`), tous les aidants disponibles après 5 minutes (`SOS_PUBLIC_AFTER_SECONDS`, file publique).
4. Le premier qui clique sur « Accepter » prend la demande ; les autres la voient disparaître, et le terminal du demandeur affiche qui arrive. Ctrl+C dans le terminal annule la demande.

Les alertes ne montrent que la techno, la commande et la ligne d'erreur (déjà masquée). Le code n'est visible que dans la salle SOS.

Pour une démo rapide : `SOS_WIDEN_AFTER_SECONDS=10 SOS_PUBLIC_AFTER_SECONDS=20 npm run server`.

### La salle SOS (étape 4)

Quand un aidant accepte, il entre directement dans la salle (`/#/salle/<id>`), et `sos` reste ouvert dans le terminal du demandeur : c'est le pont entre la salle et sa machine. Seuls le demandeur et l'aidant qui a accepté peuvent y entrer.

- **Code partagé en direct** : les fichiers de la demande (déjà masqués) s'ouvrent dans un éditeur partagé (CodeMirror + Yjs). Chaque frappe est synchronisée.
- **Chat**, depuis le navigateur ou depuis le terminal (une ligne tapée dans `sos` part dans le chat). Le serveur masque à nouveau les secrets de chaque message.
- **Terminal du demandeur en lecture seule** : chaque relance s'affiche dans la salle. `sos` masque les secrets ligne par ligne avant l'envoi, le serveur repasse derrière.
- **« Envoyer mes corrections »** (aidant) : le demandeur voit le diff de chaque fichier modifié dans son terminal et répond `o/n`. Rien n'est écrit sans « o », et seuls les fichiers partagés, à l'intérieur du projet, peuvent l'être. Les lignes non modifiées gardent leurs vraies valeurs : un `[MASQUÉ:…]` n'est jamais écrit sur le disque (une correction qui modifie une ligne contenant un secret masqué est refusée).
- **« Demander une relance »** (aidant) : le terminal demande « Entrée pour lancer, n pour refuser ». Aucun code ne s'exécute sans l'accord du demandeur, et jamais sur le serveur.
- **« Problème résolu »** (ou `/resolu` dans le terminal) : la salle se ferme pour les deux, et le code est effacé du serveur immédiatement. Une annulation, ou l'expiration des 24 h, ferme aussi la salle.

Dans le terminal : `/relance` pour relancer soi-même, `/resolu`, `/quitter` (ou Ctrl+C) pour partir. `SOS_WEB_URL` (défaut `http://localhost:5173`) sert à afficher le lien de la salle dans le terminal.

### Connexion GitHub

`sos login` utilise le « device flow » de GitHub : le terminal affiche un code à saisir sur github.com, aucun mot de passe ne passe par le terminal. Il faut une OAuth App GitHub (Settings → Developer settings → OAuth Apps) avec **Enable Device Flow** coché, et mettre son Client ID dans `GITHUB_CLIENT_ID` (ce n'est pas un secret). Le serveur vérifie le jeton GitHub une fois, ne le garde pas, et donne à `sos` son propre jeton de session (stocké dans `~/.sos/config.json`, lisible par toi seul ; le serveur n'en garde que l'empreinte SHA-256).

Le mode démo (`sos login --dev <pseudo>`, sans mot de passe) n'existe que pour le développement local et les tests : **il est toujours coupé en production**, quelle que soit la configuration. Le site web ne le propose plus.

### Connexion GitHub sur le site

Le bouton « Continuer avec GitHub » demande une OAuth App GitHub (celle du terminal peut servir, avec le callback en plus) :

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. **Homepage URL** : l'adresse publique du site (`http://localhost:5173` en local).
3. **Authorization callback URL** : `<adresse du site>/api/auth/github/callback` (`http://localhost:5173/api/auth/github/callback` en local).
4. **Generate a new client secret**, puis mets dans le serveur `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` et `SOS_WEB_URL` (l'adresse du site, sans `/` final).

Sans `GITHUB_CLIENT_SECRET`, le bouton n'apparaît pas. Le secret ne doit jamais être commité.

### Exécuter le code dans la salle

Le bouton **Exécuter** lance le fichier JavaScript partagé dans un espace isolé du navigateur (`iframe sandbox="allow-scripts"` : ni cookies, ni stockage, ni accès à la page ; 5 secondes au plus). On peut ajouter un appel à tester, par exemple `greet({ name: 'awa' })`. Le résultat est partagé avec l'autre personne. **Seul un résultat vert lancé par le demandeur confirme le test** : l'aidant ne peut pas se confirmer lui-même. Le serveur n'exécute jamais de code.

### Avant / après d'une fiche

À la validation de la fiche, le demandeur peut cocher « Publier l'avant / après ». La fiche affiche alors la correction ligne par ligne, et on peut la rejouer. Sans cette case, aucun code n'est publié.

### Passeport vérifiable

Le Passeport public (`#/passeport/<pseudo>`) porte un QR code et un bouton « Vérifier l'empreinte » qui recalcule le SHA-256 dans le navigateur.

### Notifications

Quand un aidant prend une demande et que le demandeur a fermé la page, il reçoit une notification Web Push sur son téléphone ou son ordinateur. Rien à configurer : les clés VAPID sont créées au premier lancement et gardées en base. Le site est aussi installable (manifeste + service worker).

### Test de charge

```bash
node scripts/loadtest-ws.mjs http://localhost:4000 25
```

Il crée de vrais comptes de test (`charge-…@exemple.com`) : à lancer sur un serveur de test, pas sur la production. Au-delà de 25 paires, augmente la limite de connexions avec `SOS_AUTH_RATE_PER_MIN`.

### Comptes : e-mail, GitHub, Google

Le site propose trois façons d'entrer, sans mode démo :

- **Créer un compte / se connecter avec un e-mail et un mot de passe.** Seule l'empreinte du mot de passe est gardée (scrypt, sel aléatoire), jamais le mot de passe. Au bout de 8 essais ratés, l'adresse est bloquée 15 minutes. Pas d'indication sur la partie fausse (e-mail ou mot de passe). Désactivable avec `SOS_PASSWORD_AUTH=0`.
- **Continuer avec GitHub** : voir la section précédente.
- **Continuer avec Google** :
  1. Google Cloud Console → **APIs et services** → **Écran de consentement OAuth** : type *Externe*, nom de l'application, e-mail d'assistance, portées `openid`, `email`, `profile`. Passe l'application en **production** (sinon seuls les testeurs déclarés peuvent se connecter).
  2. **Identifiants** → **Créer des identifiants** → **ID client OAuth** → *Application Web*.
  3. **URI de redirection autorisé** : `<adresse du site>/api/auth/google/callback` (`http://localhost:5173/api/auth/google/callback` en local).
  4. Mets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `SOS_WEB_URL` dans le serveur. Le secret n'est jamais commité.

Chaque personne a un **pseudo unique** (insensible à la casse) : si GitHub ou Google propose un pseudo déjà pris, il devient `Awa-Diop-2`. Un même e-mail utilisé avec deux méthodes donne deux comptes séparés. Pas encore de vérification d'e-mail ni de « mot de passe oublié » : il faut pour cela un service d'envoi d'e-mails (SMTP).


### API

| Route | Rôle |
| --- | --- |
| `GET /health` | État du serveur |
| `GET /auth/config` | Client ID GitHub et mode démo |
| `POST /auth/github` · `POST /auth/dev` | Connexion, renvoie un jeton de session |
| `POST /auth/logout` · `GET /me` | Déconnexion, compte connecté |
| `POST /requests` | Envoyer une demande (3 par heure maximum) |
| `GET /requests` · `GET /requests/:id` | Mes demandes (le code n'est visible que par son auteur) |
| `POST /requests/:id/close` | Annuler ma demande |
| `GET /solutions/search?q=…&tech=…` | Chercher des fiches (public) |
| `GET/PUT /community/profile` · `GET /community/neighbors` | Maison : ville, pays, technos, porte ouverte/fermée ; voisins réels à leur porte |
| `POST /community/neighbors/ring/:login` | Sonnette : notification temps réel, seulement si la porte est ouverte et la personne connectée |
| `GET /community/passport/:login` · `GET /community/confirmed` | Passeport public (preuves + empreinte SHA-256 recalculable) · fiches confirmées par un test |
| `GET/POST /community/projects` · `…/join` · `…/requests/:login` · `…/tasks` | Vitrine de projets, demande pour rejoindre (l'auteur décide), tableau de tâches réservé aux membres |
| `POST /community/report` | Signaler une fiche ou un projet |
| `GET /community/network` · `GET /community/stats` | Public : villes des aidants à leur porte (sans noms) et dernières aides · compteurs réels |
| `GET /spaces` · `GET/POST /spaces/:id/messages` | Salons par techno (connexion requise, secrets masqués, 1 message toutes les 0,6 s) |
| `GET/POST /spaces/fiche/:id` · `…/utile` · `…/comments` | Commentaires et « utile » sur une fiche |
| `POST /spaces/follow/:login` · `GET /spaces/following` · `GET /spaces/feed` | Suivre un développeur, voir ses aides confirmées |
| WebSocket `/ws` | Radar : `auth`, `disponible`, `pause`, `accepter` (aidant) · `suivre` (demandeur) |
| WebSocket `/ws` | Salle SOS : `rejoindre`, `yjs`, `message`, `resolu` · `proposer`, `relance` (aidant) · `terminal`, `execution`, `reponse`, `reponse-relance` (terminal du demandeur) |

À la réception, le serveur refait le masquage des secrets (au cas où le CLI serait ancien ou contourné), refuse les fichiers sensibles et les chemins hors du projet, et fixe l'effacement du code à 24 h maximum. Une purge tourne toutes les 10 minutes.

## La commande `sos`

```
sos [options] <commande...>
sos login [--dev <pseudo>] [--server <url>]
sos whoami | sos logout | sos send <fichier>

  -a, --add <fichier>  Ajouter un fichier à la demande (répétable)
  -y, --yes            Valider sans poser de question
      --dry-run        Afficher l'aperçu sans rien envoyer
      --json           Afficher la demande au format JSON
      --force          Préparer une demande même si la commande réussit
```

Ce qu'elle fait :

1. Lance la commande et affiche sa sortie en direct.
2. Si la commande plante, récupère les 200 dernières lignes de la sortie, les fichiers cités dans la trace d'erreur, les fichiers de dépendances (`package.json`, `requirements.txt`…) et les fichiers ajoutés avec `--add`. Limite : 10 fichiers, 200 Ko.
3. N'envoie jamais `.env*`, `*.pem`, `*.key`, les clés SSH, `.npmrc`… même avec `--add`. Respecte `.gitignore`.
4. Masque les secrets **sur ta machine** : clés connues (AWS, GitHub, Stripe, IA, Slack, Google, JWT), clés privées, mots de passe dans les URL, en-têtes `Authorization`, affectations du type `password=` ou `API_KEY =`, et les chaînes qui ont l'air aléatoires (calcul d'entropie).
5. Affiche les fiches qui ressemblent à l'erreur (seule la ligne d'erreur masquée est envoyée pour cette recherche). Si l'une règle le problème, rien n'est envoyé.
6. Affiche l'aperçu exact de la demande. Tu peux retirer des fichiers, puis tu valides.

7. Envoie la demande au serveur, puis attend un aidant en direct (`--no-wait` pour ne pas attendre). Si tu n'es pas connecté ou si le serveur est injoignable, elle est gardée dans `~/.sos/demandes/` et tu peux la renvoyer avec `sos send`.
8. Quand un aidant accepte, reste ouvert et relie ton terminal à la salle SOS (corrections validées par `o/n`, relances sur Entrée, chat).

## Vérifications

```bash
npm run typecheck
npm test
npm run build
npm run audit:licenses
```

Les tests PostgreSQL ne tournent que si `TEST_DATABASE_URL` pointe vers une base jetable (le schéma est effacé) : `TEST_DATABASE_URL=postgres://sos:sos@localhost:5432/sos npm test`.

L'intégration continue (`.github/workflows/ci.yml`) lance les mêmes vérifications à chaque push, avec une base PostgreSQL. L'audit parcourt toutes les dépendances, y compris les indirectes, et échoue si une licence GPL, AGPL ou LGPL apparaît.
