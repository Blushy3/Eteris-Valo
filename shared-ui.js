(function(){
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMobileNav);else initMobileNav();
})();
