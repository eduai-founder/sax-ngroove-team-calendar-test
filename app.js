/* SAX 'N' GROOVE Team Calendar v0.7 TEST — samo citanje. */
'use strict';
const YEARS=[2026,2027,2028];
const MONTHS=['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];
const GROUPS=['Ozvučenje','Rasveta','Kablovi','Ostalo'];
const STORAGE_KEY='sax_team_calendar_link_v07';
const DEMO=(new URLSearchParams(location.search)).get('demo')==='1';
const els={setup:document.getElementById('setup'),view:document.getElementById('calendar-view'),form:document.getElementById('setup-form'),input:document.getElementById('existing-link'),setupError:document.getElementById('setup-error'),year:document.getElementById('year-heading'),months:document.getElementById('months'),days:document.getElementById('days'),monthName:document.getElementById('month-name'),detail:document.getElementById('day-details'),status:document.getElementById('sync-status')};
const state={year:YEARS.includes(new Date().getFullYear())?new Date().getFullYear():2026,month:new Date().getMonth(),day:null,events:[],config:null,active:null,request:0,lastUpdate:null};
function node(tag,cls,text){const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=String(text);return a;}
function pad(n){return String(n).padStart(2,'0');}
function dateStr(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`;}
function humanDate(s){const a=String(s||'').split('-');return a.length===3?`${Number(a[2])}. ${Number(a[1])}. ${a[0]}.`:s;}
function displayError(message){els.setupError.textContent=message;els.setupError.hidden=false;}
function parseExistingLink(value){
  let url;
  try{url=new URL(value.trim());}catch(e){throw Error('Nalepi kompletnu Google LIVE adresu, ne samo deo linka.');}
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(url.pathname))throw Error('Adresa mora biti objavljeni Google Apps Script Web App link koji se završava sa /exec.');
  const key=url.searchParams.get('k');
  if(!key||!/^[-A-Za-z0-9]{64,160}$/.test(key))throw Error('U linku nedostaje važeći ključ za pregled (parametar k).');
  return {url:url.origin+url.pathname.replace(/\/$/,''),key};
}
function setupView(){els.view.hidden=true;els.setup.hidden=false;els.setupError.hidden=true;}
function calendarView(){els.setup.hidden=true;els.view.hidden=false;render();fetchYear();}
function status(s,bad=false){els.status.textContent=s;els.status.classList.toggle('failure',!!bad);}
function cleanPending(){if(state.active){state.active.cleanup();state.active=null;}}
function demoEvents(){return [
  {date:'2026-11-20',type:'Svadbe',status:'Potvrđeno',venue:'TEST SALA',venueAddress:'Primer adrese',startTime:'19:00',endTime:'23:30',gatherTime:'17:30',teamName:'Tim A',djName:'DJ Primer',saxName:'Saksofonista Primer',gear:[{category:'Ozvučenje',name:'Test zvučnik',quantity:2}],note:'Demonstracija. Nije stvarna rezervacija.'},
  {date:'2027-06-20',type:'Korporativne zabave',status:'Potvrđeno',venue:'TEST HOTEL',startTime:'20:00',teamName:'Tim B',gear:[],note:'Primer prikaza.'},
  {date:'2028-08-15',type:'Rođendani',status:'Rezervisano',venue:'TEST PROSTOR',startTime:'21:00',gear:[],note:'Primer prikaza.'}
].filter(e=>e.date.startsWith(String(state.year)));}
function fetchYear(){
  if(document.hidden||els.view.hidden)return;
  cleanPending();
  const request=++state.request;
  const expectedYear=state.year;
  if(DEMO){state.events=demoEvents();state.lastUpdate=new Date();render();status('DEMO PRIKAZ — primeri događaja, bez povezivanja sa Google tabelom.');return;}
  if(!state.config){setupView();return;}
  status('Proveravam događaje za '+expectedYear+'. godinu…');
  // Google ContentService vraca JavaScript (JSONP) jer cross-origin JSON fetch nije podrzan.
  const cb='sgTeamCallback'+Date.now()+Math.floor(Math.random()*10000);
  const tag=document.createElement('script');tag.async=true;tag.referrerPolicy='no-referrer';
  let complete=false, timer;
  function cleanup(){clearTimeout(timer);tag.remove();try{delete window[cb];}catch(e){window[cb]=undefined;}}
  state.active={cleanup};
  window[cb]=function(payload){
    if(complete)return;complete=true;cleanup();state.active=null;
    if(request!==state.request||expectedYear!==state.year)return;
    if(!payload||payload.ok!==true||Number(payload.godina)!==expectedYear||!Array.isArray(payload.events)){
      status('Pristup nije odobren ili server nije vratio podatke. Proveri link za pregled.',true);return;
    }
    state.events=payload.events.filter(e=>e&&typeof e.date==='string'&&e.date.startsWith(expectedYear+'-'));
    state.lastUpdate=new Date();render();
    status(`${expectedYear}. · Ažurirano u ${state.lastUpdate.toLocaleTimeString('sr-RS',{hour:'2-digit',minute:'2-digit'})} · ${state.events.length} nastupa · Automatska provera na 60 sekundi`);
  };
  tag.onerror=function(){if(complete)return;complete=true;cleanup();state.active=null;if(request===state.request)status('Povezivanje nije uspelo. Proveri internet, Google pristup i objavljenu verziju koda.',true);};
  timer=setTimeout(()=>{if(complete)return;complete=true;cleanup();state.active=null;if(request===state.request)status('Google nije odgovorio u predviđenom roku. Pokušaj ponovo.',true);},25000);
  const u=new URL(state.config.url);
  u.searchParams.set('mode','team_jsonp');u.searchParams.set('godina',String(expectedYear));u.searchParams.set('k',state.config.key);u.searchParams.set('callback',cb);
  tag.src=u.href;document.head.append(tag);
}
function eventCount(m){return state.events.filter(e=>e.date.startsWith(`${state.year}-${pad(m+1)}-`)).length;}
function selectYear(year){if(!YEARS.includes(year)||state.year===year)return;cleanPending();state.request++;state.year=year;state.day=null;state.events=[];render();fetchYear();}
function selectMonth(m){state.month=m;state.day=null;render();document.getElementById('month-panel').scrollIntoView({behavior:'smooth',block:'start'});}
function selectDay(d){state.day=d;renderDays();renderDetails();}
function addPair(parent,label,value){if(value===undefined||value===null||String(value).trim()==='')return;const p=node('p');p.append(node('strong','',label+': '),document.createTextNode(String(value)));parent.append(p);}
function renderDetails(){
  els.detail.replaceChildren();if(!state.day){els.detail.append(node('p','empty-state','Izaberi datum za detalje.'));return;}
  const date=dateStr(state.year,state.month,state.day);const found=state.events.filter(e=>e.date===date);
  els.detail.append(node('p','detail-heading',humanDate(date)+' · '+found.length+' nastupa'));
  if(!found.length){els.detail.append(node('p','empty-state','Za izabrani datum nema prijavljenih nastupa.'));return;}
  for(const event of found){
    const box=node('article','event-card');box.append(node('h3','',event.type||'Nastup'));
    addPair(box,'Status',event.status);addPair(box,'Lokacija',event.venue);addPair(box,'Adresa',event.venueAddress);
    addPair(box,'Početak',event.startTime);addPair(box,'Završetak',event.endTime);addPair(box,'Okupljanje',event.gatherTime);addPair(box,'Tonska proba',event.soundcheckTime);
    addPair(box,'Tim',event.teamName);addPair(box,'DJ',event.djName);addPair(box,'Saksofonista',event.saxName);
    addPair(box,'Pesma za tortu',event.cakeSong);addPair(box,'Vreme torte',event.cakeTime);
    addPair(box,'Ulazak mladenaca',event.entranceSong);addPair(box,'Prvi ples',event.firstDance);
    const gear=Array.isArray(event.gear)?event.gear:[];
    for(const group of GROUPS){const things=gear.filter(g=>g.category===group);if(!things.length)continue;box.append(node('p','','Oprema — '+group));const list=node('ul');for(const part of things)list.append(node('li','',String(part.name||'')+' × '+String(part.quantity||1)));box.append(list);}
    addPair(box,'Napomene',event.note);
    if(event.venueAddress||event.venue){const a=node('a','','Otvori lokaciju u mapama');a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(event.venueAddress||event.venue);a.target='_blank';a.rel='noopener noreferrer';box.append(a);}
    els.detail.append(box);
  }
}
function renderDays(){
  const y=state.year,m=state.month;els.monthName.textContent=MONTHS[m]+' '+y+'.';els.days.replaceChildren();
  const offset=(new Date(y,m,1).getDay()+6)%7;
  for(let j=0;j<offset;j++)els.days.append(node('span','day empty'));
  const end=new Date(y,m+1,0).getDate();
  for(let d=1;d<=end;d++){
    const date=dateStr(y,m,d);const found=state.events.filter(e=>e.date===date);const booked=found.length>0;
    const cls='day'+(booked?' busy':'')+(booked&&found.every(e=>e.status==='Otkazano')?' cancelled':'')+(state.day===d?' selected':'');
    const b=node('button',cls,d);b.type='button';b.setAttribute('aria-label',`${humanDate(date)}, ${found.length} nastupa`);b.addEventListener('click',()=>selectDay(d));
    if(booked)b.append(node('span','marker'));els.days.append(b);
  }
}
function renderMonths(){els.months.replaceChildren();for(let m=0;m<12;m++){const count=eventCount(m);const b=node('button','month-tile'+(m===state.month?' active':'')+(count?' has-events':''));b.type='button';b.append(node('span','',MONTHS[m]),node('small','',`${count} ${count===1?'nastup':'nastupa'}`));b.addEventListener('click',()=>selectMonth(m));els.months.append(b);}}
function render(){els.year.textContent=state.year+'.';for(const b of document.querySelectorAll('.year-button'))b.setAttribute('aria-pressed',String(Number(b.dataset.year)===state.year));renderMonths();renderDays();renderDetails();}
function init(){
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  document.querySelectorAll('.year-button').forEach(b=>b.addEventListener('click',()=>selectYear(Number(b.dataset.year))));
  document.getElementById('prev-month').addEventListener('click',()=>{state.month=(state.month+11)%12;state.day=null;render();});
  document.getElementById('next-month').addEventListener('click',()=>{state.month=(state.month+1)%12;state.day=null;render();});
  document.getElementById('refresh').addEventListener('click',fetchYear);
  document.getElementById('connection').addEventListener('click',()=>{const ok=window.confirm('Zaboraviti sačuvan pristup na ovom uređaju? Ponovno povezivanje zahteva Google LIVE link.');if(ok){localStorage.removeItem(STORAGE_KEY);state.config=null;cleanPending();setupView();}});
  els.form.addEventListener('submit',event=>{event.preventDefault();try{const config=parseExistingLink(els.input.value);localStorage.setItem(STORAGE_KEY,JSON.stringify(config));state.config=config;els.input.value='';calendarView();}catch(ex){displayError(ex.message);}});
  if(DEMO){calendarView();return;}
  try{const stored=localStorage.getItem(STORAGE_KEY);if(stored){const parsed=JSON.parse(stored);if(parsed.url&&parsed.key&&typeof parsed.key==='string'){state.config=parsed;calendarView();return;}}}catch(e){}
  setupView();
}
init();
setInterval(()=>{if(!document.hidden&&!els.view.hidden)fetchYear();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!els.view.hidden)fetchYear();});
