/**
 * La boutique du CLAP — Club Légende Auto Passion
 * Backend Google Apps Script (base de données = ce Google Sheet)
 *
 * Installation : voir README.md
 *  1. Extensions > Apps Script, coller ce fichier
 *  2. Exécuter la fonction  setup()  une fois (autoriser l'accès)
 *  3. Déployer > Nouveau déploiement > Application Web
 *     - Exécuter en tant que : Moi
 *     - Qui a accès : Tout le monde
 *  4. Copier l'URL /exec dans assets/config.js
 */

var ONGLET = {
  CATALOGUE: 'Catalogue',
  COMMANDES: 'Commandes',
  LIGNES: 'Lignes',
  A_COMMANDER: 'À commander',
  PARAMS: 'Paramètres'
};

var STATUTS = ['À traiter', 'Commandée', 'Reçue', 'Remise', 'Annulée'];

var COL_CATALOGUE = ['ID', 'Catégorie', 'Article', 'Description', 'Tailles', 'Prix membre', 'Prix public', 'Image', 'Actif', 'Ordre'];
var COL_COMMANDES = ['N°', 'Date', 'Nom', 'Prénom', 'Téléphone', 'E-mail', 'Membre', 'Détail', 'Total (€)', 'Règlement', 'Payé', 'Statut', 'Préparée', 'Date de remise', 'Commentaire client', 'Notes internes'];
var COL_LIGNES = ['N° commande', 'Client', 'Article', 'Taille', 'Qté', 'Prix unitaire', 'Sous-total', 'Statut commande', 'Payée'];

