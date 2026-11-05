/* WakatShop – onglet Tontine. À charger après wakat-extras.js :
   <script src="wakat-tontine.js"></script> avant </body> */
(function () {
  const FEE = 0.03;
  const phoneVal = () => digits(document.getElementById('ton-phone').value);

  const nav = document.querySelector('nav.bottom-nav');
  const nb = document.createElement('button');
  nb.className = 'nav-item';
  nb.innerHTML = '<i>🤝</i>Tontine';
  nb.onclick = () => switchView('tontine-view', nb);
  nav.insertBefore(nb, nav.lastElementChild);

  const v = document.createElement('div');
  v.id = 'tontine-view';
  v.className = 'view';
  v.innerHTML = `<div class="section-box"><h2>Tontine</h2>
    <p style="color:#555;line-height:1.5;margin-bottom:12px">Cotisez en groupe : à chaque tour, un membre reçoit un article ou du cash (3 % de frais sur le cash).</p>
    <button class="btn" onclick="tonCreate()">Créer ma tontine</button>
    <button class="btn btn-outline" onclick="tonJoin()">Rejoindre avec un code</button></div>
    <div class="section-box"><h3>Mes tontines</h3>
    <div class="form-group"><input type="tel" id="ton-phone" placeholder="Votre numéro de téléphone"></div>
    <button class="btn" onclick="tonLoad()">Voir mes tontines</button></div>
    <div id="ton-list"></div>`;
  document.querySelector('.container').appendChild(v);

  window.tonCreate = function () {
    const name = (prompt('Nom du groupe (ex : Les Amis du lit) :') || '').trim(); if (!name) return;
    const goal = (prompt('Article ou budget visé (facultatif) :') || '').trim();
    const con = Math.round(Number(prompt('Cotisation de chaque membre à chaque tour (FCFA) :')));
    if (!(con > 0)) { alert('Montant invalide.'); return; }
    const frequency = (prompt('Rythme : Jour, Semaine ou Mois ?', 'Mois') || 'Mois').trim();
    const size = Math.round(Number(prompt('Nombre de membres (3 à 10) :')));
    if (!(size >= 3 && size <= 10)) { alert('Choisissez entre 3 et 10 membres.'); return; }
    const cname = (prompt('Votre nom et prénom :') || '').trim(); if (!cname) return;
    const phone = digits(prompt('Votre numéro de téléphone Mobile Money :'));
    if (phone.length < 8) { alert('Numéro invalide.'); return; }
    post({ action: 'createTontine', tontine: { name, goal, contribution: con, frequency, size, cname, phone } })
      .then(r => { alert('Tontine créée ! Code à partager : ' + r.code); document.getElementById('ton-phone').value = phone; tonLoad(); })
      .catch(() => alert('Échec de la création. Réessayez.'));
  };

  window.tonJoin = function () {
    const code = (prompt('Code de la tontine :') || '').trim().toUpperCase(); if (!code) return;
    api({ action: 'getTontineByCode', code }).then(a => {
      const t = a && a[0];
      if (!t) { alert('Code introuvable.'); return; }
      if (t.status !== 'Ouverte') { alert('Cette tontine est déjà complète.'); return; }
      if (!confirm(t.name + ' : ' + money(t.contribution) + ' FCFA par ' + String(t.frequency).toLowerCase() + ', ' + t.members + '/' + t.size + ' membres. Rejoindre ?')) return;
      const name = (prompt('Votre nom et prénom :') || '').trim(); if (!name) return;
      const phone = digits(prompt('Votre numéro de téléphone Mobile Money :'));
      if (phone.length < 8) { alert('Numéro invalide.'); return; }
      return post({ action: 'joinTontine', code, name, phone })
        .then(() => { alert('Vous avez rejoint la tontine !'); document.getElementById('ton-phone').value = phone; tonLoad(); });
    }).catch(() => alert('Échec. Vérifiez votre connexion et réessayez.'));
  };

  window.tonLoad = function () {
    const phone = phoneVal(), box = document.getElementById('ton-list');
    if (!phone) { alert('Entrez votre numéro de téléphone.'); return; }
    box.innerHTML = '<div class="section-box">Chargement...</div>';
    api({ action: 'getMyTontines', phone }).then(list => {
      if (!Array.isArray(list)) throw 0;
      box.innerHTML = list.length ? list.map(tonCard).join('')
        : '<div class="section-box">Aucune tontine pour ce numéro. Créez-en une ou rejoignez-en une avec un code.</div>';
    }).catch(() => { box.innerHTML = '<div class="section-box" style="color:#c0392b">Chargement impossible. Réessayez.</div>'; });
  };

  function tonCard(t) {
    const id = esc(t.id), gross = t.contribution * t.size, net = Math.round(gross * (1 - FEE));
    const share = encodeURIComponent('Rejoins ma tontine « ' + t.name + ' » sur WakatShop avec le code ' + t.code + ' : ' + location.origin + location.pathname);
    let h = `<div class="section-box"><h3>${esc(t.name)}</h3>
      <p style="color:#555;line-height:1.5">${t.goal ? esc(t.goal) + '<br>' : ''}<b>${money(t.contribution)} FCFA</b> par ${esc(String(t.frequency).toLowerCase())} · ${t.members.length}/${t.size} membres · <b>${esc(t.status)}</b></p>`;
    if (t.status === 'Ouverte')
      h += `<div class="payinfo">Code à partager : <b>${esc(t.code)}</b> · <a href="https://wa.me/?text=${share}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a><br>L’ordre de passage est tiré au sort quand le groupe est complet.</div>`;
    else if (t.status === 'En cours')
      h += `<p style="margin:8px 0"><b>Tour ${t.round}/${t.size}</b> : c’est le tour de <b>${esc(t.turnName)}</b>${t.myTurn ? ' (vous)' : ''}</p>`;
    else h += '<p style="margin:8px 0"><b>Tontine terminée.</b></p>';
    h += '<div class="hist">' + t.members.map(m => `<div>${m.order ? m.order + '. ' : ''}${esc(m.name)}${m.me ? ' (vous)' : ''}${t.status === 'En cours' ? (m.paid ? ' · ✓ a cotisé' : ' · en attente') : ''}</div>`).join('') + '</div>';
    if (t.status === 'En cours') {
      if (!t.myCot || t.myCot === 'Refusé')
        h += `<details class="pay"><summary>Faire ma cotisation du tour</summary>
          <div class="payinfo">Envoyez ${money(t.contribution)} FCFA par Mobile Money :<br><b>${esc(PAY_INFO)}</b></div>
          <select id="tm-${id}"><option>Orange Money</option><option>Moov Money</option><option>Autre</option></select>
          <input type="text" id="tr-${id}" placeholder="Référence de la transaction">
          <button class="btn" onclick="tonPay('${id}')">Envoyer ma cotisation</button></details>`;
      else h += `<p style="margin:8px 0">Ma cotisation : <b>${esc(t.myCot)}</b></p>`;
      if (t.tour) h += `<p><b>Mon tour : ${esc(t.tour.choice)}</b> (${money(t.tour.net)} FCFA) · ${esc(t.tour.status)}</p>`;
      else if (t.myTurn && t.allPaid)
        h += `<div class="payinfo">C’est votre tour ! Tout le monde a cotisé. Choisissez :</div>
          <button class="btn" onclick="tonChoose('${id}','Article')">Prendre un article (${money(gross)} FCFA)</button>
          <button class="btn btn-outline" onclick="tonChoose('${id}','Cash')">Recevoir du cash : ${money(net)} FCFA (3 % de frais)</button>`;
      else if (t.myTurn) h += '<p style="margin:8px 0;color:#777">C’est votre tour : vous pourrez choisir dès que tous les membres auront cotisé.</p>';
    }
    return h + '</div>';
  }

  window.tonPay = function (id) {
    const txRef = document.getElementById('tr-' + id).value.trim(), method = document.getElementById('tm-' + id).value;
    if (txRef.length < 4) { alert('Entrez la référence reçue par SMS.'); return; }
    post({ action: 'saveCotisation', tontineId: id, phone: phoneVal(), method, txRef })
      .then(() => { alert('Cotisation envoyée ! Elle sera validée par WakatShop.'); tonLoad(); })
      .catch(() => alert('Échec de l’envoi. Réessayez.'));
  };
  window.tonChoose = function (id, choice) {
    if (!confirm(choice === 'Cash' ? 'Recevoir du cash (3 % de frais) ?' : 'Prendre un article ?')) return;
    post({ action: 'chooseOption', tontineId: id, phone: phoneVal(), choice })
      .then(() => { alert('Choix enregistré. WakatShop vous contactera pour la suite.'); tonLoad(); })
      .catch(() => alert('Échec. Réessayez.'));
  };

  /* ---------- Admin ---------- */
  const box = document.createElement('div');
  box.className = 'section-box';
  box.innerHTML = '<h3>Tontines</h3><button class="btn btn-outline" onclick="tonAdmin()">Charger les tontines</button><div id="ton-admin"></div>';
  document.getElementById('admin-deposits-sec').appendChild(box);

  window.tonAdmin = function () {
    api({ action: 'getTontinesAdmin', pwd: adminPwd }).then(d => {
      if (!d || d.error) throw 0;
      const tn = {}; d.tontines.forEach(t => tn[t.id] = t);
      const nm = (tid, ph) => { const m = d.members.find(x => x.tontineId === tid && digits(x.phone) === digits(ph)); return m ? m.name : ph; };
      const pend = d.cotisations.filter(c => c.status === 'En attente'), tours = d.tours.filter(x => x.status === 'À traiter');
      const tt = (id) => esc((tn[id] || {}).name);
      let h = `<h4 style="margin:10px 0 6px;color:var(--primary)">Cotisations à valider (${pend.length})</h4>` +
        (pend.map(c => `<div class="dep"><b>${esc(nm(c.tontineId, c.phone))}</b> · ${tt(c.tontineId)} · tour ${esc(c.round)}<br>${money(c.amount)} FCFA via ${esc(c.method)} · Réf : ${esc(c.txRef)}<br>
          <button class="btn" onclick="tonReview('${esc(c.id)}','Validé')">Valider</button> <button class="btn btn-danger" onclick="tonReview('${esc(c.id)}','Refusé')">Refuser</button></div>`).join('') || '<p>Aucune.</p>');
      h += `<h4 style="margin:12px 0 6px;color:var(--primary)">Tours à traiter (${tours.length})</h4>` +
        (tours.map(x => `<div class="dep"><b>${esc(nm(x.tontineId, x.phone))}</b> (${esc(x.phone)}) · ${tt(x.tontineId)} · tour ${esc(x.round)}<br><b>${esc(x.choice)}</b> : ${money(x.net)} FCFA${Number(x.fee) ? ' (frais ' + money(x.fee) + ')' : ''}<br>
          <button class="btn" onclick="tonPaid('${esc(x.id)}')">Marquer comme traité</button></div>`).join('') || '<p>Aucun.</p>');
      document.getElementById('ton-admin').innerHTML = h;
    }).catch(() => alert('Impossible de charger les tontines.'));
  };
  window.tonReview = (id, decision) => { if (confirm(decision + ' cette cotisation ?')) post({ action: 'reviewCotisation', id, decision }).then(tonAdmin).catch(() => alert('Échec.')); };
  window.tonPaid = id => { if (confirm('Marquer ce tour comme traité (paiement fait ou article livré) ?')) post({ action: 'markTourPaid', id }).then(tonAdmin).catch(() => alert('Échec.')); };
})();
