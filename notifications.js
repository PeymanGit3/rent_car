const API = 'https://rentcar.stepprojects.ge';
let token = null, user = null;

try {
  token = localStorage.getItem('rc_token');
  user = JSON.parse(localStorage.getItem('rc_user') || 'null');
} catch {}

function renderNav() {
  const nav = document.getElementById('nav-links');
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
      <a href="index.html" class="nav-btn">← მთავარი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
  }
}

function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  window.location.href = 'index.html';
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!user?.phoneNumber) {
    list.innerHTML = `<div class="empty-block"><div class="empty-icon">🔒</div><p>შეტყობინებების სანახავად გაიარეთ ავტორიზაცია</p></div>`;
    return;
  }
  try {
    const res = await fetch(`${API}/Message/Messages?phoneNumber=${encodeURIComponent(user.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const messages = await res.json();
    const msgs = Array.isArray(messages) ? messages : [];

    localStorage.setItem(`rc_notif_read_count_${user.phoneNumber}`, msgs.length);

    const hiddenKey = `rc_hidden_msgs_${user.phoneNumber}`;
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    const filteredMsgs = msgs.filter(m => !hidden.includes(m));

    document.getElementById('notif-count').textContent = filteredMsgs.length;

    if (!filteredMsgs.length) {
      list.innerHTML = `<div class="empty-block"><div class="empty-icon"><i class="fa-solid fa-bell"></i></div><p>შეტყობინებები არ არის</p></div>`;
      return;
    }

    list.innerHTML = '';
    filteredMsgs.forEach((m) => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      item.dataset.msg = m;
      item.innerHTML = `
        <div class="notif-icon"><i class="fa-solid fa-money-check"></i></div>
        <div class="notif-body">
          <div class="notif-title">მანქანა დაქირავდა!</div>
          <div class="notif-meta">${m}</div>
        </div>
        <button class="notif-delete-btn" onclick="deleteNotif(this)">🗑</button>
      `;
      list.appendChild(item);
    });
  } catch(e) {
    console.error(e);
    list.innerHTML = `<div class="empty-block"><div class="empty-icon">⚠️</div><p>შეტყობინებები ვერ ჩაიტვირთა</p></div>`;
  }
}

function deleteNotif(btn) {
  const card = btn.closest('.notif-item');
  const msg = card.dataset.msg;

  const hiddenKey = `rc_hidden_msgs_${user.phoneNumber}`;
  const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
  if (!hidden.includes(msg)) hidden.push(msg);
  localStorage.setItem(hiddenKey, JSON.stringify(hidden));

  card.style.transition = 'opacity .3s, transform .3s';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.9)';
  setTimeout(() => {
    card.remove();
    const remaining = document.querySelectorAll('.notif-item').length;
    document.getElementById('notif-count').textContent = remaining;
    if (remaining === 0) {
      document.getElementById('notif-list').innerHTML =
        `<div class="empty-block"><div class="empty-icon"><i class="fa-solid fa-bell"></i></div><p>შეტყობინებები არ არის</p></div>`;
    }
  }, 300);
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

renderNav();
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
    const hiddenKey = `rc_hidden_msgs_${user.phoneNumber}`;
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    const visible = msgs.filter(m => !hidden.includes(m)).length;
    const readCount = parseInt(localStorage.getItem(`rc_notif_read_count_${user.phoneNumber}`) || '0');
    if (visible > 0 && visible > readCount) {
      badge.textContent = visible;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

loadNotifCount();
loadNotifications();