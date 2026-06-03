(function(){
  const SUPABASE_URL='https://jczxgcbxqnnhlafvekul.supabase.co';
  const SUPABASE_KEY='sb_publishable_ZsL8foOFNJYOa3FW4YoKdw_-gJCnZ5P';
  const SESSION_KEY='eteris_social_user';
  const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);

  function setSession(user){
    if(user)localStorage.setItem(SESSION_KEY,JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }
  function addStyles(){
    if(document.getElementById('eteris-auth-style'))return;
    const style=document.createElement('style');
    style.id='eteris-auth-style';
    style.textContent=`
      .eteris-auth-overlay{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(14px)}
      .eteris-auth-overlay.open{display:flex}
      .eteris-auth-modal{width:min(460px,100%);background:rgba(12,12,18,.98);border:1px solid rgba(255,70,85,.2);border-radius:16px;padding:24px;box-shadow:0 22px 70px rgba(0,0,0,.7);color:#e8eaf0;font-family:'Rajdhani',sans-serif}
      .eteris-auth-step{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#ff4655;margin-bottom:10px}
      .eteris-auth-title{font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:800;text-transform:uppercase;line-height:1.05}
      .eteris-auth-copy{color:#6b7280;font-size:16px;line-height:1.6;margin:10px 0 18px}
      .eteris-auth-field{display:flex;flex-direction:column;gap:6px;margin:16px 0 8px;text-align:left}
      .eteris-auth-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:#6b7280}
      .eteris-auth-input{width:100%;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;color:#e8eaf0;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px 12px;outline:none;caret-color:#ff4655}
      .eteris-auth-input:focus{border-color:rgba(255,70,85,.42)}
      .eteris-auth-error{min-height:16px;color:#ff4655;font-size:13px;line-height:1.2;margin-top:8px}
      .eteris-auth-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
      .eteris-auth-btn{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:9px 13px;cursor:pointer;text-decoration:none}
      .eteris-auth-btn:hover{color:#e8eaf0;border-color:rgba(255,255,255,.15)}
      .eteris-auth-primary{background:#ff4655;border-color:#ff4655;color:#fff}
      @media(max-width:540px){.eteris-auth-actions{flex-direction:column-reverse}.eteris-auth-btn{text-align:center}}
    `;
    document.head.appendChild(style);
  }
  function ensureModal(){
    addStyles();
    let overlay=document.getElementById('eteris-auth-modal');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.className='eteris-auth-overlay';
    overlay.id='eteris-auth-modal';
    overlay.innerHTML=`
      <div class="eteris-auth-modal" role="dialog" aria-modal="true" aria-labelledby="eteris-auth-title">
        <div class="eteris-auth-step">Account access</div>
        <div class="eteris-auth-title" id="eteris-auth-title">Log in</div>
        <p class="eteris-auth-copy" id="eteris-auth-copy">Enter your private access code.</p>
        <div class="eteris-auth-field">
          <span class="eteris-auth-label">Access code</span>
          <input class="eteris-auth-input" id="eteris-auth-code" type="password" autocomplete="off" placeholder="Your code"/>
          <div class="eteris-auth-error" id="eteris-auth-error"></div>
        </div>
        <div class="eteris-auth-actions">
          <button class="eteris-auth-btn" type="button" data-auth-close>Cancel</button>
          <button class="eteris-auth-btn eteris-auth-primary" type="button" data-auth-submit>Log in</button>
        </div>
      </div>
    `;
    overlay.querySelector('[data-auth-close]').addEventListener('click',close);
    overlay.querySelector('[data-auth-submit]').addEventListener('click',submit);
    overlay.querySelector('#eteris-auth-code').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    document.body.appendChild(overlay);
    return overlay;
  }
  let currentOptions={};
  function open(options={}){
    currentOptions=options;
    const overlay=ensureModal();
    overlay.querySelector('#eteris-auth-copy').textContent=options.copy||'Enter your private access code.';
    overlay.querySelector('#eteris-auth-error').textContent='';
    overlay.querySelector('#eteris-auth-code').value='';
    overlay.classList.add('open');
    setTimeout(()=>overlay.querySelector('#eteris-auth-code')?.focus(),50);
  }
  function close(){
    document.getElementById('eteris-auth-modal')?.classList.remove('open');
  }
  async function submit(){
    const overlay=ensureModal();
    const code=overlay.querySelector('#eteris-auth-code').value.trim();
    const err=overlay.querySelector('#eteris-auth-error');
    if(!code){err.textContent='Enter your code.';return}
    if(!sb){err.textContent='Login service unavailable.';return}
    const{data,error}=await sb.from('accounts').select('*').eq('access_code',code).single();
    if(error||!data){err.textContent='Invalid code.';overlay.querySelector('#eteris-auth-code').value='';overlay.querySelector('#eteris-auth-code').focus();return}
    setSession(data);
    close();
    window.dispatchEvent(new CustomEvent('eteris:login',{detail:{user:data}}));
    if(typeof currentOptions.onLogin==='function')currentOptions.onLogin(data);
  }
  window.EterisAuth={open,close,setSession};
})();
