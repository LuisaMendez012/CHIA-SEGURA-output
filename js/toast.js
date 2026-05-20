// Simple global toast utility used por modal y páginas
(function(){
  'use strict';
  function ensureContainer(){
    let c = document.getElementById('toastContainer');
    if(!c){
      c = document.createElement('div');
      c.id = 'toastContainer';
      c.style.position = 'fixed';
      c.style.bottom = '24px';
      c.style.right = '24px';
      c.style.zIndex = '9999';
      c.style.display = 'flex';
      c.style.flexDirection = 'column';
      c.style.gap = '10px';
      document.body.appendChild(c);
    }
    return c;
  }

  window.showToast = function(title, msg, type, icon, dur){
    const container = ensureContainer();
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.style.minWidth = '240px';
    el.style.padding = '12px 14px';
    el.style.borderRadius = '12px';
    el.style.fontWeight = '700';
    el.style.backdropFilter = 'blur(8px)';
    el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start"><div style="font-size:18px">${icon||''}</div><div style="flex:1"><div style="font-weight:900">${title||''}</div>${msg?`<div style=\"font-size:13px;opacity:.9;margin-top:4px\">${msg}</div>`:''}</div></div>`;
    container.appendChild(el);
    requestAnimationFrame(()=> el.style.transform = 'translateX(0)');
    const timeout = dur || 3800;
    setTimeout(()=>{
      el.style.opacity = '0';
      el.style.transform = 'translateX(24px)';
      setTimeout(()=> el.remove(), 420);
    }, timeout);
  };

})();
