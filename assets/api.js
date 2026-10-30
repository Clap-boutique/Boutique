/* Couche d'accès au backend Apps Script — avec mode démo si aucune URL n'est configurée */
(function () {
  const URL_API = (window.CLAP_CONFIG && window.CLAP_CONFIG.API_URL || '').trim();
  const DEMO = !URL_API;

  async function get(params) {
    if (DEMO) return Demo.get(params);
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(URL_API + '?' + qs, { method: 'GET' });
    return verifier(await r.json());
  }

  async function post(data) {
    if (DEMO) return Demo.post(data);
    // text/plain = pas de pré-requête CORS avec Apps Script
    const r = await fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
    return verifier(await r.json());
  }

  function verifier(j) {
    if (!j || j.ok === false) throw new Error((j && j.erreur) || 'Erreur serveur');
    return j;
  }

  /* ---------------- Mode démo ---------------- */
  const H = 'XS (H),XS (F),S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XL (F),XXL (H),XXL (F)'.split(',');
  const p = (id, categorie, article, description, tailles, prixMembre, prixPublic, actif = true) =>
    ({ id, categorie, article, description, tailles: typeof tailles === 'string' ? tailles.split(',') : tailles, prixMembre, prixPublic, image: '', actif });
  const etat = {
    params: {
      boutique_ouverte: true,
      message_accueil: 'Bienvenue dans la boutique du club ! Choisissez vos articles, la commande est groupée et vous serez prévenu à réception.',
      message_fermeture: 'La boutique est fermée pour le moment.',
      modes_reglement: 'Carte bleue, Virement, Chèque, Espèces',
      infos_reglement: 'Le règlement s\'effectue auprès du bureau du club lors de la remise.',
      email_notification: '', mot_de_passe_admin: 'demo',
      lien_facebook: 'https://www.facebook.com/groups/260511518285463/', quantite_max_ligne: 5
    },
    produits: [
      p('chemise', 'Vêtements', 'Chemise', 'Chemise brodée CLAP.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 40, null),
      p('softshell', 'Vêtements', 'Softshell homme', 'Veste softshell coupe-vent, logo CLAP.', 'S,M,L,XL,XXL,XXXL', 60, 75),
      p('doudoune-sm', 'Vêtements', 'Doudoune sans manches homme', 'Doudoune sans manches légère.', 'XS,S,M,L,XL,XXL', 60, 75),
      p('doudoune-am', 'Vêtements', 'Doudoune avec manches', 'Doudoune avec manches, coupes homme et femme.', H, 75, 90),
      p('blouson', 'Vêtements', 'Blouson', 'Blouson CLAP.', 'S (H),S (F),M (H),M (F),L (H),L (F)', null, null, false),
      p('tshirt-mc', 'T-shirts & polos', 'T-shirt manches courtes', 'T-shirt manches courtes logo CLAP.', 'XS,S,M,L,XL,XXL', 15, 25),
      p('polo-mc', 'T-shirts & polos', 'Polo manches courtes', 'Polo brodé, coupes homme et femme.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 30, 40),
      p('polo-ml', 'T-shirts & polos', 'Polo manches longues', 'Polo manches longues brodé.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 35, 45),
      p('casquette', 'Accessoires', 'Casquette', 'Casquette brodée CLAP.', 'Unique', 10, 15),
      p('bonnet', 'Accessoires', 'Bonnet', 'Bonnet brodé CLAP.', 'Unique', 10, 15),
      p('parapluie', 'Accessoires', 'Parapluie', 'Parapluie aux couleurs du club.', 'Unique', 20, 30),
      p('tour-de-cou', 'Accessoires', 'Tour de cou', 'Tour de cou / lanyard CLAP.', 'Unique', 3, 5),
      p('ecusson', 'Accessoires', 'Écusson', 'Écusson brodé du club.', 'Unique', 9, 12)
    ],
    commandes: [], lignes: [], n: 0
  };
  const statuts = ['À traiter', 'Confirmée', 'En attente', 'Remise', 'Annulée'];
  function cmd(nom, prenom, membre, panier, statut, paye, regl) {
    const lignes = panier.map(([id, taille, qte]) => { const pr = etat.produits.find(x => x.id === id); return { article: pr.article, taille, qte, pu: membre ? (pr.prixMembre ?? pr.prixPublic) : pr.prixPublic }; });
    const numero = 'CLAP-' + String(++etat.n).padStart(4, '0');
    const total = lignes.reduce((s, l) => s + l.qte * l.pu, 0);
    etat.commandes.push({ numero, date: new Date(Date.now() - (5 - etat.n) * 86400000).toISOString(), nom, prenom, telephone: '06 00 00 00 0' + etat.n, email: prenom.toLowerCase() + '@exemple.fr', membre: membre ? 'Membre' : 'Non membre', detail: lignes.map(l => l.qte + ' × ' + l.article + (l.taille !== 'Unique' ? ' (' + l.taille + ')' : '')).join('\n'), total, reglement: regl, paye, statut, preparee: false, dateRemise: '', commentaire: '', notes: '' });
    lignes.forEach(l => etat.lignes.push({ numero, client: nom + ' ' + prenom, ...l }));
    return { numero, total };
  }
  cmd('MARTIN', 'Sophie', true, [['doudoune-am', 'M (F)', 1], ['casquette', 'Unique', 2]], 'À traiter', false, 'Carte bleue');
  cmd('DURAND', 'Paul', true, [['softshell', 'L', 1]], 'Confirmée', true, 'Virement');
  cmd('LEROY', 'Marc', false, [['polo-mc', 'XL (H)', 2], ['ecusson', 'Unique', 1]], 'En attente', true, 'Chèque');
  cmd('PETIT', 'Julie', true, [['tshirt-mc', 'S', 3]], 'À traiter', false, 'Espèces');

  const attendre = (ms = 350) => new Promise(r => setTimeout(r, ms));
  const Demo = {
    async get(q) {
      await attendre();
      if (q.action === 'suivi') return Demo.post(q);
      const pr = etat.params;
      return { ok: true, demo: true, boutiqueOuverte: !!pr.boutique_ouverte, messageAccueil: pr.message_accueil, messageFermeture: pr.message_fermeture,
        modesReglement: pr.modes_reglement.split(',').map(s => s.trim()), lienFacebook: pr.lien_facebook, quantiteMax: Number(pr.quantite_max_ligne) || 5,
        produits: etat.produits.filter(x => x.actif && (x.prixMembre != null || x.prixPublic != null)) };
    },
    async post(d) {
      await attendre();
      if (d.action === 'commande') {
        const membre = !!d.client.membre;
        const panier = d.panier.map(l => [l.id, l.taille, l.qte]);
        for (const [id] of panier) { const pr = etat.produits.find(x => x.id === id); if (!membre && pr.prixPublic == null) throw new Error('« ' + pr.article + ' » est réservé aux membres du club.'); }
        const r = cmd(d.client.nom.toUpperCase(), d.client.prenom, membre, panier, 'À traiter', false, d.client.reglement);
        const c = etat.commandes[etat.commandes.length - 1]; c.email = d.client.email.toLowerCase(); c.commentaire = d.client.commentaire || '';
        return { ok: true, ...r };
      }
      if (d.action === 'suivi') {
        let n = String(d.numero || '').trim().toUpperCase(); if (/^\d+$/.test(n)) n = 'CLAP-' + n.padStart(4, '0');
        const c = etat.commandes.find(x => x.numero === n && x.email === String(d.email).trim().toLowerCase());
        if (!c) throw new Error('Aucune commande trouvée avec ce numéro et cette adresse e-mail.');
        return { ok: true, numero: c.numero, date: c.date, statut: c.statut, paye: c.paye, detail: c.detail, total: c.total };
      }
      if (d.motDePasse !== etat.params.mot_de_passe_admin) throw new Error('Mot de passe incorrect. (démo : « demo »)');
      switch (d.action) {
        case 'admin_login': return { ok: true };
        case 'admin_donnees': return { ok: true, commandes: structuredClone(etat.commandes), lignes: structuredClone(etat.lignes), produits: structuredClone(etat.produits), params: { ...etat.params }, statuts };
        case 'admin_maj_commande': { const c = etat.commandes.find(x => x.numero === d.numero); Object.assign(c, d.maj); if (d.maj.statut === 'Remise' && !c.dateRemise) c.dateRemise = new Date().toISOString(); return { ok: true }; }
        case 'admin_maj_statut_lot': { let nb = 0; etat.commandes.forEach(c => { if (d.numeros ? d.numeros.includes(c.numero) : c.statut === d.ancien) { c.statut = d.nouveau; nb++; } }); return { ok: true, nb }; }
        case 'admin_catalogue': etat.produits = structuredClone(d.produits); return { ok: true };
        case 'admin_params': Object.entries(d.params).forEach(([k, v]) => { if (k === 'mot_de_passe_admin' && !String(v).trim()) return; etat.params[k] = v; }); return { ok: true };
      }
      throw new Error('Action inconnue');
    }
  };

  /* ---------------- Utilitaires partagés ---------------- */
  const euros = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const echap = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Accepte un lien de partage Google Drive et le convertit en image affichable */
  function imageUrl(u) {
    u = String(u || '').trim();
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800' : u;
  }
  function toast(msg, type = '') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast show ' + type;
    clearTimeout(t._h); t._h = setTimeout(() => t.className = 'toast ' + type, 3200);
  }

  window.API = { get, post, DEMO };
  window.U = { euros, echap, imageUrl, toast };
})();
