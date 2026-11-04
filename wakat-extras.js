/* WakatShop – cartes compactes qui s’agrandissent + onglet À propos
   À charger APRÈS le script principal : <script src="wakat-extras.js"></script> avant </body> */
(function () {
  const css = `
#products-grid{grid-template-columns:repeat(2,1fr);gap:10px}
@media(min-width:700px){#products-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1000px){#products-grid{grid-template-columns:repeat(4,1fr)}}
.pc{background:var(--white);border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer;display:flex;flex-direction:column;border:1px solid transparent}
.pc.open{grid-column:1/-1;border-color:var(--primary);cursor:default}
.pc-photo{position:relative}
.pc-photo img{width:100%;height:125px;object-fit:cover;display:block;background:#eee}
.pc.open .pc-photo img{height:260px;object-fit:contain;background:#000}
.pc-tag{position:absolute;left:6px;top:6px;background:rgba(255,255,255,.93);color:#2e7d32;font-size:.7rem;font-weight:700;padding:2px 7px;border-radius:10px}
.pc-body{padding:8px 10px 10px}
.pc-title{font-size:.9rem;font-weight:700;color:var(--primary-dark);line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pc.open .pc-title{font-size:1.15rem;display:block}
.pc-price{color:var(--primary);font-weight:700;font-size:.95rem;margin-top:3px}
.pc-more{font-size:.75rem;color:#666;margin-top:2px}
.pc.open .pc-more{display:none}
.pc-detail{display:none;margin-top:8px}
.pc.open .pc-detail{display:block}
.pc-detail p{font-size:.92rem;color:#555;line-height:1.45;white-space:pre-line;margin-bottom:10px}
.pc-close{background:none;border:0;color:#666;font-size:.85rem;margin-top:6px;cursor:pointer;width:100%;padding:6px}
.ab-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
.ab-btns a{display:block;text-align:center;padding:12px 8px;border-radius:6px;font-weight:700;text-decoration:none;color:#fff;background:var(--primary)}
.ab-btns a.wa{background:#1f8f4e}
.ab-steps{margin:0 0 4px 20px;line-height:1.7;color:#555}
.ab-p{font-size:.95rem;color:#555;line-height:1.55;margin-bottom:6px}
`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Cartes compactes ---------- */
  const baseCard = window.productCard;
  window.productCard = function (p, admin) {
    if (admin) return baseCard(p, true);
    const id = esc(p.id);
    return `<div class="pc" id="pc-${id}" onclick="toggleCard('${id}')">
      <div class="pc-photo"><img src="${esc(p.img || PLACEHOLDER)}" alt="${esc(p.title)}" loading="lazy"><span class="pc-tag">✓ Vérifié</span></div>
      <div class="pc-body">
        <div class="pc-title">${esc(p.title)}</div>
        <div class="pc-price">${money(p.price)} FCFA</div>
        <div class="pc-more">Appuyer pour voir ▾</div>
        <div class="pc-detail" onclick="event.stopPropagation()">
          <p>${esc(p.description || 'Aucune description détaillée.')}</p>
          <button class="btn" onclick="orderProduct('${id}')">Commander / Épargner</button>
          <button class="pc-close" onclick="toggleCard('${id}')">Réduire ▴</button>
        </div>
      </div></div>`;
  };
  window.toggleCard = function (id) {
    const el = document.getElementById('pc-' + id);
    if (!el) return;
    const wasOpen = el.classList.contains('open');
    document.querySelectorAll('.pc.open').forEach(c => c.classList.remove('open'));
    if (!wasOpen) {
      el.classList.add('open');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  /* ---------- Onglet À propos ---------- */
  document.querySelectorAll('#shop-view .section-box').forEach(b => {
    const h = b.querySelector('h3');
    if (h && h.textContent.trim() === 'À propos de WakatShop') b.remove();
  });

  const nav = document.querySelector('nav.bottom-nav');
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  btn.innerHTML = '<i>ℹ️</i>À propos';
  btn.onclick = function () { switchView('about-view', btn); };
  nav.insertBefore(btn, nav.lastElementChild);

  const v = document.createElement('div');
  v.id = 'about-view';
  v.className = 'view';
  v.innerHTML = `
    <div class="section-box">
      <h2>Bienvenue sur WakatShop</h2>
      <p class="ab-p">WakatShop vous permet d’acheter ce dont vous avez besoin, petit à petit. Lits, meubles, électroménager et bien d’autres articles : vous choisissez, vous versez à votre rythme par Mobile Money, et vous recevez votre article quand votre épargne est complète.</p>
    </div>
    <div class="section-box">
      <h3>Comment ça marche ?</h3>
      <ol class="ab-steps">
        <li>Inscrivez-vous gratuitement, sans obligation d’achat.</li>
        <li>Choisissez votre article et fixez votre rythme de versements.</li>
        <li>Versez quand vous pouvez et suivez votre avancement dans « Mon compte ».</li>
        <li>Recevez votre article une fois le paiement terminé.</li>
      </ol>
    </div>
    <div class="section-box">
      <h3>Pourquoi nous faire confiance ?</h3>
      <p class="ab-p">La qualité de chaque article proposé sur WakatShop est vérifiée et confirmée. Chaque versement est validé et enregistré, et vous suivez votre épargne à tout moment.</p>
    </div>
    <div class="section-box">
      <h3>Une question ? Contactez-nous</h3>
      <div class="ab-btns">
        <a href="tel:+22673351207">📞 Appeler<br><small>+226 73 35 12 07</small></a>
        <a href="tel:+22667443949">📞 Appeler<br><small>+226 67 44 39 49</small></a>
      </div>
      <div class="ab-btns" style="grid-template-columns:1fr">
        <a class="wa" href="https://wa.me/22667443949" target="_blank" rel="noopener">💬 WhatsApp<br><small>+226 67 44 39 49</small></a>
      </div>
    </div>`;
  document.querySelector('.container').appendChild(v);

  if (typeof products !== 'undefined' && products.length) renderProducts();
})();
