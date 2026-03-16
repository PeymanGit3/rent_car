const API = 'https://rentcar.stepprojects.ge';
function renderNav() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  if (user && token) {
    const i = ((user.firstName || '?')[0] + (user.lastName || '')[0] || '').toUpperCase();
    nav.innerHTML = `
      <a href="add-car.html" class="nav-btn primary"><i class="fa-solid fa-plus"></i></a>
      <a href="notifications.html" class="nav-btn icon-btn" style="position:relative" title="შეტყობინებები">
        <i class="fa-solid fa-bell"></i>
        <span class="notif-badge" id="notif-badge" style="display:none">0</span>
      </a>
      <a href="profile.html" class="nav-btn" style="display:flex;align-items:center;gap:6px;border:1px solid var(--gold)">
        <span class="nav-avatar">${i}</span>${user.firstName || user.phoneNumber}
      </a>
      <button class="nav-btn gamo" onclick="logout()">გამოსვლა</button>`;
  } else {
    nav.innerHTML = `
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
  }
  loadNotifCount();
}

function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  window.location.href = 'index.html';
}

async function loadNotifCount() {
  const badge = document.getElementById('notif-badge');
  if (!badge || !user?.phoneNumber || !token) return;
  try {
    const res = await fetch(`${API}/Message/Messages?phoneNumber=${encodeURIComponent(user.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const msgs = await res.json();
    const count = Array.isArray(msgs) ? msgs.length : 0;
    const readCount = parseInt(localStorage.getItem(`rc_notif_read_count_${user.phoneNumber}`) || '0');
    if (count > readCount) {
      badge.textContent = count - readCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

let token = null, user = null, car = null;

/* ── SESSION ── */
try{
  token = localStorage.getItem('rc_token');
  user  = JSON.parse(localStorage.getItem('rc_user') || 'null');
}catch{}

/* ── GALLERY ── */
// 📸 3 fotoğraf dizisi — isimleri buradan değiştir
const galImages = [];
let galIdx = 0;

function galTo(i){
  galIdx = i;
  const mainImg = document.getElementById('main-img');
  if(mainImg) mainImg.src = galImages[galIdx];
  document.querySelectorAll('.thumb').forEach((t, idx) =>
    t.classList.toggle('active', idx === galIdx)
  );
}

function galNav(dir){
  galTo((galIdx + dir + galImages.length) % galImages.length);
}

/* ── NAV ── */
// nav.js renders the top navigation. If user is not logged in, show the in-page login hint.
if (!user || !token) {
  const hint = document.getElementById('login-hint');
  if (hint) hint.style.display = 'block';
}

/* ── SLIDER ── */
function onSlider(val){
  const days = parseInt(val);
  document.getElementById('sl-days').textContent = days;
  if(!car) return;
  const price = car.dailyPrice ?? car.price ?? 0;
  document.getElementById('cost-total').textContent  = `${days * price} ₾`;
}

/* ── FAVORITES ── */
function favKey(){ return user ? `rc_favs_${user.phoneNumber}` : 'rc_favs_guest'; }
function getFavs(){ try{ return JSON.parse(localStorage.getItem(favKey()) || '[]'); }catch{ return []; } }
function saveFavs(f){ localStorage.setItem(favKey(), JSON.stringify(f)); }
function isFav(id){ return getFavs().some(f => (f.id ?? f) === id); }

function updateFavBtn(){
  if(!car) return;
  const liked = isFav(car.id);
}

function toggleFav(){
  if(!car) return;
  const favs = getFavs();
  const idx  = favs.findIndex(f => (f.id ?? f) === car.id);
  if(idx === -1){
    favs.push(car);
    showToast('❤️', 'მოწონებულებში დაემატა', 'success');
  } else {
    favs.splice(idx, 1);
    showToast('🤍', 'ამოიშალა მოწონებულებიდან', '');
  }
  saveFavs(favs);
  updateFavBtn();
}

/* ── RENT / BUY ── */
async function doRent(){
  if(!user || !token){
    showToast('⚠️', 'ჯერ გაიარეთ ავტორიზაცია', 'error');
    setTimeout(() => location.href = 'login.html', 1300);
    return;
  }

  const days  = parseInt(document.getElementById('day-slider').value);
  const today = new Date();
  const end   = new Date(today);
  end.setDate(today.getDate() + days);

  const startDate = today.toISOString().split('T')[0];
  const endDate   = end.toISOString().split('T')[0];

  const btn = document.getElementById('btn-buy');
  btn.disabled = true; btn.textContent = 'მიმდინარეობს...';

  try{
const days = parseInt(document.getElementById('day-slider').value);
const params = new URLSearchParams({
  phoneNumber: user.phoneNumber,
  carId:       car.id,
  multiplier:  days
});

const res = await fetch(`${API}/Purchase/purchase?${params}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

    if(res.ok){
      const price = car.dailyPrice ?? car.price ?? 0;
      showToast('თქვენ წარმატებით იქირავეთ მანქანა', 'success');
      
      // Save to local rented list for profile display
      try{
        const rented = JSON.parse(localStorage.getItem(`rc_rented_${user.phoneNumber}`) || '[]');
        rented.unshift({
          ...car,
          rentedAt: new Date().toISOString(),
          days,
          totalPaid: days * price,
          startDate,
          endDate
        });
        localStorage.setItem(`rc_rented_${user.phoneNumber}`, JSON.stringify(rented));
      }catch{}
      
    } else {
      const t = await res.text();
      showToast('⚠️', 'შეცდომა: ' + (t || res.status), 'error');
    }
  } catch {
    showToast('⚠️', 'სერვერთან კავშირი ვერ მოხდა', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'იქირავე';
  }
}

/* ── LOAD CAR FROM API ── */
async function loadCar(){
  const id = new URLSearchParams(location.search).get('id');
  if(!id){ showNF(); return; }
  try{
    const res = await fetch(`${API}/api/Car/${id}`);
    if(!res.ok) throw 0;
    car = await res.json();
    renderCar(car);
  } catch { showNF(); }
}

function renderCar(c){
  // Fotoğrafları API'den al
  galImages.length = 0;
  
  if(c.imageUrl1) galImages.push(c.imageUrl1);
  if(c.imageUrl2) galImages.push(c.imageUrl2);
  if(c.imageUrl3) galImages.push(c.imageUrl3);
  if(galImages.length === 0) galImages.push('car.png'); // fallback
  galImages.length = 0;

// Thumbnails render
const thumbsEl = document.getElementById('photo-thumbs');
thumbsEl.innerHTML = '';
galImages.forEach((src, i) => {
  const div = document.createElement('div');
  div.className = 'thumb' + (i === 0 ? ' active' : '');
  div.onclick = () => galTo(i);
  div.innerHTML = `<img src="${src}" alt="ფოტო ${i+1}">`;
  thumbsEl.appendChild(div);
});

galTo(0);
  galTo(0); // galeriye ilk fotoğrafı yükle
  

  document.getElementById('loading-wrap').style.display = 'none';
  document.getElementById('detail-wrap').style.display  = 'grid';

  const name = `${c.brand || ''} ${c.model || ''}`.trim();
  document.title = `RentCar — ${name}`;
  document.getElementById('car-title').textContent = name || '—';

  // Info boxes
  const boxes = [
    ['<i class="fa-solid fa-calendar-days"></i>', 'წელი',       c.year           || '—'],
    ['<i class="fa-solid fa-people-group"></i>', 'ტრანსმისია', c.transmission   || '—'],
    ['<i class="fa-solid fa-people-group"></i>', 'ტევადობა',   c.capacity       ? `${c.capacity} კაცი` : '—'],
    ['<i class="fa-solid fa-gas-pump"></i>', 'ბაკი',       c.fuelCapacity ? `${c.fuelCapacity} ლ` : '—'],
    ['<i class="fa-solid fa-location-dot"></i>', 'ქალაქი',     c.city           || '—'],
    ['<i class="fa-solid fa-user"></i>', 'განმცხადებელი', c.createdBy || '—'],
  ];
  document.getElementById('info-grid').innerHTML = boxes.map(([ic, l, v]) =>
    `<div class="ibox"><div class="ilbl">${l}</div><div class="ival">${ic} ${v}</div></div>`
  ).join('');

  // Price + slider init
  const price = c.dailyPrice ?? c.price ?? 0;
  document.getElementById('dc-price').textContent   = price;
  document.getElementById('cost-total').textContent = `${price} ₾`;

  updateFavBtn();
}

function showNF(){
  document.getElementById('loading-wrap').style.display = 'none';
  document.getElementById('nf').style.display = 'block';
}

/* ── TOAST ── */
function showToast(icon, msg, type = ''){
  const t   = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── INIT ── */
renderNav();
loadCar();