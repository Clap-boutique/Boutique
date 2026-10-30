(function () {
  const { euros, echap, imageUrl, toast } = window.U;
  const $ = s => document.querySelector(s);
  const store = {
    lire(k, d) { try { const v = localStorage.getItem('clap_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    ecrire(k, v) { try { localStorage.setItem('clap_' + k, JSON.stringify(v)); } catch (e) {} }
  };

  let data = null;
  let membre = store.lire('membre', true);
  let panier = store.lire('panier', []);            // [{id, taille, qte}]
  let filtre = 'Tous';
  const choix = {};                                  // id -> {taille, qte}
  let etape = 'panier';                              // panier | infos | ok
  let dernierClient = store.lire('client', {});

  $('#annee').textContent = new Date().getFullYear();
  if (window.API.DEMO) $('#demo').classList.remove('cache');

  /* ---------- Prix ---------- */
  const prixDe = p => membre ? (p.prixMembre ?? p.prixPublic) : p.prixPublic;
  const produit = id => data.produits.find(p => p.id === id);
  const lignesValides = () => panier.filter(l => produit(l.id));
  const totalPanier = () => lignesValides().reduce((s, l) => s + (prixDe(produit(l.id)) || 0) * l.qte, 0);
  const nbArticles = () => lignesValides().reduce((s, l) => s + l.qte, 0);

  /* ---------- Chargement ---------- */
  async function charger() {
    try {
      data = await window.API.get({ action: 'catalogue' });
      $('#accueil').textContent = data.messageAccueil || '';
      if (data.lienFacebook) $('#lienFb').href = data.lienFacebook; else $('#lienFb').remove();
      panier = panier.filter(l => produit(l.id) && produit(l.id).tailles.includes(l.taille));
      majMembre();
      rendreFiltres();
      rendreCatalogue();
      majPanier();
    } catch (e) {
      $('#catalogue').innerHTML = '<div class="ferme"><h2>Boutique indisponible</h2><p>' + echap(e.message) + '</p><p class="note">Réessayez dans quelques instants.</p></div>';
    }
  }

  /* ---------- Membre ---------- */
  document.querySelectorAll('[data-membre]').forEach(b => b.addEventListener('click', () => {
    membre = b.dataset.membre === '1';
    store.ecrire('membre', membre);
    majMembre(); rendreCatalogue(); majPanier();
  }));
  function majMembre() {
    document.querySelectorAll('[data-membre]').forEach(b => b.classList.toggle('actif', (b.dataset.membre === '1') === membre));
  }

  /* ---------- Filtres ---------- */
  function rendreFiltres() {
    const cats = ['Tous', ...new Set(data.produits.map(p => p.categorie))];
    $('#filtres').innerHTML = cats.map(c => `<button class="chip ${c === filtre ? 'actif' : ''}" data-cat="${echap(c)}">${echap(c)}</button>`).join('');
    $('#filtres').querySelectorAll('.chip').forEach(b => b.onclick = () => { filtre = b.dataset.cat; rendreFiltres(); rendreCatalogue(); });
  }

  /* ---------- Catalogue ---------- */
  function rendreCatalogue() {
    const el = $('#catalogue');
    if (!data.boutiqueOuverte) {
      el.innerHTML = `<div class="ferme"><img src="assets/logo.png" alt="" style="width:90px;margin:0 auto 12px"><h2>Boutique fermée</h2><p>${echap(data.messageFermeture)}</p></div>`;
      $('#btnPanier').classList.add('cache');
      return;
    }
    const prods = data.produits.filter(p => filtre === 'Tous' || p.categorie === filtre);
    const parCat = {};
    prods.forEach(p => (parCat[p.categorie] = parCat[p.categorie] || []).push(p));
    el.innerHTML = Object.entries(parCat).map(([cat, ps]) =>
      `<h2 class="section-titre">${echap(cat)}</h2><div class="grille">${ps.map(carte).join('')}</div>`).join('') ||
      '<div class="vide">Aucun article pour le moment.</div>';
    el.querySelectorAll('.produit').forEach(brancherCarte);
  }

  function carte(p) {
    const c = choix[p.id] || (choix[p.id] = { taille: p.tailles.length === 1 ? p.tailles[0] : '', qte: 1 });
    const prix = prixDe(p);
    const reserve = p.prixPublic == null;
    const visuel = p.image
      ? `<img class="photo" src="${echap(imageUrl(p.image))}" alt="${echap(p.article)}" loading="lazy">`
      : `<img class="filigrane" src="assets/logo.png" alt="">`;
    let prixHtml;
    if (prix == null) prixHtml = `<div class="prix"><span class="info">Réservé aux membres du club</span></div>`;
    else if (membre && p.prixPublic != null && p.prixMembre != null && p.prixMembre < p.prixPublic)
      prixHtml = `<div class="prix"><strong>${euros(prix)}</strong><span class="barre">${euros(p.prixPublic)}</span><span class="info">tarif membre</span></div>`;
    else prixHtml = `<div class="prix"><strong>${euros(prix)}</strong>${!membre && p.prixMembre != null && p.prixMembre < prix ? `<span class="info">${euros(p.prixMembre)} pour les membres</span>` : ''}</div>`;
    const tailles = p.tailles.length === 1 && p.tailles[0] === 'Unique' ? '<span class="note">Taille unique</span>' :
      p.tailles.map(t => `<button type="button" class="taille ${c.taille === t ? 'choisie' : ''}" data-t="${echap(t)}">${echap(t)}</button>`).join('');
    return `<article class="produit" data-id="${echap(p.id)}">
      <div class="produit-visuel">${visuel}${reserve ? '<span class="etiquette membres">Membres</span>' : ''}</div>
      <div class="produit-corps">
        <h3 class="produit-nom">${echap(p.article)}</h3>
        ${p.description ? `<p class="produit-desc">${echap(p.description)}</p>` : ''}
        ${prixHtml}
        <div class="tailles">${tailles}</div>
        <div class="ajout">
          <div class="qte"><button type="button" data-q="-1" aria-label="Moins">−</button><span>${c.qte}</span><button type="button" data-q="1" aria-label="Plus">+</button></div>
          <button type="button" class="btn btn-orange btn-plein" data-ajout ${prix == null ? 'disabled' : ''}>Ajouter</button>
        </div>
      </div>
    </article>`;
  }

  function brancherCarte(el) {
    const p = produit(el.dataset.id);
    const c = choix[p.id];
    el.querySelectorAll('.taille').forEach(b => b.onclick = () => {
      c.taille = b.dataset.t;
      el.querySelectorAll('.taille').forEach(x => x.classList.toggle('choisie', x === b));
    });
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
      c.qte = Math.min(data.quantiteMax || 5, Math.max(1, c.qte + Number(b.dataset.q)));
      el.querySelector('.qte span').textContent = c.qte;
    });
    el.querySelector('[data-ajout]').onclick = () => {
      if (!c.taille) { toast('Choisissez une taille', 'err'); el.querySelector('.tailles').animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; }
      const ex = panier.find(l => l.id === p.id && l.taille === c.taille);
      const max = data.quantiteMax || 5;
      if (ex) {
        if (ex.qte + c.qte > max) toast(`Maximum ${max} par taille — au-delà, précisez-le en commentaire`, 'err');
        ex.qte = Math.min(max, ex.qte + c.qte);
      } else panier.push({ id: p.id, taille: c.taille, qte: c.qte });
      sauverPanier();
      toast(`${p.article}${c.taille !== 'Unique' ? ' (' + c.taille + ')' : ''} ajouté au panier`);
      c.qte = 1; el.querySelector('.qte span').textContent = 1;
    };
  }

  /* ---------- Panier ---------- */
  function sauverPanier() { store.ecrire('panier', panier); majPanier(); }
  function majPanier() {
    if (!data) return;
    const n = nbArticles();
    $('#nbPanier').textContent = n;
    $('#totalMobile').textContent = n ? n + ' art. · ' + euros(totalPanier()) : '';
    $('#barrePanier').classList.toggle('visible', n > 0 && data.boutiqueOuverte && !$('#tiroir').classList.contains('ouvert'));
    if ($('#tiroir').classList.contains('ouvert') && etape !== 'ok') rendreTiroir();
  }

  function ouvrir() { etape = 'panier'; $('#tiroir').classList.add('ouvert'); $('#voile').classList.add('ouvert'); rendreTiroir(); majPanier(); }
  function fermer() { $('#tiroir').classList.remove('ouvert'); $('#voile').classList.remove('ouvert'); if (etape === 'ok') etape = 'panier'; majPanier(); }
  $('#btnPanier').onclick = ouvrir; $('#btnPanierMobile').onclick = ouvrir;
  $('#fermerTiroir').onclick = fermer; $('#voile').onclick = fermer;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { fermer(); $('#modaleSuivi').classList.add('cache'); } });

  function rendreTiroir() {
    const corps = $('#tiroirCorps'), pied = $('#tiroirPied');
    if (etape === 'panier') {
      $('#tiroirTitre').textContent = 'Mon panier';
      const lignes = lignesValides();
      if (!lignes.length) { corps.innerHTML = '<div class="vide"><div style="font-size:40px">🛒</div>Votre panier est vide.</div>'; pied.innerHTML = ''; return; }
      corps.innerHTML = lignes.map((l, i) => {
        const p = produit(l.id), pu = prixDe(p);
        return `<div class="ligne-panier">
          <div><div class="nom">${echap(p.article)}</div><div class="sous">${l.taille !== 'Unique' ? 'Taille ' + echap(l.taille) + ' · ' : ''}${pu == null ? '<span style="color:var(--rouge)">réservé aux membres</span>' : euros(pu) + ' l\'unité'}</div></div>
          <div class="montant">${pu == null ? '—' : euros(pu * l.qte)}</div>
          <div class="qte"><button data-i="${i}" data-d="-1">−</button><span>${l.qte}</span><button data-i="${i}" data-d="1">+</button></div>
          <div class="actions"><button class="lien" data-suppr="${i}">Retirer</button></div>
        </div>`;
      }).join('') + `<p class="note" style="margin-top:14px">Tarif ${membre ? '<b>membre</b>' : '<b>public</b>'} appliqué. Commande groupée : vous serez prévenu à la réception des articles.</p>`;
      const bloque = lignes.some(l => prixDe(produit(l.id)) == null);
      pied.innerHTML = `<div class="total"><span>Total</span><strong>${euros(totalPanier())}</strong></div>
        ${bloque ? '<div class="erreur">Certains articles sont réservés aux membres : retirez-les ou indiquez que vous êtes membre.</div>' : ''}
        <button class="btn btn-orange" id="versInfos" ${bloque ? 'disabled' : ''}>Valider ma commande</button>`;
      corps.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
        const l = lignes[b.dataset.i];
        l.qte = Math.min(data.quantiteMax || 5, l.qte + Number(b.dataset.d));
        if (l.qte < 1) panier.splice(panier.indexOf(l), 1);
        sauverPanier();
      });
      corps.querySelectorAll('[data-suppr]').forEach(b => b.onclick = () => { panier.splice(panier.indexOf(lignes[b.dataset.suppr]), 1); sauverPanier(); });
      $('#versInfos').onclick = () => { etape = 'infos'; rendreTiroir(); };
    }
    else if (etape === 'infos') {
      $('#tiroirTitre').textContent = 'Vos coordonnées';
      const c = dernierClient;
      corps.innerHTML = `<form id="formCmd" novalidate>
        <div class="deux">
          <div class="champ"><label for="fNom">Nom *</label><input id="fNom" required autocomplete="family-name" value="${echap(c.nom || '')}"></div>
          <div class="champ"><label for="fPrenom">Prénom *</label><input id="fPrenom" required autocomplete="given-name" value="${echap(c.prenom || '')}"></div>
        </div>
        <div class="champ"><label for="fTel">Téléphone *</label><input id="fTel" type="tel" required autocomplete="tel" value="${echap(c.telephone || '')}"></div>
        <div class="champ"><label for="fMail">E-mail *</label><input id="fMail" type="email" required autocomplete="email" value="${echap(c.email || '')}"><span class="note">Un récapitulatif de commande vous sera envoyé.</span></div>
        <div class="champ"><label>Membre du CLAP</label><div class="note"><b>${membre ? 'Oui' : 'Non'}</b> — modifiable en haut de la page</div></div>
        <div class="champ"><label for="fRegl">Mode de règlement prévu *</label><select id="fRegl" required>
          <option value="">Choisir…</option>${(data.modesReglement || []).map(m => `<option ${c.reglement === m ? 'selected' : ''}>${echap(m)}</option>`).join('')}</select></div>
        <div class="champ"><label for="fCom">Commentaire (facultatif)</label><textarea id="fCom" rows="3" placeholder="Ex. : plus de ${data.quantiteMax || 5} pièces sur une taille, précision…"></textarea></div>
        <div id="errCmd"></div>
      </form>`;
      pied.innerHTML = `<div class="total"><span>${nbArticles()} article(s)</span><strong>${euros(totalPanier())}</strong></div>
        <div style="display:flex;gap:8px"><button class="btn btn-gris" id="retour">Retour</button><button class="btn btn-orange btn-plein" id="envoyer">Envoyer ma commande</button></div>`;
      $('#retour').onclick = () => { etape = 'panier'; rendreTiroir(); };
      $('#envoyer').onclick = envoyer;
    }
  }

  async function envoyer() {
    const v = id => $(id).value.trim();
    const client = { nom: v('#fNom'), prenom: v('#fPrenom'), telephone: v('#fTel'), email: v('#fMail'), reglement: v('#fRegl'), commentaire: v('#fCom'), membre };
    const err = $('#errCmd');
    const manque = [['nom', 'Nom'], ['prenom', 'Prénom'], ['telephone', 'Téléphone'], ['email', 'E-mail'], ['reglement', 'Mode de règlement']].filter(([k]) => !client[k]).map(x => x[1]);
    if (manque.length) { err.innerHTML = `<div class="erreur">À compléter : ${manque.join(', ')}</div>`; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client.email)) { err.innerHTML = '<div class="erreur">Adresse e-mail invalide.</div>'; return; }
    const b = $('#envoyer'); b.disabled = true; b.innerHTML = '<span class="roue" style="width:18px;height:18px;border-width:2px"></span> Envoi…';
    try {
      const r = await window.API.post({ action: 'commande', client, panier: lignesValides() });
      dernierClient = { nom: client.nom, prenom: client.prenom, telephone: client.telephone, email: client.email, reglement: client.reglement };
      store.ecrire('client', dernierClient);
      const mesCmd = store.lire('commandes', []); mesCmd.unshift({ numero: r.numero, email: client.email }); store.ecrire('commandes', mesCmd.slice(0, 10));
      panier = []; sauverPanier();
      etape = 'ok';
      $('#tiroirTitre').textContent = 'Merci !';
      $('#tiroirCorps').innerHTML = `<div class="succes"><div class="coche">✓</div>
        <p>Votre commande est enregistrée</p><div class="num">${echap(r.numero)}</div>
        <p style="font-size:22px;font-weight:700;margin:6px 0">${euros(r.total)}</p>
        <p class="note">Un récapitulatif a été envoyé à <b>${echap(client.email)}</b>.<br>Conservez votre numéro pour suivre votre commande.</p></div>`;
      $('#tiroirPied').innerHTML = '<button class="btn btn-orange" id="fini">Continuer mes achats</button>';
      $('#fini').onclick = fermer;
    } catch (e) {
      err.innerHTML = `<div class="erreur">${echap(e.message)}</div>`;
      b.disabled = false; b.textContent = 'Envoyer ma commande';
    }
  }

  /* ---------- Suivi ---------- */
  const STATUTS = ['À traiter', 'Commandée', 'Reçue', 'Remise'];
  const classeStatut = s => 's-' + String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/-$/, '');
  const LIBELLES = { 'À traiter': 'Commande reçue par le club', 'Commandée': 'Commandée chez le fournisseur', 'Reçue': 'Arrivée au club — prête à être remise', 'Remise': 'Remise — bonne route !', 'Annulée': 'Commande annulée' };
  $('#btnSuivi').onclick = () => {
    const d = store.lire('commandes', [])[0];
    if (d && !$('#sNum').value) { $('#sNum').value = d.numero; $('#sMail').value = d.email; }
    $('#resSuivi').innerHTML = '';
    $('#modaleSuivi').classList.remove('cache');
  };
  $('#modaleSuivi').addEventListener('click', e => { if (e.target.id === 'modaleSuivi' || e.target.hasAttribute('data-fermer')) $('#modaleSuivi').classList.add('cache'); });
  $('#formSuivi').onsubmit = async e => {
    e.preventDefault();
    const res = $('#resSuivi');
    res.innerHTML = '<div class="chargement" style="padding:16px"><div class="roue"></div></div>';
    try {
      const r = await window.API.post({ action: 'suivi', numero: $('#sNum').value, email: $('#sMail').value });
      const idx = STATUTS.indexOf(r.statut);
      res.innerHTML = `<div style="background:var(--fond);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center"><b>${echap(r.numero)}</b><span class="statut ${classeStatut(r.statut)}">${echap(r.statut)}</span></div>
        ${r.statut !== 'Annulée' ? `<div class="etapes">${STATUTS.map((s, i) => `<div class="${i <= idx ? 'ok' : ''}"></div>`).join('')}</div>` : ''}
        <p style="margin:4px 0 8px;font-weight:600">${echap(LIBELLES[r.statut] || '')}</p>
        <div class="note" style="white-space:pre-line">${echap(r.detail)}</div>
        <p style="margin:8px 0 0"><b>${euros(r.total)}</b> · ${r.paye ? '✅ Réglée' : '⏳ Règlement en attente'}</p></div>`;
    } catch (err) { res.innerHTML = `<div class="erreur" style="margin-bottom:12px">${echap(err.message)}</div>`; }
  };

  charger();
})();
