(function(){
  const style=document.createElement('style');
  style.textContent=`.site-footer{position:relative;z-index:1;width:100%;min-height:68px;margin-top:auto;border-top:1px solid var(--border,rgba(255,255,255,.07));padding:20px max(24px,calc((100vw - 1280px)/2));display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:rgba(6,6,8,.72)}.site-footer-left{font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px;letter-spacing:1px;color:var(--muted2,#4b5563)}.site-footer-right{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.site-footer-link{font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px;color:var(--muted2,#4b5563);background:none;border:none;cursor:pointer;text-decoration:none;transition:color .15s}.site-footer-link:hover{color:var(--text,#e8eaf0)}@media(max-width:640px){.site-footer{padding:18px 12px;align-items:flex-start;flex-direction:column}.site-footer-right{gap:12px}}`;
  document.head.appendChild(style);
  const footer=document.querySelector('footer')||document.createElement('footer');
  footer.className='site-footer';
  footer.innerHTML=`<div class="site-footer-left">&copy; 2026 Eteris Esport - Valorant Premier - powered by Supabase</div><div class="site-footer-right"><a class="site-footer-link" href="notes.html">Notes</a><a class="site-footer-link" href="feed.html">Feed</a><a class="site-footer-link" href="suggestions.html">Suggestions</a><a class="site-footer-link" href="account.html">Account</a><a class="site-footer-link" href="rules.html">Rules & Privacy</a></div>`;
  if(!footer.parentNode)document.body.appendChild(footer);
})();
