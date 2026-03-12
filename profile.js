const API = 'https://rentcar.stepprojects.ge';
let token = null, currentUser = null;

/* ── SESSION ── */
function loadSession() {
  try {
    token = localStorage.getItem('rc_token');
    currentUser = JSON.parse(localStorage.getItem('rc_user') || 'null');
  } catch { token = null; currentUser = null; }
}

/* ── TABS ── */
function showTab(name) {
  ['rentals','favorites','posted'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('.ptab').forEach((btn, i) => {
    btn.classList.toggle('active', ['rentals','favorites','posted'][i] === name);
  });
}

/* ── FAVORITES ── */
function favKey() { return currentUser ? `rc_favs_${currentUser.phoneNumber}` : 'rc_favs_guest'; }
function getFavs() { try { return JSON.parse(localStorage.getItem(favKey()) || '[]'); } catch { return []; } }
function saveFavs(f) { localStorage.setItem(favKey(), JSON.stringify(f)); }
function isFav(id) { return getFavs().some(f => (f.id ?? f) === id); }

function toggleFav(car, btn, cardEl) {
  const favs = getFavs();
  const idx = favs.findIndex(f => (f.id ?? f) === car.id);
  if (idx === -1) {
    favs.push(car);
    btn.classList.add('liked');
    showToast('❤️ მოწონებულებში დაემატა', 'success');
  } else {
    favs.splice(idx, 1);
    btn.classList.remove('liked');
    // animate out
    cardEl.style.transition = 'opacity .3s, transform .3s';
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'scale(0.9)';
    setTimeout(() => {
      cardEl.remove();
      checkFavEmpty();
      updateFavCount();
    }, 300);
    showToast('🤍 ამოიშალა მოწონებულებიდან', '');
  }
  saveFavs(favs);
  updateFavCount();
}

function updateFavCount() {
  const n = getFavs().length;
  const el = document.getElementById('fav-count');
  const el2 = document.getElementById('stat-liked');
  if (el) el.textContent = n;
  if (el2) el2.textContent = n;
}

function checkFavEmpty() {
  const grid = document.getElementById('fav-grid');
  if (grid && grid.querySelectorAll('.car-card').length === 0) {
    grid.innerHTML = `<div class="empty-block"><div class="empty-icon">🤍</div><p>ჯერ არ მოგიწონებიათ მანქანა</p></div>`;
  }
}

/* ── BUILD CARD ── */
function buildCard(car) {
  const liked = isFav(car.id);
  const img = car.imageUrls?.[0];
  const d = document.createElement('div');
  d.className = 'car-card';
  d.innerHTML = `
    <div class="car-img-wrap">
      ${img
        ? `<img src="${img}" alt="${car.brand||''}" loading="lazy" onerror="this.closest('.car-img-wrap').innerHTML='<div class=car-img-ph>🚗</div>'">`
        : '<div class="car-img-ph">🚗</div>'}
      <button class="btn-heart ${liked ? 'liked' : ''}" data-id="${car.id}">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="car-body">
      <div class="car-name">${car.brand||''} ${car.model||''}</div>
      <div class="car-tags">
        ${car.year ? `<span class="tag">📅 ${car.year}</span>` : ''}
        ${car.city ? `<span class="tag">📍 ${car.city}</span>` : ''}
        ${car.capacity ? `<span class="tag">👥 ${car.capacity} კაცი</span>` : ''}
        ${car.transmission ? `<span class="tag">⚙️ ${car.transmission}</span>` : ''}
      </div>
      <div class="car-footer">
        <div>
          <span class="price-num">${car.dailyPrice ?? car.price ?? '—'}</span>
          <span class="price-unit"> ₾/დღე</span>
        </div>
        <button class="btn-remove-rental" onclick="removeFav(this)">🗑</button>
      </div>
    </div>
  `;
  d.querySelector('.btn-heart').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(car, e.currentTarget, d);
  });
  return d;
}

/* ── RENDER FAVORITES ── */
function renderFavorites() {
  const favs = getFavs();
  const grid = document.getElementById('fav-grid');
  document.getElementById('stat-liked').textContent = favs.length;
  if (!favs.length) {
    grid.innerHTML = `<div class="empty-block"><div class="empty-icon">🤍</div><p>ჯერ არ მოგიწონებიათ მანქანა</p></div>`;
    return;
  }
  grid.innerHTML = '';
  favs.forEach(car => grid.appendChild(buildCard(car)));
}

