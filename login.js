const API='https://rentcar.stepprojects.ge';

// redirect if already logged in
if(localStorage.getItem('rc_token'))window.location.href='index.html';

function switchTab(tab){
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
  document.getElementById('form-login').classList.toggle('active',tab==='login');
  document.getElementById('form-register').classList.toggle('active',tab==='register');
  document.getElementById('l-err').style.display='none';
  document.getElementById('r-err').style.display='none';
}

async function doLogin(){
  const phone=document.getElementById('l-phone').value.trim();
  const pass=document.getElementById('l-pass').value;
  const err=document.getElementById('l-err');
  const btn=document.getElementById('l-btn');
  if(!phone||!pass){showErr(err,'გთხოვთ შეავსოთ ყველა ველი');return;}
  btn.disabled=true;btn.textContent='მიმდინარეობს...';
  try{
    const r=await fetch(`${API}/api/Users/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:phone,password:pass})});
    if(r.ok){
      const d=await r.json();
      const tok=d.token||d.accessToken||d;
      const u={phoneNumber:phone,firstName:d.firstName||'',lastName:d.lastName||'',id:d.userId||d.id||null};
      localStorage.setItem('rc_token',tok);
      localStorage.setItem('rc_user',JSON.stringify(u));
      showToast('👋 მოგესალმებით!','success');
      setTimeout(()=>window.location.href='index.html',900);
    }else{
      const t=await r.text();
      showErr(err,'არასწორი ტელეფონი ან პაროლი');
    }
  }catch{showErr(err,'სერვერთან კავშირი ვერ მოხდა');}
  finally{btn.disabled=false;btn.textContent='შესვლა';}
}

async function doRegister(){
  const fn=document.getElementById('r-fname').value.trim();
  const ln=document.getElementById('r-lname').value.trim();
  const ph=document.getElementById('r-phone').value.trim();
  const em=document.getElementById('r-email').value.trim();
  const pw=document.getElementById('r-pass').value;
  const err=document.getElementById('r-err');
  const btn=document.getElementById('r-btn');
  if(!fn||!ln||!ph||!em||!pw){showErr(err,'გთხოვთ შეავსოთ ყველა ველი');return;}
  btn.disabled=true;btn.textContent='მიმდინარეობს...';
  try{
    const r=await fetch(`${API}/api/Users/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:fn,lastName:ln,phoneNumber:ph,email:em,password:pw})});
    if(r.ok){
      showToast('✅ რეგისტრაცია წარმატებულია! გაიარეთ ავტორიზაცია.','success');
      switchTab('login');
      document.getElementById('l-phone').value=ph;
    }else{
      const t=await r.text();
      showErr(err,'შეცდომა: '+(t||'სცადეთ თავიდან'));
    }
  }catch{showErr(err,'სერვერთან კავშირი ვერ მოხდა');}
  finally{btn.disabled=false;btn.textContent='რეგისტრაცია';}
}

function showErr(el,msg){el.textContent=msg;el.style.display='block';}
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className=`toast ${type}`;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}

// check URL param for auto-tab
const urlTab=new URLSearchParams(location.search).get('tab');
if(urlTab==='register')switchTab('register');