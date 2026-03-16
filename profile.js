const API = 'https://rentcar.stepprojects.ge';
let token = null, currentUser = null;

/* ── SESSION ── */
function loadSession() {
  try {
    token = localStorage.getItem('rc_token');
    currentUser = JSON.parse(localStorage.getItem('rc_user') || 'null');
  } catch { token = null; currentUser = null; }
}

/* ── NAVBAR ── */
// function renderNav() {
//   const nav = document.getElementById('nav-links');
//   if (!nav) return;
//   if (currentUser && token) {
//     const i = ((currentUser.firstName || '?')[0] + (currentUser.lastName || '')[0] || '').toUpperCase();
//     nav.innerHTML = `
//       <a href="add-car.html" class="nav-btn primary"><i class="fa-solid fa-plus"></i></a>
//       <a href="notifications.html" class="nav-btn icon-btn" style="position:relative" title="შეტყობინებები">
//         <i class="fa-solid fa-bell"></i>
//         <span class="notif-badge" id="notif-badge" style="display:none">0</span>
//       </a>
//       <a href="profile.html" class="nav-btn" style="display:flex;align-items:center;gap:6px;border:1px solid var(--gold)">
//         <span class="nav-avatar">${i}</span>${currentUser.firstName||currentUser.phoneNumber}
//       </a>
//       <button class="nav-btn gamo" onclick="logout()">გამოსვლა</button>`;
//     loadNotifCount();
//   } else {
//     nav.innerHTML = `
//       <a href="filter.html" class="nav-btn">ფილტრი</a>
//       <a href="login.html" class="nav-btn primary">შესვლა</a>`;
//   }
// }