/* ------------------------------------------------------------------ */
/*  INSTALLATION                                                       */
/* ------------------------------------------------------------------ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var cat = creerOnglet_(ss, ONGLET.CATALOGUE, COL_CATALOGUE);
  if (cat.getLastRow() < 2) {
    var H = 'XS (H),XS (F),S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XL (F),XXL (H),XXL (F)';
    var produits = [
      ['chemise', 'Vêtements', 'Chemise', 'Chemise brodée CLAP.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 40, '', '', true],
      ['softshell', 'Vêtements', 'Softshell homme', 'Veste softshell coupe-vent, logo CLAP.', 'S,M,L,XL,XXL,XXXL', 60, 75, '', true],
      ['doudoune-sm', 'Vêtements', 'Doudoune sans manches homme', 'Doudoune sans manches légère.', 'XS,S,M,L,XL,XXL', 60, 75, '', true],
      ['doudoune-am', 'Vêtements', 'Doudoune avec manches', 'Doudoune avec manches, coupes homme et femme.', H, 75, 90, '', true],
      ['blouson', 'Vêtements', 'Blouson', 'Blouson CLAP, coupes homme et femme.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XL (F),XXL (H),XXL (F),XXXL (H),XXXL (F)', '', '', '', false],
      ['tshirt-mc', 'T-shirts & polos', 'T-shirt manches courtes', 'T-shirt manches courtes logo CLAP.', 'XS,S,M,L,XL,XXL', 15, 25, '', true],
      ['tshirt-ml', 'T-shirts & polos', 'T-shirt manches longues', 'T-shirt manches longues logo CLAP.', 'XS,S,M,L,XL,XXL', '', '', '', false],
      ['tshirt-collector', 'T-shirts & polos', 'T-shirt Collector', 'Édition collector.', 'XS,S,S (F),M,M (F),L,L (F),XL,XXL', '', '', '', false],
      ['polo-mc', 'T-shirts & polos', 'Polo manches courtes', 'Polo brodé, coupes homme et femme.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 30, 40, '', true],
      ['polo-ml', 'T-shirts & polos', 'Polo manches longues', 'Polo manches longues brodé.', 'S (H),S (F),M (H),M (F),L (H),L (F),XL (H),XXL (H)', 35, 45, '', true],
      ['casquette', 'Accessoires', 'Casquette', 'Casquette brodée CLAP.', 'Unique', 10, 15, '', true],
      ['bonnet', 'Accessoires', 'Bonnet', 'Bonnet brodé CLAP.', 'Unique', 10, 15, '', true],
      ['parapluie', 'Accessoires', 'Parapluie', 'Parapluie aux couleurs du club.', 'Unique', 20, 30, '', true],
      ['tour-de-cou', 'Accessoires', 'Tour de cou', 'Tour de cou / lanyard CLAP.', 'Unique', 3, 5, '', true],
      ['ecusson', 'Accessoires', 'Écusson', 'Écusson brodé du club.', 'Unique', 9, 12, '', true],
      ['porte-cles', 'Accessoires', 'Porte-clés', 'Porte-clés CLAP.', 'Unique', '', '', '', false],
      ['grattoir', 'Accessoires', 'Grattoir', 'Grattoir à givre CLAP.', 'Unique', '', '', '', false],
      ['ventouses', 'Accessoires', 'Ventouses', 'Ventouses.', 'Unique', '', '', '', false],
      ['ligne-9', 'Accessoires', 'Ligne 9', '', 'Unique', '', '', '', false]
    ];
    var rows = produits.map(function (p, i) { return p.concat([(i + 1) * 10]); });
    cat.getRange(2, 1, rows.length, COL_CATALOGUE.length).setValues(rows);
  }
  cat.getRange('F:G').setNumberFormat('0.00 €');
  cat.getRange('I2:I').insertCheckboxes();

  var cmd = creerOnglet_(ss, ONGLET.COMMANDES, COL_COMMANDES);
  cmd.getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  cmd.getRange('I:I').setNumberFormat('0.00 €');
  cmd.getRange('N:N').setNumberFormat('dd/mm/yyyy');
  cmd.getRange('H:H').setWrap(true);
  cmd.setColumnWidth(8, 320);
  var regle = SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).build();
  cmd.getRange('L2:L').setDataValidation(regle);

  var lig = creerOnglet_(ss, ONGLET.LIGNES, COL_LIGNES);
  lig.getRange('F:G').setNumberFormat('0.00 €');

  var ac = creerOnglet_(ss, ONGLET.A_COMMANDER, ['Article', 'Taille', 'À commander (statut « À traiter »)', 'Total commandé (hors annulées)', 'Dont payé']);
  // Tableau récapitulatif fournisseur, recalculé automatiquement
  ac.getRange('A2').setFormula(
    '=IFERROR(SORT(UNIQUE(FILTER({Lignes!C2:C,Lignes!D2:D},Lignes!C2:C<>"",Lignes!H2:H<>"Annulée"))),"")');
  ac.getRange('C2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="",,SUMIFS(Lignes!E2:E,Lignes!C2:C,A2:A,Lignes!D2:D,B2:B,Lignes!H2:H,"À traiter")))');
  ac.getRange('D2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="",,SUMIFS(Lignes!E2:E,Lignes!C2:C,A2:A,Lignes!D2:D,B2:B,Lignes!H2:H,"<>Annulée")))');
  ac.getRange('E2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="",,SUMIFS(Lignes!E2:E,Lignes!C2:C,A2:A,Lignes!D2:D,B2:B,Lignes!H2:H,"<>Annulée",Lignes!I2:I,TRUE)))');

  var par = creerOnglet_(ss, ONGLET.PARAMS, ['Clé', 'Valeur', 'Aide']);
  var defauts = [
    ['boutique_ouverte', true, 'Cocher pour ouvrir la boutique aux commandes'],
    ['message_accueil', 'Bienvenue dans la boutique du club ! Choisissez vos articles, la commande est groupée et vous serez prévenu à réception.', 'Texte affiché en haut de la boutique'],
    ['message_fermeture', 'La boutique est fermée pour le moment. Rendez-vous lors de la prochaine commande groupée !', 'Texte affiché quand la boutique est fermée'],
    ['modes_reglement', 'Carte bleue, Virement, Chèque, Espèces', 'Liste séparée par des virgules'],
    ['infos_reglement', 'Le règlement s\'effectue auprès du bureau du club lors de la remise ou par virement (RIB communiqué sur demande).', 'Texte envoyé dans l\'e-mail de confirmation'],
    ['email_notification', '', 'Adresse(s) qui reçoivent une alerte à chaque commande (séparées par des virgules)'],
    ['mot_de_passe_admin', 'clap2026', 'Mot de passe de l\'espace admin — À CHANGER'],
    ['lien_facebook', 'https://www.facebook.com/groups/260511518285463/', 'Lien du groupe Facebook'],
    ['quantite_max_ligne', 5, 'Quantité max par taille et par article (au-delà : préciser en commentaire)']
  ];
  var existants = par.getLastRow() > 1 ? par.getRange(2, 1, par.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  defauts.forEach(function (d) { if (existants.indexOf(d[0]) < 0) par.appendRow(d); });
  par.setColumnWidth(2, 420);
  par.setColumnWidth(3, 380);

  ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(function (n) {
    var f = ss.getSheetByName(n);
    if (f && f.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(f);
  });
  toast_('Installation terminée ✔  Pensez à changer le mot de passe admin dans « Paramètres ».');
}

function creerOnglet_(ss, nom, entetes) {
  var sh = ss.getSheetByName(nom) || ss.insertSheet(nom);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, entetes.length).setValues([entetes])
      .setFontWeight('bold').setBackground('#555c6c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function toast_(msg) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Boutique du CLAP', 8); } catch (e) {}
}

/* ------------------------------------------------------------------ */
/*  ROUTAGE WEB                                                        */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || 'catalogue';
  try {
    if (a === 'catalogue') return json_(catalogPublic_());
    if (a === 'suivi') return json_(suivi_(e.parameter.numero, e.parameter.email));
    return json_({ ok: false, erreur: 'Action inconnue' });
  } catch (err) {
    return json_({ ok: false, erreur: String(err.message || err) });
  }
}

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, erreur: 'Requête invalide' }); }
  try {
    switch (d.action) {
      case 'commande': return json_(nouvelleCommande_(d));
      case 'suivi': return json_(suivi_(d.numero, d.email));
    }
    // ---- actions admin ----
    verifierAdmin_(d.motDePasse);
    switch (d.action) {
      case 'admin_login': return json_({ ok: true });
      case 'admin_donnees': return json_(adminDonnees_());
      case 'admin_maj_commande': return json_(adminMajCommande_(d));
      case 'admin_maj_statut_lot': return json_(adminMajStatutLot_(d));
      case 'admin_catalogue': return json_(adminCatalogue_(d.produits));
      case 'admin_params': return json_(adminParams_(d.params));
    }
    return json_({ ok: false, erreur: 'Action inconnue' });
  } catch (err) {
    return json_({ ok: false, erreur: String(err.message || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  LECTURE                                                            */
/* ------------------------------------------------------------------ */

function lireTable_(nom) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h = v.shift();
  return v.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {};
    h.forEach(function (k, i) { o[k] = r[i]; });
    return o;
  });
}

function params_() {
  var p = {};
  lireTable_(ONGLET.PARAMS).forEach(function (r) { p[r['Clé']] = r['Valeur']; });
  return p;
}

function vrai_(v) { return v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'oui' || v === 1; }
function nombre_(v) { return (v === '' || v === null || isNaN(Number(v))) ? null : Number(v); }

function produits_() {
  return lireTable_(ONGLET.CATALOGUE).map(function (r) {
    return {
      id: String(r['ID']),
      categorie: String(r['Catégorie'] || 'Autres'),
      article: String(r['Article']),
      description: String(r['Description'] || ''),
      tailles: String(r['Tailles'] || 'Unique').split(',').map(function (t) { return t.trim(); }).filter(String),
      prixMembre: nombre_(r['Prix membre']),
      prixPublic: nombre_(r['Prix public']),
      image: String(r['Image'] || ''),
      actif: vrai_(r['Actif']),
      ordre: Number(r['Ordre']) || 999
    };
  }).sort(function (a, b) { return a.ordre - b.ordre; });
}

function catalogPublic_() {
  var p = params_();
  return {
    ok: true,
    boutiqueOuverte: vrai_(p.boutique_ouverte),
    messageAccueil: p.message_accueil || '',
    messageFermeture: p.message_fermeture || '',
    modesReglement: String(p.modes_reglement || '').split(',').map(function (s) { return s.trim(); }).filter(String),
    lienFacebook: p.lien_facebook || '',
    quantiteMax: Number(p.quantite_max_ligne) || 5,
    produits: produits_().filter(function (x) { return x.actif && (x.prixMembre !== null || x.prixPublic !== null); })
  };
}

/* ------------------------------------------------------------------ */
/*  COMMANDE                                                           */
/* ------------------------------------------------------------------ */

function nouvelleCommande_(d) {
  var p = params_();
  if (!vrai_(p.boutique_ouverte)) throw new Error('La boutique est actuellement fermée.');

  var c = d.client || {};
  ['nom', 'prenom', 'telephone', 'email'].forEach(function (k) {
    if (!c[k] || !String(c[k]).trim()) throw new Error('Champ obligatoire manquant : ' + k);
  });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) throw new Error('Adresse e-mail invalide.');
  var membre = c.membre === true || c.membre === 'Oui';

  var catalogue = {};
  produits_().forEach(function (x) { catalogue[x.id] = x; });

  var lignes = [];
  var total = 0;
  (d.panier || []).forEach(function (l) {
    var prod = catalogue[l.id];
    var q = Math.floor(Number(l.qte));
    if (!prod || !prod.actif || !(q > 0)) return;
    if (prod.tailles.indexOf(l.taille) < 0) throw new Error('Taille invalide pour ' + prod.article);
    var pu = membre ? (prod.prixMembre !== null ? prod.prixMembre : prod.prixPublic) : prod.prixPublic;
    if (pu === null) throw new Error('« ' + prod.article + ' » est réservé aux membres du club.');
    lignes.push({ article: prod.article, taille: l.taille, qte: q, pu: pu });
    total += q * pu;
  });
  if (!lignes.length) throw new Error('Le panier est vide.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(ONGLET.COMMANDES);
    var props = PropertiesService.getScriptProperties();
    var n = Number(props.getProperty('DERNIER_NUMERO') || 0);
    if (!n && sh.getLastRow() > 1) {
      n = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
        .map(function (r) { return Number(String(r[0]).replace(/\D/g, '')) || 0; })
        .reduce(function (a, b) { return Math.max(a, b); }, 0);
    }
    n++;
    props.setProperty('DERNIER_NUMERO', String(n));
    var numero = 'CLAP-' + ('000' + n).slice(-4);
    var client = (String(c.nom).trim().toUpperCase() + ' ' + capitalise_(String(c.prenom).trim())).trim();
    var detail = lignes.map(function (l) { return l.qte + ' × ' + l.article + (l.taille !== 'Unique' ? ' (' + l.taille + ')' : ''); }).join('\n');

    sh.appendRow([numero, new Date(), String(c.nom).trim().toUpperCase(), capitalise_(String(c.prenom).trim()),
      "'" + String(c.telephone).trim(), String(c.email).trim().toLowerCase(), membre ? 'Membre' : 'Non membre',
      detail, total, String(c.reglement || ''), false, STATUTS[0], false, '', String(c.commentaire || '').slice(0, 1000), '']);
    var r = sh.getLastRow();
    sh.getRange(r, 11).insertCheckboxes();
    sh.getRange(r, 13).insertCheckboxes();

    var lig = ss.getSheetByName(ONGLET.LIGNES);
    var rows = lignes.map(function (l) { return [numero, client, l.article, l.taille, l.qte, l.pu, l.qte * l.pu, STATUTS[0], false]; });
    lig.getRange(lig.getLastRow() + 1, 1, rows.length, COL_LIGNES.length).setValues(rows);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  try { envoyerEmails_(numero, c, membre, lignes, total, p); } catch (e) { console.warn(e); }
  return { ok: true, numero: numero, total: total };
}

function capitalise_(s) {
  return s.toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); });
}

