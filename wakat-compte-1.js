/* WakatShop – un client déjà inscrit ne recrée plus de compte quand il choisit un article.
   À charger après les autres : <script src="wakat-compte.js"></script> avant </body> */
(function () {
  const K = 'wk_client';
  const get = () => { try { return JSON.parse(localStorage.getItem(K)); } catch (e) { return null; } };
  const set = c => { try { localStorage.setItem(K, JSON.stringify(c)); } catch (e) {} };
  const forget = () => { try { localStorage.removeItem(K); } catch (e) {} };

  function send(p, c) {
    return post({ action: 'saveDeposit', deposit: { name: c.name, phone: c.phone, productId: p.id } })
      .then(() => alert('Demande enregistrée ! Consultez l’onglet « Mon compte ».'))
      .catch(() => alert('Échec de l’envoi. Vérifiez votre connexion et réessayez.'));
  }

  window.orderProduct = function (id) {
    const p = findProduct(id);
    if (!p) return;
    const c = get();
    if (c && c.phone && c.name) {
      if (confirm('Commander « ' + p.title + ' » avec le compte de ' + c.name + ' (' + c.phone + ') ?')) return send(p, c);
      if (confirm('Utiliser un autre numéro ?')) { forget(); return orderProduct(id); }
      return;
    }
    const phone = digits(prompt('Entrez votre numéro de téléphone Mobile Money pour épargner sur : ' + p.title));
    if (!phone) return;
    if (phone.length < 8) { alert('Numéro invalide. Vérifiez et réessayez.'); return; }
    return Promise.all([api({ action: 'getClient', phone: phone }), api({ action: 'getClientDeposits', phone: phone })]).then(([cli, deps]) => {
      let name = Array.isArray(cli) && cli.length ? String(cli[0].name || '').trim()
        : (Array.isArray(deps) && deps.length ? String(deps[0].name || '').trim() : '');
      if (!name) name = (prompt('Entrez votre nom et prénom :') || '').trim();
      if (!name) return;
      const acc = { name: name, phone: phone };
      set(acc);
      return send(p, acc);
    }).catch(() => alert('Échec. Vérifiez votre connexion et réessayez.'));
  };
})();
