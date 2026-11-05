/* WakatShop – parrainage + espace vendeur. À charger en dernier :
   <script src="wakat-croissance.js"></script> avant </body> */
(function () {
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const p0 = 'color:#555;line-height:1.5;margin-bottom:10px';

  /* ---------- Parrainage : mémoriser le lien ?ref= et l'envoyer à l'inscription ---------- */
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref && digits(ref).length >= 8) store.set('wk_ref', digits(ref));
  const basePost = window.post;
  window.post = function (body) {
    return basePost(body).then(r => {
      if (body.action === 'registerClient' || body.action === 'saveDeposit') {
        const ph = digits((body.client || body.deposit || {}).phone), code = store.get('wk_ref');
        if (code && ph && ph !== code) { basePost({ action: 'setReferrer', phone: ph, code: code }).catch(() => {}); store.del('wk_ref'); }
      }
      return r;
    });
  };

  const rb = document.createElement('div');
  rb.className = 'section-box';
  rb.innerHTML = `<h3>Parrainage</h3><p style="${p0}">Invitez un ami : vous gagnez un bonus sur votre épargne dès que son premier versement est validé.</p>
    <button class="btn btn-outline" onclick="refShow()">Voir mon lien de parrainage</button><div id="ref-box"></div>`;
  document.getElementById('savings-view').appendChild(rb);

  window.refShow = function () {
    const ph = digits(document.getElementById('client-phone').value);
    if (ph.length < 8) { alert('Entrez d’abord votre numéro de téléphone ci-dessus.'); return; }
    api({ action: 'getReferral', phone: ph }).then(r => {
      if (!r || r.error) throw 0;
      const link = location.origin + location.pathname + '?ref=' + ph;
      const wa = 'https://wa.me/?text=' + encodeURIComponent('Rejoins WakatShop et achète petit à petit : ' + link);
      document.getElementById('ref-box').innerHTML = `<div class="payinfo">Bonus : <b>${money(r.bonus)} FCFA</b> ajoutés à votre épargne pour chaque ami dont le premier versement est validé.<br>Votre lien : <b>${esc(link)}</b><br><a href="${wa}" target="_blank" rel="noopener">Partager sur WhatsApp</a></div>
        <div class="hist">${r.referrals.length ? r.referrals.map(x => `<div>${esc(x.name || 'Ami')} · ${esc(x.status)}</div>`).join('') : '<div>Aucun filleul pour le moment.</div>'}</div>`;
    }).catch(() => alert('Chargement impossible. Réessayez.'));
  };

  /* ---------- Espace vendeur ---------- */
  let vend = null;
  const vv = document.createElement('div');
  vv.id = 'vendor-view';
  vv.className = 'view';
  vv.innerHTML = `<div class="section-box"><h2>Espace vendeur</h2>
    <p style="${p0}">Connectez-vous avec le numéro et le code vendeur donnés par WakatShop. Vos articles sont publiés après vérification.</p>
    <div class="form-group"><input type="tel" id="v-phone" placeholder="Votre numéro"></div>
    <div class="form-group"><input type="password" id="v-code" placeholder="Votre code vendeur"></div>
    <button class="btn" onclick="vendLogin()">Me connecter</button></div><div id="v-area"></div>`;
  document.querySelector('.container').appendChild(vv);

  const about = document.getElementById('about-view');
  if (about) {
    const ab = document.createElement('div');
    ab.className = 'section-box';
    ab.innerHTML = `<h3>Vous vendez des articles ?</h3><p style="${p0}">Proposez vos articles sur WakatShop.</p>
      <button class="btn btn-outline" onclick="showView('vendor-view', document.createElement('i'))">Espace vendeur</button>`;
    about.appendChild(ab);
  }

  window.vendLogin = function () {
    vend = { phone: digits(document.getElementById('v-phone').value), code: document.getElementById('v-code').value.trim() };
    vendLoad();
  };
  function vendLoad() {
    const box = document.getElementById('v-area');
    api({ action: 'getVendorProducts', phone: vend.phone, code: vend.code }).then(list => {
      if (!Array.isArray(list)) { vend = null; box.innerHTML = ''; alert('Numéro ou code incorrect.'); return; }
      box.innerHTML = `<div class="section-box"><button class="btn" onclick="vendAdd()">Ajouter un article</button></div>
        <div class="section-box"><h3>Mes articles</h3>${list.length ? list.map(p => `<div class="dep"><b>${esc(p.title)}</b> · ${money(p.price)} FCFA<br>Statut : <b>${esc(p.status)}</b><br>
          <button class="btn btn-danger" onclick="vendDel('${esc(p.id)}')">Supprimer</button></div>`).join('') : '<p>Aucun article pour le moment.</p>'}</div>`;
    }).catch(() => alert('Chargement impossible. Vérifiez votre connexion.'));
  }
  window.vendAdd = function () {
    const title = (prompt('Nom de l’article :') || '').trim(); if (!title) return;
    const category = (prompt('Catégorie (ex : Lits, Meubles, Matelas) :', 'Autres') || 'Autres').trim();
    const price = Math.round(Number(prompt('Prix (FCFA) :')));
    if (!(price > 0)) { alert('Prix invalide.'); return; }
    const img = (prompt('Lien direct de la photo (ImgBB) :') || '').trim();
    const description = (prompt('Description (matériaux, dimensions…) :') || '').trim();
    post({ action: 'vendorAddProduct', phone: vend.phone, code: vend.code, product: { title, category, price, img, description } })
      .then(() => { alert('Article envoyé. Il sera publié après vérification par WakatShop.'); vendLoad(); })
      .catch(() => alert('Échec de l’envoi. Réessayez.'));
  };
  window.vendDel = function (id) {
    if (!confirm('Supprimer cet article ?')) return;
    post({ action: 'vendorDeleteProduct', phone: vend.phone, code: vend.code, id })
      .then(() => { loadProducts(); vendLoad(); }).catch(() => alert('Échec de la suppression.'));
  };

  /* ---------- Admin ---------- */
  const ab2 = document.createElement('div');
  ab2.className = 'section-box';
  ab2.innerHTML = '<h3>Parrainage & vendeurs</h3><button class="btn btn-outline" onclick="growAdmin()">Charger</button><div id="grow-admin"></div>';
  document.getElementById('admin-deposits-sec').appendChild(ab2);

  const h4 = t => `<h4 style="margin:12px 0 6px;color:var(--primary)">${t}</h4>`;
  window.growAdmin = function () {
    api({ action: 'getGrowthAdmin', pwd: adminPwd }).then(d => {
      if (!d || d.error) throw 0;
      const refs = d.referrals.filter(r => r.status === 'En attente'), prods = d.products.filter(p => p.status === 'En attente');
      let h = h4('Parrainages en attente (' + refs.length + ')') + (refs.map(r => `<div class="dep"><b>${esc(r.name || r.referred)}</b> (${esc(r.referred)}) parrainé par ${esc(r.referrer)}<br>
        Premier versement validé : <b>${r.paid ? 'oui' : 'pas encore'}</b><br>${r.paid ? `<button class="btn" onclick="growDo('creditReferral',{id:'${esc(r.id)}'})">Créditer ${money(r.bonus)} FCFA au parrain</button>` : ''}</div>`).join('') || '<p>Aucun.</p>');
      h += h4('Articles vendeurs à vérifier (' + prods.length + ')') + (prods.map(p => `<div class="dep"><b>${esc(p.title)}</b> · ${money(p.price)} FCFA · vendeur ${esc(p.vendor)}<br>${esc(p.description)}<br>
        <button class="btn" onclick="growDo('reviewVendorProduct',{id:'${esc(p.id)}',decision:'Validé'},true)">Approuver</button>
        <button class="btn btn-danger" onclick="growDo('reviewVendorProduct',{id:'${esc(p.id)}',decision:'Refusé'})">Refuser</button></div>`).join('') || '<p>Aucun.</p>');
      h += h4('Vendeurs (' + d.vendors.length + ')') + d.vendors.map(v => `<div class="dep">${esc(v.name)} · ${esc(v.phone)}</div>`).join('') +
        '<button class="btn btn-outline" onclick="vendNew()">Ajouter un vendeur</button>';
      document.getElementById('grow-admin').innerHTML = h;
    }).catch(() => alert('Impossible de charger.'));
  };
  window.growDo = function (action, extra, reload) {
    post(Object.assign({ action }, extra)).then(() => { if (reload) loadProducts(); growAdmin(); })
      .catch(e => alert(e.message === 'no deposit' ? 'Le parrain n’a pas d’article en cours : le bonus sera possible dès qu’il en aura un.' : 'Échec de l’opération.'));
  };
  window.vendNew = function () {
    const name = (prompt('Nom du vendeur :') || '').trim(); if (!name) return;
    const phone = digits(prompt('Numéro du vendeur :'));
    const code = (prompt('Code vendeur à lui donner (4 caractères minimum) :') || '').trim();
    if (phone.length < 8 || code.length < 4) { alert('Numéro ou code invalide.'); return; }
    growDo('addVendor', { name, phone, code });
  };
})();