function euros_(n) { return Number(n).toFixed(2).replace('.', ',') + ' €'; }

function echap_(s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function envoyerEmails_(numero, c, membre, lignes, total, p) {
  var lignesHtml = lignes.map(function (l) {
    return '<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7ee">' + echap_(l.article) +
      (l.taille !== 'Unique' ? ' — ' + echap_(l.taille) : '') + '</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7ee;text-align:center">' +
      l.qte + '</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7ee;text-align:right">' + euros_(l.qte * l.pu) + '</td></tr>';
  }).join('');
  var html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2b2f3a">' +
    '<div style="background:#555c6c;color:#fff;padding:18px 22px;border-bottom:4px solid #e8541c">' +
    '<div style="font-size:22px;font-weight:bold;letter-spacing:2px">CLAP</div>' +
    '<div style="font-size:13px;opacity:.85">La boutique du Club Légende Auto Passion</div></div>' +
    '<div style="padding:20px 22px;background:#fff">' +
    '<p>Bonjour ' + echap_(capitalise_(String(c.prenom))) + ',</p>' +
    '<p>Merci pour votre commande <b>' + numero + '</b>. Voici le récapitulatif :</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<tr style="background:#f1f4f9"><th style="padding:6px 10px;text-align:left">Article</th><th style="padding:6px 10px">Qté</th><th style="padding:6px 10px;text-align:right">Montant</th></tr>' +
    lignesHtml +
    '<tr><td colspan="2" style="padding:10px;text-align:right;font-weight:bold">Total ' + (membre ? '(tarif membre)' : '') + '</td><td style="padding:10px;text-align:right;font-weight:bold;color:#e8541c">' + euros_(total) + '</td></tr></table>' +
    '<p><b>Règlement prévu :</b> ' + echap_(c.reglement || '—') + '</p>' +
    (p.infos_reglement ? '<p style="background:#f1f4f9;padding:10px 12px;border-left:3px solid #7883a3">' + echap_(p.infos_reglement) + '</p>' : '') +
    '<p>Vous serez prévenu dès réception des articles. Conservez votre numéro de commande pour la suivre en ligne.</p>' +
    '<p>À bientôt sur la route !<br><b>Le CLAP</b></p></div></div>';

  MailApp.sendEmail({
    to: String(c.email).trim(),
    subject: 'Boutique du CLAP — Commande ' + numero,
    htmlBody: html,
    name: 'La boutique du CLAP'
  });

  if (p.email_notification) {
    MailApp.sendEmail({
      to: String(p.email_notification),
      subject: '🛒 Nouvelle commande ' + numero + ' — ' + String(c.nom).toUpperCase() + ' ' + capitalise_(String(c.prenom)) + ' — ' + euros_(total),
      htmlBody: html.replace('Merci pour votre commande', 'Nouvelle commande') +
        '<p style="font-family:Arial">Tél. : ' + echap_(c.telephone) + ' — ' + echap_(c.email) + ' — ' + (membre ? 'Membre' : 'Non membre') +
        (c.commentaire ? '<br>Commentaire : ' + echap_(c.commentaire) : '') + '</p>',
      name: 'La boutique du CLAP'
    });
  }
}

function suivi_(numero, email) {
  numero = String(numero || '').trim().toUpperCase();
  if (/^\d+$/.test(numero)) numero = 'CLAP-' + ('000' + numero).slice(-4);
  email = String(email || '').trim().toLowerCase();
  var c = lireTable_(ONGLET.COMMANDES).filter(function (r) {
    return String(r['N°']).toUpperCase() === numero && String(r['E-mail']).toLowerCase() === email;
  })[0];
  if (!c) return { ok: false, erreur: 'Aucune commande trouvée avec ce numéro et cette adresse e-mail.' };
  return {
    ok: true, numero: c['N°'], date: c['Date'], statut: c['Statut'], paye: vrai_(c['Payé']),
    detail: c['Détail'], total: c['Total (€)']
  };
}

/* ------------------------------------------------------------------ */
/*  ADMIN                                                              */
/* ------------------------------------------------------------------ */

function verifierAdmin_(mdp) {
  var attendu = String(params_().mot_de_passe_admin || '');
  if (!attendu || String(mdp || '') !== attendu) {
    Utilities.sleep(800);
    throw new Error('Mot de passe incorrect.');
  }
}

function adminDonnees_() {
  var commandes = lireTable_(ONGLET.COMMANDES).map(function (r, i) {
    return {
      numero: String(r['N°']), date: r['Date'] instanceof Date ? r['Date'].toISOString() : String(r['Date']),
      nom: r['Nom'], prenom: r['Prénom'], telephone: String(r['Téléphone']), email: r['E-mail'],
      membre: r['Membre'], detail: r['Détail'], total: Number(r['Total (€)']) || 0, reglement: r['Règlement'],
      paye: vrai_(r['Payé']), statut: r['Statut'] || STATUTS[0], preparee: vrai_(r['Préparée']),
      dateRemise: r['Date de remise'] instanceof Date ? r['Date de remise'].toISOString() : String(r['Date de remise'] || ''),
      commentaire: r['Commentaire client'], notes: r['Notes internes']
    };
  });
  var lignes = lireTable_(ONGLET.LIGNES).map(function (r) {
    return { numero: String(r['N° commande']), client: r['Client'], article: r['Article'], taille: String(r['Taille']), qte: Number(r['Qté']) || 0, pu: Number(r['Prix unitaire']) || 0 };
  });
  var p = params_();
  return { ok: true, commandes: commandes, lignes: lignes, produits: produits_(), params: p, statuts: STATUTS };
}

function ligneCommande_(sh, numero) {
  var v = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(numero)) return i + 2;
  throw new Error('Commande introuvable : ' + numero);
}

