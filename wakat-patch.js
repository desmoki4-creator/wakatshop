/* WakatShop - correctifs : code PIN, suppression de clients, photo de l'article, rappels.
   À charger EN DERNIER (après wakat-croissance.js). */
(function () {
  let currentPin = '';

  /* ---------- Textes : numéro -> code PIN ---------- */
  const inp = document.getElementById('client-phone');
  if (inp) {
    inp.type = 'password'; inp.inputMode = 'numeric'; inp.maxLength = 6; inp.autocomplete = 'off';
    inp.placeholder = 'Votre code PIN (4 à 6 chiffres)';
    if (inp.previousElementSibling) inp.previousElementSibling.textContent = 'Votre code PIN';
  }
  document.querySelectorAll('#shop-view p, #savings-view p').forEach(p => {
    p.innerHTML = p.innerHTML
      .replace('Créez votre compte avec votre numéro,', 'Créez votre compte avec un code PIN personnel,')
      .replace('Entrez votre numéro Mobile Money pour voir', 'Entrez votre code PIN pour voir');
  });

  /* ---------- Outils ---------- */
  function askIdentity() {
    const name = (prompt("Entrez votre nom et prénom :") || '').trim();
    if (!name) return null;
    const phone = digits(prompt("Entrez votre numéro Mobile Money (pour vous contacter) :"));
    if (phone.length < 8) { alert("Numéro invalide. Vérifiez et réessayez."); return null; }
    const pin = digits(prompt("Choisissez votre code PIN (4 à 6 chiffres), ou entrez-le si vous avez déjà un compte. Il remplace votre numéro pour vous connecter :"));
    if (pin.length < 4 || pin.length > 6) { alert("Le code PIN doit contenir 4 à 6 chiffres."); return null; }
    return { name, phone, pin };
  }
  function fail(e, def) {
    alert(e && e.message === 'pin_taken' ? "Ce code PIN est déjà utilisé. Choisissez-en un autre."
      : e && e.message === 'wrong_pin' ? "Code PIN incorrect pour ce numéro." : def);
  }
  const prodOf = d => findProduct(d.productId) || products.find(p => d.ref && String(d.ref).indexOf(p.title) > -1);
  const photo = d => {
    const p = prodOf(d);
    return p ? `<img src="${esc(p.img || PLACEHOLDER)}" alt="${esc(p.title)}" title="Agrandir" onclick="openProduct('${esc(p.id)}')" style="width:90px;height:90px;object-fit:cover;border-radius:6px;float:right;margin-left:10px;cursor:pointer;border:1px solid var(--gray)">` : '';
  };
  const reste = d => Math.max(Number(d.price) - Number(d.amount), 0);

  /* ---------- Côté client : PIN ---------- */
  window.orderProduct = function (id) {
    const p = findProduct(id); if (!p) return;
    const c = askIdentity(); if (!c) return;
    post({ action: 'saveDeposit', deposit: { name: c.name, phone: c.phone, pin: c.pin, productId: p.id } })
      .then(() => alert("Demande enregistrée ! Retenez votre code PIN : " + c.pin + ". Consultez l'onglet « Mon compte »."))
      .catch(e => fail(e, "Échec de l'envoi. Vérifiez votre connexion et réessayez."));
  };
  window.registerClient = function () {
    const c = askIdentity(); if (!c) return;
    post({ action: 'registerClient', client: { name: c.name, phone: c.phone, pin: c.pin } })
      .then(() => {
        alert("Compte créé ! Retenez votre code PIN : " + c.pin + ". Il vous servira à vous connecter.");
        document.getElementById('client-phone').value = c.pin;
        showView('savings-view', document.querySelectorAll('.nav-item')[1]);
        checkSavings();
      })
      .catch(e => fail(e, "Échec de l'inscription. Vérifiez votre connexion et réessayez."));
  };
  window.requestCustom = function () {
    const item = (prompt("Quel article souhaitez-vous acheter ? (ex : téléviseur 43 pouces, matelas 2 places)") || '').trim();
    if (!item) return;
    const note = (prompt("Votre budget approximatif ou une précision (facultatif) :") || '').trim();
    const c = askIdentity(); if (!c) return;
    post({ action: 'saveDeposit', deposit: { name: c.name, phone: c.phone, pin: c.pin, item: item, note: note } })
      .then(() => alert("Demande envoyée ! WakatShop vous confirmera le prix. Suivez-la dans « Mon compte » avec votre code PIN."))
      .catch(e => fail(e, "Échec de l'envoi. Vérifiez votre connexion et réessayez."));
  };
  window.submitPayment = function (id) {
    const amount = Number(document.getElementById('pa-' + id).value);
    const method = document.getElementById('pm-' + id).value;
    const txRef = document.getElementById('pr-' + id).value.trim();
    if (!(amount > 0)) { alert("Entrez un montant valide."); return; }
    if (txRef.length < 4) { alert("Entrez la référence de la transaction reçue par SMS."); return; }
    post({ action: 'savePayment', payment: { depositId: id, pin: currentPin, amount: amount, method: method, txRef: txRef } })
      .then(() => { alert("Versement envoyé ! Il sera confirmé après vérification par WakatShop."); checkSavings(); })
      .catch(() => alert("Échec de l'envoi. Vérifiez votre connexion et réessayez."));
  };

  window.checkSavings = function () {
    const pin = digits(document.getElementById('client-phone').value);
    const box = document.getElementById('client-savings-result');
    if (pin.length < 4) { alert("Veuillez entrer votre code PIN."); return; }
    currentPin = pin;
    box.innerHTML = '<div class="section-box" style="margin-top:15px">Recherche en cours...</div>';
    Promise.all([
      api({ action: 'getClientDeposits', pin: pin }),
      api({ action: 'getClientPayments', pin: pin }),
      api({ action: 'getClient', pin: pin })
    ]).then(([deps, pays, cli]) => {
      if (!Array.isArray(deps) || !Array.isArray(pays)) throw new Error('format');
      if (!deps.length) {
        box.innerHTML = Array.isArray(cli) && cli.length
          ? `<div class="section-box" style="margin-top:15px"><h3>Bienvenue ${esc(cli[0].name)} 👋</h3><p style="color:#555;line-height:1.5;margin-bottom:12px">Votre compte est créé. Choisissez un article quand vous voulez et payez petit à petit.</p><button class="btn" onclick="showView('shop-view', document.querySelector('.nav-item'))">Voir les articles</button></div>`
          : '<div class="section-box" style="margin-top:15px;color:#c0392b">Code PIN inconnu. Vérifiez-le, ou créez votre compte gratuitement.</div>';
        return;
      }
      const due = deps.filter(d => Number(d.price) > 0 && d.status !== 'Soldé');
      const rappel = due.map(d => `<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:5px;padding:8px;margin-bottom:10px">🔔 <b>Rappel :</b> il vous reste <b>${money(reste(d))} FCFA</b> à verser pour ${esc(d.ref)}.</div>`).join('');
      let html = `<div class="section-box" style="margin-top:15px"><h3>Espace client de ${esc(deps[0].name)}</h3>
        <p style="margin-bottom:15px;color:#555">Connecté avec votre code PIN 🔒</p>${rappel}`;
      deps.forEach(d => {
        const c = STATUS_COLOR[d.status] || '#999';
        const price = Number(d.price) || 0, paid = Number(d.amount) || 0;
        const mine = pays.filter(x => String(x.depositId) === String(d.id)).reverse();
        const id = esc(d.id);
        html += `<div style="background:#fdf8f5;padding:12px;border-radius:5px;margin-bottom:12px;overflow:hidden;border-left:4px solid ${c}">
          ${photo(d)}<strong>${esc(d.ref)}</strong><br>
          ${price ? `Prix : <b>${money(price)} FCFA</b> · Versé : <b>${money(paid)} FCFA</b> · Reste : <b>${money(reste(d))} FCFA</b>${bar(paid, price)}<small>${pct(paid, price)} % payé</small><br>`
                  : `<i>Prix en cours de confirmation par WakatShop${d.note ? ' (' + esc(d.note) + ')' : ''}.</i><br>`}
          Statut : <span class="badge" style="color:${c};border-color:${c}">${esc(d.status)}</span>
          <div class="hist">${mine.length ? mine.map(x => `<div>${dateFmt(x.date)} · ${money(x.amount)} FCFA (${esc(x.method)}) · <span style="color:${STATUS_COLOR[x.status] || '#999'};font-weight:bold">${esc(x.status)}</span></div>`).join('') : '<div>Aucun versement pour le moment.</div>'}</div>`;
        if (d.status !== 'Soldé' && price > 0) {
          html += `<details class="pay"><summary>Faire un versement</summary>
            <div class="payinfo">1) Envoyez le montant par Mobile Money :<br><b>${esc(PAY_INFO)}</b><br>2) Notez la référence reçue par SMS, puis remplissez ci-dessous.</div>
            <input type="number" id="pa-${id}" min="1" placeholder="Montant versé (FCFA)">
            <select id="pm-${id}"><option>Orange Money</option><option>Moov Money</option><option>Autre</option></select>
            <input type="text" id="pr-${id}" placeholder="Référence de la transaction">
            <button class="btn" onclick="submitPayment('${id}')">Envoyer mon versement</button></details>`;
        }
        html += '</div>';
      });
      box.innerHTML = html + '</div>';
    }).catch(() => {
      box.innerHTML = '<div class="section-box" style="margin-top:15px;color:#c0392b">Impossible de charger votre compte. Vérifiez votre connexion et réessayez.</div>';
    });
  };

  /* ---------- Côté admin : photo, PIN, rappels, suppressions ---------- */
  window.renderAdminDeposits = function () {
    const list = document.getElementById('admin-deposits-list');
    const byId = {}; deposits.forEach(d => byId[d.id] = d);
    const pending = payments.filter(p => p.status === 'En attente');
    let html = `<h4 style="color:var(--primary);margin-bottom:8px">Versements à valider (${pending.length})</h4>`;
    html += pending.length ? pending.map(p => {
      const d = byId[p.depositId] || {};
      return `<div class="dep">${photo(d)}<strong>${esc(d.name)}</strong> (${esc(p.phone)})<br>${esc(d.ref)}<br>
        <b>${money(p.amount)} FCFA</b> via ${esc(p.method)} · Réf : ${esc(p.txRef)} · ${dateFmt(p.date)}<br>
        <button class="btn" onclick="reviewPayment('${esc(p.id)}','Validé')">Valider</button>
        <button class="btn btn-danger" onclick="reviewPayment('${esc(p.id)}','Refusé')">Refuser</button></div>`;
    }).join('') : '<p style="margin-bottom:15px">Aucun versement en attente.</p>';
    html += `<h4 style="color:var(--primary);margin:15px 0 8px">Dossiers clients</h4>`;
    html += deposits.length ? deposits.slice().reverse().map(d => {
      const id = esc(d.id), open = Number(d.price) > 0 && d.status !== 'Soldé';
      return `<div class="dep">${photo(d)}<strong>${esc(d.name)}</strong> (${esc(d.phone)}) · PIN : <b>${esc(d.pin || '—')}</b><br>${esc(d.ref)}<br>
        ${d.note ? `<small>Précision du client : ${esc(d.note)}</small><br>` : ''}
        ${money(d.amount)} / ${money(d.price)} FCFA · <b>${esc(d.status)}</b>${bar(d.amount, d.price)}
        ${Number(d.price) > 0 ? '' : `<input type="number" id="price-${id}" min="1" placeholder="Fixer le prix (FCFA)"><button class="btn" onclick="setPrice('${id}')">Fixer le prix</button><br>`}
        <input type="number" id="cash-${id}" min="0" placeholder="Versement en espèces">
        <button class="btn" onclick="addCash('${id}')">Ajouter</button><br>
        ${open ? `<button class="btn btn-outline" onclick="remind('${id}','wa')">🔔 Rappel WhatsApp</button> <button class="btn btn-outline" onclick="remind('${id}','sms')">🔔 Rappel SMS</button><br>` : ''}
        <button class="btn btn-danger" onclick="deleteDossier('${id}')">Supprimer ce dossier</button>
        <button class="btn btn-danger" onclick="deleteClientAcct('${esc(digits(d.phone))}')">Supprimer le client</button></div>`;
    }).join('') : '<p>Aucun dossier pour le moment.</p>';
    html += `<h4 style="color:var(--primary);margin:15px 0 8px">Inscrits sans article (${registered.length})</h4>`;
    html += registered.length ? registered.slice().reverse().map(c => `<div class="dep">
        <strong>${esc(c.name)}</strong> (${esc(c.phone)}) · PIN : <b>${esc(c.pin || '—')}</b> · ${dateFmt(c.date)}<br>
        <button class="btn btn-danger" onclick="deleteClientAcct('${esc(digits(c.phone))}')">Supprimer ce client</button></div>`).join('')
      : '<p>Aucune inscription pour le moment.</p>';
    list.innerHTML = html;
  };

  window.deleteClientAcct = function (phone) {
    if (!confirm("Supprimer définitivement ce client (compte, dossiers et versements) ?")) return;
    post({ action: 'deleteClient', phone: phone })
      .then(() => { alert("Client supprimé."); return loadDeposits(); })
      .catch(() => alert("Échec de la suppression."));
  };
  window.deleteDossier = function (id) {
    if (!confirm("Supprimer ce dossier et ses versements ? Le compte du client reste actif.")) return;
    post({ action: 'deleteDeposit', depositId: id })
      .then(() => { alert("Dossier supprimé."); return loadDeposits(); })
      .catch(() => alert("Échec de la suppression."));
  };
  window.remind = function (id, mode) {
    const d = deposits.find(x => String(x.id) === String(id)); if (!d) return;
    let n = digits(d.phone); if (n.length > 8 && n.indexOf('226') === 0) n = n.slice(3);
    const msg = `Bonjour ${d.name}, rappel WakatShop : il vous reste ${money(reste(d))} FCFA à verser pour « ${d.ref} ». Merci de faire votre prochain versement. Connectez-vous à votre compte avec votre code PIN.`;
    window.open(mode === 'wa' ? 'https://wa.me/226' + n + '?text=' + encodeURIComponent(msg)
                              : 'sms:+226' + n + '?body=' + encodeURIComponent(msg), '_blank');
  };

  /* Réafficher les dossiers (photos) une fois le catalogue chargé */
  const rp = window.refreshProducts;
  window.refreshProducts = function () { rp(); if (adminPwd && deposits.length) renderAdminDeposits(); };
})();
