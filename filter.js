const API='https://rentcar.stepprojects.ge';
let token=localStorage.getItem('rc_token');
let user=JSON.parse(localStorage.getItem('rc_user')||'null');
let allCars=[];

function renderNav(){
  const nav=document.getElementById('nav-links');
  if(user&&token){
    const i=(user.firstName||user.phoneNumber||'?')[0].toUpperCase();
    nav.innerHTML=`
      <a href="add-car.html" class="nav-btn primary"><i class="fa-solid fa-plus"></i></a>
      <button class="nav-btn icon-btn" onclick="openNotif()" title="შეტყობინებები"><i class="fa-solid fa-bell"></i><span class="notif-dot" id="ndot" style="display:none"></span></button>
      <a href="profile.html" class="nav-btn" style="display:flex;align-items:center;gap:6px;border: 1px solid var(--gold)"><span class="nav-avatar">${i}</span>${user.firstName||user.phoneNumber}</a>
      <button class="nav-btn gamo" onclick="logout()">გამოსვლა</button>`;
  }else{
    nav.innerHTML=`
      <a href="filter.html" class="nav-btn active">ფილტრი</a>
      <a href="login.html" class="nav-btn primary">შესვლა</a>`;
  }
}
function logout(){localStorage.removeItem('rc_token');localStorage.removeItem('rc_user');window.location.href='index.html';}

function favKey(){return user?`rc_favs_${user.phoneNumber}`:'rc_favs_guest';}
function getFavs(){try{return JSON.parse(localStorage.getItem(favKey())||'[]');}catch{return[];}}
function saveFavs(f){localStorage.setItem(favKey(),JSON.stringify(f));}
function isFav(id){return getFavs().some(f=>(f.id||f)===id);}
function toggleFav(car,btn){
  const favs=getFavs();const idx=favs.findIndex(f=>(f.id||f)===car.id);
  if(idx===-1){favs.push(car);btn.classList.add('liked');showToast('❤️ მოწონებულებში დაემატა','success');}
  else{favs.splice(idx,1);btn.classList.remove('liked');showToast('🤍 წაიშალა','');}
  saveFavs(favs);
}

function buildCard(car){
  const div=document.createElement('div');div.className='car-card';div.setAttribute('data-cid',car.id);
  const liked=isFav(car.id);
  const imgH=(car.imageUrl1||car.imageUrls?.[0])
  ?`<img src="${car.imageUrl1||car.imageUrls[0]}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-img-placeholder></div>'">`
  :'<div class="card-img-placeholder"></div>';
  div.innerHTML=`
    <div class="card-img-wrap">
  ${imgH}
  <button class="btn-heart ${liked?'liked':''}" title="მოწონება"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
  <a href="car-detail.html?id=${car.id}" class="btn-hover-rent">
    <span>იქირავე</span>
  </a>
  ${car.city?`<div class="card-city-tag"><i class="fa-solid fa-location-dot"></i> ${car.city}</div>`:''}
</div>
    <div class="card-body">
      <div class="card-title">${car.brand||''} ${car.model||''}</div>
      <div class="card-tags">
        ${car.year?`<span class="tag"><i class="fa-solid fa-calendar-days"></i> ${car.year}</span>`:''}
        ${car.capacity?`<span class="tag"><i class="fa-solid fa-people-group"></i> ${car.capacity} კაცი</span>`:''}
        ${car.transmission?`<span class="tag"><i class="fa-solid fa-gears"></i> ${car.transmission}</span>`:''}
      </div>
      <div class="card-footer">
        <div><span class="price-val">${car.dailyPrice||car.price||'—'}</span><span class="price-unit"> ₾/დღე</span></div>
        ${car.createdBy?`<span class="tag"><i class="fa-solid fa-user"></i> ${car.createdBy}</span>`:''}
      </div>
    </div>`;
  div.querySelector('.btn-heart').addEventListener('click',e=>{e.stopPropagation();e.preventDefault();toggleFav(car,e.currentTarget);});
  return div;
}

