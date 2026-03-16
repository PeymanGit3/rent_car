const API = 'https://rentcar.stepprojects.ge';
let token = null, currentUser = null;
let selectedFiles = [];

try {
  token = localStorage.getItem('rc_token');
  currentUser = JSON.parse(localStorage.getItem('rc_user') || 'null');
} catch {}

renderNav()

if (!currentUser || !token) {
  document.getElementById('not-auth').style.display = 'block';
} else {
  document.getElementById('form-wrap').style.display = 'block';
  const phone = currentUser.phoneNumber || '';
  document.getElementById('f-phone').value = phone;
  document.getElementById('owner-phone-show').textContent = phone || '—';
}

function renderNav() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  if (currentUser && token) {
    const i = ((currentUser.firstName || '?')[0] + (currentUser.lastName || '')[0] || '').toUpperCase();
    nav.innerHTML = `
      <a href="add-car.html" class="nav-btn primary"><i class="fa-solid fa-plus"></i></a>
      <a href="notifications.html" class="nav-btn icon-btn" style="position:relative" title="შეტყობინებები">
        <i class="fa-solid fa-bell"></i>
        <span class="notif-badge" id="notif-badge" style="display:none">0</span>
      </a>
      <a href="profile.html" class="nav-btn" style="display:flex;align-items:center;gap:6px;border:1px solid var(--gold)">
        <span class="nav-avatar">${i}</span>${currentUser.firstName || currentUser.phoneNumber}
      </a>
      <button class="nav-btn gamo" onclick="logout()">გამოსვლა</button>`;
  } else {
    nav.innerHTML = `
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
  }
}

function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  window.location.href = 'index.html';
}

document.getElementById('f-photos')?.addEventListener('change', function () {
  const newFiles = Array.from(this.files);
  newFiles.forEach(f => {
    if (selectedFiles.length < 3) selectedFiles.push(f);
  });
  this.value = '';
  renderPreviews();
});

const zone = document.getElementById('upload-zone');
if (zone) {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    selectedFiles = Array.from(e.dataTransfer.files)
      .filter(f => /\.(png|jpe?g)$/i.test(f.name)).slice(0, 3);
    renderPreviews();
  });
}

function renderPreviews() {
  const grid = document.getElementById('preview-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    if (selectedFiles[i]) {
      const wrap = document.createElement('div');
      wrap.className = 'prev-thumb';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(selectedFiles[i]);
      const btn = document.createElement('button');
      btn.className = 'prev-remove';
      btn.innerHTML = '✕';
      const idx = i;
      btn.onclick = () => { selectedFiles.splice(idx, 1); renderPreviews(); };
      wrap.appendChild(img);
      wrap.appendChild(btn);
      grid.appendChild(wrap);
    } else {
      const empty = document.createElement('div');
      empty.className = 'prev-empty';
      empty.textContent = '📷';
      grid.appendChild(empty);
    }
  }
}

async function submitCar() {
  const errBox = document.getElementById('err-box');
  errBox.style.display = 'none';

  const brand = document.getElementById('f-brand').value.trim();
  const model = document.getElementById('f-model').value.trim();
  const year  = parseInt(document.getElementById('f-year').value);
  const city  = document.getElementById('f-city').value.trim();
  const trans = document.getElementById('f-trans').value;
  const cap   = parseInt(document.getElementById('f-cap').value);
  const price = parseFloat(document.getElementById('f-price').value);
  const fuel  = parseFloat(document.getElementById('f-fuel').value);
  const phone = currentUser?.phoneNumber || '';

  if (!brand || !model || !year || !city || !trans || !cap || !price || !fuel) {
    showErr('გთხოვთ შეავსოთ ყველა სავალდებულო ველი'); return;
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = 'ემატება...';

  try {
    const fd = new FormData();
    fd.append('Brand', brand);
    fd.append('Model', model);
    fd.append('Year', year);
    fd.append('City', city);
    fd.append('Transmission', trans);
    fd.append('Capacity', cap);
    fd.append('Price', price);
    fd.append('FuelCapacity', fuel);
    fd.append('CreatedBy', phone);
    fd.append('CreatedByEmail', currentUser.email || phone + '@rentcar.ge');
    fd.append('Latitude', 0);
    fd.append('Longitude', 0);
    fd.append('OwnerPhoneNumber', phone);

    const res = await fetch(`${API}/api/Car`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });

    if (res.ok || res.status === 201) { showSuccess(); return; }
    const resText = await res.text();
    showErr('სერვერის შეცდომა: ' + resText);

  } catch(e) {
    console.error(e);
    showErr('სერვერთან კავშირი ვერ მოხდა');
  } finally {
    btn.disabled = false; btn.innerHTML = 'განცხადების დამატება <i class="fa-solid fa-plus"></i>';
  }
}

function showSuccess() {
  document.getElementById('success-ov').classList.add('show');
}

function showErr(msg) {
  const el = document.getElementById('err-box');
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}