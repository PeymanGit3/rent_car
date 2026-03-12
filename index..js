const API='https://rentcar.stepprojects.ge';
let token=localStorage.getItem('rc_token');
let user=JSON.parse(localStorage.getItem('rc_user')||'null');

function renderNav(){
  const nav=document.getElementById('nav-links');
  if(user&&token){
    const i=(user.firstName||user.phoneNumber||'?')[0].toUpperCase();
    nav.innerHTML=`
      <a href="add-car.html" class="nav-btn primary"><i class="fa-solid fa-plus"></i></a>
      <button class="nav-btn icon-btn" onclick="openNotif()" title="შეტყობინებები">🔔<span class="notif-dot" id="ndot" style="display:none"></span></button>
      <a href="profile.html" class="nav-btn" style="display:flex;align-items:center;gap:6px;border: 1px solid var(--gold)"><span class="nav-avatar">${i}</span>${user.firstName||user.phoneNumber}</a>
      <button class="nav-btn" onclick="logout()">გამოსვლა</button>`;
  }else{
    nav.innerHTML=`
      <a href="filter.html" class="nav-btn">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
  }
}

function logout(){localStorage.removeItem('rc_token');localStorage.removeItem('rc_user');window.location.reload();}

function favKey(){return user?`rc_favs_${user.phoneNumber}`:'rc_favs_guest';}
function getFavs(){try{return JSON.parse(localStorage.getItem(favKey())||'[]');}catch{return[];}}
function saveFavs(f){localStorage.setItem(favKey(),JSON.stringify(f));}
function isFav(id){return getFavs().some(f=>(f.id||f)===id);}

function toggleFav(car,btn){
  const favs=getFavs();
  const idx=favs.findIndex(f=>(f.id||f)===car.id);
  if(idx===-1){
    favs.push(car);btn.classList.add('liked');
    showToast('❤️ მოწონებულებში დაემატა','success');
    if(user&&token&&user.id){fetch(`${API}/api/Users/${user.id}/favorites/${car.id}`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}}).catch(()=>{});}
  }else{
    favs.splice(idx,1);btn.classList.remove('liked');
    showToast('🤍 მოწონებულებიდან წაიშალა','');
  }
  saveFavs(favs);
  document.querySelectorAll(`[data-cid="${car.id}"] .btn-heart`).forEach(b=>b.classList.toggle('liked',isFav(car.id)));
}

function buildCard(car){
  const div=document.createElement('div');
  div.className='car-card';div.setAttribute('data-cid',car.id);
  const liked=isFav(car.id);
  const imgH=(car.imageUrls&&car.imageUrls[0])?`<img src="${car.imageUrls[0]}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-img-placeholder>🚗</div>'">`:'<div class="card-img-placeholder">🚗</div>';
  div.innerHTML=`
    <div class="card-img-wrap">
      ${imgH}
      <button class="btn-heart ${liked?'liked':''}" title="მოწონება"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
      <a href="car-detail.html?id=${car.id}" class="btn-hover-rent">
  <span>🚗 იქირავე</span>
</a>
      ${car.city?`<div class="card-city-tag">📍 ${car.city}</div>`:''}
    </div>
    <div class="card-body">
      <div class="card-title">${car.brand||''} ${car.model||''}</div>
      <div class="card-tags">
        ${car.year?`<span class="tag">📅 ${car.year}</span>`:''}
        ${car.capacity?`<span class="tag">👥 ${car.capacity} კაცი</span>`:''}
        ${car.transmission?`<span class="tag">⚙️ ${car.transmission}</span>`:''}
        ${car.fuelTankCapacity?`<span class="tag">⛽ ${car.fuelTankCapacity}ლ</span>`:''}
      </div>
      <div class="card-footer">
        <div class="card-price"><span class="price-val">${car.dailyPrice||car.price||'—'}</span><span class="price-unit"> ₾/დღე</span></div>
        <a href="car-detail.html?id=${car.id}" class="btn-detail">დეტალები →</a>
      </div>
    </div>`;
  div.querySelector('.btn-heart').addEventListener('click',e=>{e.stopPropagation();e.preventDefault();toggleFav(car,e.currentTarget);});
  div.querySelector('.card-img-wrap').addEventListener('click',()=>location.href=`car-detail.html?id=${car.id}`);
  div.querySelector('.card-title').addEventListener('click',()=>location.href=`car-detail.html?id=${car.id}`);
  return div;
}

// cache all cars to reuse across both sections
let _allCars = null;

async function fetchAllCars(){
  if(_allCars) return _allCars;
  // try paginated first, then plain list
  const urls = [`${API}/api/Car/paginated?page=1&pageSize=50`, `${API}/api/Car`];
  for(const url of urls){
    try{
      const r = await fetch(url);
      if(!r.ok) continue;
      const data = await r.json();
      // API may return {items:[...]} or plain array
      const list = Array.isArray(data) ? data : (data.items || data.cars || data.data || []);
      if(list.length){ _allCars = list; return list; }
    }catch{}
  }
  return [];
}

async function loadPopular(){
  const g=document.getElementById('popular-grid');
  try{
    // try dedicated popular endpoint
    const r=await fetch(`${API}/api/Car/popular`);
    if(r.ok){
      const cars=await r.json();
      const list=Array.isArray(cars)?cars:(cars.items||cars.cars||cars.data||[]);
      if(list.length){
        g.innerHTML='';
        list.slice(0,6).forEach(c=>g.appendChild(buildCard(c)));
        try{document.getElementById('stat-cars').textContent=list.length+'+';}catch{}
        return;
      }
    }
    // fallback: use all cars
    const all = await fetchAllCars();
    g.innerHTML='';
    if(!all.length){g.innerHTML='<div class="empty-state"><div class="ei">🚗</div><p>მანქანები ვერ მოიძებნა</p></div>';return;}
    all.slice(0,6).forEach(c=>g.appendChild(buildCard(c)));
    try{document.getElementById('stat-cars').textContent=all.length+'+';}catch{}
  }catch{
    // last resort fallback
    const all = await fetchAllCars();
    g.innerHTML='';
    if(all.length) all.slice(0,6).forEach(c=>g.appendChild(buildCard(c)));
    else g.innerHTML='<div class="empty-state"><div class="ei">⚠️</div><p>მონაცემები ვერ ჩაიტვირთა</p></div>';
  }
}

async function loadRandom(){
  const g=document.getElementById('random-grid');
  try{
    const all = await fetchAllCars();
    if(!all.length){g.innerHTML='<div class="empty-state"><div class="ei">🚗</div><p>მანქანები ვერ მოიძებნა</p></div>';return;}
    const shuffled=[...all].sort(()=>Math.random()-.5);
    g.innerHTML='';
    shuffled.slice(0,6).forEach(c=>g.appendChild(buildCard(c)));
  }catch{
    g.innerHTML='<div class="empty-state"><div class="ei">⚠️</div><p>მონაცემები ვერ ჩაიტვირთა</p></div>';
  }
}

async function openNotif(){
  if(!user||!token)return;
  try{
    const r=await fetch(`${API}/Message/Messages`,{headers:{'Authorization':`Bearer ${token}`}});
    if(r.ok){const m=await r.json();showToast(m&&m.length?`🔔 ${m.length} შეტყობინება`:'შეტყობინებები არ არის','');}
  }catch{showToast('შეტყობინებები ვერ ჩაიტვირთა','error');}
}

function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className=`toast ${type}`;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}

renderNav();loadPopular();loadRandom();


// Typewriter effect for hero title
/* ── TYPEWRITER ── */
(function(){
  const words = ['სრულყოფილი','სანდო','იაფი','სწრაფი','იდეალური','კომფორტული'];
  const el = document.getElementById('typewriter');
  if(!el) return;
  let wi = 0, ci = 0, deleting = false;

  function tick(){
    const word = words[wi];
    if(!deleting){
      el.textContent = word.slice(0, ++ci);
      if(ci === word.length){
        deleting = true;
        setTimeout(tick, 1800);
        return;
      }
      setTimeout(tick, 110);
    } else {
      el.textContent = word.slice(0, --ci);
      if(ci === 0){
        deleting = false;
        wi = (wi + 1) % words.length;
        setTimeout(tick, 400);
        return;
      }
      setTimeout(tick, 60);
    }
  }
  setTimeout(tick, 600);
})();