function adminMajCommande_(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ONGLET.COMMANDES);
  var r = ligneCommande_(sh, d.numero);
  var m = d.maj || {};
  if ('paye' in m) sh.getRange(r, 11).setValue(!!m.paye);
  if ('statut' in m) {
    if (STATUTS.indexOf(m.statut) < 0) throw new Error('Statut invalide');
    sh.getRange(r, 12).setValue(m.statut);
    if (m.statut === 'Remise' && !sh.getRange(r, 14).getValue()) sh.getRange(r, 14).setValue(new Date());
  }
  if ('preparee' in m) sh.getRange(r, 13).setValue(!!m.preparee);
  if ('notes' in m) sh.getRange(r, 16).setValue(String(m.notes));
  if ('reglement' in m) sh.getRange(r, 10).setValue(String(m.reglement));
  synchroLignes_(ss, [d.numero]);
  return { ok: true };
}

function adminMajStatutLot_(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ONGLET.COMMANDES);
  if (STATUTS.indexOf(d.nouveau) < 0) throw new Error('Statut invalide');
  var n = sh.getLastRow() - 1;
  if (n < 1) return { ok: true, nb: 0 };
  var v = sh.getRange(2, 1, n, 12).getValues();
  var touches = [];
  v.forEach(function (row, i) {
    if ((d.numeros && d.numeros.indexOf(String(row[0])) >= 0) || (!d.numeros && row[11] === d.ancien)) {
      sh.getRange(i + 2, 12).setValue(d.nouveau);
      touches.push(String(row[0]));
    }
  });
  synchroLignes_(ss, touches);
  return { ok: true, nb: touches.length };
}

