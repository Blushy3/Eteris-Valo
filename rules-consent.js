(function(){
  const RULES_VERSION='2026-06-09-v6';
  const SESSION_KEY='eteris_social_user';
  const ACCEPT_PREFIX='eteris_rules_acceptance_';
  const SUPABASE_URL='https://jczxgcbxqnnhlafvekul.supabase.co';
  const SUPABASE_KEY='sb_publishable_ZsL8foOFNJYOa3FW4YoKdw_-gJCnZ5P';
  const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
  const isRulesPage=/\/rules\.html$/i.test(location.pathname);
  let checking=false;

  function readUser(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
  }
  function writeUser(user){
    if(user)localStorage.setItem(SESSION_KEY,JSON.stringify(user));
  }
  function subjectKey(user=readUser()){
    return ACCEPT_PREFIX+(user?.id?`account_${user.id}`:'guest');
  }
  function localAccepted(user=readUser()){
    try{return JSON.parse(localStorage.getItem(subjectKey(user))||'null')?.version===RULES_VERSION}catch{return false}
  }
  function markLocal(user=readUser()){
    localStorage.setItem(subjectKey(user),JSON.stringify({version:RULES_VERSION,accepted_at:new Date().toISOString()}));
  }
  function removePrompt(){
    document.querySelector('.rules-consent-overlay')?.remove();
    document.querySelector('.rules-consent-bar')?.remove();
  }
  async function fetchFreshUser(user){
    if(!sb||!user?.id)return user;
    const{data}=await sb.from('accounts').select('*').eq('id',user.id).maybeSingle();
    if(data){writeUser(data);return data}
    return user;
  }
  async function hasAccepted(){
    const user=await fetchFreshUser(readUser());
    if(user?.id){
      if(user.rules_accepted_version===RULES_VERSION){markLocal(user);return true}
      if(localAccepted(user)){
        await saveAcceptance(true);
        return true;
      }
      return false;
    }
    return localAccepted(user);
  }
  async function saveAcceptance(silent=false){
    const user=readUser();
    const acceptedAt=new Date().toISOString();
    if(user?.id&&sb){
      const{data,error}=await sb.from('accounts').update({
        rules_accepted_version:RULES_VERSION,
        rules_accepted_at:acceptedAt,
        updated_at:acceptedAt
      }).eq('id',user.id).select().single();
      if(!error&&data)writeUser(data);
    }
    markLocal(user);
    removePrompt();
    if(!silent)window.dispatchEvent(new CustomEvent('eteris:rulesAccepted',{detail:{version:RULES_VERSION}}));
  }
  function addStyles(){
    if(document.getElementById('rules-consent-style'))return;
    const style=document.createElement('style');
    style.id='rules-consent-style';
    style.textContent=`
      .rules-consent-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.74);backdrop-filter:blur(16px)}
      .rules-consent-card,.rules-consent-bar{background:rgba(12,12,18,.98);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 80px rgba(0,0,0,.62);color:#e8eaf0;font-family:'Rajdhani',sans-serif}
      .rules-consent-card{width:min(520px,100%);border-radius:16px;padding:24px}
      .rules-consent-k{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#ff4655;margin-bottom:9px}
      .rules-consent-title{font-family:'Barlow Condensed',sans-serif;font-size:38px;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:8px}
      .rules-consent-copy{color:#8b93a3;font-size:16px;line-height:1.62;margin-bottom:16px}
      .rules-consent-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .rules-consent-btn{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:9px 13px;background:rgba(255,255,255,.045);color:#8b93a3;cursor:pointer;text-decoration:none}
      .rules-consent-btn:hover{color:#e8eaf0;border-color:rgba(255,255,255,.2)}
      .rules-consent-accept{background:#ff4655;border-color:#ff4655;color:#fff}
      .rules-consent-bar{position:fixed;left:50%;bottom:18px;z-index:9999;width:min(760px,calc(100vw - 28px));transform:translateX(-50%);border-radius:14px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:14px}
      .rules-consent-bar p{margin:0;color:#8b93a3;font-size:14px;line-height:1.45}
      @media(max-width:640px){.rules-consent-actions,.rules-consent-bar{align-items:stretch;flex-direction:column}.rules-consent-btn{text-align:center}.rules-consent-title{font-size:32px}}
    `;
    document.head.appendChild(style);
  }
  function showModal(){
    if(document.querySelector('.rules-consent-overlay'))return;
    const overlay=document.createElement('div');
    overlay.className='rules-consent-overlay';
    overlay.innerHTML=`
      <div class="rules-consent-card" role="dialog" aria-modal="true" aria-labelledby="rules-consent-title">
        <div class="rules-consent-k">Rules update</div>
        <div class="rules-consent-title" id="rules-consent-title">Accept team rules</div>
        <p class="rules-consent-copy">Before using Eteris, please accept the current Rules & Privacy document. If the document changes, this confirmation will appear again.</p>
        <div class="rules-consent-actions">
          <a class="rules-consent-btn" href="rules.html">Review rules</a>
          <button class="rules-consent-btn rules-consent-accept" type="button">Accept</button>
        </div>
      </div>
    `;
    overlay.querySelector('.rules-consent-accept').addEventListener('click',()=>saveAcceptance(false));
    document.body.appendChild(overlay);
  }
  function showRulesBar(){
    if(document.querySelector('.rules-consent-bar'))return;
    const bar=document.createElement('div');
    bar.className='rules-consent-bar';
    bar.innerHTML=`
      <p><strong>Rules acceptance required.</strong><br/>Accept the current version after reviewing this page. Future updates will ask again.</p>
      <button class="rules-consent-btn rules-consent-accept" type="button">Accept current rules</button>
    `;
    bar.querySelector('.rules-consent-accept').addEventListener('click',()=>saveAcceptance(false));
    document.body.appendChild(bar);
  }
  async function check(){
    if(checking)return;
    checking=true;
    const ok=await hasAccepted();
    checking=false;
    if(ok){removePrompt();return}
    addStyles();
    if(isRulesPage)showRulesBar();else showModal();
  }
  function init(){check()}
  window.addEventListener('eteris:login',()=>check());
  window.EterisRules={version:RULES_VERSION,check,accept:saveAcceptance};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
