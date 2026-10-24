import { nid, SHARED } from './store.js';
import { installDnd, isDragging } from './dnd.js';
import { TEMPLATES } from './templates.js';

export function startApp(store, data, root){
  var S=data.S, D=data, ME=store.me;
  var app=root,status='',pending=null;
  // Tags : liste ordonnée par compte (la position = la priorité), id stocké sur la tâche (p) ou l'article (lvl)
  function tagList(k){return prefs().tags[k];}
  function tagOf(k,id){return tagList(k).filter(function(t){return t.id===id;})[0]||null;}
  function rank(k,id){var L=tagList(k);for(var i=0;i<L.length;i++)if(L[i].id===id)return i;return 999;}
  function defTag(k){var L=tagList(k);if(!L.length)return 0;return tagOf(k,2)?2:L[Math.floor((L.length-1)/2)].id;}
  // Tag posé par quelqu'un d'autre (liste partagée) : affiché comme un tag au pseudo de cette personne
  function foreign(t){return !!(t.tu&&t.tu!==ME.uid);}
  function tagFor(k,t){if(foreign(t))return {id:'u:'+t.tu,n:t.tn||'Partagé',c:'later',foreign:true};return tagOf(k,k==='todo'?t.p:t.lvl);}
  function rankT(k,t){var g=tagFor(k,t);return !g?2000:g.foreign?1000:rank(k,g.id);}
  function mark(t){t.tu=ME.uid;t.tn=ME.name;}
  function tagSpan(g,cls){return g?'<span class="'+cls+'" style="color:var(--'+g.c+')">'+esc(g.n)+'</span>':'';}
  var PAL=['perso','contenu','ngc','tj','isfsc','oasis','chloe','other'];
  var tab='today',btab='all',mode='todo',sh=null,sheetEl=document.createElement('div');
  document.body.appendChild(sheetEl);
  // Redessiner une feuille déjà ouverte garde sa position de défilement et ne rejoue pas l'animation d'ouverture
  var sheetRoot={
    set innerHTML(h){var o=sheetEl.querySelector('.sheet'),top=o?o.scrollTop:0;sheetEl.innerHTML=h;var n=sheetEl.querySelector('.sheet');if(o&&n){n.classList.add('noanim');n.scrollTop=top;}},
    get innerHTML(){return sheetEl.innerHTML;},
    querySelector:function(q){return sheetEl.querySelector(q);},
    querySelectorAll:function(q){return sheetEl.querySelectorAll(q);}
  };
  try{tab=localStorage.getItem('tab2')||'today';btab=localStorage.getItem('btab')||'all';mode=localStorage.getItem('mode2')==='buy'?'buy':'todo';}catch(e){}
  // raccourcis de l'appli installée (?v=today / ?v=buy)
  var qv=new URLSearchParams(location.search).get('v');if(qv==='buy')mode='buy';else if(qv==='today'){mode='todo';tab='today';}if(qv)history.replaceState(null,'',location.pathname);

  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ckey(s){var k=s.color||s.id;return PAL.indexOf(k)>=0?k:'other';}
  function col(s){return 'var(--'+ckey(s)+')';}
  // Journée = date locale décalée de 6h (une nuit blanche compte encore pour la veille)
  function dayKey(d){d=new Date((d||new Date()).getTime()-6*3600e3);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function shift(k,n){var p=k.split('-');var d=new Date(+p[0],p[1]-1,+p[2]+n,12);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function flat(secs){var r=[];secs.forEach(function(s,si){s.groups.forEach(function(g,gi){g.tasks.forEach(function(t,i){r.push({t:t,s:s,g:g,si:si,gi:gi,i:i});});});});return r;}
  function tasks(){return flat(S.sections);}
  // les suivis (watchlists) ne comptent pas comme des tâches : ni dans Aujourd'hui, ni dans Tout, ni dans le compteur
  function isWatch(s){return s&&s.type==='watch';}
  function todoTasks(){return tasks().filter(function(x){return !isWatch(x.s);});}
  function find(id,secs){var a=flat(secs||S.sections);for(var i=0;i<a.length;i++)if(a[i].t.id===id)return a[i];return null;}
  function focusList(today){
    var due=todoTasks().filter(function(x){return x.t.due&&x.t.due<=today&&(!x.t.d||x.t.at===today);});
    var ids=due.map(function(x){return x.t.id;});
    return due.concat(S.focus.map(function(id){return find(id);}).filter(function(x){return x&&ids.indexOf(x.t.id)<0&&(!x.t.d||x.t.at===today);}));}
  function dueLabel(k){var today=dayKey();if(k<today)return ['En retard','late'];if(k===today)return ['Aujourd’hui','now'];if(k===shift(today,1))return ['Demain','soon'];
    return [new Date(k+'T12:00').toLocaleDateString('fr-BE',{weekday:'short',day:'numeric',month:'short'}),''];}
  // Changer le texte d'une tâche en gardant l'ancienne version dans l'historique
  function setText(t,v){v=(v||'').trim();if(!v||v===t.t)return;(t.hist=t.hist||[]).push({t:t.t,on:dayKey()});t.t=v;}
  function fdate(k){return new Date(k+'T12:00').toLocaleDateString('fr-BE',{day:'numeric',month:'short'});}
  function byPrio(a,b){return (a.t.d-b.t.d)||(rankT('todo',a.t)-rankT('todo',b.t))||((a.t.due||'9')<(b.t.due||'9')?-1:(a.t.due||'9')>(b.t.due||'9')?1:0);}

  /* ---------- Todo : lignes ---------- */
  function row(x,o){
    var t=x.t,f=S.focus.indexOf(t.id)>=0,m='';
    if(!t.d)m+=tagSpan(tagFor('todo',t),'pri');
    if(t.due&&!t.d){var dl=dueLabel(t.due);m+='<span class="due '+dl[1]+'">'+dl[0]+'</span>';}
    if(o.proj)m+='<span class="proj">'+esc(x.s.name)+' › '+esc(x.g.name)+'</span>';
    if(f&&!t.d)m+='<span class="starred">★ Focus</span>';
    if(t.guests&&t.guests.length&&!x.s.virtual)m+='<span class="shr">'+PEOPLE+t.guests.length+'</span>';
    if(x.s.virtual&&t.byName)m+='<span class="shr">de '+esc(t.byName)+'</span>';
    if(t.rep&&t.rep.length&&!t.d){var nr=t.rep.filter(isRep).length,lw='';for(var ri=t.rep.length-1;ri>=0;ri--)if(t.rep[ri].why){lw=t.rep[ri].why;break;}
      if(nr||lw)m+='<span class="repl">'+(nr?'↻ reportée'+(nr>1?' '+nr+'×':''):'✎')+(lw?' · '+esc(lw):'')+'</span>';}
    return '<li class="task'+(t.d?' done':'')+'" style="--k:'+col(x.s)+'"'+(x.s.virtual?'':' data-drag="t:'+t.id+'"')+'>'+
      '<input class="check" type="checkbox" id="cb-'+(o.pre||'')+t.id+'" data-id="'+t.id+'"'+(t.d?' checked':'')+' aria-label="Marquer comme faite : '+esc(t.t)+'">'+
      '<button class="body" type="button" data-open="'+t.id+'"><span class="t">'+esc(t.t)+'</span>'+(m?'<span class="meta">'+m+'</span>':'')+'</button>'+
      (t.d?'':'<button type="button" class="pen" data-rep="'+t.id+'" aria-label="Mettre à jour ou reporter : '+esc(t.t)+'" title="Mettre à jour / reporter">✎</button>')+'</li>';
  }
  function list(L,o){return '<ul>'+L.map(function(x){return row(x,o||{});}).join('')+'</ul>';}
  function doneBox(L,o,label,fn){if(!L.length)return '';return '<details class="donebox"><summary>'+(label||'Terminées')+' ('+L.length+')</summary><ul>'+L.map(function(x){return (fn||row)(x,o||{});}).join('')+'</ul></details>';}

  /* ---------- Rendu ---------- */
  function render(){
    var every=tasks(),all=every.filter(function(x){return !isWatch(x.s);}),today=dayKey(),N=all.length,D=all.filter(function(x){return x.t.d;}).length;
    var B=flat(S.buy),bOpen=B.filter(function(x){return !x.t.d;}).length;
    if(['today','all'].concat(S.sections.filter(function(s){return !isWatch(s)||prefs().tools.watch;}).map(function(s){return s.id;})).indexOf(tab)<0)tab='today';
    if(['all'].concat(S.buy.map(function(s){return s.id;})).indexOf(btab)<0)btab='all';
    var foc=focusList(today),focOpen=foc.filter(function(x){return !x.t.d;}).length;
    var h='<header class="top"><div class="top-in"><div class="brand"><h1><span class="h-pre">Nocturnz/</span>'+(mode==='buy'?'wishlist':'todo')+'</h1><div class="right"><span class="status" id="status">'+esc(status)+'</span>'+
      '<button type="button" class="iconb bell" data-bell aria-label="Notifications'+(unread()?' ('+unread()+' nouvelles)':'')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>'+(unread()?'<i class="badge">'+unread()+'</i>':'')+'</button>'+
      '<button type="button" class="gear" data-manage aria-label="Catégories"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg><span>Catégories</span></button><button type="button" class="iconb me-b" data-account aria-label="Mon compte">'+avatar({n:ME.name,e:ME.email,ph:ME.photo})+'</button></div></div>'+
      '<div class="modes" role="tablist" aria-label="Section">'+
        '<button type="button" role="tab" data-mode="todo" aria-selected="'+(mode==='todo')+'">Todo<span class="n">'+(N-D)+'</span></button>'+
        '<button type="button" role="tab" data-mode="buy" aria-selected="'+(mode==='buy')+'">Wishlist<span class="n">'+bOpen+'</span></button></div>';
    if(mode==='todo'){
      h+='<div class="meter"><div class="track"><i style="width:'+(N?D/N*100:0)+'%"></i></div><span>'+D+'/'+N+' faites</span></div>'+
      '<nav class="tabs" aria-label="Vues">'+tabBtn('tab','today','Aujourd’hui','var(--star)',focOpen,tab)+tabBtn('tab','all','Tout','var(--ink)',N-D,tab)+
      S.sections.map(function(s,i){if(isWatch(s)&&!prefs().tools.watch)return '';return tabBtn('tab',s.id,s.name,col(s),every.filter(function(x){return x.s===s&&!x.t.d;}).length,tab,s.virtual?'':'t:'+i,s);}).join('')+'</nav>';
    }else{
      h+='<nav class="tabs" aria-label="Catégories de la wishlist">'+tabBtn('btab','all','Tout','var(--ink)',bOpen,btab)+
      S.buy.map(function(s,i){return tabBtn('btab',s.id,s.name,col(s),B.filter(function(x){return x.s===s&&!x.t.d;}).length,btab,s.virtual?'':'b:'+i,s);}).join('')+'</nav>';
    }
    h+='</div></header><main id="main">';
    if(mode==='buy')h+=viewBuys(B);
    else if(tab==='today')h+=viewToday(all,today,foc);
    else if(tab==='all')h+=viewAll(all);
    else{var cur=S.sections.filter(function(s){return s.id===tab;})[0];h+=isWatch(cur)?viewWatch(cur,every):viewSection(cur,all);}
    var onWatch=mode==='todo'&&isWatch(S.sections.filter(function(s){return s.id===tab;})[0]);
    h+='<p class="sign">by Adam</p></main>'+(mode==='buy'||onWatch?'':'<button class="fab" type="button" data-add aria-label="Ajouter une tâche">+</button>');
    app.innerHTML=h;
    document.title='Nocturnz/'+(mode==='buy'?'wishlist':'todo');
    fitNames();
    var at=app.querySelector('.tab[aria-pressed="true"]');if(at&&at.scrollIntoView)try{at.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}
  }
  function fitNames(){app.querySelectorAll('textarea.gname').forEach(function(t){t.style.height='auto';t.style.height=t.scrollHeight+'px';});}
  // « Autre date… » : ouvre le calendrier natif (le champ date est posé invisible sur la pastille)
  document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('.datechip');if(!c||e.target.tagName==='INPUT')return;var i=c.querySelector('input');try{i.showPicker();}catch(_){i.focus();}});
  document.addEventListener('input',function(e){if(e.target.classList&&e.target.classList.contains('gname')&&e.target.tagName==='TEXTAREA'){e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}});
  var PEOPLE='<svg class="ppl" viewBox="0 0 24 24" aria-label="partagée"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.6.2 4.4 1.8 5 4.8"/></svg>';
  function isShared(s){return s&&!s.virtual&&s.members&&s.members.length>1;}
  function isTplWatch(s){return isWatch(s)&&!!(s.tpl||TEMPLATES.some(function(t){return t.name===s.name||(t.aliases||[]).indexOf(s.name)>=0;}));}
  function tabBtn(attr,id,name,c,n,cur,drop,s){return '<button class="tab" type="button" data-'+attr+'="'+esc(id)+'" aria-pressed="'+(cur===id)+'" style="--c:'+c+'"'+(drop?' data-drop="'+drop+':-" data-drop-open':'')+'><span class="dot"></span>'+esc(name)+(isShared(s)||(s&&s.virtual)?PEOPLE:'')+(n?'<span class="n">'+n+'</span>':'')+'</button>';}
  function shareBtn(s,kind){if(!s||s.virtual)return '';var n=(s.members||[]).length||1;return '<button type="button" class="sharebtn'+(n>1?' on':'')+'" data-share="'+kind+':'+esc(s.id)+'" aria-label="Partager '+esc(s.name)+'">'+PEOPLE+(n>1?'<span>'+n+'</span>':'<span>Partager</span>')+'</button>';}

  function viewToday(all,today,foc){
    var dl=new Date(today+'T12:00').toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long'});
    var h='<div class="pagehead"><div><div class="eyebrow">'+esc(dl)+'</div><h2>Aujourd’hui</h2></div></div>';
    h+='<section class="card"><div class="card-h"><h2>Focus du jour</h2><span class="sub">'+foc.filter(function(x){return x.t.d;}).length+'/'+foc.length+'</span></div>';
    if(foc.length){h+=list(foc,{proj:true,pre:'f-',rep:true});}
    else{var sug=all.filter(function(x){return !x.t.d;}).sort(byPrio).slice(0,3);
      if(!sug.length)h+='<p class="hint">Rien de prévu pour l’instant. Ajoute tes premières tâches avec le bouton + ou dans un projet.</p>';else
      h+='<p class="hint">Rien de prévu. Choisis jusqu’à 3 tâches (ouvre une tâche → Focus), ou prends ces suggestions :</p>'+list(sug,{proj:true,pre:'s-'})+
        '<div class="btn-row"><button class="btn" type="button" data-sug="'+sug.map(function(x){return x.t.id;}).join(',')+'">Prendre ces 3 tâches</button></div>';}
    var repd=all.filter(function(x){return !x.t.d&&x.t.rep&&x.t.rep.some(function(r){return r.on===today&&isRep(r);});});
    if(repd.length)h+='<details class="donebox"><summary>Reportées aujourd’hui ('+repd.length+')</summary>'+list(repd,{proj:true,pre:'r-'})+'</details>';
    h+='</section>';
    var fids=foc.map(function(x){return x.t.id;});
    var top=tagList('todo')[0],urg=top?all.filter(function(x){return !x.t.d&&!foreign(x.t)&&x.t.p===top.id&&fids.indexOf(x.t.id)<0;}).sort(byPrio):[];
    h+='<section class="card"><div class="card-h"><h2>Urgences</h2><span class="sub">'+urg.length+'</span></div>'+(urg.length?list(urg,{proj:true,rep:true}):'<p class="empty">Aucune urgence en dehors du focus.</p>')+'</section>';
    var byDay={};all.forEach(function(x){if(x.t.d&&x.t.at)byDay[x.t.at]=(byDay[x.t.at]||0)+1;});
    var streak=0,k=today;if(!byDay[k])k=shift(k,-1);while(byDay[k]){streak++;k=shift(k,-1);}
    var days=[],mx=1;for(var i=13;i>=0;i--){var dk=shift(today,-i);days.push([dk,byDay[dk]||0]);mx=Math.max(mx,byDay[dk]||0);}
    h+='<section class="card"><div class="card-h"><h2>Suivi</h2></div><div class="stats">'+
      '<div class="stat"><b>'+(byDay[today]||0)+'</b><span>faites aujourd’hui</span></div>'+
      '<div class="stat"><b>'+streak+'</b><span>jour'+(streak>1?'s':'')+' d’affilée</span></div>'+
      '<div class="stat"><b>'+days.reduce(function(a,d){return a+d[1];},0)+'</b><span>sur 14 jours</span></div></div>'+
      '<div class="spark" aria-label="Tâches faites par jour sur 14 jours">'+days.map(function(d){return '<i class="'+(d[0]===today?'now':d[1]?'on':'')+'" style="height:'+(d[1]?Math.max(14,d[1]/mx*100):8)+'%" title="'+d[0]+' : '+d[1]+'"></i>';}).join('')+'</div>'+
      '<div class="spark-l"><span>il y a 14 j</span><span>aujourd’hui</span></div></section>';
    return h;
  }
  function viewAll(all){
    var h='<div class="pagehead"><h2>Tout</h2><span class="sub">'+all.filter(function(x){return !x.t.d;}).length+' à faire</span></div>';
    var others={};all.forEach(function(x){if(!x.t.d&&foreign(x.t))others[x.t.tu]=tagFor('todo',x.t);});
    tagList('todo').concat(Object.keys(others).map(function(u){return others[u];}),[{id:null,n:'Sans tag',c:'later'}]).forEach(function(tg){
      var L=all.filter(function(x){if(x.t.d)return false;var g=tagFor('todo',x.t);return tg.id===null?!g:!!g&&g.id===tg.id;}).sort(byPrio);
      if((tg.id===null||tg.foreign)&&!L.length)return;
      h+='<section class="card"><div class="card-h"><h2><span class="pri" style="color:var(--'+tg.c+')">'+esc(tg.n)+'</span></h2><span class="sub">'+L.length+'</span></div>'+(L.length?list(L,{proj:true}):'<p class="empty">Rien ici.</p>')+'</section>';
    });
    var dn=all.filter(function(x){return x.t.d;});
    if(dn.length)h+='<section class="card">'+doneBox(dn,{proj:true})+'</section>';
    return h;
  }
  function qline(kind,si,gi,lvl,ph){
    var id='qa-'+kind+'-'+si+'-'+gi+(lvl?'-'+lvl:'');
    return '<div class="qline"><span class="qbox"></span><input class="qadd" type="text" id="'+id+'" data-qk="'+kind+'" data-qs="'+si+'" data-qg="'+gi+'"'+(lvl?' data-ql="'+lvl+'"':'')+' placeholder="'+esc(ph)+'" enterkeyhint="done" autocomplete="off" aria-label="'+esc(ph)+'"></div>';
  }
  // En-tête de sous-catégorie : nom modifiable sur place + bouton « + » pour ajouter une ligne
  function gHead(k,si,gi,g,extra,noAdd){
    return '<div class="grp-h ed"><textarea class="gname inl" rows="1" data-gk="'+k+'" data-gs="'+si+'" data-gg="'+gi+'" enterkeyhint="done" aria-label="Renommer la sous-catégorie '+esc(g.name)+'">'+esc(g.name)+'</textarea>'+extra+
      (noAdd?'':'<button type="button" class="plus" data-qfocus="qa-'+k+'-'+si+'-'+gi+'" aria-label="Ajouter dans '+esc(g.name)+'">+</button>')+'</div>';
  }
  function nameObj(inp){var d=inp.dataset;if(d.ck){return (d.ck==='b'?S.buy:S.sections)[+d.cs];}var s=(d.gk==='b'?S.buy:S.sections)[+d.gs];return s&&s.groups[+d.gg];}
  function renameGroup(inp){
    var g=nameObj(inp);if(!g)return;
    var v=inp.value.replace(/\s+/g,' ').trim();
    if(!v||v===g.name){inp.value=g.name;return;}
    g.name=v;change();
  }
  /* ---------- Suivi (watchlist) : progression vers un objectif ---------- */
  // deux niveaux : l'ancien « Mieux de voir » (2) compte comme « À regarder »
  var IMP={1:{n:'À voir',c:'oasis'},3:{n:'À skip',c:'later'}};
  function impOf(t){var i=t.imp||1;return i===2?1:i;}
  var wf={imp:0,hide:false,grp:'',lm:true,lh:true};try{var wfs=JSON.parse(localStorage.getItem('wf')||'null');if(wfs)wf=wfs;}catch(_){}
  if(wf.imp===2)wf.imp=1;if(wf.lm===undefined)wf.lm=true;if(wf.lh===undefined)wf.lh=true;
  function saveWf(){try{localStorage.setItem('wf',JSON.stringify(wf));}catch(_){}}
  function hm(min){min=Math.round(min||0);if(!min)return '0h';var h=Math.floor(min/60),m=min%60;return h?h+'h'+(m?String(m).padStart(2,'0'):''):m+' min';}
  function yr(k){return k?k.slice(0,4):'';}
  // date de sortie lisible : « 2 mai 2008 » (ou l'année seule si on ne la connaît pas plus précisément)
  function relDate(k){if(!k)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return k.slice(0,4);return new Date(k+'T12:00').toLocaleDateString('fr-BE',{day:'numeric',month:'short',year:'numeric'});}
  function byRel(a,b){return (a.t.rel||'9999')<(b.t.rel||'9999')?-1:(a.t.rel||'9999')>(b.t.rel||'9999')?1:0;}
  function impTag(i,side){var k=i===2?1:(i||1),m=IMP[k];return m?'<span class="imp" style="--c:var(--'+(side&&k===1?'contenu':m.c)+')">'+m.n+'</span>':'';}
  function friendDots(t,ctx){var F=(ctx&&ctx.fr)||[];var who=F.filter(function(f){return f.prog&&f.prog.seen&&f.prog.seen[t.t]!==undefined;});
    return who.length?'<span class="fdots">'+who.slice(0,4).map(function(f){return '<i title="'+esc(f.name)+' l’a vu">'+(f.photo?'<img src="'+esc(f.photo)+'" alt="">':esc(initials(f.name)))+'</i>';}).join('')+'</span>':'';}
  function wrow(x,n,ctx){
    var t=x.t,m=[];
    // déjà vu : version compacte, titre + année seulement
    if(t.d)return '<li class="task wrow done" id="wr-'+t.id+'" style="--k:'+col(x.s)+'">'+
      '<input class="check" type="checkbox" id="w-'+t.id+'" data-id="'+t.id+'" checked aria-label="Marquer comme pas vu : '+esc(t.t)+'">'+
      '<button class="body" type="button" data-wopen="'+t.id+'"><span class="t"><span class="wn">'+String(n).padStart(2,'0')+'</span>'+esc(t.t)+(t.rel?' <span class="wyear">'+yr(t.rel)+'</span>':'')+'</span></button>'+friendDots(t,ctx)+'</li>';
    if(t.rel)m.push('<span class="reld">'+relDate(t.rel)+'</span>');if(t.fmt)m.push(esc(t.fmt));else if(t.dur)m.push(hm(t.dur));
    ctx=ctx||{L:[],back:{}};var today=new Date().toISOString().slice(0,10),badge='';
    if(t.rel&&t.rel>today)badge='<span class="soonb">À venir</span>';
    var find2=function(n){return ctx.L.filter(function(y){return y.t.t===n;})[0];};
    var pre=wf.lm?(t.pre||[]).map(find2).filter(Boolean):[];
    var links=wf.lh?(t.lk||[]).map(find2).filter(function(y){return y&&impOf(y.t)!==3;}).concat(ctx.back[t.t]||[]):[];
    var chips=function(L,cls){return L.map(function(y){return '<button type="button" class="wlink '+cls+(y.t.d?' seen':'')+'" data-wlink="'+y.t.id+'">'+esc(y.t.t)+'</button>';}).join('');};
    return '<li class="task wrow'+(t.d?' done':'')+(t.goal?' goal':'')+(links.length||pre.length?' haslinks':'')+'" id="wr-'+t.id+'" style="--k:'+col(x.s)+'">'+
      '<input class="check" type="checkbox" id="w-'+t.id+'" data-id="'+t.id+'"'+(t.d?' checked':'')+' aria-label="Marquer comme vu : '+esc(t.t)+'">'+
      '<button class="body" type="button" data-wopen="'+t.id+'"><span class="t"><span class="wn">'+String(n).padStart(2,'0')+'</span>'+esc(t.t)+(t.goal?' <span class="goalb">Objectif</span>':'')+'</span>'+
      '<span class="meta">'+(m.length?'<span>'+m.join(' · ')+'</span>':'')+badge+impTag(t.imp,!!t.cont)+(t.note&&!t.cont?'<span>'+esc(t.note)+'</span>':'')+'</span></button>'+friendDots(t,ctx)+
      (pre.length?'<div class="wlinks" aria-label="Titres MCU à voir avant">'+chips(pre,'pre')+'</div>':'')+
      (links.length?'<div class="wlinks" aria-label="'+(t.cont?'Titres MCU liés':'Titres hors MCU liés')+'">'+chips(links,'hors')+'</div>':'')+'</li>';
  }
  function viewWatch(s,every){
    var si=S.sections.indexOf(s),L=every.filter(function(x){return x.s===s;}).sort(byRel);
    var side=function(g){return !!g.side||(g.tasks.length>0&&g.tasks.every(function(t){return t.cont;}));};
    var goal=L.filter(function(x){return x.t.goal;})[0],main=L.filter(function(x){return !side(x.g);}),bonus=L.filter(function(x){return side(x.g);});
    var ctx={goal:goal,L:L,back:{},fr:[]};main.forEach(function(x){(x.t.lk||[]).forEach(function(n){(ctx.back[n]=ctx.back[n]||[]).push(x);});});
    // le bloc de progression suit l'onglet : MCU (jusqu'à l'objectif) ou liste Hors MCU
    if(wf.grp!=='hors'||!bonus.length)wf.grp='';
    var hors=wf.grp==='hors';
    var G=hors?bonus:goal?main.filter(function(x){return (x.t.rel||'')<=(goal.t.rel||'9999');}):main;
    var seen=G.filter(function(x){return x.t.d;}),left=G.filter(function(x){return !x.t.d;});
    var ess=left.filter(function(x){return impOf(x.t)===1;}),pct=G.length?Math.round(seen.length/G.length*100):0;
    var tAll=left.reduce(function(a,x){return a+(x.t.dur||0);},0),tEss=ess.reduce(function(a,x){return a+(x.t.dur||0);},0);
    var fimp=hors?(wf.impH||0):wf.imp,next=left.filter(function(x){var i=impOf(x.t);return fimp?i===fimp:i!==3;})[0]||left[0];
    var h='<div class="pagehead" style="--c:'+col(s)+'"><h2><input class="gname pname inl" type="text" value="'+esc(s.name)+'" data-ck="t" data-cs="'+si+'" enterkeyhint="done" autocomplete="off" aria-label="Renommer le suivi"></h2></div>';
    var tplId=isTplWatch(s)?(s.tpl||(TEMPLATES.filter(function(t){return t.name===s.name||(t.aliases||[]).indexOf(s.name)>=0;})[0]||{}).id):'';
    var fr=tplId?D.friends.filter(function(f){return f.tpl===tplId;}):[];ctx.fr=fr;
    var shareB='<button type="button" class="wshare" data-wshare="'+s.id+'" aria-label="Partager">'+PEOPLE+(fr.length?'<span>'+fr.length+'</span>':'')+'</button>';
    h+='<section class="card whero'+(hors?' hors':'')+'"><div class="wh-top">'+shareB+'<div><div class="wh-goal">'+(hors?'Hors MCU':goal?esc(goal.t.t):esc(s.name))+'</div></div><div class="wh-pct">'+pct+'<small>%</small></div></div>'+
      '<div class="wbar'+(hors?' hors':'')+'"><i style="width:'+pct+'%"></i></div>'+
      (function(){
        // temps vu / temps total, et la même chose sans les « Tu peux skip »
        var sum=function(L){return L.reduce(function(a,x){return a+(x.t.dur||0);},0);},E=G.filter(function(x){return impOf(x.t)===1;});
        // le temps bascule au toucher : total (gris, skip compris) ↔ sans les skip (vert, comme « À regarder »)
        var ess=wf.tm==='ess',T=ess?E:G;
        // compteur de titres : interrupteur à part (wf.tc), même principe
        var cE=wf.tc==='ess',C=cE?E:G,CS=C.filter(function(x){return x.t.d;});
        return '<div class="wstats"><button type="button" class="wtime'+(cE?' ess':'')+'" data-wcount aria-label="'+(cE?'Titres « à voir » vus':'Titres vus, skip compris')+'"><b>'+CS.length+'<small>/'+C.length+'</small></b></button>'+
          '<button type="button" class="wtime'+(ess?' ess':'')+'" data-wtime aria-label="'+(ess?'Temps sans les skip (toucher pour le temps total)':'Temps total, skip compris (toucher pour le temps sans les skip)')+'"><b>'+hm(sum(T.filter(function(x){return x.t.d;})))+'<small>/'+hm(sum(T))+'</small></b></button></div>';
      })()+
      '<!--friends-->'+
      (next?'<div class="wnext"><div class="wn-l"><span class="eyebrow">Prochain</span><b>'+esc(next.t.t)+'</b><small>'+[relDate(next.t.rel),next.t.fmt||'',next.t.dur?hm(next.t.dur):''].filter(Boolean).join(' · ')+'</small></div><button type="button" class="btn" data-wseen="'+next.t.id+'">Vu ✓</button></div>':
        (G.length?'<div class="wnext done-all"><b>'+(goal&&!hors?'Objectif atteint 🎉':'Tout est vu 🎉')+'</b></div>':''))+'<!--favs--></section>';
    // amis : juste leurs photos, qui dépassent du bas de la carte ; un toucher ouvre leur fiche
    h=h.replace('<!--friends-->','');
    if(tplId&&fr.length)h=h.replace('<!--favs-->','<div class="wfavs">'+fr.map(function(f){var p=f.prog||{};
      return '<button type="button" class="wfav" data-wfriend="'+esc(f.id)+'" aria-label="'+esc(f.name)+(p.pct!=null?' : '+p.pct+' %':'')+'">'+avatar({n:f.name,ph:f.photo})+'</button>';}).join('')+'</div>');
    if(tplId){
      var seenMap={},vhMap={},lastT=null;L.forEach(function(x){if(x.t.d){seenMap[x.t.t]=x.t.at||'';}if(x.t.vh&&x.t.vh.length){vhMap[x.t.t]=x.t.vh.slice(-5);var l=x.t.vh[x.t.vh.length-1];if(!lastT||l>lastT.at)lastT={t:x.t.t,at:l};}});
      var mainAll=main.filter(function(x){return !goal||(x.t.rel||'')<=(goal.t.rel||'9999');});
      store.saveProgress(tplId,{pct:mainAll.length?Math.round(mainAll.filter(function(x){return x.t.d;}).length/mainAll.length*100):0,
        nSeen:mainAll.filter(function(x){return x.t.d;}).length,nTotal:mainAll.length,hSeen:bonus.filter(function(x){return x.t.d;}).length,hTotal:bonus.length,
        next:(main.filter(function(x){return !x.t.d&&impOf(x.t)!==3;})[0]||{t:{}}).t.t||'',last:lastT,seen:seenMap,vh:vhMap});
    }
    h=h.replace('<!--favs-->','');
    var miss=tplMissing(s),fromTpl=!!(s.tpl||TEMPLATES.some(function(t){return t.name===s.name||(t.aliases||[]).indexOf(s.name)>=0;}));
    var nNew=miss.filter(function(o){return !o.upd&&!o.rm&&!o.rename;}).length;
    if(miss.length)h+='<div class="wmiss"><span>'+(nNew?nNew+' titre'+(nNew>1?'s':'')+' et des infos ajoutés':'Des infos (noms des groupes, objectif, liens « à voir avant ») ajoutées')+' au modèle depuis la création de ce suivi.</span><button type="button" class="btn ghost" data-wfill="'+s.id+'">Mettre à jour</button></div>';
    // deux listes séparées : le MCU (par phase) et, en parallèle, les autres productions liées
    if(bonus.length)h+='<div class="wtabs seg" role="tablist">'+
      '<button type="button" role="tab" data-wf-grp="" aria-selected="'+!hors+'">MCU <span class="n">'+main.filter(function(x){return x.t.d;}).length+'/'+main.length+'</span></button>'+
      '<button type="button" role="tab" data-wf-grp="hors" aria-selected="'+hors+'">Hors MCU <span class="n">'+bonus.filter(function(x){return x.t.d;}).length+'/'+bonus.length+'</span></button></div>';
    if(!hors)h+='<div class="chipscroll wfilters">'+[[0,'Toute importance'],[1,IMP[1].n],[3,IMP[3].n]].map(function(f){
      return '<button type="button" class="chipb'+(f[0]?' tg':'')+'" style="--c:var(--'+(f[0]?IMP[f[0]].c:'ink')+')" data-wf-imp="'+f[0]+'" aria-pressed="'+(wf.imp===f[0])+'">'+f[1]+'</button>';}).join('')+
      '<button type="button" class="chipb" data-wf-hide aria-pressed="'+!!wf.hide+'">Masquer les vus</button></div>';
    else h+='<div class="chipscroll wfilters">'+[[0,'Toute importance'],[1,IMP[1].n],[3,IMP[3].n]].map(function(f){
      return '<button type="button" class="chipb'+(f[0]?' tg':'')+'" style="--c:var(--'+(f[0]===1?'contenu':f[0]?IMP[f[0]].c:'ink')+')" data-wf-imph="'+f[0]+'" aria-pressed="'+((wf.impH||0)===f[0])+'">'+f[1]+'</button>';}).join('')+
      '<button type="button" class="chipb" data-wf-hide aria-pressed="'+!!wf.hide+'">Masquer les vus</button></div>';
    h+='<div class="wtoggles"><button type="button" class="ltog" style="--c:var(--isfsc)" data-wf-lm aria-pressed="'+!!wf.lm+'" aria-label="Afficher les liens MCU">↗ MCU</button><button type="button" class="ltog" style="--c:var(--contenu)" data-wf-lh aria-pressed="'+!!wf.lh+'" aria-label="Afficher les liens hors MCU">↗ Hors MCU</button></div>';
    var keep=function(x){return !(wf.hide&&x.t.d)&&(hors?(!wf.impH||impOf(x.t)===wf.impH):(!wf.imp||impOf(x.t)===wf.imp));};
    h+='<section class="card notes">';
    s.groups.forEach(function(g,gi){
      if(side(g)!==hors)return;
      var GL=L.filter(function(x){return x.g===g;}),shown=GL.filter(keep);
      var after=!hors&&goal&&GL.length&&GL.every(function(x){return (x.t.rel||'')>(goal.t.rel||'9999');});
      h+=gHead('w',si,gi,g,(after?'<span class="afterb">après l’objectif</span>':'')+'<span class="gsum">'+GL.filter(function(x){return x.t.d;}).length+'/'+GL.length+'</span>',fromTpl);
      h+=shown.length?'<ul>'+shown.map(function(x){return wrow(x,GL.indexOf(x)+1,ctx);}).join('')+'</ul>':(GL.length?'<p class="empty">'+(wf.hide?'Tout est vu ici.':'Rien avec ces filtres.')+'</p>':'');
      // suivi issu d'un modèle : liste fixe, pas de ligne d'ajout
      if(!fromTpl)h+=qline('w',si,gi,0,'Ajouter dans '+g.name+'…');
    });
    if(!s.groups.some(function(g){return side(g)===hors;}))h+='<p class="empty">Aucun titre pour l’instant.</p>';
    h+='</section>';
    var ev=[];L.forEach(function(x){(x.t.vh||[]).forEach(function(d){ev.push({on:d,t:x.t.t});});});
    ev.sort(function(a,b){return a.on<b.on?1:a.on>b.on?-1:0;});
    h+='<section class="card"><details class="donebox"'+(ev.length&&ev.length<6?' open':'')+'><summary>Historique ('+ev.length+')</summary>'+
      (ev.length?'<ol class="whist">'+ev.slice(0,100).map(function(e){return '<li><span class="hd">'+fdate(e.on)+'</span><span>'+esc(e.t)+'</span></li>';}).join('')+'</ol>':'<p class="empty">Coche un titre quand tu l’as vu : il s’affichera ici avec la date.</p>')+
      '</details>'+(L.some(function(x){return x.t.d;})?'<div class="btn-row"><button type="button" class="btn danger" data-wreset="'+s.id+'">'+(wreset===s.id?'Confirmer : tout décocher ('+L.filter(function(x){return x.t.d;}).length+')':'Réinitialiser la progression')+'</button></div>':'')+'</section>';
    return h;
  }
  var wreset='';
  /* ---------- Suivre à plusieurs : chacun son suivi, on voit la progression de ses amis ---------- */
  function tplOf(s){return TEMPLATES.filter(function(t){return t.id===s.tpl||(!s.tpl&&(t.name===s.name||(t.aliases||[]).indexOf(s.name)>=0));})[0]||null;}
  function openWShare(s){var tpl=tplOf(s);if(!tpl){openShare('cat',s.id);return;}sh={kind:'wshare',tpl:tpl.id,tplName:tpl.name,email:'',err:'',sentTo:''};renderWShare();}
  function renderWShare(){
    var F=D.friends.filter(function(f){return f.tpl===sh.tpl;}),mine=D.sent.filter(function(v){return v.type==='watch'&&v.target===sh.tpl&&v.status!=='accepted';}),h='';
    var linked=D.sent.filter(function(v){return v.type==='watch'&&v.target===sh.tpl;}).map(function(v){return v.toEmail;}).concat(D.invites.filter(function(v){return v.type==='watch'&&v.target===sh.tpl;}).map(function(v){return v.fromEmail;}));
    if(F.length)h+='<div class="set">'+F.map(function(f){var p=f.prog||{};return '<div class="row">'+avatar({n:f.name,ph:f.photo})+'<span class="rl"><b>'+esc(f.name)+'</b><small>'+(p.pct!=null?p.pct+' % du MCU':'pas encore commencé')+'</small></span><button type="button" class="tbtn danger" data-wunfriend="'+esc(f.id)+'">Retirer</button></div>';}).join('')+'</div>';
    if(mine.length)h+='<div class="set">'+mine.map(function(v){return '<div class="row"><span class="rl"><b>'+esc(v.toEmail)+'</b><small>'+(v.status==='declined'?'a refusé':'invitation en attente')+'</small></span><button type="button" class="xbtn sm" data-sh-cancel="'+esc(v.id)+'" aria-label="Annuler l’invitation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>';}).join('')+'</div>';
    h+=contactChips(F.map(function(f){return f.email;}).concat(linked).filter(Boolean).map(function(e){return e.toLowerCase();}));
    h+='<div class="set"><div class="row inv"><input type="email" id="ws-email" inputmode="email" autocomplete="off" placeholder="Inviter par email" value="'+esc(sh.email)+'"><button type="button" class="tbtn" data-ws-invite>Inviter</button></div></div>'+
      (sh.err?'<p class="err">'+esc(sh.err)+'</p>':'')+(sh.sentTo?'<p class="hint flush">Invitation envoyée à '+esc(sh.sentTo)+' : elle apparaît dans sa cloche 🔔.</p>':'');
    sheetRoot.innerHTML=edSheet('Partager',h);
  }
  function wsInvite(){var e=sheetRoot.querySelector('#ws-email'),email=(e?e.value:'').trim().toLowerCase();sh.email=email;sh.err='';sh.sentTo='';
    if(!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)){sh.err='Adresse email invalide';renderWShare();return;}
    store.memberStatus(email).then(function(m){if(m==='none'){sh.err=email+' n’a pas de compte sur l’appli.';renderWShare();return;}
      return store.invite('watch',sh.tpl,email,sh.tplName,'todo').then(function(){sh.sentTo=email;sh.email='';renderWShare();});})
      .catch(function(er){sh.err=er.message||'Échec';renderWShare();});}
  function openFriend(id){sh={kind:'friend',id:id};renderFriend();}
  function renderFriend(){
    var f=D.friends.filter(function(x){return x.id===sh.id;})[0];if(!f){closeSheet();return;}var p=f.prog||{},seen=p.seen||{},tpl=TEMPLATES.filter(function(t){return t.id===f.tpl;})[0],h='';
    h+='<div class="set"><div class="row acct">'+avatar({n:f.name,ph:f.photo})+'<span class="rl"><b>'+esc(f.name)+'</b><small>'+(p.nSeen!=null?p.nSeen+'/'+p.nTotal+' titres MCU · '+(p.hSeen||0)+'/'+(p.hTotal||0)+' hors MCU':'pas encore commencé')+'</small></span><span class="wh-pct sm">'+(p.pct||0)+'<small>%</small></span></div></div>';
    h+='<div class="wbar"><i style="width:'+(p.pct||0)+'%"></i></div>';
    if(p.last||p.next)h+='<div class="set">'+(p.last?'<div class="row"><span class="rk">Dernier vu</span><span class="rl right">'+esc(p.last.t)+(p.last.at?' · '+fdate(p.last.at):'')+'</span></div>':'')+(p.next?'<div class="row"><span class="rk">Prochain</span><span class="rl right">'+esc(p.next)+'</span></div>':'')+'</div>';
    if(tpl){h+=tpl.groups.map(function(g){var vus=g.items.filter(function(it){return seen[it.t]!==undefined;});if(!vus.length)return '';
      return '<section class="sec"><h4 class="sec-h">'+esc(g.name)+'<span>'+vus.length+'/'+g.items.length+'</span></h4><div class="fseen">'+vus.map(function(it){return '<span>'+esc(it.t)+'</span>';}).join('')+'</div></section>';}).join('');}
    sheetRoot.innerHTML=edSheet(esc(f.name),h);
  }
  function openWatch(id){var x=find(id);if(!x)return;var t=x.t;sh={kind:'watch',id:id,text:t.t,rel:t.rel||'',dur:t.dur||'',imp:impOf(t),goal:!!t.goal,d:!!t.d,note:t.note||'',confirm:false};renderWatch();}
  function syncWatch(){var q=function(i){return sheetRoot.querySelector(i);};['text','rel','dur','note'].forEach(function(k){var e=q('#wt-'+k);if(e)sh[k]=e.value;});var g=q('#wt-goal');if(g)sh.goal=g.checked;var d=q('#wt-d');if(d)sh.d=d.checked;}
  function renderWatch(){
    var x=find(sh.id);if(!x){closeSheet();return;}var vh=(x.t.vh||[]).slice().reverse();
    sheetRoot.innerHTML=edSheet('Modifier le titre',
      '<textarea id="wt-text" class="ed-text" rows="2" aria-label="Titre">'+esc(sh.text)+'</textarea>'+
      '<div class="set"><label class="row" for="wt-rel"><span class="rk">Sortie</span><input type="'+(/^\d{4}$/.test(sh.rel)?'text':'date')+'" id="wt-rel" class="rowin right" value="'+esc(sh.rel)+'" placeholder="AAAA-MM-JJ"></label>'+
        '<label class="row" for="wt-dur"><span class="rk">Durée</span><input type="number" id="wt-dur" class="rowin right" inputmode="numeric" min="0" value="'+esc(sh.dur)+'" placeholder="minutes"><span class="unit">min</span></label></div>'+
      '<section class="sec"><h4 class="sec-h">Importance</h4><div class="chipscroll">'+[1,3].map(function(i){return '<button type="button" class="chipb tg" style="--c:var(--'+IMP[i].c+')" data-wimp="'+i+'" aria-pressed="'+(sh.imp===i)+'">'+IMP[i].n+'</button>';}).join('')+'</div></section>'+
      '<div class="set"><label class="row" for="wt-note"><span class="rk">Note</span><input type="text" id="wt-note" class="rowin right" value="'+esc(sh.note)+'" placeholder="où le voir, avec qui…"></label>'+
        '<label class="row" for="wt-d"><span class="rl">Vu</span><input type="checkbox" class="toggle" id="wt-d"'+(sh.d?' checked':'')+'></label>'+
        '<label class="row" for="wt-goal"><span class="rl">C’est l’objectif</span><input type="checkbox" class="toggle" id="wt-goal"'+(sh.goal?' checked':'')+'></label></div>'+
      (vh.length?'<details class="hist" open><summary>Vu '+vh.length+' fois</summary><ol>'+vh.map(function(d){return '<li><span class="hd">'+fdate(d)+'</span><span>Vu</span></li>';}).join('')+'</ol></details>':'')+
      '<div class="ed-foot"><button type="button" class="tbtn danger" data-w-del>'+(sh.confirm?'Confirmer ?':'Supprimer')+'</button><span class="spacer"></span><button type="button" class="btn" data-w-save>Enregistrer</button></div>');
  }
  function saveWatch(){
    syncWatch();var x=find(sh.id);if(!x){closeSheet();return;}var t=x.t,v=sh.text.trim();if(v)setText(t,v);
    if(sh.rel)t.rel=sh.rel;else delete t.rel;var du=parseInt(sh.dur,10);if(du>0)t.dur=du;else delete t.dur;t.imp=sh.imp;
    if(sh.note.trim())t.note=sh.note.trim();else delete t.note;
    if(sh.goal){x.s.groups.forEach(function(g){g.tasks.forEach(function(o){if(o!==t)delete o.goal;});});t.goal=true;}else delete t.goal;
    if(sh.d&&!t.d){t.d=true;t.at=dayKey();(t.vh=t.vh||[]).push(t.at);}else if(!sh.d&&t.d){t.d=false;delete t.at;}
    closeSheet();change();
  }
  function tplItem(it){var o={id:nid('t'),t:it.t,d:false,imp:it.imp||1};['rel','dur','fmt','cont','note','ph','lk','pre'].forEach(function(k){if(it[k])o[k]=it[k];});if(it.goal)o.goal=true;return o;}
  // Titres du modèle absents du suivi (comparés par titre) : pour compléter un suivi créé avec une ancienne version
  function tplMissing(s){var tpl=TEMPLATES.filter(function(t){return t.id===s.tpl||(!s.tpl&&(t.name===s.name||(t.aliases||[]).indexOf(s.name)>=0));})[0];if(!tpl)return [];
    var have={},where={};s.groups.forEach(function(g){g.tasks.forEach(function(t){have[t.t]=t;where[t.t]=g.name;});});
    var out=[];tpl.groups.forEach(function(g){g.items.forEach(function(it){var t=have[it.t];
      if(!t){out.push({g:g.name,side:!!g.side,it:it});return;}
      var lacks=['lk','pre','fmt','cont','dur'].some(function(k){return it[k]&&!t[k];})||(!!it.goal!==!!t.goal)||t.imp===2;
      if(it.cont&&it.imp===1&&t.imp===3)lacks=true;
      if(where[it.t]!==g.name||lacks)out.push({g:g.name,side:!!g.side,it:it,upd:t});});});
    var known={};tpl.groups.forEach(function(g){g.items.forEach(function(it){known[it.t]=1;});});
    s.groups.forEach(function(g){g.tasks.forEach(function(t){if(t.cont&&!t.d&&!known[t.t])out.push({rm:t});});});
    if((tpl.aliases||[]).indexOf(s.name)>=0)out.push({rename:true});
    return out;}
  // Crée un suivi (vide ou depuis un modèle) et l'ouvre
  function createWatch(tpl){
    var s={id:nid('c'),name:tpl?tpl.name:'Nouveau suivi',color:tpl?tpl.color:'contenu',type:'watch',tpl:tpl?tpl.id:'',owner:ME.uid,members:[ME.uid],memberInfo:{},
      groups:tpl?tpl.groups.map(function(g){var o={name:g.name,tasks:g.items.map(tplItem)};if(g.side)o.side=true;return o;}):[{name:'Titres',tasks:[]}]};
    S.sections.push(s);mode='todo';tab=s.id;try{localStorage.setItem('tab2',tab);localStorage.setItem('mode2','todo');}catch(_){}
    change();window.scrollTo(0,0);toast(tpl?'Suivi « '+tpl.name+' » créé':'Suivi créé');
    if(tpl)store.myProgress(tpl.id).then(function(pg){if(!pg||!pg.seen)return;var n=0;
      s.groups.forEach(function(g){g.tasks.forEach(function(t){if(pg.seen[t.t]!==undefined){t.d=true;t.at=pg.seen[t.t]||dayKey();t.vh=(pg.vh&&pg.vh[t.t])||[t.at];n++;}});});
      if(n){toast('Progression reprise : '+n+' titre'+(n>1?'s':'')+' déjà vu'+(n>1?'s':''));change();}});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-wshare],[data-wfriend],[data-wunfriend],[data-ws-invite],[data-wlink],[data-wopen],[data-wseen],[data-wf-imp],[data-wf-hide],[data-wf-grp],[data-wtime],[data-wcount],[data-wf-imph],[data-wf-lm],[data-wf-lh],[data-wfill],[data-wreset],[data-wimp],[data-w-save],[data-w-del],[data-m-watch]');if(!b)return;
    function A(n){return b.getAttribute('data-'+n);}function has(n){return b.hasAttribute('data-'+n);}
    if(has('wshare')){var ss=S.sections.filter(function(c){return c.id===A('wshare');})[0];if(ss)openWShare(ss);return;}
    if(has('wfriend')){openFriend(A('wfriend'));return;}
    if(has('wunfriend')){if(!b.dataset.c){b.dataset.c=1;b.textContent='Sûr ?';return;}store.removeFriend(A('wunfriend')).then(function(){toast('Retiré');});return;}
    if(has('ws-invite')){wsInvite();return;}
    if(has('wlink')){var lx=find(A('wlink'));if(!lx)return;var sd=!!lx.g.side||lx.g.tasks.every(function(t){return t.cont;});wf.grp=sd?'hors':'';wf.hide=false;wf.imp=0;saveWf();render();
      var el=document.getElementById('wr-'+lx.t.id);if(el){try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(_){el.scrollIntoView();}el.classList.add('flash');setTimeout(function(){el.classList.remove('flash');},1600);}return;}
    if(has('wopen')){openWatch(A('wopen'));return;}
    if(has('wseen')){var x=find(A('wseen'));if(x&&!x.t.d){x.t.d=true;x.t.at=dayKey();(x.t.vh=x.t.vh||[]).push(x.t.at);toast('Vu : '+x.t.t);change();}return;}
    if(has('wf-imp')){wf.imp=+A('wf-imp');saveWf();render();return;}
    if(has('wf-hide')){wf.hide=!wf.hide;saveWf();render();return;}
    if(has('wf-grp')){wf.grp=A('wf-grp');saveWf();render();return;}
    if(has('wf-imph')){wf.impH=+A('wf-imph');saveWf();render();return;}
    if(has('wtime')){wf.tm=wf.tm==='ess'?'all':'ess';saveWf();render();return;}
    if(has('wcount')){wf.tc=wf.tc==='ess'?'all':'ess';saveWf();render();return;}
    if(has('wf-lm')){wf.lm=!wf.lm;saveWf();render();return;}
    if(has('wf-lh')){wf.lh=!wf.lh;saveWf();render();return;}
    if(has('wfill')){var sc=S.sections.filter(function(c){return c.id===A('wfill');})[0];if(!sc)return;var mm=tplMissing(sc);
      // range chaque titre dans le groupe du modèle (phase / production) sans toucher à ce qui est déjà coché
      var tpl=TEMPLATES.filter(function(t){return t.id===sc.tpl||(!sc.tpl&&(t.name===sc.name||(t.aliases||[]).indexOf(sc.name)>=0));})[0],nAdd=0;
      var grp=function(name,side){var g=sc.groups.filter(function(x){return x.name===name;})[0];if(!g){g={name:name,tasks:[]};sc.groups.push(g);}if(side)g.side=true;return g;};
      if(tpl)tpl.groups.forEach(function(g){grp(g.name,g.side);});
      mm.forEach(function(o){
        if(o.rename)return;
        if(o.rm){sc.groups.forEach(function(x){var i=x.tasks.indexOf(o.rm);if(i>=0)x.tasks.splice(i,1);});return;}
        var g=grp(o.g,o.side);
        if(o.upd){['lk','pre','fmt','cont','ph','note','dur'].forEach(function(k){if(o.it[k]&&!o.upd[k])o.upd[k]=o.it[k];});if(o.it.goal)o.upd.goal=true;else delete o.upd.goal;if(o.upd.imp===2)o.upd.imp=1;if(o.it.cont&&o.it.imp===1&&o.upd.imp===3)o.upd.imp=1;
          sc.groups.forEach(function(x){var i=x.tasks.indexOf(o.upd);if(i>=0&&x!==g){x.tasks.splice(i,1);g.tasks.push(o.upd);}});return;}
        g.tasks.push(tplItem(o.it));nAdd++;});
      // ordre des groupes comme dans le modèle, groupes vidés retirés
      if(tpl&&(tpl.aliases||[]).indexOf(sc.name)>=0)sc.name=tpl.name;
      if(tpl){var order=tpl.groups.map(function(g){return g.name;});sc.groups=sc.groups.filter(function(g){return g.tasks.length||order.indexOf(g.name)>=0;}).sort(function(a,b){var ia=order.indexOf(a.name),ib=order.indexOf(b.name);return (ia<0?99:ia)-(ib<0?99:ib);});}
      toast(nAdd?nAdd+' titre'+(nAdd>1?'s':'')+' ajouté'+(nAdd>1?'s':''):'Suivi mis à jour');change();return;}
    if(has('wreset')){var id=A('wreset');if(wreset!==id){wreset=id;render();setTimeout(function(){if(wreset===id){wreset='';render();}},5000);return;}
      wreset='';var sec=S.sections.filter(function(c){return c.id===id;})[0];if(sec)sec.groups.forEach(function(g){g.tasks.forEach(function(t){if(t.d){t.d=false;delete t.at;}});});toast('Progression remise à zéro (l’historique est gardé)');change();return;}
    if(has('m-watch')){var key=A('m-watch'),tpl=TEMPLATES.filter(function(t){return t.id===key;})[0]||null;if(sh&&sh.kind==='manage'){syncManage();saveManage();}else if(sh)closeSheet();createWatch(tpl);return;}
    if(!sh||sh.kind!=='watch')return;
    if(has('wimp')){syncWatch();sh.imp=+A('wimp');renderWatch();return;}
    if(has('w-save')){saveWatch();return;}
    if(has('w-del')){if(!sh.confirm){syncWatch();sh.confirm=true;renderWatch();return;}var y=find(sh.id);if(y)y.g.tasks.splice(y.i,1);closeSheet();change();return;}
  });
  function viewSection(s,all){
    var si=S.sections.indexOf(s),L=all.filter(function(x){return x.s===s;}),open=L.filter(function(x){return !x.t.d;});
    var h='<div class="pagehead" style="--c:'+col(s)+'"><h2>'+(s.virtual?esc(s.name):'<input class="gname pname inl" type="text" value="'+esc(s.name)+'" data-ck="t" data-cs="'+si+'" enterkeyhint="done" autocomplete="off" aria-label="Renommer le projet '+esc(s.name)+'">')+'</h2><span class="sub">'+open.length+' à faire · '+(L.length-open.length)+' faites</span>'+shareBtn(s,'t')+'</div><section class="card notes">';
    s.groups.forEach(function(g,gi){
      var G=L.filter(function(x){return x.g===g&&!x.t.d;});
      if(s.virtual){h+=G.length?list(G,{}):'<p class="empty">Plus rien à faire ici.</p>';return;}
      h+='<div class="grp" data-drop="t:'+si+':'+gi+'">'+gHead('t',si,gi,g,'')+(G.length?list(G,{}):'')+qline('t',si,gi,0,'Ajouter une tâche…')+'</div>';
    });
    h+=doneBox(L.filter(function(x){return x.t.d;}),{})+'</section>';
    return h;
  }

  /* ---------- Achats ---------- */
  function price(v){var m=String(v||'').replace(/\s/g,'').replace(',','.').match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):0;}
  function eur(n){return n.toLocaleString('fr-BE',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+' €';}
  function host(u){try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}}
  function brow(x,o){
    var b=x.t,m='';
    if(o.cat)m+='<span class="proj">'+esc(x.s.name)+' › '+esc(x.g.name)+'</span>';
    if(b.link&&host(b.link))m+='<span>'+esc(host(b.link))+'</span>';
    if(b.note)m+='<span>'+esc(b.note)+'</span>';
    return '<li class="task'+(b.d?' done':'')+'" style="--k:'+col(x.s)+'"'+(x.s.virtual?'':' data-drag="b:'+b.id+'"')+'>'+
      '<input class="check" type="checkbox" id="bc-'+b.id+'" data-bid="'+b.id+'"'+(b.d?' checked':'')+' aria-label="Marquer comme acheté : '+esc(b.t)+'">'+
      '<button class="body" type="button" data-bopen="'+b.id+'"><span class="t">'+esc(b.t)+'</span>'+(m?'<span class="meta">'+m+'</span>':'')+'</button>'+
      (b.d?'':(function(){var tg=tagFor('buy',b)||{n:'Tag',c:'later'};return '<button type="button" class="tagbtn" style="color:var(--'+tg.c+')" data-bcycle="'+b.id+'" aria-label="Tag : '+esc(tg.n)+' (toucher pour changer)">'+esc(tg.n)+'</button>';})())+
      '<button type="button" class="pricetag'+(b.price?'':' empty')+'" data-bopen="'+b.id+'" aria-label="Prix">'+(b.price?esc(b.price):'+ €')+'</button></li>';
  }
  function byLvl(a,b){return (rankT('buy',a.t)-rankT('buy',b.t))||(a.si-b.si)||(a.gi-b.gi);}
  // Totaux par degré (Vite / Envie / Un jour), couleur du tag
  function lvlTotals(L){
    return '<span class="ltot">'+tagList('buy').map(function(tg){var s=L.filter(function(x){return !foreign(x.t)&&x.t.lvl===tg.id;}).reduce(function(a,x){return a+price(x.t.price);},0);
      return '<span class="lt'+(s?'':' zero')+'" style="color:var(--'+tg.c+')" title="'+esc(tg.n)+'">'+eur(s)+'</span>';}).join('')+'</span>';
  }
  function bGroups(sec,open){
    var si=S.buy.indexOf(sec),h='';
    sec.groups.forEach(function(g,gi){
      var G=open.filter(function(x){return x.g===g;}),st=G.reduce(function(a,x){return a+price(x.t.price);},0);
      if(sec.virtual){h+=G.length?'<ul>'+G.map(function(x){return brow(x,{});}).join('')+'</ul>':'<p class="empty">Rien ici.</p>';return;}
      h+='<div class="grp" data-drop="b:'+si+':'+gi+'">'+gHead('b',si,gi,g,'<span class="gsum">'+eur(st)+'</span>')+(G.length?'<ul>'+G.map(function(x){return brow(x,{});}).join('')+'</ul>':'')+qline('b',si,gi,0,'Ajouter… (ex. Déodorant 7,50€)')+'</div>';
    });
    return h;
  }
  function viewBuys(B){
    var sec=btab==='all'?null:S.buy.filter(function(s){return s.id===btab;})[0];
    var L0=sec?B.filter(function(x){return x.s===sec;}):B, open=L0.filter(function(x){return !x.t.d;});
    var tot=open.reduce(function(a,x){return a+price(x.t.price);},0);
    var h='<div class="pagehead"'+(sec?' style="--c:'+col(sec)+'"':'')+'><div><div class="eyebrow">Liste d’envies</div><h2>'+(sec&&!sec.virtual?'<input class="gname pname inl" type="text" value="'+esc(sec.name)+'" data-ck="b" data-cs="'+S.buy.indexOf(sec)+'" enterkeyhint="done" autocomplete="off" aria-label="Renommer la catégorie '+esc(sec.name)+'">':sec?esc(sec.name):'Wishlist')+'</h2></div><span class="sub">'+open.length+' à acheter</span>'+shareBtn(sec,'b')+'</div>'+(sec?'<div class="ltrow">'+lvlTotals(open)+'</div>':'');
    if(sec){
      var si=S.buy.indexOf(sec);
      h+='<section class="card notes">'+bGroups(sec,open);
      h+=doneBox(L0.filter(function(x){return x.t.d;}),{},'Achetés',brow)+'</section>';
      return h;
    }
    // Tout : chaque catégorie avec ses sous-catégories, totaux, ajout et renommage sur place (rien ne redirige)
    S.buy.forEach(function(c){
      var ci=S.buy.indexOf(c),ct=open.filter(function(x){return x.s===c;}).reduce(function(a,x){return a+price(x.t.price);},0);
      h+='<section class="card notes" style="--c:'+col(c)+'"><div class="card-h chead"><span class="cdot"></span>'+(c.virtual?'<span class="gname cname">'+esc(c.name)+'</span>':'<input class="gname cname inl" type="text" value="'+esc(c.name)+'" data-ck="b" data-cs="'+ci+'" enterkeyhint="done" autocomplete="off" aria-label="Renommer la catégorie '+esc(c.name)+'">')+shareBtn(c,'b')+'</div><div class="ltrow inl-tot">'+lvlTotals(open.filter(function(x){return x.s===c;}))+'</div>'+bGroups(c,open)+'</section>';
    });
    var dn=L0.filter(function(x){return x.t.d;});
    if(dn.length)h+='<section class="card">'+doneBox(dn,{cat:true},'Achetés',brow)+'</section>';
    return h;
  }
  // Ajout façon « notes » : on tape, Entrée, et on continue sur la ligne suivante. Un prix en fin de ligne (« 7,50€ ») est reconnu.
  function quickAdd(inp,soft){
    var v=inp.value.trim();if(!v)return;inp.value='';
    var kind=inp.getAttribute('data-qk'),si=+inp.getAttribute('data-qs'),gi=+inp.getAttribute('data-qg'),l=+inp.getAttribute('data-ql')||0,id=inp.id;
    if(kind==='b'){
      var m=v.match(/^(.*?)[\s:,-]*(\d+(?:[.,]\d{1,2})?)\s*(€|eur(?:os?)?)\s*$/i),it={id:nid('b'),d:false,lvl:l||defTag('buy')};mark(it);
      if(m&&m[1].trim()){it.t=m[1].trim();it.price=m[2].replace('.',',')+' €';}else it.t=v;
      S.buy[si].groups[gi].tasks.push(it);
    }else if(kind==='w'){
      // « Thor 2011 » ou « Thor (2011) » : l'année devient la date de sortie
      var my=v.match(/^(.*?)[\s(,-]*((?:19|20)\d{2})\)?\s*$/),wt={id:nid('t'),d:false,imp:1};
      if(my&&my[1].trim()){wt.t=my[1].trim();wt.rel=my[2];}else wt.t=v;
      S.sections[si].groups[gi].tasks.push(wt);
    }else S.sections[si].groups[gi].tasks.push({id:nid('t'),t:v,d:false,p:defTag('todo'),tu:ME.uid,tn:ME.name});
    if(soft){save();setTimeout(function(){var ae=document.activeElement;if(!sh&&!(ae&&ae.classList&&ae.classList.contains('qadd')))render();},300);return;}
    prune();render();var n=document.getElementById(id);if(n)n.focus();save();
  }

  function keepChip(k,attr,cur){var x=sh.id&&find(sh.id,k==='buy'?S.buy:S.sections);if(!x||!foreign(x.t))return '';var g=tagFor(k,x.t);
    return '<button type="button" class="chipb tg" style="--c:var(--'+g.c+')" data-'+attr+'="keep" aria-pressed="'+(cur==='keep')+'">'+esc(g.n)+'</button>';}
  /* ---------- Feuilles : champs Catégorie + Sous-catégorie partagés ---------- */
  // Liste + groupe : lignes avec menus natifs (faciles au doigt)
  function catFields(secs,lblCat,lblGrp){
    var sec=secs[sh.si];if(sh.gi>=sec.groups.length)sh.gi=sec.groups.length?0:-1;
    return '<label class="row selrow"><span class="rk">'+lblCat+'</span><span class="cdot" style="--c:'+col(sec)+'"></span><select id="sh-sec" aria-label="'+lblCat+'">'+secs.map(function(s,i){return s.virtual?'':'<option value="'+i+'"'+(i===sh.si?' selected':'')+'>'+esc(s.name)+'</option>';}).join('')+'</select>'+CHEV+'</label>'+
      '<label class="row selrow"><span class="rk">'+lblGrp+'</span><select id="sh-grp" aria-label="'+lblGrp+'">'+sec.groups.map(function(g,i){return '<option value="'+i+'"'+(i===sh.gi?' selected':'')+'>'+esc(g.name)+'</option>';}).join('')+'<option value="__new"'+(sh.gi<0?' selected':'')+'>+ Nouveau…</option></select>'+CHEV+'</label>'+
      (sh.gi<0?'<div class="row"><input type="text" id="sh-newg" class="rowin" placeholder="Nom du nouveau groupe" value="'+esc(sh.newg)+'"></div>':'');
  }
  function targetGroup(secs){
    var sec=secs[sh.si];
    if(sh.gi<0){var nm=sh.newg.trim()||'Divers';var g=sec.groups.filter(function(x){return x.name===nm;})[0];if(!g){g={name:nm,tasks:[]};sec.groups.push(g);}return g;}
    return sec.groups[sh.gi];
  }
  function syncCommon(){var q=function(s){return sheetRoot.querySelector(s);};
    var t=q('#sh-text');if(t)sh.text=t.value;var g=q('#sh-grp');if(g)sh.gi=g.value==='__new'?-1:+g.value;var n=q('#sh-newg');if(n)sh.newg=n.value;}
  function actions(){return '<div class="ed-foot">'+(sh.mode==='edit'?'<button type="button" class="tbtn danger" data-sh-del>'+(sh.confirm?'Confirmer ?':'Supprimer')+'</button><button type="button" class="tbtn" data-share-task="'+esc(sh.id)+'">'+PEOPLE+' Partager</button>':'')+
      '<span class="spacer"></span><button type="button" class="btn" data-sh-save>'+(sh.mode==='add'?'Ajouter':'Enregistrer')+'</button></div>';}
  function edSheet(title,inner){return '<div class="backdrop" data-close></div><div class="sheet ed" role="dialog" aria-modal="true" aria-labelledby="sh-title"><div class="grab"></div>'+
    '<div class="pf-top"><h3 id="sh-title">'+title+'</h3><button type="button" class="xbtn" data-close aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+inner+'</div>';}
  function tagChips(k,attr,cur){return '<div class="chipscroll">'+keepChip(k,attr,cur)+tagList(k).map(function(tg){return '<button type="button" class="chipb tg" style="--c:var(--'+tg.c+')" data-'+attr+'="'+tg.id+'" aria-pressed="'+(cur===tg.id)+'">'+esc(tg.n)+'</button>';}).join('')+'</div>';}
  function wrap(title,inner){return '<div class="backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-title"><div class="grab"></div><h3 id="sh-title">'+title+'</h3>'+inner+'</div>';}
  function closeSheet(){sh=null;sheetRoot.innerHTML='';var f=app.querySelector('.fab');if(f)f.focus();flush();}
  function rerender(){if(sh.kind==='wshare')renderWShare();else if(sh.kind==='friend')renderFriend();else if(sh.kind==='watch')renderWatch();else if(sh.kind==='share')renderShare();else if(sh.kind==='bell')renderBell();else if(sh.kind==='account')renderAccount();else if(sh.kind==='task')renderTask();else if(sh.kind==='buy')renderBuy();else if(sh.kind==='rep')renderRep();else renderManage();}
  function sync(){if(!sh)return;if(['rep','share','bell','account','watch','wshare','friend'].indexOf(sh.kind)>=0)return;if(sh.kind==='manage')syncManage();else{syncCommon();if(sh.kind==='task'){var d=sheetRoot.querySelector('#sh-date');if(d)sh.due=d.value;var f=sheetRoot.querySelector('#sh-focus');if(f)sh.focus=f.checked;}
    else ['price','link','note'].forEach(function(k){var el=sheetRoot.querySelector('#bs-'+k);if(el)sh[k]=el.value;});}}

  /* Tâche */
  function openTask(id){
    var today=dayKey();
    if(id){var x=find(id);if(!x)return;sh={kind:'task',mode:'edit',id:id,text:x.t.t,si:x.si,gi:x.gi,p:foreign(x.t)?'keep':x.t.p,due:x.t.due||'',focus:S.focus.indexOf(id)>=0,newg:'',confirm:false};}
    else sh={kind:'task',mode:'add',text:'',si:Math.max(0,S.sections.map(function(s){return s.virtual?'':s.id;}).indexOf(tab)),gi:0,p:defTag('todo'),due:tab==='today'?today:'',focus:false,newg:'',confirm:false};
    renderTask(true);
  }
  function renderTask(first){
    var today=dayKey(),tom=shift(today,1),other=sh.due&&sh.due!==today&&sh.due!==tom;
    sheetRoot.innerHTML=edSheet(sh.mode==='add'?'Nouvelle tâche':'Modifier la tâche',
      '<textarea id="sh-text" class="ed-text" rows="2" placeholder="Que faut-il faire ?" aria-label="Tâche">'+esc(sh.text)+'</textarea>'+
      (S.sections[sh.si]&&S.sections[sh.si].virtual?'':'<div class="set">'+catFields(S.sections,'Liste','Groupe')+'</div>')+
      '<section class="sec"><h4 class="sec-h">Tag</h4>'+tagChips('todo','sh-p',sh.p)+'</section>'+
      '<section class="sec"><h4 class="sec-h">Échéance</h4><div class="chipscroll">'+
        '<button type="button" class="chipb" data-sh-due="" aria-pressed="'+(!sh.due)+'">Aucune</button>'+
        '<button type="button" class="chipb" data-sh-due="'+today+'" aria-pressed="'+(sh.due===today)+'">Aujourd’hui</button>'+
        '<button type="button" class="chipb" data-sh-due="'+tom+'" aria-pressed="'+(sh.due===tom)+'">Demain</button>'+
        '<label class="chipb datechip" aria-pressed="'+!!other+'">'+(other?fdate(sh.due):'Autre date…')+'<input type="date" id="sh-date" value="'+esc(sh.due)+'" aria-label="Choisir une date"></label></div></section>'+
      '<div class="set"><label class="row" for="sh-focus"><span class="rl">★ Focus du jour</span><input type="checkbox" class="toggle" id="sh-focus"'+(sh.focus?' checked':'')+'></label></div>'+
      (sh.mode==='edit'?histHtml(find(sh.id).t):'')+actions());
    if(first&&sh.mode==='add'){var t=sheetRoot.querySelector('#sh-text');if(t)t.focus();}
  }
  function histHtml(t){
    var ev=[];(t.hist||[]).forEach(function(h){ev.push({on:h.on,h:'Ancienne version : « '+esc(h.t)+' »'});});
    (t.rep||[]).forEach(function(r){var h=isRep(r)?'Reportée '+(r.to?'au '+fdate(r.to):'sans date'):'Mise à jour';if(r.why)h+=' — '+esc(r.why);if(!isRep(r)&&!r.why)return;ev.push({on:r.on,h:h});});
    if(t.d&&t.at)ev.push({on:t.at,h:'Faite'});
    if(!ev.length)return '';
    ev.sort(function(a,b){return a.on<b.on?1:a.on>b.on?-1:0;});
    return '<details class="hist"'+(ev.length<4?' open':'')+'><summary>Historique ('+ev.length+')</summary><ol>'+ev.map(function(e){return '<li><span class="hd">'+fdate(e.on)+'</span><span>'+e.h+'</span></li>';}).join('')+'</ol></details>';
  }
  // Reporter : nouvelle date (ou « plus tard » sans date, en Pas pressé), sort du focus, garde une trace (date + raison).
  // Mise à jour d'une tâche (bouton ✎) : reformuler, noter, reporter (avec ou sans date). Chaque enregistrement laisse une trace dans le journal.
  function isRep(r){return r.k?r.k==='rep':true;}
  function openRep(id){var x=find(id);if(!x)return;sh={kind:'rep',id:id,text:x.t.t,why:'',when:'',date:'',p:foreign(x.t)?'keep':x.t.p};renderRep(true);}
  // Fiche ✎ : reformuler, changer le tag, noter où on en est, reporter
  function renderRep(first){
    var t=find(sh.id).t;
    function ch(v,l){return '<button type="button" class="chipb" data-rp="'+v+'" aria-pressed="'+(sh.when===v)+'">'+l+'</button>';}
    sheetRoot.innerHTML=edSheet('Mettre à jour',
      '<textarea id="rp-text" class="ed-text" rows="2" aria-label="Tâche">'+esc(sh.text)+'</textarea>'+
      '<section class="sec"><h4 class="sec-h">Tag</h4>'+tagChips('todo','rp-p',sh.p)+'</section>'+
      '<div class="set"><label class="row" for="rp-why"><span class="rk">Note</span><input type="text" id="rp-why" class="rowin right" value="'+esc(sh.why)+'" placeholder="où j’en suis…"></label></div>'+
      '<section class="sec"><h4 class="sec-h">Reporter</h4><div class="chipscroll">'+ch('','Non')+ch('nodate','Sans date')+ch('1','Demain')+ch('3','Dans 3 jours')+ch('mon','Lundi prochain')+
        '<label class="chipb datechip" aria-pressed="'+(sh.when==='date')+'">'+(sh.when==='date'&&sh.date?fdate(sh.date):'Autre date…')+'<input type="date" id="rp-date" value="'+esc(sh.when==='date'?sh.date:'')+'" aria-label="Choisir une date"></label></div></section>'+
      histHtml(t)+
      '<div class="ed-foot"><button type="button" class="tbtn" data-rp-full>Tout modifier</button><span class="spacer"></span><button type="button" class="btn" data-rp-save>Enregistrer</button></div>');
  }
  function syncRep(){var q=function(id){var e=sheetRoot.querySelector(id);return e?e.value:'';};sh.text=q('#rp-text');sh.why=q('#rp-why');var d=q('#rp-date');if(d){sh.date=d;sh.when='date';}}
  function saveRep(){
    syncRep();var x=find(sh.id);if(!x){closeSheet();return;}var t=x.t,today=dayKey(),before=t.t,why=sh.why.trim(),to='',w=sh.when;
    setText(t,sh.text);
    if(w==='nodate'){delete t.due;}
    else if(w==='mon'){var d=new Date(today+'T12:00');to=shift(today,((8-d.getDay())%7)||7);}
    else if(w==='1'||w==='3')to=shift(today,+w);
    else if(w==='date'&&sh.date)to=sh.date;
    if(to)t.due=to;
    if(w){var fi=S.focus.indexOf(t.id);if(fi>=0)S.focus.splice(fi,1);}
    if(sh.p!=='keep'&&(sh.p!==t.p||foreign(t))){t.p=sh.p;mark(t);}
    if(w||why||t.t!==before)(t.rep=t.rep||[]).push({on:today,k:w?'rep':'note',to:to,why:why});
    closeSheet();change();
  }
  function saveTask(){
    sync();var text=sh.text.trim();if(!text)return nudge('Écris la tâche avant d’enregistrer');
    var grp=targetGroup(S.sections),sec=S.sections[sh.si],t;
    if(sh.mode==='edit'){var x=find(sh.id);if(!x){closeSheet();return;}t=x.t;if(x.g!==grp){x.g.tasks.splice(x.i,1);grp.tasks.push(t);}}
    else{t={id:nid('t'),d:false};grp.tasks.push(t);}
    if(sh.mode==='edit')setText(t,text);else t.t=text;if(sh.p!=='keep'&&(sh.mode==='add'||sh.p!==t.p||foreign(t))){t.p=sh.p;mark(t);}if(sh.due)t.due=sh.due;else delete t.due;
    var fi=S.focus.indexOf(t.id);if(sh.focus&&fi<0)S.focus.push(t.id);if(!sh.focus&&fi>=0)S.focus.splice(fi,1);
    if(sh.mode==='add'&&tab!=='today'&&tab!=='all')tab=sec.id;
    closeSheet();change();
  }
  /* Achat */
  function openBuy(id){
    if(id){var x=find(id,S.buy);if(!x)return;var b=x.t;sh={kind:'buy',mode:'edit',id:id,text:b.t,si:x.si,gi:x.gi,newg:'',lvl:foreign(b)?'keep':b.lvl,price:b.price||'',link:b.link||'',note:b.note||'',confirm:false};}
    else sh={kind:'buy',mode:'add',text:'',si:Math.max(0,S.buy.map(function(s){return s.virtual?'':s.id;}).indexOf(btab)),gi:0,newg:'',lvl:2,price:'',link:'',note:'',confirm:false};
    renderBuy(true);
  }
  function renderBuy(first){
    var lk=/^https?:\/\//i.test(sh.link.trim())?sh.link.trim():'';
    sheetRoot.innerHTML=edSheet(sh.mode==='add'?'Nouvel article':'Modifier l’article',
      '<textarea id="sh-text" class="ed-text" rows="2" placeholder="Qu’est-ce que tu veux acheter ?" aria-label="Article">'+esc(sh.text)+'</textarea>'+
      '<div class="set"><label class="row" for="bs-price"><span class="rk">Prix</span><input type="text" id="bs-price" class="rowin right" inputmode="decimal" placeholder="0" value="'+esc(sh.price.replace(/\s*€\s*$/,''))+'"><span class="unit">€</span></label>'+
        (S.buy[sh.si]&&S.buy[sh.si].virtual?'':catFields(S.buy,'Liste','Groupe'))+'</div>'+
      '<section class="sec"><h4 class="sec-h">Tag</h4>'+tagChips('buy','bs-lvl',sh.lvl)+'</section>'+
      '<div class="set"><label class="row" for="bs-note"><span class="rk">Note</span><input type="text" id="bs-note" class="rowin right" placeholder="taille, couleur…" value="'+esc(sh.note)+'"></label>'+
        '<label class="row" for="bs-link"><span class="rk">Lien</span><input type="text" id="bs-link" class="rowin right" inputmode="url" placeholder="https://…" value="'+esc(sh.link)+'">'+
        '<a class="extb" id="bs-ext" href="'+esc(lk||'#')+'" target="_blank" rel="noopener" aria-label="Ouvrir le lien"'+(lk?'':' hidden')+'>↗</a></label></div>'+actions());
    if(first&&sh.mode==='add'){var t=sheetRoot.querySelector('#sh-text');if(t)t.focus();}
  }
  function saveBuy(){
    sync();var text=sh.text.trim();if(!text)return nudge('Écris l’achat avant d’enregistrer');
    var grp=targetGroup(S.buy),sec=S.buy[sh.si],b;
    if(sh.mode==='edit'){var x=find(sh.id,S.buy);if(!x){closeSheet();return;}b=x.t;if(x.g!==grp){x.g.tasks.splice(x.i,1);grp.tasks.push(b);}}
    else{b={id:nid('b'),d:false};grp.tasks.push(b);}
    b.t=text;if(sh.lvl!=='keep'&&(sh.mode==='add'||sh.lvl!==b.lvl||foreign(b))){b.lvl=sh.lvl;mark(b);}['price','link','note'].forEach(function(k){var v=sh[k].trim();if(k==='price'&&v&&!/€/.test(v))v=v+' €';if(v)b[k]=v;else delete b[k];});
    if(sh.mode==='add'&&btab!=='all')btab=sec.id;
    closeSheet();change();
  }
  function startEdit(id){
    var x=find(id),li=app.querySelector('[data-edit="'+id+'"]');if(!x||!li)return;li=li.closest('.task');var body=li.querySelector('.body');
    var ta=document.createElement('textarea');ta.className='inl';ta.value=x.t.t;ta.rows=Math.min(4,Math.ceil(x.t.t.length/34)||1);ta.setAttribute('aria-label','Modifier le texte');
    body.replaceWith(ta);ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);var done=false;
    function fin(ok){if(done)return;done=true;if(ok){var before=x.t.t;setText(x.t,ta.value);if(x.t.t!==before){change();return;}}render();}
    ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fin(true);}else if(e.key==='Escape'){e.preventDefault();fin(false);}});
    ta.addEventListener('blur',function(){setTimeout(function(){fin(true);},0);});
  }
  // Toucher une catégorie ou sous-catégorie place le curseur sur sa ligne d'ajout
  function focusLine(id){var el=document.getElementById(id);if(!el)return;el.focus();try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){el.scrollIntoView();}}
  function nudge(msg){var t=sheetRoot.querySelector('#sh-text');if(t){t.placeholder=msg;t.focus();}}

  /* ---------- Gérer les catégories (todo ou achats) ---------- */
  // focusId : catégorie à montrer (ouverture depuis l'appui long sur son onglet)
  function openManage(focusId){
    var src=(mode==='buy'?S.buy:S.sections).filter(function(s){return !s.virtual;});
    sh={kind:'manage',target:mode,draft:src.map(function(s){return {src:s,name:s.name,color:ckey(s),groups:s.groups.map(function(g){return {src:g,name:g.name};})};})};
    var i=focusId?src.map(function(s){return s.id;}).indexOf(focusId):-1;
    sh.only=i>=0?i:null;
    renderManage(true);
  }
  function cnt(d){return d.src?d.src.tasks?d.src.tasks.length:d.src.groups.reduce(function(a,g){return a+g.tasks.length;},0):0;}
  function delBtn(path,d){var n=cnt(d);return '<button type="button" class="mini danger" data-m-del="'+path+'" aria-label="Supprimer">'+(d.confirm?'Supprimer '+(n?'+ '+n+' élément'+(n>1?'s':''):'')+' ?':'×')+'</button>';}
  function renderManage(first){
    var isBuy=sh.target==='buy',D=sh.draft;
    var one=sh.only!=null&&D[sh.only];
    var h=(one?'':'<p class="hint flush">'+(isBuy?'Catégories et sous-catégories de ta wishlist.':'Projets et groupes de ta todo.')+' Renomme directement dans les champs, change la couleur avec la pastille, réordonne avec ↑ ↓.</p>')+'<div class="mgr">';
    D.forEach(function(s,i){
      if(one&&i!==sh.only)return;
      h+='<div class="mg-sec'+(one?' one':'')+'" style="--c:var(--'+s.color+')"><div class="mg-row">'+
        '<button type="button" class="swatch" data-m-color="'+i+'" aria-label="Changer la couleur"></button>'+
        '<input type="text" class="mg-name strong" id="m-s-'+i+'" value="'+esc(s.name)+'" aria-label="Nom">'+
        '<button type="button" class="mini" data-m-up="s-'+i+'" aria-label="Monter"'+(i?'':' disabled')+'>↑</button>'+
        '<button type="button" class="mini" data-m-down="s-'+i+'" aria-label="Descendre"'+(i<D.length-1?'':' disabled')+'>↓</button>'+
        (D.length>1?delBtn('s-'+i,s):'')+'</div><div class="mg-groups">';
      s.groups.forEach(function(g,j){
        h+='<div class="mg-row sub"><input type="text" class="mg-name" id="m-g-'+i+'-'+j+'" value="'+esc(g.name)+'" aria-label="Nom du sous-groupe">'+
          '<button type="button" class="mini" data-m-up="g-'+i+'-'+j+'" aria-label="Monter"'+(j?'':' disabled')+'>↑</button>'+
          '<button type="button" class="mini" data-m-down="g-'+i+'-'+j+'" aria-label="Descendre"'+(j<s.groups.length-1?'':' disabled')+'>↓</button>'+delBtn('g-'+i+'-'+j,g)+'</div>';
      });
      h+='<button type="button" class="addline" data-m-addg="'+i+'">+ '+(isBuy?'Sous-catégorie':'Groupe')+'</button></div></div>';
    });
    h+='</div>'+(one?'':'<button type="button" class="btn ghost" data-m-adds>+ '+(isBuy?'Nouvelle catégorie':'Nouveau projet')+'</button>'+
      (isBuy||!prefs().tools.watch?'':'<div class="set">'+watchButtons()+'</div>'))+
      '<div class="ed-foot"><button type="button" class="tbtn" data-close>Annuler</button><span class="spacer"></span><button type="button" class="btn" data-m-save>Enregistrer</button></div>';
    sheetRoot.innerHTML=edSheet(one?'Modifier « '+esc(one.name||'Sans nom')+' »':isBuy?'Catégories de la wishlist':'Projets et groupes',h);
    if(first){var b=sheetRoot.querySelector('.sheet');if(b)b.focus&&b.focus();}
  }
  function syncManage(){sh.draft.forEach(function(s,i){var e=sheetRoot.querySelector('#m-s-'+i);if(e)s.name=e.value;s.groups.forEach(function(g,j){var f=sheetRoot.querySelector('#m-g-'+i+'-'+j);if(f)g.name=f.value;});});}
  function mref(path){var p=path.split('-');var s=sh.draft[+p[1]];return p[0]==='s'?{arr:sh.draft,i:+p[1],item:s}:{arr:s.groups,i:+p[2],item:s.groups[+p[2]]};}
  function saveManage(){
    syncManage();var isBuy=sh.target==='buy';
    var out=sh.draft.map(function(d,i){
      var s=d.src||{id:nid('c'),groups:[],owner:ME.uid,members:[ME.uid],memberInfo:{}};
      s.name=d.name.trim()||'Sans nom';s.color=d.color;
      s.groups=d.groups.map(function(g){var o=g.src||{tasks:[]};o.name=g.name.trim()||'Divers';return o;});
      return s;});
    var virt=(isBuy?S.buy:S.sections).filter(function(s){return s.virtual;});out=out.concat(virt);
    if(isBuy)S.buy=out;else S.sections=out;
    closeSheet();change();
  }

  /* ---------- Événements ---------- */
  document.addEventListener('change',function(e){
    var id=e.target.getAttribute&&e.target.getAttribute('data-id');
    if(id){var x=find(id);if(!x)return;x.t.d=e.target.checked;if(x.t.d){x.t.at=dayKey();if(isWatch(x.s))(x.t.vh=x.t.vh||[]).push(x.t.at);}else delete x.t.at;change();return;}
    var bid=e.target.getAttribute&&e.target.getAttribute('data-bid');
    if(bid){var y=find(bid,S.buy);if(!y)return;y.t.d=e.target.checked;if(y.t.d)y.t.at=dayKey();else delete y.t.at;change();return;}
    if(sh&&(sh.kind==='task'||sh.kind==='buy')&&e.target.id==='sh-sec'){sync();sh.si=+e.target.value;sh.gi=0;rerender();return;}
    if(sh&&sh.kind!=='manage'&&e.target.id==='sh-grp'){sync();rerender();var n=sheetRoot.querySelector('#sh-newg');if(n)n.focus();}
    if(sh&&sh.kind==='task'&&e.target.id==='sh-date'){sync();rerender();}
    if(sh&&sh.kind==='rep'&&e.target.id==='rp-date'){syncRep();if(!sh.date)sh.when='';renderRep();}
  });
  document.addEventListener('input',function(e){
    if(sh&&sh.kind==='buy'&&e.target.id==='bs-link'){var a=sheetRoot.querySelector('#bs-ext'),v=e.target.value.trim(),ok=/^https?:\/\//i.test(v);if(a){a.hidden=!ok;if(ok)a.href=v;}}
  });
  var SEL='[data-mode],[data-tab],[data-btab],[data-open],[data-bopen],[data-add],[data-sug],[data-manage],[data-close],[data-sh-sec],[data-sh-p],[data-sh-due],[data-bs-lvl],[data-sh-save],[data-sh-del],[data-snooze],[data-bcycle],[data-rep],[data-edit],[data-qfocus],[data-qgo],[data-rp],[data-rp-save],[data-rp-p],[data-rp-full],[data-m-color],[data-m-up],[data-m-down],[data-m-del],[data-m-addg],[data-m-adds],[data-m-save]';
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest(SEL);if(!b)return;
    function A(n){return b.getAttribute('data-'+n);}
    function has(n){return b.hasAttribute('data-'+n);}
    if(has('mode')){mode=A('mode');try{localStorage.setItem('mode2',mode);}catch(_){}render();window.scrollTo(0,0);return;}
    if(has('tab')){tab=A('tab');try{localStorage.setItem('tab2',tab);}catch(_){}render();window.scrollTo(0,0);return;}
    if(has('btab')){btab=A('btab');try{localStorage.setItem('btab',btab);}catch(_){}render();window.scrollTo(0,0);return;}
    if(has('rep')){openRep(A('rep'));return;}
    if(has('edit')){startEdit(A('edit'));return;}
    if(has('qfocus')){focusLine(A('qfocus'));return;}
    if(has('qgo')){var qg=A('qgo').split(':');var c=S.buy[+qg[0]];if(!c)return;btab=c.id;try{localStorage.setItem('btab',btab);}catch(_){}render();focusLine('qa-b-'+qg[0]+'-'+qg[1]);return;}
    if(has('bcycle')){var z=find(A('bcycle'),S.buy);if(z){var TL=tagList('buy');if(TL.length){z.t.lvl=foreign(z.t)?TL[0].id:TL[(rank('buy',z.t.lvl)+1)%TL.length].id;if(z.t.lvl===undefined)z.t.lvl=TL[0].id;mark(z.t);}change();}return;}
    if(has('open')){openTask(A('open'));return;}
    if(has('bopen')){openBuy(A('bopen'));if(b.classList.contains('pricetag')){var pr=sheetRoot.querySelector('#bs-price');if(pr)pr.focus();}return;}
    if(has('add')){if(mode==='buy')openBuy(null);else openTask(null);return;}
    if(has('manage')){openManage();return;}
    if(has('sug')){S.focus=A('sug').split(',');change();return;}
    if(!sh)return;
    if(has('close')){closeSheet();return;}
    if(sh.kind==='rep'){if(has('rp-p')){syncRep();sh.p=A('rp-p')==='keep'?'keep':+A('rp-p');renderRep();return;}if(has('rp-full')){var rid=sh.id;closeSheet();openTask(rid);return;}if(has('rp')){syncRep();sh.when=A('rp');if(sh.when!=='date')sh.date='';renderRep();}else if(has('rp-save'))saveRep();return;}
    if(sh.kind==='manage'){
      syncManage();
      if(has('m-color')){var d=sh.draft[+A('m-color')];d.color=PAL[(PAL.indexOf(d.color)+1)%PAL.length];}
      else if(has('m-up')||has('m-down')){var r=mref(A('m-up')||A('m-down')),k=r.i+(has('m-up')?-1:1);if(k>=0&&k<r.arr.length){var tmp=r.arr[k];r.arr[k]=r.arr[r.i];r.arr[r.i]=tmp;}}
      else if(has('m-del')){var q=mref(A('m-del'));if(!cnt(q.item)||q.item.confirm){q.arr.splice(q.i,1);if(sh.only!=null&&A('m-del').charAt(0)==='s'){sh.only=null;saveManage();return;}}else q.item.confirm=true;}
      else if(has('m-addg')){sh.draft[+A('m-addg')].groups.push({src:null,name:''});renderManage();var gs=sheetRoot.querySelectorAll('#m-g-'+A('m-addg')+'-'+(sh.draft[+A('m-addg')].groups.length-1));if(gs[0])gs[0].focus();return;}
      else if(has('m-adds')){sh.draft.push({src:null,name:'',color:PAL[sh.draft.length%PAL.length],groups:[{src:null,name:'Divers'}]});renderManage();var ns=sheetRoot.querySelector('#m-s-'+(sh.draft.length-1));if(ns)ns.focus();return;}
      else if(has('m-save')){saveManage();return;}
      renderManage();return;
    }
    if(has('snooze')){snooze(A('snooze'));return;}
    if(has('sh-sec')){sync();var ns2=+A('sh-sec');if(ns2!==sh.si){sh.si=ns2;sh.gi=0;}rerender();return;}
    if(has('sh-p')){sync();sh.p=A('sh-p')==='keep'?'keep':+A('sh-p');rerender();return;}
    if(has('sh-due')){sync();sh.due=A('sh-due');rerender();return;}
    if(has('bs-lvl')){sync();sh.lvl=A('bs-lvl')==='keep'?'keep':+A('bs-lvl');rerender();return;}
    if(has('sh-save')){if(sh.kind==='buy')saveBuy();else saveTask();return;}
    if(has('sh-del')){if(!sh.confirm){sync();sh.confirm=true;rerender();return;}
      var secs=sh.kind==='buy'?S.buy:S.sections,x=find(sh.id,secs);
      if(x){x.g.tasks.splice(x.i,1);var j=S.focus.indexOf(sh.id);if(j>=0)S.focus.splice(j,1);}closeSheet();change();return;}
  });
  document.addEventListener('keydown',function(e){
    if(sh&&sh.kind==='rep'&&e.key==='Enter'&&!e.shiftKey&&(e.target.id==='rp-why'||e.target.id==='rp-text')){e.preventDefault();saveRep();return;}
    if(e.target.classList&&e.target.classList.contains('qadd')){
      if(e.key==='Enter'){e.preventDefault();quickAdd(e.target);}
      else if(e.key==='Escape'){e.target.value='';e.target.blur();}
      return;}
    if(!sh)return;
    if(e.key==='Escape'){e.preventDefault();closeSheet();}
    else if(e.key==='Enter'&&!e.shiftKey&&(sh.kind==='task'||sh.kind==='buy')&&(e.target.id==='sh-text'||/^bs-/.test(e.target.id))){e.preventDefault();if(sh.kind==='buy')saveBuy();else saveTask();}
  });


  /* ---------- PC : faire défiler les rangées d'onglets à la molette ou en glissant ---------- */
  var HS='.tabs,.chipscroll';
  document.addEventListener('wheel',function(e){var el=e.target.closest&&e.target.closest(HS);if(!el||el.scrollWidth<=el.clientWidth+1)return;
    if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){el.scrollLeft+=e.deltaY;e.preventDefault();}},{passive:false});
  var hs=null,hsBlock=0;
  document.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'||e.button)return;var el=e.target.closest&&e.target.closest(HS);if(!el||el.scrollWidth<=el.clientWidth+1)return;hs={el:el,x:e.clientX,l:el.scrollLeft,moved:false};});
  document.addEventListener('pointermove',function(e){if(!hs)return;var dx=e.clientX-hs.x;if(!hs.moved&&Math.abs(dx)>5){hs.moved=true;hs.el.classList.add('grabbing');}if(hs.moved)hs.el.scrollLeft=hs.l-dx;});
  document.addEventListener('pointerup',function(){if(hs&&hs.moved){hsBlock=Date.now()+300;hs.el.classList.remove('grabbing');}hs=null;});
  document.addEventListener('click',function(e){if(Date.now()<hsBlock){e.preventDefault();e.stopPropagation();}},true);

  /* ---------- Synchro ---------- */
  function prune(){var today=dayKey();S.focus=S.focus.filter(function(id){var x=find(id)||find(id,S.buy);return x&&(!x.t.d||x.t.at===today);});}
  function setStatus(t){status=t;var el=document.getElementById('status');if(el)el.textContent=t;}
  // on enregistre même si l'affichage plante, pour ne jamais perdre une modification
  function change(){prune();try{render();}finally{save();}}
  function save(){store.commit(S);}
  // Les mises à jour venues d'ailleurs (autre appareil, personne qui partage) attendent la fin d'une saisie
  function busy(){var ae=document.activeElement;return isDragging()||!!cm||(sh&&['task','buy','rep','manage','watch'].indexOf(sh.kind)>=0)||!!(ae&&ae.classList&&(ae.classList.contains('qadd')||ae.classList.contains('inl')||ae.classList.contains('gname')));}
  function apply(d){
    pending=null;var same=JSON.stringify(d.S)===JSON.stringify(S),soc=JSON.stringify([d.invites,d.sent,d.notifs.map(function(n){return n.id+n.read;}),d.club,d.friends])!==JSON.stringify([D.invites,D.sent,D.notifs.map(function(n){return n.id+n.read;}),D.club,D.friends]);
    var pc=JSON.stringify(d.prefs||{})!==JSON.stringify(D.prefs||{});
    D=d;if(!same)S=d.S;if(pc){applyPrefs();same=false;}
    if(!same||soc)render();
    if(sh&&['share','bell','account','wshare','friend'].indexOf(sh.kind)>=0)rerender();
  }
  function flush(){setTimeout(function(){if(pending&&!busy())apply(store.current());},60);}
  document.addEventListener('focusout',flush);

  /* ---------- Glisser-déposer ---------- */
  function moveTo(ref,drop,at){
    var a=ref.split(':'),b=drop.split(':'),secs=a[0]==='b'?S.buy:S.sections,x=find(a[1],secs),sec=secs[+b[1]];
    if(!x||!sec||sec.virtual||x.s.virtual)return;
    // réordonner : insérer avant/après la ligne visée (même groupe ou un autre)
    var y=at&&find(at.row.split(':')[1],secs);
    if(y&&y.t!==x.t&&!y.s.virtual){
      var moved=y.g!==x.g;
      x.g.tasks.splice(x.i,1);var k=y.g.tasks.indexOf(y.t)+(at.after?1:0);y.g.tasks.splice(k,0,x.t);
      if(moved)toast('Déplacé vers '+y.s.name+(y.s.groups.length>1?' › '+y.g.name:''));
      change();return;
    }
    var g=b[2]==='-'?(x.s===sec?null:sec.groups[0]):sec.groups[+b[2]];
    if(!g||g===x.g)return;
    x.g.tasks.splice(x.i,1);g.tasks.push(x.t);
    toast('Déplacé vers '+sec.name+(sec.groups.length>1?' › '+g.name:''));
    change();
  }
  installDnd({onDrop:moveTo,onEnd:flush,onHover:function(drop){var b=drop.split(':'),secs=b[0]==='b'?S.buy:S.sections,s=secs[+b[1]];if(!s)return;
    if(b[0]==='b'){btab=s.id;try{localStorage.setItem('btab',btab);}catch(_){}}else{tab=s.id;try{localStorage.setItem('tab2',tab);}catch(_){}}render();}});
  var toastT=null;
  function toast(msg){var el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){el.classList.remove('on');},2200);}

  /* ---------- Menu d'une catégorie : clic droit (ou appui long) sur son onglet ---------- */
  var cm=null;
  function catOfTab(el){var k=el.hasAttribute('data-btab')?'b':'t',id=el.getAttribute(k==='b'?'data-btab':'data-tab'),secs=k==='b'?S.buy:S.sections;
    var s=secs.filter(function(c){return c.id===id;})[0];return s&&!s.virtual?{k:k,s:s,secs:secs}:null;}
  function closeMenu(){if(cm){cm.el.remove();cm=null;flush();}}
  function openMenu(el,x,y){
    var c=catOfTab(el);if(!c)return;closeMenu();
    var real=c.secs.filter(function(z){return !z.virtual;}),own=!c.s.owner||c.s.owner===ME.uid;
    var m=document.createElement('div');m.className='cmenu';m.setAttribute('role','menu');
    cm={el:m,c:c,confirm:false};
    var draw=function(){
      m.innerHTML='<input class="inl cm-name" type="text" value="'+esc(c.s.name)+'" aria-label="Nom de la catégorie" enterkeyhint="done">'+
        '<div class="cm-cols">'+PAL.map(function(k){return '<button type="button" class="cm-col'+(ckey(c.s)===k?' on':'')+'" data-cm-color="'+k+'" style="--c:var(--'+k+')" aria-label="Couleur '+k+'"></button>';}).join('')+'</div>'+
        '<button type="button" role="menuitem" data-cm-share>'+PEOPLE+' Partager</button>'+
        '<button type="button" role="menuitem" data-cm-manage>Gérer les catégories…</button>'+
        (real.length>1||!own?'<button type="button" role="menuitem" class="danger" data-cm-del>'+(cm.confirm?(own?'Confirmer : supprimer avec ses tâches':'Confirmer : quitter la liste'):(own?'Supprimer':'Quitter la liste partagée'))+'</button>':'');
    };
    draw();cm.draw=draw;document.body.appendChild(m);
    var r=m.getBoundingClientRect();m.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';m.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';
    if(matchMedia('(pointer:fine)').matches){var n=m.querySelector('.cm-name');n.focus();n.select();}
  }
  function renameFromMenu(){if(!cm)return;var n=cm.el.querySelector('.cm-name'),v=n?n.value.replace(/\s+/g,' ').trim():'';if(v&&v!==cm.c.s.name){cm.c.s.name=v;change();}}
  document.addEventListener('contextmenu',function(e){var t=e.target.closest&&e.target.closest('.tab[data-tab],.tab[data-btab]');if(!t||!catOfTab(t))return;e.preventDefault();openMenu(t,e.clientX,e.clientY);});
  var lp=null;
  document.addEventListener('pointerdown',function(e){
    if(cm&&!cm.el.contains(e.target)){renameFromMenu();closeMenu();}
    var t=e.pointerType==='touch'&&e.target.closest&&e.target.closest('.tab[data-tab],.tab[data-btab]');
    if(t&&catOfTab(t)){var x=e.clientX,y=e.clientY;lp={t:setTimeout(function(){lp.fired=true;var r=t.getBoundingClientRect();openMenu(t,r.left,r.bottom+6);try{navigator.vibrate&&navigator.vibrate(10);}catch(_){}},550),x:x,y:y};}
  });
  document.addEventListener('pointermove',function(e){if(lp&&!lp.fired&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>8){clearTimeout(lp.t);lp=null;}});
  document.addEventListener('pointerup',function(){if(lp&&!lp.fired){clearTimeout(lp.t);lp=null;}});
  document.addEventListener('click',function(e){if(lp&&lp.fired&&e.target.closest&&e.target.closest('.tab')){e.preventDefault();e.stopPropagation();lp=null;}},true);
  document.addEventListener('keydown',function(e){if(!cm)return;if(e.key==='Escape'){closeMenu();}else if(e.key==='Enter'&&e.target.classList.contains('cm-name')){e.preventDefault();renameFromMenu();closeMenu();}});
  window.addEventListener('scroll',function(){if(cm&&document.activeElement!==cm.el.querySelector('.cm-name')){renameFromMenu();closeMenu();}},true);
  document.addEventListener('click',function(e){
    if(!cm)return;var b=e.target.closest&&e.target.closest('[data-cm-color],[data-cm-share],[data-cm-manage],[data-cm-del]');if(!b||!cm.el.contains(b))return;
    var c=cm.c;renameFromMenu();
    if(b.hasAttribute('data-cm-color')){c.s.color=b.getAttribute('data-cm-color');change();cm.draw();return;}
    if(b.hasAttribute('data-cm-share')){closeMenu();openShare('cat',c.s.id);return;}
    if(b.hasAttribute('data-cm-manage')){closeMenu();mode=c.k==='b'?'buy':'todo';openManage(c.s.id);return;}
    if(b.hasAttribute('data-cm-del')){if(!cm.confirm){cm.confirm=true;cm.draw();return;}
      var i=c.secs.indexOf(c.s);if(i>=0)c.secs.splice(i,1);if(tab===c.s.id)tab='today';if(btab===c.s.id)btab='all';closeMenu();toast((c.s.owner&&c.s.owner!==ME.uid?'Tu as quitté « ':'Supprimé : « ')+c.s.name+' »');change();}
  });

  /* ---------- Partage ---------- */
  function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase()||'?';}
  function avatar(i){return '<span class="av">'+(i&&i.ph?'<img src="'+esc(i.ph)+'" alt="" referrerpolicy="no-referrer">':esc(initials(i&&(i.n||i.e))))+'</span>';}
  function shareTarget(){
    if(sh.type==='cat'){var s=S.sections.concat(S.buy).filter(function(c){return c.id===sh.id;})[0];return s?{name:s.name,sec:s}:null;}
    var x=find(sh.id)||find(sh.id,S.buy);return x?{name:x.t.t,x:x,sec:x.s}:null;
  }
  function openShare(type,id){sh={kind:'share',type:type,id:id,email:'',err:'',sentTo:''};renderShare(true);}
  function shareLink(){return location.origin+'/';}
  function renderShare(first){
    var tg=shareTarget();if(!tg){closeSheet();return;}
    var sec=tg.sec,isMember=sec&&!sec.virtual&&sec.members.indexOf(ME.uid)>=0,owner=sec&&sec.owner===ME.uid,h='';
    if(sh.type==='cat'){
      var others=sec.members.filter(function(u){return u!==ME.uid;});
      if(others.length||!owner)h+='<div class="field"><span class="lbl">Membres ('+others.length+')</span><ul class="people">'+others.map(function(u){var i=sec.memberInfo[u]||{};
        return '<li>'+avatar(i)+'<span class="pp"><b>'+esc(u===ME.uid?'Toi':(i.n||i.e||'Membre'))+'</b><small>'+esc(i.e||'')+(u===sec.owner?' · propriétaire':'')+'</small></span>'+
          (owner&&u!==ME.uid?'<button type="button" class="mini danger" data-sh-rm="'+u+'">Retirer</button>':'')+
          '</li>';}).join('')+'</ul>'+(!owner?'<button type="button" class="tbtn danger" data-sh-leave>Quitter la liste</button>':'')+'</div>';
    }else{
      var x=tg.x,gs=x.t.guests||[];
      if(!x.s.virtual)h+='<p class="hint flush">'+(sec.members.length>1?'Déjà visible par les '+sec.members.length+' membres de « '+esc(sec.name)+' ». ':'')+'Invite quelqu’un pour cette tâche seulement : elle apparaîtra dans « Partagées avec moi ».</p>';
      else h+='<p class="hint flush">'+esc(x.t.byName||'Quelqu’un')+' a partagé cette tâche avec toi.</p>';
      if(gs.length)h+='<div class="field"><span class="lbl">Invités sur cette tâche</span><ul class="people">'+gs.map(function(u){var i=(x.t.guestInfo||{})[u]||{};
        return '<li>'+avatar(i)+'<span class="pp"><b>'+esc(u===ME.uid?'Toi':(i.n||i.e||'Invité'))+'</b><small>'+esc(i.e||'')+'</small></span>'+
          (isMember&&u!==ME.uid?'<button type="button" class="mini danger" data-sh-rmg="'+u+'">Retirer</button>':'')+
          (u===ME.uid?'<button type="button" class="mini danger" data-sh-leaveg>Quitter</button>':'')+'</li>';}).join('')+'</ul></div>';
    }
    var mine=D.sent.filter(function(v){return v.target===sh.id&&v.status!=='accepted';});
    if(mine.length)h+='<div class="field"><span class="lbl">Invitations envoyées</span><ul class="people">'+mine.map(function(v){
      return '<li><span class="av">@</span><span class="pp"><b>'+esc(v.toEmail)+'</b><small>'+(v.status==='declined'?'refusée':'en attente')+'</small></span>'+
        (v.status==='declined'?'<button type="button" class="mini" data-sh-again="'+esc(v.toEmail)+'">Relancer</button>':'')+
        '<button type="button" class="mini danger" data-sh-cancel="'+esc(v.id)+'" aria-label="Annuler l’invitation">×</button></li>';}).join('')+'</ul></div>';
    if(isMember){
      var already=(sec.members||[]).map(function(u){return ((sec.memberInfo||{})[u]||{}).e;}).concat(mine.map(function(v){return v.toEmail;}));
      if(sh.type==='task'&&tg.x)already=already.concat(Object.keys(tg.x.t.guestInfo||{}).map(function(u){return (tg.x.t.guestInfo[u]||{}).e;}));
      h+=contactChips(already.filter(Boolean).map(function(e){return e.toLowerCase();}));
      h+='<div class="field"><label class="lbl" for="sh-email">Inviter par email (compte Google)</label><div class="invrow"><input type="email" id="sh-email" inputmode="email" autocomplete="email" placeholder="prenom@gmail.com" value="'+esc(sh.email)+'"><button type="button" class="btn" data-sh-invite>Inviter</button></div>'+
        (sh.err?'<p class="err">'+esc(sh.err)+'</p>':'')+'</div>';
      if(sh.needClub)h+='<div class="sent warn"><p><b>'+esc(sh.needClub)+'</b> n’a pas de compte sur l’appli. '+(D.club.admin?'Tu peux l’inviter.':D.club.left>0?'Tu peux l’inviter : il te reste '+D.club.left+' invitation'+(D.club.left>1?'s':'')+'.':'Tu as utilisé tes 2 invitations. Vérifie l’adresse, ou demande à quelqu’un d’autre de l’inviter.')+'</p>'+
        (D.club.admin||D.club.left>0?'<div class="actions"><button type="button" class="btn ghost" data-sh-noclub>Annuler</button><button type="button" class="btn" data-sh-club>Inviter et partager</button></div>':'')+'</div>';
      if(sh.sentTo&&sh.pendingNote)h+='<p class="hint flush">'+esc(sh.pendingNote)+'</p>';
      if(sh.sentTo)h+='<div class="sent"><p><b>Invitation prête pour '+esc(sh.sentTo)+'.</b> Elle s’affichera dans sa cloche 🔔 dès que la personne ouvre l’appli avec cette adresse. Envoie-lui le lien :</p><div class="actions"><button type="button" class="btn ghost" data-sh-copy>Copier le lien</button>'+(navigator.share?'<button type="button" class="btn ghost" data-sh-send>Envoyer…</button>':'')+'</div></div>';
    }
    h+='<div class="actions"><span class="spacer"></span><button type="button" class="btn" data-close>Fermer</button></div>';
    sheetRoot.innerHTML=wrap((sh.type==='cat'?'Partager « ':'Partager la tâche « ')+esc(tg.name)+' »',h);
    if(first){var e=sheetRoot.querySelector('#sh-email');if(e&&matchMedia('(pointer:fine)').matches)e.focus();}
  }
  // Contacts : les personnes avec qui on partage déjà quelque chose, pour les retrouver en un toucher
  function contacts(){var out={},add=function(e,n,ph){e=String(e||'').toLowerCase();if(!e||e===ME.email)return;var o=out[e]||(out[e]={e:e,n:'',ph:''});if(n&&!o.n)o.n=n;if(ph&&!o.ph)o.ph=ph;};
    S.sections.concat(S.buy).forEach(function(c){Object.keys(c.memberInfo||{}).forEach(function(u){var i=c.memberInfo[u]||{};add(i.e,i.n,i.ph);});});
    (D.friends||[]).forEach(function(f){add(f.email,f.name,f.photo);});
    (D.sent||[]).forEach(function(v){if(v.status==='accepted')add(v.toEmail);});
    ((D.club&&D.club.invited)||[]).forEach(function(v){if(v.joined)add(v.email,v.name);});
    return Object.keys(out).map(function(k){return out[k];}).sort(function(a,b){return (a.n||a.e).localeCompare(b.n||b.e);});}
  // répertoire : juste les photos ; le pseudo au survol, et au toucher on sélectionne puis on confirme
  function contactChips(skip){var L=contacts().filter(function(c){return skip.indexOf(c.e)<0;});if(!L.length)return '';
    var pick=sh&&sh.pick?L.filter(function(c){return c.e===sh.pick;})[0]:null;
    return '<section class="sec"><h4 class="sec-h">Amis</h4><div class="chipscroll repo">'+L.map(function(c){var nm=c.n||c.e.split('@')[0],on=pick&&pick.e===c.e;
      return '<span class="repo-it'+(on?' on':'')+'"><button type="button" class="repo-av" data-contact="'+esc(c.e)+'" data-name="'+esc(nm)+'" aria-label="'+esc(nm)+'">'+avatar({n:nm,ph:c.ph})+'</button>'+
        (on?'<button type="button" class="repo-go" data-contact-go="'+esc(c.e)+'" aria-label="Inviter '+esc(nm)+'">Inviter</button>':'')+'</span>';}).join('')+'</div></section>';}
  function inviteMsg(){var tg=shareTarget();return 'Je t’ai invité·e sur « '+(tg?tg.name:'ma liste')+' » dans ma Todo. Ouvre '+shareLink()+' et connecte-toi avec '+sh.sentTo+' : l’invitation est dans la cloche 🔔';}
  // Partager avec quelqu'un hors du club = l'inviter aussi au club (1 des 2 places), après confirmation
  function doInvite(email,withClub){
    var tg=shareTarget();if(!tg)return;var e=sheetRoot.querySelector('#sh-email');email=(email||(e?e.value:'')).trim().toLowerCase();sh.email=email;sh.err='';sh.needClub='';
    if(!email)return;
    var kind=S.buy.indexOf(tg.sec)>=0||(tg.x&&S.buy.indexOf(tg.x.s)>=0)?'buy':'todo';
    var btn=sheetRoot.querySelector('[data-sh-invite]');if(btn){btn.disabled=true;btn.textContent='Envoi…';}
    var go=function(){return store.invite(sh.type,sh.id,email,tg.name,kind);};
    if(!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)){sh.err='Adresse email invalide';renderShare();return;}
    sh.pendingNote='';
    (withClub?store.clubInvite(email).then(go):store.memberStatus(email).then(function(m){
      if(m==='none'){sh.needClub=email;return 'ask';}
      if(m==='pending')sh.pendingNote=email+' est invité·e mais ne s’est pas encore connecté·e : le partage l’attendra.';
      return go();}))
      .then(function(r){if(r!=='ask'){sh.sentTo=email;sh.email='';}renderShare();},function(er){sh.err=er.code==='permission-denied'?'Impossible d’inviter sur cet élément':(er.message||'Échec');renderShare();});
  }

  /* ---------- Cloche ---------- */
  function ago(ts){var t=ts&&ts.toMillis?ts.toMillis():Date.now(),m=Math.round((Date.now()-t)/60000);if(m<1)return 'à l’instant';if(m<60)return 'il y a '+m+' min';var h=Math.round(m/60);if(h<24)return 'il y a '+h+' h';var d=Math.round(h/24);return d<7?'il y a '+d+' j':new Date(t).toLocaleDateString('fr-BE',{day:'numeric',month:'short'});}
  function unread(){return D.invites.length+D.notifs.filter(function(n){return !n.read;}).length;}
  function openBell(){sh={kind:'bell'};renderBell();setTimeout(function(){if(sh&&sh.kind==='bell')store.readAll();},1500);}
  function renderBell(){
    var h='';
    if(D.invites.length)h+='<div class="field"><span class="lbl">Invitations</span><ul class="people">'+D.invites.map(function(v){
      return '<li class="inv">'+avatar({n:v.fromName})+'<span class="pp"><b>'+esc(v.fromName||v.fromEmail)+'</b><small>'+(v.type==='watch'?'t’invite à suivre « '+esc(v.targetName)+' » ensemble':'t’invite sur '+(v.type==='cat'?(v.kind==='buy'?'la wishlist':'la liste'):'la tâche')+' « '+esc(v.targetName)+' »')+'</small></span>'+
        '<span class="invb"><button type="button" class="mini" data-inv-no="'+esc(v.id)+'">Refuser</button><button type="button" class="mini ok" data-inv-ok="'+esc(v.id)+'">Accepter</button></span></li>';}).join('')+'</ul></div>';
    h+='<div class="field"><span class="lbl">Activité</span>'+(D.notifs.length?'<ul class="notes-l">'+D.notifs.slice(0,40).map(function(n){
      return '<li class="'+(n.read?'':'new')+'"><span>'+esc(n.text)+'</span><small>'+ago(n.createdAt)+'</small></li>';}).join('')+'</ul>':'<p class="hint flush">Rien pour l’instant. Ici s’afficheront les invitations et ce que font les personnes avec qui tu partages.</p>')+'</div>';
    h+='<div class="actions">'+(D.notifs.length?'<button type="button" class="btn danger" data-bell-clear>Tout effacer</button>':'')+'<span class="spacer"></span><button type="button" class="btn" data-close>Fermer</button></div>';
    sheetRoot.innerHTML=wrap('Notifications',h);
  }

  /* ---------- Profil : thème, tags, invitations ---------- */
  var installEvt=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();installEvt=e;});
  function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
  var THEMES=[['auto','Auto'],['light','Clair'],['dark','Sombre'],['noir','Noir']];
  var TAGCOL=['urgent','perso','important','star','oasis','ngc','isfsc','contenu','chloe','later'];
  var TAGDEF={p1:{n:'Urgent',c:'urgent'},p2:{n:'Important',c:'important'},p3:{n:'Pas pressé',c:'later'},l1:{n:'Vite',c:'urgent'},l2:{n:'Envie',c:'important'},l3:{n:'Un jour',c:'later'}};
  // Préférences du compte ; les anciens tags fixes (p1…l3) sont convertis en listes
  function prefs(){
    var p=D.prefs||{},t=p.tags||{},o={theme:THEMES.some(function(x){return x[0]===p.theme;})?p.theme:'auto',tags:{}};
    ['todo','buy'].forEach(function(k){
      var L=Array.isArray(t[k])?t[k]:[1,2,3].map(function(i){var key=(k==='todo'?'p':'l')+i,d=TAGDEF[key],x=t[key]||{};return {id:i,n:x.n||d.n,c:x.c||d.c};});
      o.tags[k]=L.map(function(x){return {id:+x.id,n:String(x.n||'Tag'),c:x.c||'later'};});
    });
    o.tools={watch:!!(p.tools&&p.tools.watch)};
    return o;
  }
  function applyPrefs(){
    var P=prefs(),r=document.documentElement;
    if(P.theme==='auto')delete r.dataset.theme;else r.dataset.theme=P.theme;
    try{localStorage.setItem('theme',P.theme);}catch(_){}
  }
  function savePrefs(P){D.prefs=P;applyPrefs();render();store.savePrefs(P);}
  function openAccount(){sh={kind:'account',edit:''};renderAccount();}
  var CHEV='<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  function tagRow(k,T,i,P){var key=k+':'+T.id,open=sh.edit===key,L=P.tags[k];
    var h='<button type="button" class="row tagr'+(open?' open':'')+'" data-tag-edit="'+key+'" aria-expanded="'+open+'" style="--c:var(--'+T.c+')"><span class="tdot"></span><span class="rl">'+esc(T.n)+'</span>'+CHEV+'</button>';
    if(open)h+='<div class="row tagedit"><input type="text" id="tag-name" class="inl" maxlength="18" value="'+esc(T.n)+'" aria-label="Nom du tag" enterkeyhint="done">'+
      '<div class="swatches">'+TAGCOL.map(function(c){return '<button type="button" class="sw'+(T.c===c?' on':'')+'" data-tag-col="'+c+'" style="--c:var(--'+c+')" aria-label="Couleur '+c+'" aria-pressed="'+(T.c===c)+'"></button>';}).join('')+'</div>'+
      '<div class="tagact"><button type="button" class="mini" data-tag-move="-1"'+(i?'':' disabled')+' aria-label="Monter">↑</button><button type="button" class="mini" data-tag-move="1"'+(i<L.length-1?'':' disabled')+' aria-label="Descendre">↓</button>'+
      '<span class="spacer"></span>'+(L.length>1?'<button type="button" class="tbtn danger" data-tag-del>'+(sh.delc?'Confirmer la suppression':'Supprimer')+'</button>':'')+'</div></div>';
    return h;}
  function renderAccount(){
    var P=prefs(),C=D.club,h='';
    h+='<div class="pf-top"><h3 id="sh-title">Profil</h3><button type="button" class="xbtn" data-close aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    h+='<div class="set"><div class="row acct"><label class="avpick" for="ph-file" aria-label="Changer la photo de profil">'+avatar({n:ME.name,e:ME.email,ph:ME.photo})+'<i>✎</i></label><input type="file" id="ph-file" accept="image/*" hidden>'+
      '<span class="rl"><b>'+esc(ME.name)+'</b><small>'+esc(ME.email)+'</small></span>'+(D.prefs&&ME.photo&&/^data:/.test(ME.photo)?'<button type="button" class="tbtn" data-ph-reset>Photo Google</button>':'')+'</div>'+
      '<label class="row pseudo" for="pseudo"><span class="rk">Pseudo</span><input type="text" id="pseudo" class="inl" maxlength="30" autocomplete="nickname" enterkeyhint="done" value="'+esc(ME.name)+'" placeholder="Ton pseudo"></label></div>'+
      '<p class="sec-note">Visible par les personnes avec qui tu partages. Leurs tâches taguées apparaissent sous leur pseudo.</p>';
    h+='<section class="sec"><h4 class="sec-h">Apparence</h4><div class="themegrid" role="radiogroup" aria-label="Thème">'+THEMES.map(function(t){
      return '<button type="button" class="thm t-'+t[0]+'" role="radio" data-theme-set="'+t[0]+'" aria-checked="'+(P.theme===t[0])+'"><span class="prev"><i></i><i></i></span><span>'+t[1]+'</span></button>';}).join('')+'</div></section>';
    h+='<section class="sec"><h4 class="sec-h">Tags</h4><div class="set">'+[['todo','Todo'],['buy','Wishlist']].map(function(kk){
      return '<div class="row sub">'+kk[1]+'</div>'+P.tags[kk[0]].map(function(t,i){return tagRow(kk[0],t,i,P);}).join('')+
        '<button type="button" class="row addtag" data-tag-add="'+kk[0]+'"><span class="plusc">+</span><span class="rl">Ajouter un tag</span></button>';}).join('')+'</div></section>';
    h+='<section class="sec"><h4 class="sec-h">Outils</h4><div class="set">'+
      '<label class="row" for="tool-watch"><span class="rl"><b>Suivis de films et séries</b><small>Progression vers un objectif, temps restant, historique</small></span><input type="checkbox" class="toggle" id="tool-watch"'+(P.tools.watch?' checked':'')+'></label>'+
      (P.tools.watch?watchButtons():'')+'</div></section>';
    h+='<section class="sec"><h4 class="sec-h">Invitations<span>'+(C.admin?'Illimitées':C.used+' / 2')+'</span></h4><div class="set">'+
      C.invited.map(function(v){return '<div class="row"><span class="rl"><b>'+esc(v.name||v.email)+'</b>'+(v.name?'<small>'+esc(v.email)+'</small>':'')+'</span><span class="pill'+(v.joined?' ok':'')+'">'+(v.joined?'Membre':'En attente')+'</span>'+
        (!v.joined?'<button type="button" class="xbtn sm" data-club-cancel="'+esc(v.email)+'" aria-label="Annuler l’invitation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>':'')+'</div>';}).join('')+
      (C.left>0?'<div class="row inv"><input type="email" id="club-email" inputmode="email" autocomplete="off" placeholder="Inviter par email" value="'+esc(sh.clubEmail||'')+'"><button type="button" class="tbtn" data-club-invite>Inviter</button></div>':
        (C.invited.length?'':'<div class="row"><span class="rl muted">Plus d’invitation disponible</span></div>'))+
      (sh.clubSent?'<div class="row note"><span class="rl"><b>'+esc(sh.clubSent)+'</b><small>Peut maintenant entrer</small></span><button type="button" class="tbtn" data-club-copy>Copier le lien</button></div>':'')+
      '</div>'+(sh.clubErr?'<p class="err">'+esc(sh.clubErr)+'</p>':'')+'</section>';
    if(installEvt&&!standalone())h+='<div class="set"><button type="button" class="row center" data-install>Installer l’appli</button></div>';
    h+='<div class="set"><button type="button" class="row center danger" data-logout>Se déconnecter</button></div>';
    sheetRoot.innerHTML='<div class="backdrop" data-close></div><div class="sheet pf" role="dialog" aria-modal="true" aria-labelledby="sh-title"><div class="grab"></div>'+h+'</div>';
  }
  function editRef(P){var p=(sh.edit||'').split(':'),L=P.tags[p[0]];if(!L)return null;for(var i=0;i<L.length;i++)if(L[i].id===+p[1])return {k:p[0],L:L,i:i,t:L[i]};return null;}
  // photo choisie : recadrée en carré et réduite (128 px) sur l'appareil, puis enregistrée
  document.addEventListener('change',function(e){if(e.target.id!=='ph-file'||!e.target.files[0])return;var f=e.target.files[0],img=new Image(),url=URL.createObjectURL(f);
    img.onload=function(){var z=128,c=document.createElement('canvas');c.width=c.height=z;var k=Math.min(img.width,img.height),sx=(img.width-k)/2,sy=(img.height-k)/2;
      c.getContext('2d').drawImage(img,sx,sy,k,k,0,0,z,z);URL.revokeObjectURL(url);var data=c.toDataURL('image/jpeg',.82);
      store.savePhoto(data).then(function(){toast('Photo mise à jour');render();if(sh&&sh.kind==='account')renderAccount();});};
    img.onerror=function(){toast('Image illisible');};img.src=url;});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-ph-reset]')){store.savePhoto('').then(function(){toast('Photo Google reprise');render();if(sh&&sh.kind==='account')renderAccount();});}});
  function watchButtons(){return '<button type="button" class="row" data-m-watch=""><span class="plusc">+</span><span class="rl"><b>Nouveau suivi</b><small>Liste vide à remplir</small></span></button>'+
    TEMPLATES.map(function(t){return '<button type="button" class="row" data-m-watch="'+t.id+'"><span class="plusc">★</span><span class="rl"><b>Modèle : '+esc(t.name)+'</b><small>'+esc(t.desc)+'</small></span></button>';}).join('');}
  document.addEventListener('change',function(e){if(sh&&sh.kind==='account'&&e.target.id==='tool-watch'){var P=prefs();P.tools.watch=e.target.checked;savePrefs(P);renderAccount();}});
  function saveTagName(){if(!sh||sh.kind!=='account'||!sh.edit)return;var n=sheetRoot.querySelector('#tag-name');if(!n)return;var P=prefs(),r=editRef(P),v=n.value.replace(/\s+/g,' ').trim();if(r&&v&&v!==r.t.n){r.t.n=v;savePrefs(P);}}
  document.addEventListener('click',function(e){
    if(!sh||sh.kind!=='account')return;var b=e.target.closest&&e.target.closest('[data-theme-set],[data-tag-edit],[data-tag-col],[data-tag-add],[data-tag-move],[data-tag-del]');if(!b)return;
    if(!b.hasAttribute('data-theme-set'))saveTagName();
    var P=prefs(),r=editRef(P);
    if(b.hasAttribute('data-theme-set')){P.theme=b.getAttribute('data-theme-set');savePrefs(P);renderAccount();return;}
    if(b.hasAttribute('data-tag-edit')){var k=b.getAttribute('data-tag-edit');sh.edit=sh.edit===k?'':k;sh.delc=false;renderAccount();focusTag();return;}
    if(b.hasAttribute('data-tag-add')){var kk=b.getAttribute('data-tag-add'),L=P.tags[kk],id=L.reduce(function(m,x){return Math.max(m,x.id);},0)+1,used=L.map(function(x){return x.c;});
      L.push({id:id,n:'Nouveau tag',c:TAGCOL.filter(function(c){return used.indexOf(c)<0;})[0]||'later'});sh.edit=kk+':'+id;sh.delc=false;savePrefs(P);renderAccount();focusTag(true);return;}
    if(!r)return;
    if(b.hasAttribute('data-tag-col')){r.t.c=b.getAttribute('data-tag-col');savePrefs(P);renderAccount();return;}
    if(b.hasAttribute('data-tag-move')){var j=r.i+(+b.getAttribute('data-tag-move'));if(j<0||j>=r.L.length)return;var tmp=r.L[j];r.L[j]=r.t;r.L[r.i]=tmp;savePrefs(P);renderAccount();return;}
    if(b.hasAttribute('data-tag-del')){if(!sh.delc){sh.delc=true;renderAccount();return;}r.L.splice(r.i,1);sh.edit='';sh.delc=false;savePrefs(P);renderAccount();return;}
  });
  function focusTag(force){var n=sheetRoot.querySelector('#tag-name');if(n&&(force||matchMedia('(pointer:fine)').matches)){n.focus();n.select();}}
  function savePseudo(){var n=sheetRoot.querySelector('#pseudo');if(!n)return;var v=n.value.replace(/\s+/g,' ').trim();if(!v){n.value=ME.name;return;}if(v===ME.name)return;
    store.savePseudo(v).then(function(){toast('Pseudo enregistré');render();if(sh&&sh.kind==='account')renderAccount();});}
  document.addEventListener('change',function(e){if(sh&&sh.kind==='account'&&e.target.id==='pseudo')savePseudo();});
  document.addEventListener('keydown',function(e){if(sh&&sh.kind==='account'&&e.target.id==='pseudo'&&e.key==='Enter'){e.preventDefault();e.target.blur();}});
  document.addEventListener('keydown',function(e){if(sh&&sh.kind==='account'&&e.target.id==='tag-name'&&e.key==='Enter'){e.preventDefault();saveTagName();sh.edit='';renderAccount();}});
  document.addEventListener('change',function(e){if(sh&&sh.kind==='account'&&e.target.id==='tag-name')saveTagName();});

  /* ---------- Clics des nouvelles fonctions ---------- */
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-share],[data-bell],[data-account],[data-share-task],[data-sh-invite],[data-sh-rm],[data-sh-leave],[data-sh-rmg],[data-sh-leaveg],[data-sh-cancel],[data-sh-again],[data-sh-copy],[data-sh-send],[data-inv-ok],[data-inv-no],[data-bell-clear],[data-install],[data-logout],[data-sh-club],[data-sh-noclub],[data-club-invite],[data-club-cancel],[data-club-copy],[data-club-send]');
    if(!b)return;function A(n){return b.getAttribute('data-'+n);}function has(n){return b.hasAttribute('data-'+n);}
    if(has('share')){var p=A('share').split(':');openShare('cat',p[1]);return;}
    if(has('share-task')){var id=A('share-task');sync();closeSheet();openShare('task',id);return;}
    if(has('bell')){openBell();return;}
    if(has('account')){openAccount();return;}
    if(!sh)return;
    var fail=function(er){toast(er.code==='permission-denied'?'Action refusée':'Échec, réessaie');};
    if(has('sh-invite')){doInvite();return;}
    if(has('sh-club')){doInvite(sh.needClub,true);return;}
    if(has('sh-noclub')){sh.needClub='';renderShare();return;}
    if(has('club-invite')){var ce=sheetRoot.querySelector('#club-email'),em=(ce?ce.value:'').trim().toLowerCase();sh.clubEmail=em;sh.clubErr='';sh.clubSent='';b.disabled=true;b.textContent='Envoi…';
      store.clubInvite(em).then(function(isNew){if(isNew){sh.clubSent=em;sh.clubEmail='';}else sh.clubErr=em+' a déjà accès';renderAccount();},function(er){sh.clubErr=er.message||'Échec';renderAccount();});return;}
    if(has('club-cancel')){store.cancelClubInvite(A('club-cancel')).catch(fail);return;}
    if(has('club-copy')||has('club-send')){var cm='Je t’invite sur Nocturnz/todo : ouvre '+shareLink()+' et connecte-toi avec Google ('+sh.clubSent+').';
      if(has('club-send')){navigator.share({title:'Invitation Todo',text:cm}).catch(function(){});}else (navigator.clipboard?navigator.clipboard.writeText(cm):Promise.reject()).then(function(){toast('Message copié');},function(){prompt('Copie ce message :',cm);});return;}
    if(has('sh-again')){doInvite(A('sh-again'));return;}
    if(has('sh-cancel')){store.cancelInvite(A('sh-cancel')).catch(fail);return;}
    if(has('sh-rm')){store.removeMember(sh.id,A('sh-rm')).catch(fail);return;}
    if(has('sh-leave')){if(!sh.confirm){sh.confirm=1;b.textContent='Sûr ? Quitter';return;}store.removeMember(sh.id,ME.uid).then(function(){closeSheet();toast('Tu as quitté la liste');},fail);return;}
    if(has('sh-rmg')){store.removeGuest(sh.id,A('sh-rmg')).catch(fail);return;}
    if(has('sh-leaveg')){store.removeGuest(sh.id,ME.uid).then(function(){closeSheet();},fail);return;}
    if(has('sh-copy')){var msg=inviteMsg();(navigator.clipboard?navigator.clipboard.writeText(msg):Promise.reject()).then(function(){toast('Message copié');},function(){prompt('Copie ce message :',msg);});return;}
    if(has('sh-send')){navigator.share({title:'Invitation Todo',text:inviteMsg()}).catch(function(){});return;}
    if(has('inv-ok')||has('inv-no')){var v=D.invites.filter(function(x){return x.id===(A('inv-ok')||A('inv-no'));})[0];if(!v)return;b.disabled=true;
      (has('inv-ok')?store.accept(v).then(function(){toast('Ajouté : '+v.targetName);
        if(v.type==='watch'){var P=prefs();if(!P.tools.watch){P.tools.watch=true;savePrefs(P);}var have=S.sections.filter(function(c){var t=tplOf(c);return isWatch(c)&&t&&t.id===v.target;})[0];
          if(have){mode='todo';tab=have.id;closeSheet();render();}else{var tp=TEMPLATES.filter(function(t){return t.id===v.target;})[0];if(tp){closeSheet();createWatch(tp);}}return;}if(v.type==='cat'){if(v.kind==='buy'){mode='buy';btab=v.target;}else{mode='todo';tab=v.target;}}}):store.decline(v)).catch(fail);return;}
    if(has('bell-clear')){store.clearNotifs();return;}
    if(has('install')&&installEvt){installEvt.prompt();installEvt.userChoice.finally(function(){installEvt=null;if(sh)renderAccount();});return;}
    if(has('logout')){store.signOut();return;}
  });
  document.addEventListener('click',function(e){if(!sh)return;var b=e.target.closest&&e.target.closest('[data-contact],[data-contact-go]');if(!b)return;
    if(b.hasAttribute('data-contact')){var em0=b.getAttribute('data-contact');sh.pick=sh.pick===em0?'':em0;if(sh.kind==='share')renderShare();else if(sh.kind==='wshare')renderWShare();return;}
    var em=b.getAttribute('data-contact-go');sh.pick='';
    if(sh.kind==='share'){doInvite(em);return;}
    if(sh.kind==='wshare'){var i=sheetRoot.querySelector('#ws-email');if(i)i.value=em;wsInvite();return;}});
  document.addEventListener('keydown',function(e){if(sh&&sh.kind==='share'&&e.target.id==='sh-email'&&e.key==='Enter'){e.preventDefault();doInvite();}
    if(sh&&sh.kind==='account'&&e.target.id==='club-email'&&e.key==='Enter'){e.preventDefault();var bt=sheetRoot.querySelector('[data-club-invite]');if(bt)bt.click();}});

  document.addEventListener('change',function(e){if(e.target.classList&&e.target.classList.contains('gname'))renameGroup(e.target);});
  document.addEventListener('keydown',function(e){if(e.target.classList&&e.target.classList.contains('gname')){if(e.key==='Enter'){e.preventDefault();e.target.blur();}else if(e.key==='Escape'){var o=nameObj(e.target);if(o)e.target.value=o.name;e.target.blur();}}});
  document.addEventListener('focusout',function(e){if(e.target.classList&&e.target.classList.contains('qadd')){if(e.target.value.trim())quickAdd(e.target,true);}});
  applyPrefs();
  render();
  return {
    update:function(d){if(busy()){pending=d;return;}apply(d);},
    status:setStatus,
  };
}
