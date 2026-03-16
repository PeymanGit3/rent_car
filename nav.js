// const API = 'https://rentcar.stepprojects.ge';

function getNavSession() {
  let token = null, user = null;
  try {
    token = localStorage.getItem('rc_token');
    user = JSON.parse(localStorage.getItem('rc_user') || 'null');
  } catch {}
  return { token, user };
}

function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  window.location.href = 'index.html';
}

function toggleBurger() {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobile-menu');
  if (burger) burger.classList.toggle('open');
  if (menu) menu.classList.toggle('open');
}

function renderNav() {
  const { token, user } = getNavSession();
  const nav = document.getElementById('nav-links');
  const burger = document.getElementById('burger');
  const avatarWrap = document.getElementById('nav-avatar-mobile-wrap');
  const avatarMobile = document.getElementById('nav-avatar-mobile');
  const menuTop = document.getElementById('mobile-menu-top');

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

    if (burger) burger.style.display = 'flex';
    if (avatarWrap) avatarWrap.style.display = 'none';
    if (avatarMobile) avatarMobile.textContent = i;

    if (menuTop) menuTop.innerHTML = `
      <a href="add-car.html" class="mobile-nav-btn">
        <i class="fa-solid fa-plus"></i> მანქანის დამატება
      </a>
      <a href="notifications.html" class="mobile-nav-btn">
        <i class="fa-solid fa-bell"></i> შეტყობინებები
      </a>
      <a href="profile.html" class="mobile-nav-btn">
        <i class="fa-solid fa-user"></i> პროფილი
      </a>`;

    loadNavNotifCount();
  } else {
    nav.innerHTML = `
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;

    if (burger) burger.style.display = 'none';
    if (avatarWrap) avatarWrap.style.display = 'none';
  }
}

async function loadNavNotifCount() {
  const { token, user } = getNavSession();
  const badge = document.getElementById('notif-badge');
  if (!badge || !user?.phoneNumber || !token) return;
  try {
    const res = await fetch(`${API}/Message/Messages?phoneNumber=${encodeURIComponent(user.phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const msgs = await res.json();
    const hiddenKey = `rc_hidden_msgs_${user.phoneNumber}`;
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    const visible = Array.isArray(msgs) ? msgs.filter(m => !hidden.includes(m)).length : 0;
    const readCount = parseInt(localStorage.getItem(`rc_notif_read_count_${user.phoneNumber}`) || '0');
    if (visible > readCount) {
      badge.textContent = visible - readCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

renderNav();