function renderCars(cars){
  const g=document.getElementById('results-grid');
  document.getElementById('res-count').textContent=cars.length;
  g.innerHTML='';
  if(!cars.length){g.innerHTML='<div class="empty-state"><div class="ei">🔍</div><p>შედეგები ვერ მოიძებნა</p></div>';return;}
  cars.forEach(c=>g.appendChild(buildCard(c)));
}

async function loadCities(){
  try{
    const r=await fetch(`${API}/api/Car/cities`);
    if(r.ok){
      const cities=await r.json();
      const sel=document.getElementById('f-city');
      (Array.isArray(cities)?cities:[]).forEach(c=>{
        const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);
      });
    }
  }catch{}
}

async function applyFilters(){
  const city=document.getElementById('f-city').value;
  const yFrom=document.getElementById('f-year-from').value;
  const yTo=document.getElementById('f-year-to').value;
  const cap=document.getElementById('f-capacity').value;
  const g=document.getElementById('results-grid');
  g.innerHTML='<div class="skeleton-card"><div class="skel skel-img"></div><div class="skel-body"><div class="skel skel-line w75"></div><div class="skel skel-line w55"></div></div></div>'.repeat(3);

  // Build query params
const params=new URLSearchParams();
if(city)params.append('city',city);
if(yFrom)params.append('startYear',yFrom);
if(yTo)params.append('endYear',yTo);
if(cap)params.append('capacity',cap);
params.append('pageIndex',0);
params.append('pageSize',50);

  try{
    let url=`${API}/api/Car/filter`;
    if(params.toString())url+='?'+params.toString();
    const r=await fetch(url);
    if(r.ok){const cars=await r.json();renderCars(cars);}
    else{
      // fallback: filter locally
      let filtered=allCars;
      if(city)filtered=filtered.filter(c=>(c.city||'').toLowerCase()===city.toLowerCase());
      if(yFrom)filtered=filtered.filter(c=>c.year>=parseInt(yFrom));
      if(yTo)filtered=filtered.filter(c=>c.year<=parseInt(yTo));
      if(cap)filtered=filtered.filter(c=>c.capacity==parseInt(cap));
      renderCars(filtered);
    }
  }catch{
    let filtered=allCars;
    if(city)filtered=filtered.filter(c=>(c.city||'').toLowerCase()===city.toLowerCase());
    if(yFrom)filtered=filtered.filter(c=>c.year>=parseInt(yFrom));
    if(yTo)filtered=filtered.filter(c=>c.year<=parseInt(yTo));
    if(cap)filtered=filtered.filter(c=>c.capacity==parseInt(cap));
    renderCars(filtered);
  }
}

function clearFilters(){
  document.getElementById('f-city').value='';
  document.getElementById('f-year-from').value='';
  document.getElementById('f-year-to').value='';
  document.getElementById('f-capacity').value='';
  renderCars(allCars);
}

async function init(){
  renderNav();
  await loadCities();
  const tryUrls=[`${API}/api/Car/paginated?page=1&pageSize=100`,`${API}/api/Car`];
  for(const url of tryUrls){
    try{
      const r=await fetch(url);
      if(!r.ok)continue;
      const data=await r.json();
      allCars=Array.isArray(data)?data:(data.items||data.cars||data.data||[]);
      if(allCars.length){renderCars(allCars);return;}
    }catch{}
  }
  document.getElementById('results-grid').innerHTML='<div class="empty-state"><div class="ei">⚠️</div><p>მონაცემები ვერ ჩაიტვირთა</p></div>';
}

async function openNotif(){
  if(!user||!token)return;
  try{const r=await fetch(`${API}/Message/Messages`,{headers:{'Authorization':`Bearer ${token}`}});if(r.ok){const m=await r.json();showToast(m&&m.length?`🔔 ${m.length} შეტყობინება`:'შეტყობინებები არ არის','');}}catch{}
}

function showToast(msg,type=''){
  const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type}`;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}

init();