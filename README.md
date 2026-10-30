# La boutique du CLAP

Boutique en ligne du **Club Légende Auto Passion** : catalogue, commande en ligne, suivi de commande et espace admin.
Hébergement **100 % gratuit** : site sur GitHub Pages, données dans un Google Sheet.

- `index.html` — la boutique (tarif membre / public, panier, commande, suivi)
- `admin.html` — l'espace admin (tableau de bord, commandes, récap fournisseur, catalogue, paramètres)
- `apps-script/Code.gs` — le « serveur » à coller dans le Google Sheet
- `assets/config.js` — l'adresse du serveur (seul fichier à modifier)

Sans adresse dans `config.js`, le site tourne en **mode démo** (mot de passe admin : `demo`).

---

## Installation (≈ 10 minutes)

> Conseil : faites tout depuis un **compte Google du club** (ex. boutique.clap@gmail.com) : les e-mails de confirmation partent de ce compte.

### 1. Le Google Sheet
1. Créez un Google Sheet vide nommé « Boutique du CLAP ».
2. Menu **Extensions → Apps Script**. Effacez le contenu et collez tout le fichier `apps-script/Code.gs`. Enregistrez.
3. Choisissez la fonction **`setup`** dans la liste, puis cliquez sur **Exécuter**. Autorisez l'accès (« Paramètres avancés → Accéder au projet »).
   Les onglets *Catalogue, Commandes, Lignes, À commander, Paramètres* sont créés avec le catalogue actuel.
4. Dans l'onglet **Paramètres**, changez `mot_de_passe_admin` et renseignez `email_notification` (adresse qui reçoit une alerte à chaque commande).

### 2. Publier le serveur
1. Dans Apps Script : **Déployer → Nouveau déploiement → Type : Application Web**.
2. *Exécuter en tant que* : **Moi**. *Qui a accès* : **Tout le monde**.
3. Copiez l'URL qui se termine par `/exec`.
4. Collez-la dans `assets/config.js` :
   ```js
   window.CLAP_CONFIG = { API_URL: 'https://script.google.com/macros/s/XXXX/exec' };
   ```

> Après une modification de `Code.gs` : **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version**, pour garder la même URL.

### 3. Mettre en ligne
Dans le dépôt GitHub : **Settings → Pages → Branch : `main` / root → Save**.
La boutique est en ligne à `https://<organisation>.github.io/<dépôt>/` et l'admin à `…/admin.html`.

### 4. (Facultatif) Reprendre les commandes de l'ancien formulaire
Dans `Code.gs`, renseignez `ID_ANCIEN_SHEET` (l'identifiant du Sheet des réponses, entre `/d/` et `/edit` dans son URL), puis exécutez `importerAncienFormulaire`.

---

## Utilisation au quotidien

| Étape | Où | Action |
|---|---|---|
| Un membre commande | Boutique | Il reçoit un e-mail avec son n° `CLAP-0001` ; la commande est **À traiter** |
| Validation | Admin → *Commandes* ou *À commander* | Passer en **Confirmée** (une par une ou en lot) |
| Attente fournisseur / stock | Admin → *À commander → Confirmées* | Récap par article et taille → bouton « passer En attente » |
| Remise au membre | Admin → *Commandes* | Fiche → statut **Remise**, interrupteur **Payée** |

- **Catalogue** : ajouter/masquer un article, changer les prix, les tailles et la photo (un lien de partage Google Drive est accepté). Prix public vide = article réservé aux membres.
- **Paramètres** : ouvrir ou fermer la boutique, textes, modes de règlement, mot de passe.
- Tout reste aussi modifiable directement dans le Google Sheet.

© CLAP — Club Légende Auto Passion
