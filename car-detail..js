const API = 'https://rentcar.stepprojects.ge';
let token = null, user = null, car = null;

/* ── SESSION ── */
try{
  token = localStorage.getItem('rc_token');
  user  = JSON.parse(localStorage.getItem('rc_user') || 'null');
}catch{}

/* ── GALLERY ── */
// 📸 3 fotoğraf dizisi — isimleri buradan değiştir
const galImages = ['audi_2.jpeg', 'car.png', 'car2.png'];
let galIdx = 0;

function galTo(i){
  galIdx = i;
  document.getElementById('main-img').src = galImages[galIdx];
  document.querySelectorAll('.thumb').forEach((t, idx) =>
    t.classList.toggle('active', idx === galIdx)
  );
}

function galNav(dir){
  galTo((galIdx + dir + galImages.length) % galImages.length);
}

/* ── NAV ── */
function renderNav(){
  const nav = document.getElementById('nav-links');
  if(user && token){
    const i = (user.firstName || user.phoneNumber || '?')[0].toUpperCase();
    nav.innerHTML = `
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="add-car.html" class="nav-btn primary">+ დამატება</a>
      <a href="profile.html" class="nav-btn">
        <span class="nav-avatar">${i}</span>${user.firstName || user.phoneNumber}
      </a>
      <button class="nav-btn danger" onclick="logout()">გამოსვლა</button>`;
  } else {
    nav.innerHTML = `
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
    document.getElementById('login-hint').style.display = 'block';
  }
}

function logout(){
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  location.href = 'index.html';
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
      showToast('🚗', 'თქვენ წარმატებით იქირავეთ მანქანა', 'success');
      
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
    btn.innerHTML = '🚗 ყიდვა';
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
  document.getElementById('loading-wrap').style.display = 'none';
  document.getElementById('detail-wrap').style.display  = 'grid';

  const name = `${c.brand || ''} ${c.model || ''}`.trim();
  document.title = `RentCar — ${name}`;
  document.getElementById('bc-name').textContent   = name;
  document.getElementById('car-title').textContent = name || '—';
  document.getElementById('car-city').textContent  = c.city || '—';

  // Info boxes
  const boxes = [
    ['📅', 'წელი',       c.year           || '—'],
    ['⚙️', 'ტრანსმისია', c.transmission   || '—'],
    ['👥', 'ტევადობა',   c.capacity       ? `${c.capacity} კაცი` : '—'],
    ['⛽', 'ბაკი',       c.fuelTankCapacity ? `${c.fuelTankCapacity} ლ` : '—'],
    ['📍', 'ქალაქი',     c.city           || '—'],
    ['💰', 'ფასი/დღე',   `${c.dailyPrice ?? c.price ?? '—'} ₾`],
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