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
  const newFiles = Array.from(this.files);
  newFiles.forEach(f => {
    if (selectedFiles.length < 3) selectedFiles.push(f);
  });
  this.value = ''; // input'u sıfırla ki aynı dosyayı tekrar seçebilsin
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

  const brand = document.getElementById('f-brand').value.trim();
  const model = document.getElementById('f-model').value.trim();
  const year  = parseInt(document.getElementById('f-year').value);
  const city  = document.getElementById('f-city').value.trim();
  const trans = document.getElementById('f-trans').value;
  const cap   = parseInt(document.getElementById('f-cap').value);
  const price = parseFloat(document.getElementById('f-price').value);
  const fuel  = parseFloat(document.getElementById('f-fuel').value);
  const phone = currentUser?.phoneNumber || '';

const img1val = document.getElementById('f-img1').value.trim();
if (!brand || !model || !year || !city || !trans || !cap || !price || !fuel) {
  showErr('გთხოვთ შეავსოთ ყველა სავალდებულო ველი'); return;
}
if (!img1val) {
  showErr('გთხოვთ შეიყვანოთ მინიმუმ 1 ფოტოს URL'); return;
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
    fd.append('CreatedBy', currentUser.firstName || phone);
    fd.append('CreatedByEmail', currentUser.email || phone + '@rentcar.ge');
    fd.append('Latitude', 0);
    fd.append('Longitude', 0);
fd.append('OwnerPhoneNumber', phone);

const img1 = document.getElementById('f-img1').value.trim();
const img2 = document.getElementById('f-img2').value.trim();
const img3 = document.getElementById('f-img3').value.trim();
const urlToBlob = async (url) => {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const ext = url.split('.').pop().split('?')[0] || 'jpg';
    return new File([blob], `photo.${ext}`, { type: blob.type });
  } catch { return null; }
};

if(img1){ const f = await urlToBlob(img1); if(f) fd.append('Image1', f); }
if(img2){ const f = await urlToBlob(img2); if(f) fd.append('Image2', f); }
if(img3){ const f = await urlToBlob(img3); if(f) fd.append('Image3', f); }

    console.log('Sending to API...');
    for (let [k, v] of fd.entries()) console.log(k, v);

    const res = await fetch(`${API}/api/Car`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });

    console.log('Response status:', res.status);
    const resText = await res.text();
    console.log('Response body:', resText);

   if (res.ok || res.status === 201) { showSuccess(); return; }
    showErr('სერვერის შეცდომა: ' + resText);

  } catch(e) {
    console.error(e);
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

['f-img1','f-img2','f-img3'].forEach((id, i) => {
  document.getElementById(id)?.addEventListener('input', function() {
    const grid = document.getElementById('preview-grid');
    const items = grid.children;
    if(this.value.trim()) {
      items[i].innerHTML = `<img src="${this.value.trim()}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.parentElement.innerHTML='📷'">`;
    } else {
      items[i].innerHTML = '📷';
      items[i].className = 'prev-empty';
    }
  });
});