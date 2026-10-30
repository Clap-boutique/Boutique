(function () {
  const { euros, echap, imageUrl, toast } = window.U;
  const $ = s => document.querySelector(s);
  const ss = {
    get(k) { try { return sessionStorage.getItem('clap_' + k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? sessionStorage.removeItem('clap_' + k) : sessionStorage.setItem('clap_' + k, v); } catch (e) {} }
  };
  const STATUTS = ['À traiter', 'Commandée', 'Reçue', 'Remise', 'Annulée'];
  const classeStatut = s => 's-' + String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/-$/, '');
  const dateFr = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };

  let mdp = ss.get('mdp');
  let D = null;                   // données
  let vue = 'bord';
  const filtres = { q: '', statut: '', paye: '' };
  const selection = new Set();
  let modeFournisseur = 'À traiter';
  let catalogueBrouillon = null;

  $('#annee').textContent = new Date().getFullYear();
  if (window.API.DEMO) $('#demo').classList.remove('cache');

  const api = (action, extra = {}) => window.API.post({ action, motDePasse: mdp, ...extra });

  /* ---------- Connexion ---------- */
  $('#formLogin').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true;
    try {
      mdp = $('#mdp').value;
      await api('admin_login');
      ss.set('mdp', mdp);
      demarrer();
    } catch (err) { $('#errLogin').innerHTML = `<div class="erreur" style="margin-bottom:12px">${echap(err.message)}</div>`; }
    b.disabled = false;
  };
  $('#btnDeco').onclick = () => { ss.set('mdp', null); location.reload(); };

  async function demarrer() {
    $('#ecranLogin').classList.add('cache');
    $('#ecranApp').classList.remove('cache');
    await charger();
  }
  async function charger() {
    try {
      D = await api('admin_donnees');
      catalogueBrouillon = null;
      rendre();
    } catch (err) {
      if (/mot de passe/i.test(err.message)) { ss.set('mdp', null); location.reload(); return; }
      $('#vue').innerHTML = `<div class="erreur" style="margin-top:20px">${echap(err.message)}</div>`;
    }
  }
  $('#btnRafraichir').onclick = async () => { $('#btnRafraichir').disabled = true; await charger(); $('#btnRafraichir').disabled = false; toast('Données actualisées'); };

  $('#onglets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (vue === 'catalogue' && catalogueBrouillon && catalogueBrouillon.modifie && !confirm('Des modifications du catalogue ne sont pas enregistrées. Quitter quand même ?')) return;
    vue = b.dataset.v;
    document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('actif', x === b));
    rendre();
  });

  function rendre() {
    if (!D) return;
    ({ bord: vueBord, commandes: vueCommandes, fournisseur: vueFournisseur, catalogue: vueCatalogue, params: vueParams })[vue]();
  }

  /* ---------- Tableau de bord ---------- */
  function vueBord() {
    const actives = D.commandes.filter(c => c.statut !== 'Annulée');
    const total = actives.reduce((s, c) => s + c.total, 0);
    const encaisse = actives.filter(c => c.paye).reduce((s, c) => s + c.total, 0);
    const nbArt = D.lignes.filter(l => statutDe(l.numero) !== 'Annulée').reduce((s, l) => s + l.qte, 0);
    const parStatut = STATUTS.map(s => [s, D.commandes.filter(c => c.statut === s).length]);
    const max = Math.max(1, ...parStatut.map(x => x[1]));
    const aTraiter = D.commandes.filter(c => c.statut === 'À traiter').length;
    const recues = D.commandes.filter(c => c.statut === 'Reçue').length;
    const top = Object.entries(D.lignes.filter(l => statutDe(l.numero) !== 'Annulée').reduce((o, l) => (o[l.article] = (o[l.article] || 0) + l.qte, o), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('#vue').innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Commandes</span><strong>${actives.length}</strong></div>
        <div class="kpi"><span>Articles</span><strong>${nbArt}</strong></div>
        <div class="kpi accent"><span>Montant total</span><strong>${euros(total)}</strong></div>
        <div class="kpi"><span>Encaissé</span><strong style="color:var(--vert)">${euros(encaisse)}</strong></div>
        <div class="kpi"><span>Reste à encaisser</span><strong style="color:var(--rouge)">${euros(total - encaisse)}</strong></div>
      </div>
      ${!D.params.boutique_ouverte || String(D.params.boutique_ouverte) === 'false' ? '<div class="alerte" style="margin-top:16px">La boutique est actuellement <b>fermée</b> aux commandes (onglet Paramètres).</div>' : ''}
      ${D.params.mot_de_passe_admin === 'clap2026' ? '<div class="alerte" style="margin-top:16px">⚠️ Le mot de passe admin par défaut est toujours utilisé : changez-le dans Paramètres.</div>' : ''}
      <div class="panneau"><h3>Par statut</h3><div class="barres">
        ${parStatut.map(([s, n]) => `<div class="barre-l"><span class="statut ${classeStatut(s)}">${s}</span><div class="piste"><div style="width:${n / max * 100}%"></div></div><b>${n}</b></div>`).join('')}
      </div></div>
      <div class="panneau"><h3>À faire</h3>
        <p style="margin:0 0 6px">📋 <b>${aTraiter}</b> commande(s) à passer chez le fournisseur — <a href="#" data-aller="fournisseur">voir le récapitulatif</a></p>
        <p style="margin:0">📦 <b>${recues}</b> commande(s) reçue(s) à remettre — <a href="#" data-aller="commandes" data-statut="Reçue">voir la liste</a></p>
      </div>
      <div class="panneau"><h3>Articles les plus commandés</h3>
        ${top.length ? `<table class="tab"><tbody>${top.map(([a, n]) => `<tr><td>${echap(a)}</td><td class="n">${n}</td></tr>`).join('')}</tbody></table>` : '<p class="note">Aucune commande pour le moment.</p>'}
      </div>`;
    $('#vue').querySelectorAll('[data-aller]').forEach(a => a.onclick = e => {
      e.preventDefault();
      if (a.dataset.statut) filtres.statut = a.dataset.statut;
      document.querySelector(`#onglets [data-v="${a.dataset.aller}"]`).click();
    });
  }
  const statutDe = num => (D.commandes.find(c => c.numero === num) || {}).statut;

  /* ---------- Commandes ---------- */
  function commandesFiltrees() {
    const q = filtres.q.toLowerCase();
    return D.commandes.filter(c =>
      (!filtres.statut || c.statut === filtres.statut) &&
      (!filtres.paye || (filtres.paye === 'oui') === c.paye) &&
      (!q || [c.numero, c.nom, c.prenom, c.email, c.telephone, c.detail].join(' ').toLowerCase().includes(q))
    ).sort((a, b) => String(b.numero).localeCompare(String(a.numero)));
  }
  function vueCommandes() {
    $('#vue').innerHTML = `
      <div class="barre-outils">
        <input type="search" id="q" placeholder="Rechercher (nom, n°, article…)" value="${echap(filtres.q)}">
        <select id="fStatut"><option value="">Tous statuts</option>${STATUTS.map(s => `<option ${filtres.statut === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <select id="fPaye"><option value="">Payé ou non</option><option value="oui" ${filtres.paye === 'oui' ? 'selected' : ''}>Payées</option><option value="non" ${filtres.paye === 'non' ? 'selected' : ''}>Non payées</option></select>
        <div class="droite">
          <button class="btn btn-ligne" id="csv">⬇ Export CSV</button>
          <button class="btn btn-ligne" onclick="print()">🖨 Imprimer</button>
        </div>
      </div>
      <div id="lot" class="panneau no-print cache" style="margin:0 0 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"></div>
      <div class="liste" id="liste"></div>`;
    $('#q').oninput = e => { filtres.q = e.target.value; rendreListe(); };
    $('#fStatut').onchange = e => { filtres.statut = e.target.value; rendreListe(); };
    $('#fPaye').onchange = e => { filtres.paye = e.target.value; rendreListe(); };
    $('#csv').onclick = exporterCsv;
    rendreListe();
  }
  function rendreListe() {
    const l = commandesFiltrees();
    $('#liste').innerHTML = l.length ? l.map(c => `
      <div class="cmd" data-n="${echap(c.numero)}">
        <label class="sel no-print" onclick="event.stopPropagation()"><input type="checkbox" data-sel="${echap(c.numero)}" ${selection.has(c.numero) ? 'checked' : ''}></label>
        <div class="haut"><span class="numero">${echap(c.numero)}</span><b>${echap(c.nom)} ${echap(c.prenom)}</b><span class="statut ${classeStatut(c.statut)}">${echap(c.statut)}</span>${c.membre === 'Membre' ? '' : '<span class="badge b-prep">Non membre</span>'}</div>
        <div class="droite-c"><strong>${euros(c.total)}</strong><span class="badge ${c.paye ? 'b-paye' : 'b-nonpaye'}">${c.paye ? 'Payée' : 'Non payée'}</span>${c.preparee ? '<span class="badge b-prep">Préparée</span>' : ''}</div>
        <div class="detail">${dateFr(c.date)} · ${echap(String(c.detail).replace(/\n/g, ' · '))}</div>
      </div>`).join('') : '<div class="vide">Aucune commande.</div>';
    $('#liste').querySelectorAll('.cmd').forEach(el => el.onclick = () => ouvrirFiche(el.dataset.n));
    $('#liste').querySelectorAll('[data-sel]').forEach(cb => cb.onchange = () => { cb.checked ? selection.add(cb.dataset.sel) : selection.delete(cb.dataset.sel); majLot(); });
    majLot();
  }
  function majLot() {
    const el = $('#lot'); if (!el) return;
    if (!selection.size) { el.classList.add('cache'); return; }
    el.classList.remove('cache');
    el.innerHTML = `<b>${selection.size} sélectionnée(s)</b> — passer en : ${STATUTS.map(s => `<button class="btn btn-gris" data-lot="${s}" style="padding:6px 10px">${s}</button>`).join('')} <button class="lien" id="deselect">Tout désélectionner</button>`;
    el.querySelectorAll('[data-lot]').forEach(b => b.onclick = async () => {
      const numeros = [...selection];
      try {
        const r = await api('admin_maj_statut_lot', { numeros, nouveau: b.dataset.lot });
        D.commandes.forEach(c => { if (numeros.includes(c.numero)) c.statut = b.dataset.lot; });
        selection.clear(); rendreListe(); toast(r.nb + ' commande(s) → ' + b.dataset.lot);
      } catch (e) { toast(e.message, 'err'); }
    });
    $('#deselect').onclick = () => { selection.clear(); rendreListe(); };
  }

  function ouvrirFiche(num) {
    const c = D.commandes.find(x => x.numero === num);
    const lignes = D.lignes.filter(l => l.numero === num);
    $('#tiroirTitre').textContent = c.numero;
    const tel = String(c.telephone).replace(/[^\d+]/g, '');
    $('#tiroirCorps').innerHTML = `<div class="fiche">
      <div class="bloc"><div style="font-size:18px;font-weight:700">${echap(c.nom)} ${echap(c.prenom)}</div>
        <div class="note">${c.membre === 'Membre' ? 'Membre du CLAP' : 'Non membre'} · ${dateFr(c.date)}</div>
        <div style="margin-top:8px;display:grid;gap:4px"><a href="tel:${echap(tel)}">📞 ${echap(c.telephone)}</a><a href="mailto:${echap(c.email)}?subject=${encodeURIComponent('Votre commande ' + c.numero + ' — Boutique du CLAP')}">✉️ ${echap(c.email)}</a></div></div>
      <div><label class="note" style="font-weight:700">Statut</label><div class="statuts" id="stt">${STATUTS.map(s => `<button class="${c.statut === s ? 'actif' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
        ${c.dateRemise ? `<p class="note" style="margin:6px 0 0">Remise le ${new Date(c.dateRemise).toLocaleDateString('fr-FR')}</p>` : ''}</div>
      <div>
        <div class="bascule"><span>Payée <span class="note">(${echap(c.reglement || '—')})</span></span><label class="switch"><input type="checkbox" id="swPaye" ${c.paye ? 'checked' : ''}><span></span></label></div>
        <div class="bascule"><span>Préparée</span><label class="switch"><input type="checkbox" id="swPrep" ${c.preparee ? 'checked' : ''}><span></span></label></div>
      </div>
      <table class="tab"><thead><tr><th>Article</th><th>Qté</th><th style="text-align:right">Montant</th></tr></thead><tbody>
        ${lignes.map(l => `<tr><td>${echap(l.article)}${l.taille !== 'Unique' ? ' <span class="note">' + echap(l.taille) + '</span>' : ''}</td><td>${l.qte}</td><td class="n">${euros(l.qte * l.pu)}</td></tr>`).join('') ||
        `<tr><td colspan="3" style="white-space:pre-line">${echap(c.detail)}</td></tr>`}
        <tr class="groupe"><td colspan="2">Total</td><td class="n">${euros(c.total)}</td></tr></tbody></table>
      ${c.commentaire ? `<div class="bloc"><b>Commentaire du client</b><div style="white-space:pre-line">${echap(c.commentaire)}</div></div>` : ''}
      <div class="champ"><label for="notes">Notes internes</label><textarea id="notes" rows="3">${echap(c.notes || '')}</textarea></div>
    </div>`;
    const maj = async (m, msg) => {
      try { await api('admin_maj_commande', { numero: num, maj: m }); Object.assign(c, m); if (m.statut === 'Remise' && !c.dateRemise) c.dateRemise = new Date().toISOString(); toast(msg); if (vue === 'commandes') rendreListe(); }
      catch (e) { toast(e.message, 'err'); }
    };
    $('#stt').querySelectorAll('button').forEach(b => b.onclick = async () => {
      $('#stt').querySelectorAll('button').forEach(x => x.classList.toggle('actif', x === b));
      await maj({ statut: b.dataset.s }, 'Statut : ' + b.dataset.s);
    });
    $('#swPaye').onchange = e => maj({ paye: e.target.checked }, e.target.checked ? 'Marquée payée' : 'Marquée non payée');
    $('#swPrep').onchange = e => maj({ preparee: e.target.checked }, e.target.checked ? 'Marquée préparée' : 'Marquée non préparée');
    $('#notes').onchange = e => maj({ notes: e.target.value }, 'Notes enregistrées');
    $('#tiroir').classList.add('ouvert'); $('#voile').classList.add('ouvert');
  }
  const fermer = () => { $('#tiroir').classList.remove('ouvert'); $('#voile').classList.remove('ouvert'); };
  $('#fermerTiroir').onclick = fermer; $('#voile').onclick = fermer;
  document.addEventListener('keydown', e => e.key === 'Escape' && fermer());

  function exporterCsv() {
    const lignes = [['N°', 'Date', 'Nom', 'Prénom', 'Téléphone', 'E-mail', 'Membre', 'Article', 'Taille', 'Qté', 'Prix unitaire', 'Sous-total', 'Statut', 'Payé', 'Règlement']];
    commandesFiltrees().forEach(c => D.lignes.filter(l => l.numero === c.numero).forEach(l =>
      lignes.push([c.numero, dateFr(c.date), c.nom, c.prenom, c.telephone, c.email, c.membre, l.article, l.taille, l.qte, l.pu, l.qte * l.pu, c.statut, c.paye ? 'Oui' : 'Non', c.reglement])));
    const csv = '﻿' + lignes.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'commandes-clap-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  }

  /* ---------- À commander (fournisseur) ---------- */
  function vueFournisseur() {
    const modes = { 'À traiter': 'À commander au fournisseur', 'tout': 'Total (hors annulées)', 'Commandée': 'En attente de livraison' };
    const garde = l => { const s = statutDe(l.numero); return modeFournisseur === 'tout' ? s !== 'Annulée' : s === modeFournisseur; };
    const agg = {};
    D.lignes.filter(garde).forEach(l => {
      const a = agg[l.article] = agg[l.article] || {};
      a[l.taille] = (a[l.taille] || 0) + l.qte;
    });
    const ordreTailles = t => { const base = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].indexOf(String(t).split(' ')[0]); return (base < 0 ? 99 : base) * 2 + (/\(F\)/.test(t) ? 1 : 0); };
    const ordreArt = a => { const i = D.produits.findIndex(p => p.article === a); return i < 0 ? 999 : i; };
    const arts = Object.keys(agg).sort((a, b) => ordreArt(a) - ordreArt(b));
    const totalPieces = arts.reduce((s, a) => s + Object.values(agg[a]).reduce((x, y) => x + y, 0), 0);
    const nums = [...new Set(D.lignes.filter(garde).map(l => l.numero))];
    $('#vue').innerHTML = `
      <div class="barre-outils">
        <div class="segment" style="background:#fff;border:1px solid var(--bord)">${Object.entries(modes).map(([k, v]) => `<button data-m="${k}" class="${modeFournisseur === k ? 'actif' : ''}">${v}</button>`).join('')}</div>
        <div class="droite"><button class="btn btn-ligne" onclick="print()">🖨 Imprimer</button></div>
      </div>
      <div class="panneau" style="margin-top:0">
        <h3>${modes[modeFournisseur]} — ${totalPieces} pièce(s), ${nums.length} commande(s)</h3>
        ${arts.length ? `<table class="tab"><thead><tr><th>Article / taille</th><th style="text-align:right">Quantité</th></tr></thead><tbody>
          ${arts.map(a => {
            const t = Object.entries(agg[a]).sort((x, y) => ordreTailles(x[0]) - ordreTailles(y[0]));
            const sous = t.reduce((s, x) => s + x[1], 0);
            return `<tr class="groupe"><td>${echap(a)}</td><td class="n">${sous}</td></tr>` + (t.length === 1 && t[0][0] === 'Unique' ? '' : t.map(([tl, q]) => `<tr><td style="padding-left:26px">${echap(tl)}</td><td class="n">${q}</td></tr>`).join(''));
          }).join('')}</tbody></table>` : '<p class="note">Rien pour le moment.</p>'}
        ${modeFournisseur === 'À traiter' && nums.length ? `<div class="no-print" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn btn-orange" id="passer">Commande fournisseur passée → marquer ces ${nums.length} commande(s) « Commandée »</button></div>` : ''}
        ${modeFournisseur === 'Commandée' && nums.length ? `<div class="no-print" style="margin-top:14px"><button class="btn btn-orange" id="recu">Livraison reçue → marquer ces ${nums.length} commande(s) « Reçue »</button></div>` : ''}
      </div>`;
    $('#vue').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { modeFournisseur = b.dataset.m; vueFournisseur(); });
    const lot = (nouveau) => async () => {
      if (!confirm(`Passer ${nums.length} commande(s) au statut « ${nouveau} » ?`)) return;
      try { await api('admin_maj_statut_lot', { numeros: nums, nouveau }); D.commandes.forEach(c => { if (nums.includes(c.numero)) c.statut = nouveau; }); toast(nums.length + ' commande(s) → ' + nouveau); vueFournisseur(); }
      catch (e) { toast(e.message, 'err'); }
    };
    if ($('#passer')) $('#passer').onclick = lot('Commandée');
    if ($('#recu')) $('#recu').onclick = lot('Reçue');
  }

  /* ---------- Catalogue ---------- */
  function vueCatalogue() {
    if (!catalogueBrouillon) catalogueBrouillon = { produits: structuredClone(D.produits), modifie: false };
    const P = catalogueBrouillon.produits;
    $('#vue').innerHTML = `
      <div class="barre-outils">
        <span class="note">${P.filter(p => p.actif).length} article(s) en vente sur ${P.length}</span>
        <div class="droite"><button class="btn btn-ligne" id="ajouter">＋ Nouvel article</button><button class="btn btn-orange" id="sauver" ${catalogueBrouillon.modifie ? '' : 'disabled'}>Enregistrer le catalogue</button></div>
      </div>
      <div class="liste">${P.map((p, i) => {
        const sansPrix = p.prixMembre == null && p.prixPublic == null;
        return `<div class="prod-ed ${p.actif ? '' : 'inactif'}" data-i="${i}">
          <div class="vign">${p.image ? `<img src="${echap(imageUrl(p.image))}" alt="">` : '<img class="logo" src="assets/logo.png" alt="">'}</div>
          <div><div style="font-weight:700">${echap(p.article)} <span class="note">· ${echap(p.categorie)}</span></div>
            <div class="note">${p.prixMembre != null ? 'Membre ' + euros(p.prixMembre) : 'Membre —'} · ${p.prixPublic != null ? 'Public ' + euros(p.prixPublic) : 'Public : réservé membres'} · ${p.tailles.length} taille(s)</div>
            ${sansPrix ? '<div class="note" style="color:var(--rouge)">Prix à définir</div>' : ''}${p.actif ? '' : '<div class="note"><b>Masqué de la boutique</b></div>'}</div>
          <div class="ctrl"><button class="icone" data-up title="Monter">↑</button><button class="icone" data-down title="Descendre">↓</button><button class="btn btn-gris" data-edit style="padding:6px 12px">Modifier</button></div>
        </div>`;
      }).join('')}</div>`;
    const modif = () => { catalogueBrouillon.modifie = true; vueCatalogue(); };
    $('#vue').querySelectorAll('.prod-ed').forEach(el => {
      const i = Number(el.dataset.i);
      el.querySelector('[data-up]').onclick = () => { if (i > 0) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; modif(); } };
      el.querySelector('[data-down]').onclick = () => { if (i < P.length - 1) { [P[i + 1], P[i]] = [P[i], P[i + 1]]; modif(); } };
      el.querySelector('[data-edit]').onclick = () => editerProduit(i);
    });
    $('#ajouter').onclick = () => { P.push({ id: '', categorie: P.length ? P[P.length - 1].categorie : 'Vêtements', article: 'Nouvel article', description: '', tailles: ['Unique'], prixMembre: null, prixPublic: null, image: '', actif: false }); catalogueBrouillon.modifie = true; editerProduit(P.length - 1); };
    $('#sauver').onclick = async () => {
      const b = $('#sauver'); b.disabled = true; b.textContent = 'Enregistrement…';
      try { await api('admin_catalogue', { produits: P }); toast('Catalogue enregistré ✔'); await charger(); }
      catch (e) { toast(e.message, 'err'); b.disabled = false; b.textContent = 'Enregistrer le catalogue'; }
    };
  }

  function editerProduit(i) {
    const P = catalogueBrouillon.produits, p = P[i];
    const cats = [...new Set(P.map(x => x.categorie))];
    $('#tiroirTitre').textContent = 'Article';
    $('#tiroirCorps').innerHTML = `<form id="fProd">
      <div class="bascule" style="margin-bottom:10px"><span>En vente dans la boutique</span><label class="switch"><input type="checkbox" id="pActif" ${p.actif ? 'checked' : ''}><span></span></label></div>
      <div class="champ"><label>Nom de l'article</label><input id="pNom" value="${echap(p.article)}" required></div>
      <div class="champ"><label>Catégorie</label><input id="pCat" list="cats" value="${echap(p.categorie)}"><datalist id="cats">${cats.map(c => `<option value="${echap(c)}">`).join('')}</datalist></div>
      <div class="champ"><label>Description</label><textarea id="pDesc" rows="2">${echap(p.description)}</textarea></div>
      <div class="deux">
        <div class="champ"><label>Prix membre (€)</label><input id="pPm" type="number" min="0" step="0.5" value="${p.prixMembre ?? ''}"></div>
        <div class="champ"><label>Prix public (€)</label><input id="pPp" type="number" min="0" step="0.5" value="${p.prixPublic ?? ''}"></div>
      </div>
      <p class="note" style="margin-top:-6px">Prix public vide = article réservé aux membres.</p>
      <div class="champ"><label>Tailles (séparées par des virgules)</label><input id="pTailles" value="${echap(p.tailles.join(', '))}"><span class="note">Ex. : S (H), S (F), M (H)… ou « Unique »</span></div>
      <div class="champ"><label>Photo (lien)</label><input id="pImg" value="${echap(p.image)}" placeholder="https://… ou lien de partage Google Drive"><span class="note">Lien Google Drive accepté (fichier partagé « Tous les utilisateurs disposant du lien »).</span></div>
      <div style="display:flex;gap:8px;justify-content:space-between;margin-top:8px">
        <button type="button" class="btn btn-ligne" id="pSuppr" style="color:var(--rouge)">Supprimer</button>
        <button class="btn btn-orange">Valider</button>
      </div>
      <p class="note">N'oubliez pas « Enregistrer le catalogue » ensuite.</p>
    </form>`;
    const num = v => v === '' ? null : Number(v);
    $('#fProd').onsubmit = e => {
      e.preventDefault();
      Object.assign(p, {
        actif: $('#pActif').checked, article: $('#pNom').value.trim(), categorie: $('#pCat').value.trim() || 'Autres', description: $('#pDesc').value.trim(),
        prixMembre: num($('#pPm').value), prixPublic: num($('#pPp').value), image: $('#pImg').value.trim(),
        tailles: $('#pTailles').value.split(',').map(s => s.trim()).filter(Boolean)
      });
      if (!p.tailles.length) p.tailles = ['Unique'];
      if (p.actif && p.prixMembre == null && p.prixPublic == null) { toast('Indiquez au moins un prix pour mettre en vente', 'err'); return; }
      catalogueBrouillon.modifie = true; fermer(); vueCatalogue();
    };
    $('#pSuppr').onclick = () => { if (confirm('Supprimer « ' + p.article + ' » du catalogue ?')) { P.splice(i, 1); catalogueBrouillon.modifie = true; fermer(); vueCatalogue(); } };
    $('#tiroir').classList.add('ouvert'); $('#voile').classList.add('ouvert');
  }

  /* ---------- Paramètres ---------- */
  function vueParams() {
    const p = D.params;
    const ouverte = p.boutique_ouverte === true || String(p.boutique_ouverte).toLowerCase() === 'true';
    $('#vue').innerHTML = `<form id="fParams" class="panneau" style="max-width:720px">
      <h3>Boutique</h3>
      <div class="bascule" style="margin-bottom:12px"><span>Boutique ouverte aux commandes</span><label class="switch"><input type="checkbox" id="boutique_ouverte" ${ouverte ? 'checked' : ''}><span></span></label></div>
      <div class="champ"><label>Message d'accueil</label><textarea id="message_accueil" rows="2">${echap(p.message_accueil)}</textarea></div>
      <div class="champ"><label>Message quand la boutique est fermée</label><textarea id="message_fermeture" rows="2">${echap(p.message_fermeture)}</textarea></div>
      <div class="champ"><label>Modes de règlement (séparés par des virgules)</label><input id="modes_reglement" value="${echap(p.modes_reglement)}"></div>
      <div class="champ"><label>Informations de règlement (dans l'e-mail de confirmation)</label><textarea id="infos_reglement" rows="3">${echap(p.infos_reglement)}</textarea></div>
      <div class="champ"><label>Quantité max par taille</label><input id="quantite_max_ligne" type="number" min="1" value="${echap(p.quantite_max_ligne)}"></div>
      <div class="champ"><label>Lien du groupe Facebook</label><input id="lien_facebook" value="${echap(p.lien_facebook)}"></div>
      <h3 style="margin-top:18px">Administration</h3>
      <div class="champ"><label>E-mail(s) alertés à chaque commande</label><input id="email_notification" value="${echap(p.email_notification)}" placeholder="bureau@exemple.fr, tresorier@exemple.fr"></div>
      <div class="champ"><label>Nouveau mot de passe admin</label><input id="mot_de_passe_admin" type="text" autocomplete="new-password" placeholder="Laisser vide pour ne pas changer"></div>
      <button class="btn btn-orange">Enregistrer</button>
    </form>`;
    $('#fParams').onsubmit = async e => {
      e.preventDefault();
      const ids = ['message_accueil', 'message_fermeture', 'modes_reglement', 'infos_reglement', 'quantite_max_ligne', 'lien_facebook', 'email_notification', 'mot_de_passe_admin'];
      const params = { boutique_ouverte: $('#boutique_ouverte').checked };
      ids.forEach(k => params[k] = $('#' + k).value.trim());
      try {
        await api('admin_params', { params });
        if (params.mot_de_passe_admin) { mdp = params.mot_de_passe_admin; ss.set('mdp', mdp); }
        toast('Paramètres enregistrés ✔');
        await charger();
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  if (mdp) demarrer();
})();
