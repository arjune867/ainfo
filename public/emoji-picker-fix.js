(function(){
  'use strict';

  const EMOJI_DATA='https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1/en/emojibase/data.json';
  const nativeCreate=document.createElement.bind(document);

  function fixPicker(el){
    if(!el||String(el.localName||'').toLowerCase()!=='emoji-picker'||el.dataset?.ainfoEmojiFixed==='1')return el;
    try{el.dataset.ainfoEmojiFixed='1'}catch{}

    const nativeSet=el.setAttribute.bind(el);
    el.setAttribute=function(name,value){
      const key=String(name||'').toLowerCase();
      let next=value;
      if(key==='locale'&&String(value||'').toLowerCase()==='id')next='en';
      nativeSet(name,next);
      if(key==='locale'||key==='skin-tone-emoji'){
        try{el.locale='en'}catch{}
        try{el.dataSource=EMOJI_DATA}catch{}
        try{nativeSet('locale','en');nativeSet('data-source',EMOJI_DATA)}catch{}
      }
    };

    try{el.locale='en'}catch{}
    try{el.dataSource=EMOJI_DATA}catch{}
    try{nativeSet('locale','en');nativeSet('data-source',EMOJI_DATA)}catch{}
    return el;
  }

  document.createElement=function(name,options){
    const el=nativeCreate(name,options);
    if(String(name||'').toLowerCase()==='emoji-picker')fixPicker(el);
    return el;
  };

  const repairExisting=()=>document.querySelectorAll('emoji-picker').forEach(fixPicker);
  new MutationObserver(repairExisting).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repairExisting,{once:true});else repairExisting();
})();