async function loadNotifCount() {
  const badge = document.getElementById('notif-badge');
  if (!badge || !currentUser?.phoneNumber || !token) return;
  try {
    const res = await fetch(`${API}/Message/Messages?phoneNumber=${encodeURIComponent(currentUser.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const msgs = await res.json();
    const count = Array.isArray(msgs) ? msgs.length : 0;
    const readCount = parseInt(localStorage.getItem(`rc_notif_read_count_${currentUser.phoneNumber}`) || '0');
    if (count > readCount) {
      badge.textContent = count - readCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

/* ── TABS ── */
function showTab(name) {
  ['rentals','favorites','posted'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('.ptab').forEach((btn, i) => {
    btn.classList.toggle('active', ['rentals','favorites','posted'][i] === name);
  });

  // Arabayı aktif butona taşı
  const tabs = document.querySelectorAll('.ptab');
  const activeIndex = ['rentals','favorites','posted'].indexOf(name);
  const activeBtn = tabs[activeIndex];
  const car = document.getElementById('car-indicator');
  const wrap = document.querySelector('.profile-tabs-wrap');
  const btnLeft = activeBtn.offsetLeft;
  const btnWidth = activeBtn.offsetWidth;
  car.style.left = (btnLeft + btnWidth / 2 - car.offsetWidth / 2) + 'px';
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
function buildCard(car, isPosted = false, isFavCard = false) {
  const liked = isFav(car.id);
  const img = car.imageUrl1 || car.imageUrls?.[0] || null;
  const d = document.createElement('div');
  d.className = 'car-card';
  d.innerHTML = `
<div class="car-img-wrap">
  ${img
    ? `<img src="${img}" alt="${car.brand||''}" loading="lazy" onerror="this.closest('.car-img-wrap').innerHTML='<div class=car-img-ph><i class=fa-solid fa-image></i></div>'">`
    : '<div class="car-img-ph"><i class="fa-solid fa-image"></i></div>'}
  <button class="btn-heart ${liked ? 'liked' : ''}" data-id="${car.id}">
    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  </button>
  ${isPosted
    ? `<button class="btn-remove-rental-card" onclick="deletePostedCar(${car.id}, this)"><span>🗑 წაშლა</span></button>`
    : `<a href="car-detail.html?id=${car.id}" class="btn-hover-rent"><span>იქირავე</span></a>`
  }
</div>
    <div class="car-body">
      <div class="car-name">${car.brand||''} ${car.model||''}</div>
      <div class="car-tags">
        ${car.year ? `<span class="tag"><i class="fa-solid fa-calendar-days"></i> ${car.year}</span>` : ''}
        ${car.capacity ? `<span class="tag"><i class="fa-solid fa-people-group"></i> ${car.capacity} კაცი</span>` : ''}
        ${car.transmission ? `<span class="tag"><i class="fa-solid fa-gears"></i> ${car.transmission}</span>` : ''}
        ${(car.fuelCapacity||car.fuelTankCapacity) ? `<span class="tag"><i class="fa-solid fa-gas-pump"></i> ${car.fuelCapacity||car.fuelTankCapacity}ლ</span>` : ''}
      </div>
      <div class="car-footer">
        <div>
          <span class="price-num">${car.dailyPrice ?? car.price ?? '—'}</span>
          <span class="price-unit"> ₾/დღე</span>
        </div>
      
        ${car.createdBy ? `<span class="tag"><i class="fa-solid fa-user"></i> ${car.createdBy}</span>` : ''}
        
      </div>
    </div>
  `;
d.querySelector('.btn-heart').addEventListener('click', e => {
  e.stopPropagation();
  const btn = e.currentTarget;
  const favs = getFavs();
  const idx = favs.findIndex(f => (f.id ?? f) === car.id);
  if (idx === -1) {
    favs.push(car);
    btn.classList.add('liked');
    showToast('❤️ მოწონებულებში დაემატა', 'success');
  } else {
    favs.splice(idx, 1);
    btn.classList.remove('liked');
    if (isFavCard) {
      d.style.transition = 'opacity .3s, transform .3s';
      d.style.opacity = '0';
      d.style.transform = 'scale(0.9)';
      setTimeout(() => {
        d.remove();
        checkFavEmpty();
        updateFavCount();
      }, 300);
    }
    showToast('🤍 ამოიშალა მოწონებულებიდან', '');
  }
  saveFavs(favs);
  updateFavCount();
});
  return d;
}

/* ── RENDER FAVORITES ── */
function renderFavorites() {
  const favs = getFavs();
  const grid = document.getElementById('fav-grid');
  document.getElementById('stat-liked').textContent = favs.length;
  if (!favs.length) {
    grid.innerHTML = `<div class="empty-block"><div class="empty-icon"></div><p>ჯერ არ მოგიწონებიათ მანქანა</p></div>`;
    return;
  }
  grid.innerHTML = '';
favs.forEach(car => grid.appendChild(buildCard(car, false, true)));
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

const hiddenKey = `rc_hidden_rentals_${currentUser.phoneNumber}`;
const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
const filteredRentals = rentals.filter(r => !hidden.includes(String(r.carId)));

document.getElementById('stat-rented').textContent = filteredRentals.length;

if (!filteredRentals.length) {
  list.innerHTML = `<div class="empty-block"><div class="empty-icon"></div><p>ჯერ არ გიქირავებიათ მანქანა</p></div>`;
  return;
}
list.innerHTML = '';
//Bu halda API ne gonderiyorsa, onu çekiyor. Ancak aşağıda biz ek işlem yaparak, carda arabanın bütün malumatlarını ekledik.

// filteredRentals.forEach(r => {
//   const days = r.multiplier || null;
//   const totalCost = r.pricePaid || null;

//   const item = document.createElement('div');
//   item.className = 'car-card';
//   item.dataset.rentalId = String(r.carId);
//   item.innerHTML = `
//     <div class="car-img-wrap">
//       <div class="car-img-ph">🚗</div>
//       <div class="rental-badge">
//         ${days ? `⏱ ${days} დღე` : ''}
//       </div>
//     </div>
//     <div class="car-body">
//       <div class="car-name">${r.carBrand || 'მანქანა'} ${r.carModel || ''}</div>
//       <div class="car-tags">
//         ${r.city ? `<span class="tag"><i class="fa-solid fa-location-dot"></i> ${r.city}</span>` : ''}
//         ${days ? `<span class="tag"><i class="fa-solid fa-calendar-days"></i> ${days} დღე</span>` : ''}
//       </div>
//       <div class="car-footer">
//         <div>
//           <span class="price-num">${totalCost ? totalCost + ' ₾' : '—'}</span>
//           <span class="price-unit"> სულ</span>
//         </div>
//         <button class="btn-remove-rental" onclick="removeRental(this)">🗑</button>
//       </div>
//     </div>
//   `;
//   list.appendChild(item);
// });

for(const r of filteredRentals) {
  let carData = {};
  try {
    const carRes = await fetch(`${API}/api/Car/${r.carId}`);
    if(carRes.ok) carData = await carRes.json();
  } catch {}

  const days = r.multiplier || null;
  const totalCost = r.pricePaid || null;
  const img = carData.imageUrl1 || null;

  const item = document.createElement('div');
  item.className = 'car-card';
  item.dataset.rentalId = String(r.carId);
  item.innerHTML = `
<div class="car-img-wrap">
  ${img
    ? `<img src="${img}" alt="" loading="lazy">`
    : '<div class="car-img-ph">🚗</div>'}
  <button class="btn-heart ${isFav(carData.id) ? 'liked' : ''}" data-id="${carData.id}">
    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  </button>
  <button class="btn-remove-rental-card" onclick="removeRental(this)">
    <span>🗑 წაშლა</span>
  </button>
</div>
    <div class="car-body">
      <div class="car-name">${r.carBrand || carData.brand || 'მანქანა'} ${r.carModel || carData.model || ''}</div>
      <div class="car-tags">
        ${carData.year ? `<span class="tag"><i class="fa-solid fa-calendar-days"></i> ${carData.year}</span>` : ''}
        ${r.city || carData.city ? `<span class="tag"><i class="fa-solid fa-location-dot"></i> ${r.city || carData.city}</span>` : ''}
        ${carData.capacity ? `<span class="tag"><i class="fa-solid fa-people-group"></i> ${carData.capacity} კაცი</span>` : ''}
        ${carData.transmission ? `<span class="tag"><i class="fa-solid fa-gears"></i> ${carData.transmission}</span>` : ''}



      </div>
      <div class="car-footer">
        <div>
          <span class="price-num">${totalCost ? totalCost + ' ₾' : '—'}</span>
          <span class="price-unit"> სულ</span>
        </div>
        ${days ? `<span class="rental-badge">⏱ ${days} დღე</span>` : ''}
      </div>
    </div>
  `;
item.querySelector('.btn-heart').addEventListener('click', e => {
  e.stopPropagation();
  const btn = e.currentTarget;
  const favs = getFavs();
  const idx = favs.findIndex(f => (f.id ?? f) === carData.id);
  if (idx === -1) {
    favs.push(carData);
    btn.classList.add('liked');
    showToast('❤️ მოწონებულებში დაემატა', 'success');
  } else {
    favs.splice(idx, 1);
    btn.classList.remove('liked');
    showToast('🤍 ამოიშალა მოწონებულებიდან', '');
  }
  saveFavs(favs);
  updateFavCount();
});
  list.appendChild(item);
}

  } catch {
    list.innerHTML = `<div class="empty-block"><div class="empty-icon">⚠️</div><p>ნაქირავები მანქანები ვერ ჩაიტვირთა</p></div>`;
  }
}

function removeRental(btn) {
const item = btn.closest('.car-card');
const rentalId = item.dataset.rentalId;
  
  // Silinenleri localStorage'a kaydet
  const hiddenKey = `rc_hidden_rentals_${currentUser.phoneNumber}`;
  const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
if(rentalId && rentalId !== 'null' && rentalId !== 'undefined') hidden.push(rentalId);
  localStorage.setItem(hiddenKey, JSON.stringify(hidden));

  item.style.transition = 'opacity .3s, transform .3s';
  item.style.opacity = '0';
  item.style.transform = 'scale(0.9)';
setTimeout(() => {
  item.remove();
  const remaining = document.querySelectorAll('#rental-list .car-card').length;
  document.getElementById('stat-rented').textContent = remaining;
  if (remaining === 0) {
    document.getElementById('rental-list').innerHTML =
      `<div class="empty-block"><div class="empty-icon">🚗</div><p>ჯერ არ გიქირავებიათ მანქანა</p></div>`;
  }
}, 300);
  showToast('🗑 წაიშალა', '');
}

function deletePostedCar(carId, btn) {
  const hiddenKey = `rc_hidden_posted_${currentUser.phoneNumber}`;
  const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
  hidden.push(String(carId));
  localStorage.setItem(hiddenKey, JSON.stringify(hidden));

  const card = btn.closest('.car-card');
  card.style.transition = 'opacity .3s, transform .3s';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.9)';
  setTimeout(() => {
    card.remove();
    const remaining = document.querySelectorAll('#posted-grid .car-card').length;
    document.getElementById('stat-posted').textContent = remaining;
  }, 300);
  showToast('🗑 განცხადება წაიშალა', '');
}

