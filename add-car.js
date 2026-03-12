const API = 'https://rentcar.stepprojects.ge';
let token = null, currentUser = null;
let selectedFiles = [];

/* ── SESSION ── */
try {
  token = localStorage.getItem('rc_token');
  currentUser = JSON.parse(localStorage.getItem('rc_user') || 'null');
} catch {}

/* ── INIT ── */
if (!currentUser || !token) {
  document.getElementById('not-auth').style.display = 'block';
} else {
  document.getElementById('form-wrap').style.display = 'block';
  const phone = currentUser.phoneNumber || '';
  document.getElementById('f-phone').value = phone;
  document.getElementById('owner-phone-show').textContent = phone || '—';
}

/* ── PHOTO HANDLING ── */
document.getElementById('f-photos')?.addEventListener('change', function () {
  const files = Array.from(this.files).slice(0, 3);
  selectedFiles = files;
  renderPreviews();
});

// Drag & drop
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

/* ── SUBMIT ── */
async function submitCar() {
  const errBox = document.getElementById('err-box');
  errBox.style.display = 'none';

  const brand    = document.getElementById('f-brand').value.trim();
  const model    = document.getElementById('f-model').value.trim();
  const year     = parseInt(document.getElementById('f-year').value);
  const city     = document.getElementById('f-city').value.trim();
  const trans    = document.getElementById('f-trans').value;
  const cap      = parseInt(document.getElementById('f-cap').value);
  const price    = parseFloat(document.getElementById('f-price').value);
  const fuel     = parseFloat(document.getElementById('f-fuel').value);
  const phone    = currentUser?.phoneNumber || '';

  if (!brand || !model || !year || !city || !trans || !cap || !price || !fuel) {
    showErr('გთხოვთ შეავსოთ ყველა სავალდებულო ველი'); return;
  }
  if (selectedFiles.length === 0) {
    showErr('გთხოვთ ატვირთოთ მინიმუმ 1 ფოტო'); return;
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = 'ემატება...';

  try {
    // Try multipart/form-data first
    const fd = new FormData();
    fd.append('brand', brand);
    fd.append('model', model);
    fd.append('year', year);
    fd.append('city', city);
    fd.append('transmission', trans);
    fd.append('capacity', cap);
    fd.append('dailyPrice', price);
    fd.append('fuelTankCapacity', fuel);
    fd.append('phoneNumber', phone);
    selectedFiles.forEach((f, i) => fd.append(`image${i + 1}`, f));

    const r1 = await fetch(`${API}/api/Car`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });

    if (r1.ok) { showSuccess(); return; }

    // Fallback: JSON (without photos)
    const r2 = await fetch(`${API}/api/Car`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ brand, model, year, city, transmission: trans, capacity: cap, dailyPrice: price, fuelTankCapacity: fuel, phoneNumber: phone })
    });

    if (r2.ok) { showSuccess(); }
    else {
      const errText = await r2.text();
      showErr('სერვერის შეცდომა: ' + (errText || r2.status));
    }
  } catch (e) {
    showErr('სერვერთან კავშირი ვერ მოხდა');
  } finally {
    btn.disabled = false; btn.textContent = 'განცხადების დამატება ➕';
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