(function(){
  'use strict';
  if(window.__ainfoGiphyProxyInstalled)return;
  window.__ainfoGiphyProxyInstalled=true;
  const previousFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.href);
      if(u.hostname==='api.giphy.com'&&/^\/v1\/gifs\/(search|trending)$/.test(u.pathname)){
        const mode=u.pathname.endsWith('/search')?'search':'trending';
        const proxy=new URL('/api/giphy',location.origin);
        proxy.searchParams.set('mode',mode);
        proxy.searchParams.set('limit',u.searchParams.get('limit')||'24');
        if(mode==='search')proxy.searchParams.set('q',u.searchParams.get('q')||'');
        return previousFetch(proxy.toString(),{credentials:'same-origin',...(init||{})});
      }
    }catch{}
    return previousFetch(input,init);
  };
})();
