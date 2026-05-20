(function(){
  'use strict';
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if(navToggle && navMenu) navToggle.addEventListener('click', ()=> navMenu.classList.toggle('open'));

  // Marca el enlace activo basándose en el nombre del archivo actual
  function setActiveLink(){
    try{
      const links = document.querySelectorAll('.navbar__link');
      const path = location.pathname.split('/').pop() || 'index.html';
      links.forEach(a=>{
        const href = a.getAttribute('href') || '';
        if(href.split('#')[0] === path) a.classList.add('active');
        else a.classList.remove('active');
      });
    }catch(e){/* ignore */}
  }
  setActiveLink();
  window.addEventListener('popstate', setActiveLink);
})();
