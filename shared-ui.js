(function(){
  function injectSharedNavStyles(){
    if(document.getElementById('eteris-shared-nav-style'))return;
    const style=document.createElement('style');
    style.id='eteris-shared-nav-style';
    style.textContent=`
      body > nav{position:sticky!important;top:0!important;left:auto!important;right:auto!important;z-index:200!important;width:100%!important;height:60px!important;min-height:60px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;flex-shrink:0!important;padding:0 max(24px,calc((100vw - 1280px)/2))!important;background:rgba(6,6,8,.92)!important;border-bottom:1px solid var(--border,rgba(255,255,255,.07))!important;backdrop-filter:blur(22px) saturate(1.25)!important}
      body > nav .nav-logo,body > nav > a:first-child{display:inline-flex!important;align-items:center!important;text-decoration:none!important}
      body > nav .nav-logo-text{font-family:var(--font-head,'Barlow Condensed',sans-serif)!important;font-size:22px!important;font-weight:700!important;line-height:1!important;letter-spacing:2px!important;text-transform:uppercase!important;color:var(--text,#e8eaf0)!important}
      body > nav .nav-logo-text span{color:var(--red,#ff4655)!important}
      body > nav .nav-links{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;align-items:center!important;gap:2px!important}
      body > nav .nav-a{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:8px 12px!important;border:0!important;border-radius:6px!important;background:transparent!important;color:var(--muted,#6b7280)!important;font-family:var(--font-head,'Barlow Condensed',sans-serif)!important;font-size:15px!important;font-weight:600!important;line-height:1!important;letter-spacing:1.5px!important;text-transform:uppercase!important;text-decoration:none!important;white-space:nowrap!important;cursor:pointer!important;transition:color .15s,background .15s!important}
      body > nav .nav-a:hover,body > nav .nav-a.active{color:var(--text,#e8eaf0)!important;background:rgba(255,255,255,.04)!important}
      body > nav #nav-user-area,body > nav #nav-user-area-idx,body > nav #nav-user-area > div,body > nav #nav-user-area-idx > div,body > nav .nav-right{display:flex!important;align-items:center!important;gap:8px!important}
      body > nav .nav-user-pill{box-sizing:border-box!important;height:36px!important;min-height:36px!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:4px 12px 4px 4px!important;border-radius:100px!important;line-height:1!important;white-space:nowrap!important;background:rgba(255,255,255,.05)!important;border:1px solid rgba(255,255,255,.08)!important;color:var(--text,#e8eaf0)!important;text-decoration:none!important;transition:border-color .15s,background .15s!important}
      body > nav .nav-user-pill:hover{border-color:rgba(255,255,255,.16)!important;background:rgba(255,255,255,.065)!important}
      body > nav .nav-user-av{box-sizing:border-box!important;width:26px!important;height:26px!important;min-width:26px!important;min-height:26px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:50%!important;background:rgba(255,255,255,.04)!important;color:var(--red,#ff4655)!important;font-family:var(--font-head,'Barlow Condensed',sans-serif)!important;font-size:11px!important;font-weight:800!important}
      body > nav .nav-user-av img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;border:0!important;border-radius:50%!important}
      body > nav .nav-user-name{color:var(--text,#e8eaf0)!important;font-family:var(--font-mono,'JetBrains Mono',monospace)!important;font-size:10px!important;font-weight:500!important;letter-spacing:.5px!important;line-height:1!important;text-decoration:none!important}
      body > nav .login-btn{box-sizing:border-box!important;height:28px!important;min-height:28px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0 11px!important;border:1px solid var(--border,rgba(255,255,255,.07))!important;border-radius:6px!important;background:rgba(255,255,255,.04)!important;color:var(--muted,#6b7280)!important;font-family:var(--font-mono,'JetBrains Mono',monospace)!important;font-size:10px!important;font-weight:500!important;letter-spacing:1px!important;line-height:1!important;text-decoration:none!important;text-transform:uppercase!important;white-space:nowrap!important;cursor:pointer!important;transition:color .15s,border-color .15s,background .15s!important}
      body > nav .login-btn:hover,body > nav .login-btn.active{border-color:var(--border-hv,rgba(255,255,255,.14))!important;background:rgba(255,255,255,.055)!important;color:var(--text,#e8eaf0)!important}
      body > nav .nav-menu-btn{box-sizing:border-box!important;width:34px!important;height:34px!important;display:none;align-items:center!important;justify-content:center!important;border:1px solid var(--border,rgba(255,255,255,.07))!important;border-radius:7px!important;background:rgba(255,255,255,.04)!important;color:var(--text,#e8eaf0)!important;cursor:pointer!important}
      @media(max-width:1050px){body > nav .nav-links{display:none!important}body > nav .nav-menu-btn{position:relative!important;display:inline-flex!important}body > nav #nav-user-area,body > nav #nav-user-area-idx,body > nav #nav-user-area > div,body > nav #nav-user-area-idx > div,body > nav .nav-right{gap:5px!important}}
      @media(max-width:620px){body > nav{padding:0 10px!important}body > nav .nav-user-name{display:none!important}body > nav .nav-user-pill{width:36px!important;padding:4px!important}body > nav .login-btn{padding:0 8px!important;font-size:9px!important}}
    `;
    document.head.appendChild(style);
  }
  function initMobileNav(){
    const nav=document.querySelector('body > nav');
    const links=nav?.querySelector('.nav-links');
    if(!nav||!links||nav.querySelector('.nav-menu-btn'))return;
    const button=document.createElement('button');
    button.className='nav-menu-btn';
    button.type='button';
    button.setAttribute('aria-label','Open navigation');
    button.innerHTML='<span></span>';
    const menu=document.createElement('div');
    menu.className='nav-mobile-menu';
    menu.innerHTML=links.innerHTML;
    button.addEventListener('click',()=>{
      const open=menu.classList.toggle('open');
      button.classList.toggle('open',open);
      button.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    });
    menu.addEventListener('click',()=>{menu.classList.remove('open');button.classList.remove('open')});
    document.addEventListener('click',event=>{
      if(nav.contains(event.target)||menu.contains(event.target))return;
      menu.classList.remove('open');button.classList.remove('open');
    });
    nav.insertBefore(button,nav.lastElementChild);
    document.body.appendChild(menu);
  }
  function init(){
    injectSharedNavStyles();
    initMobileNav();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