/* ── LOAD RENTALS ── */
async function loadRentals() {
  const list = document.getElementById('rental-list');
  if (!currentUser?.phoneNumber) {
    list.innerHTML = `
  <div class="rental-icon">🚗</div>
  <div>
    <div class="rental-name">${r.carBrand || r.brand || 'მანქანა'} ${r.carModel || r.model || ''}</div>
    <div class="rental-meta">
      ${r.city ? `<span class="rmeta">📍 ${r.city}</span>` : ''}
      <span class="rmeta">📅 ${startFormatted} → ${endFormatted}</span>
      ${days ? `<span class="rmeta">⏱ ${days} დღე</span>` : ''}
    </div>
  </div>
  <div class="rental-price">
    <div class="amount">${totalCost ? totalCost + ' ₾' : '—'}</div>
    ${days ? `<div class="days-label">${days} დღე</div>` : ''}
  </div>
  <button class="btn-remove-rental" onclick="removeRental(this)">🗑</button>
`;
    return;
  }
  try {
    const res = await fetch(`${API}/Purchase/${encodeURIComponent(currentUser.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const rentals = Array.isArray(data) ? data : (data.purchases || data.items || []);

    document.getElementById('stat-rented').textContent = rentals.length;

    if (!rentals.length) {
      list.innerHTML = `<div class="empty-block"><div class="empty-icon">🚗</div><p>ჯერ არ გიქირავებიათ მანქანა</p></div>`;
      return;
    }
    list.innerHTML = '';
    rentals.forEach(r => {
      const startFormatted = r.startDate ? new Date(r.startDate).toLocaleDateString('ka-GE') : '—';
      const endFormatted   = r.endDate   ? new Date(r.endDate).toLocaleDateString('ka-GE')   : '—';
      const days = (r.startDate && r.endDate)
        ? Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / 86400000) : null;
      const totalCost = r.totalPrice || r.amount
        || (days && (r.dailyPrice ?? r.price) ? days * (r.dailyPrice ?? r.price) : null);

      const item = document.createElement('div');
      item.className = 'rental-item';
      item.innerHTML = `
        <div class="rental-icon">🚗</div>
        <div>
          <div class="rental-name">${r.carBrand || r.brand || 'მანქანა'} ${r.carModel || r.model || ''}</div>
          <div class="rental-meta">
            ${r.city ? `<span class="rmeta">📍 ${r.city}</span>` : ''}
            <span class="rmeta">📅 ${startFormatted} → ${endFormatted}</span>
            ${days ? `<span class="rmeta">⏱ ${days} დღე</span>` : ''}
          </div>
        </div>
        <div class="rental-price">
          <div class="amount">${totalCost ? totalCost + ' ₾' : '—'}</div>
          ${days ? `<div class="days-label">${days} დღე</div>` : ''}
        </div>

        <button class="btn-remove-rental" onclick="removeRental(this)">🗑</button>
      `;
      list.appendChild(item);
    });
  } catch {
    list.innerHTML = `<div class="empty-block"><div class="empty-icon">⚠️</div><p>ნაქირავები მანქანები ვერ ჩაიტვირთა</p></div>`;
  }
}

function removeRental(btn) {
  const item = btn.closest('.rental-item');
  item.style.transition = 'opacity .3s, transform .3s';
  item.style.opacity = '0';
  item.style.transform = 'scale(0.9)';
  setTimeout(() => {
    item.remove();
    const remaining = document.querySelectorAll('.rental-item').length;
    document.getElementById('stat-rented').textContent = remaining;
    if (remaining === 0) {
      document.getElementById('rental-list').innerHTML =
        `<div class="empty-block"><div class="empty-icon">🚗</div><p>ჯერ არ გიქირავებიათ მანქანა</p></div>`;
    }
  }, 300);
  showToast('🗑 წაიშალა', '');
}

/* ── LOAD POSTED CARS ── */
async function loadPostedCars() {
  const grid = document.getElementById('posted-grid');
  if (!currentUser?.phoneNumber) {
    grid.innerHTML = `<div class="empty-block"><div class="empty-icon">📋</div><p>ინფორმაცია ვერ მოიძებნა</p></div>`;
    return;
  }
  try {
    const res = await fetch(`${API}/api/Car/byPhone?phoneNumber=${encodeURIComponent(currentUser.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const cars = await res.json();
    const list = Array.isArray(cars) ? cars : [];

    document.getElementById('stat-posted').textContent = list.length;

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-block">
          <div class="empty-icon">📋</div>
          <p>ჯერ არ გაქვთ განთავსებული მანქანა</p>
          <br>
          <a href="add-car.html" style="color:var(--gold);font-size:.875rem;font-weight:500;">+ განცხადების დამატება</a>
        </div>`;
      return;
    }
    grid.innerHTML = '';
    list.forEach(c => grid.appendChild(buildCard(c)));
  } catch {
    document.getElementById('posted-grid').innerHTML = `<div class="empty-block"><div class="empty-icon">⚠️</div><p>ვერ ჩაიტვირთა</p></div>`;
  }
}

/* ── AUTH ── */
function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  window.location.href = 'index.html';
}

/* ── TOAST ── */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── INIT ── */
loadSession();

if (!currentUser || !token) {
  document.getElementById('not-logged').style.display = 'block';
} else {
  document.getElementById('profile-content').style.display = 'block';
  const init = (currentUser.firstName || currentUser.phoneNumber || '?')[0].toUpperCase();
  document.getElementById('avatar-init').textContent = init;
  const fullName = ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim();
  document.getElementById('pname').textContent = fullName || currentUser.phoneNumber;
  document.getElementById('pphone').textContent = '📱 ' + (currentUser.phoneNumber || '—');
  renderFavorites();
  loadRentals();
  loadPostedCars();
}