/** Recopie Statut / Payé de la commande sur ses lignes (pour l'onglet « À commander »). */
function synchroLignes_(ss, numeros) {
  if (!numeros.length) return;
  var cmd = {};
  lireTable_(ONGLET.COMMANDES).forEach(function (r) { cmd[String(r['N°'])] = [r['Statut'], vrai_(r['Payé'])]; });
  var lig = ss.getSheetByName(ONGLET.LIGNES);
  if (lig.getLastRow() < 2) return;
  var rg = lig.getRange(2, 1, lig.getLastRow() - 1, 9);
  var v = rg.getValues();
  v.forEach(function (row) {
    if (numeros.indexOf(String(row[0])) >= 0 && cmd[String(row[0])]) {
      row[7] = cmd[String(row[0])][0];
      row[8] = cmd[String(row[0])][1];
    }
  });
  lig.getRange(2, 8, v.length, 2).setValues(v.map(function (r) { return [r[7], r[8]]; }));
}

function adminCatalogue_(produits) {
  if (!Array.isArray(produits)) throw new Error('Catalogue invalide');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET.CATALOGUE);
  var rows = produits.map(function (p, i) {
    var id = String(p.id || p.article || ('art-' + i)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return [id, p.categorie || 'Autres', p.article || '', p.description || '',
      (Array.isArray(p.tailles) ? p.tailles.join(',') : String(p.tailles || 'Unique')),
      p.prixMembre === null || p.prixMembre === '' ? '' : Number(p.prixMembre),
      p.prixPublic === null || p.prixPublic === '' ? '' : Number(p.prixPublic),
      p.image || '', !!p.actif, (i + 1) * 10];
  });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, COL_CATALOGUE.length).clearContent();
  if (rows.length) {
    sh.getRange(2, 1, rows.length, COL_CATALOGUE.length).setValues(rows);
    sh.getRange(2, 9, rows.length, 1).insertCheckboxes();
  }
  return { ok: true };
}