/* ── LOAD POSTED CARS ── */
async function loadPostedCars() {
  const grid = document.getElementById('posted-grid');
  if (!currentUser?.phoneNumber) {
    grid.innerHTML = `<div class="empty-block"><div class="empty-icon">📋</div><p>ინფორმაცია ვერ მოიძებნა</p></div>`;
    return;
  }
  try {
    const res = await fetch(`${API}/api/Car/byPhone?PhoneNumber=${encodeURIComponent(currentUser.phoneNumber)}`, {
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
const hiddenKey = `rc_hidden_posted_${currentUser.phoneNumber}`;
const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
const filteredList = list.filter(c => !hidden.includes(String(c.id)));

document.getElementById('stat-posted').textContent = filteredList.length;

grid.innerHTML = '';
filteredList.forEach(c => grid.appendChild(buildCard(c, true)));
  } catch {
    document.getElementById('posted-grid').innerHTML = `<div class="empty-block"><div class="empty-icon">⚠️</div><p>ვერ ჩაიტვირთა</p></div>`;
  }
}

/* ── AUTH ── */
// function logout() {
//   localStorage.removeItem('rc_token');
//   localStorage.removeItem('rc_user');
//   window.location.href = 'index.html';
// }

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
// renderNav();

if (!currentUser || !token) {
  document.getElementById('not-logged').style.display = 'block';
} else {
  document.getElementById('profile-content').style.display = 'block';
const init = ((currentUser.firstName || '?')[0] + (currentUser.lastName || '')[0] || '').toUpperCase();  document.getElementById('avatar-init').textContent = init;
  const fullName = ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim();
  document.getElementById('pname').textContent = fullName || currentUser.phoneNumber;
  document.getElementById('pphone').innerHTML = '<i class="fa-solid fa-mobile-button"></i> ' + (currentUser.phoneNumber || '—');
  renderFavorites();
  loadRentals();
  loadPostedCars();
}