function adminParams_(params) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET.PARAMS);
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  Object.keys(params || {}).forEach(function (k) {
    if (k === 'mot_de_passe_admin' && !String(params[k]).trim()) return;
    var trouve = false;
    v.forEach(function (row, i) { if (row[0] === k) { sh.getRange(i + 2, 2).setValue(params[k]); trouve = true; } });
    if (!trouve) sh.appendRow([k, params[k], '']);
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  IMPORT DE L'ANCIEN GOOGLE FORM (facultatif)                        */
/* ------------------------------------------------------------------ */

/**
 * Importe les réponses de l'ancien formulaire Google.
 * 1. Remplacez ID_ANCIEN_SHEET par l'identifiant du Google Sheet des réponses
 *    (la partie entre /d/ et /edit dans son URL)
 * 2. Exécutez importerAncienFormulaire()
 */
var ID_ANCIEN_SHEET = '';
var ONGLET_ANCIEN = 'Form Responses 1';

function importerAncienFormulaire() {
  if (!ID_ANCIEN_SHEET) throw new Error('Renseignez ID_ANCIEN_SHEET en haut de cette section.');
  var src = SpreadsheetApp.openById(ID_ANCIEN_SHEET).getSheetByName(ONGLET_ANCIEN);
  var v = src.getDataRange().getValues();
  var h = v.shift().map(function (x) { return String(x).trim(); });
  var prods = produits_();
  var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); };
  var alias = { 'softshellhomme': 'softshell', 'doudounesansmancheshomme': 'doudoune-sm', 'doudouneavecmanches': 'doudoune-am',
    'tshirtmanchescourtes': 'tshirt-mc', 'tshirtmancheslongues': 'tshirt-ml', 'tshirtcollector': 'tshirt-collector',
    'polomanchescourtes': 'polo-mc', 'polomancheslongues': 'polo-ml', 'chemise': 'chemise', 'blouson': 'blouson' };
  var parId = {}; prods.forEach(function (p) { parId[p.id] = p; });
  var parNom = {}; prods.forEach(function (p) { parNom[norm(p.article)] = p; });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ONGLET.COMMANDES);
  var lig = ss.getSheetByName(ONGLET.LIGNES);
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('DERNIER_NUMERO') || 0);
  var col = function (nom) { return h.indexOf(nom); };
  var nb = 0;

  v.forEach(function (row) {
    if (!row[col('Nom')]) return;
    var membre = String(row[col('Êtes-vous membre du CLAP ?')]) === 'Oui';
    var lignes = [];
    h.forEach(function (titre, i) {
      var m = titre.match(/^(.+?)\s*\[(.+)\]$/);
      var q = Number(row[i]);
      if (!m || !(q > 0)) return;
      var art = m[1].trim(), taille = m[2].trim();
      var p;
      if (norm(art) === 'accessoires') { p = parNom[norm(taille)]; taille = 'Unique'; }
      else { p = parId[alias[norm(art)]] || parNom[norm(art)]; }
      var article = p ? p.article : (norm(art) === 'accessoires' ? m[2].trim() : art);
      var pu = p ? (membre ? (p.prixMembre !== null ? p.prixMembre : p.prixPublic) : p.prixPublic) : 0;
      lignes.push({ article: article, taille: taille, qte: q, pu: pu || 0 });
    });
    if (!lignes.length) return;
    n++;
    var numero = 'CLAP-' + ('000' + n).slice(-4);
    var total = lignes.reduce(function (s, l) { return s + l.qte * l.pu; }, 0);
    var nom = String(row[col('Nom')]).trim().toUpperCase(), prenom = capitalise_(String(row[col('Prénom')]).trim());
    sh.appendRow([numero, row[col('Timestamp')], nom, prenom, "'" + String(row[col('Téléphone')]).trim(), String(row[col('E-mail')]).trim().toLowerCase(),
      membre ? 'Membre' : 'Non membre',
      lignes.map(function (l) { return l.qte + ' × ' + l.article + (l.taille !== 'Unique' ? ' (' + l.taille + ')' : ''); }).join('\n'),
      total, row[col('Mode de règlement prévu')] || '', false, STATUTS[0], false, '', row[col('Commentaire (facultatif)')] || '', 'Importée de l\'ancien formulaire']);
    sh.getRange(sh.getLastRow(), 11).insertCheckboxes();
    sh.getRange(sh.getLastRow(), 13).insertCheckboxes();
    var rows = lignes.map(function (l) { return [numero, nom + ' ' + prenom, l.article, l.taille, l.qte, l.pu, l.qte * l.pu, STATUTS[0], false]; });
    lig.getRange(lig.getLastRow() + 1, 1, rows.length, COL_LIGNES.length).setValues(rows);
    nb++;
  });
  props.setProperty('DERNIER_NUMERO', String(n));
  toast_(nb + ' commande(s) importée(s).');
}
