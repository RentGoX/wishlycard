(function(){
"use strict";

/* ===================== UTIL ===================== */
const $app = document.getElementById('app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, attrs, ...children){
  const e = document.createElement(tag);
  if(attrs) for(const k in attrs){
    if(k === 'class') e.className = attrs[k];
    else if(k === 'html') e.innerHTML = attrs[k];
    else if(k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  children.flat().forEach(c=>{
    if(c === null || c === undefined) return;
    if(typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=> t.classList.remove('show'), 2400);
}

function b64e(str){ return btoa(unescape(encodeURIComponent(str))).replace(/=+$/,''); }
function b64d(str){ try{ return decodeURIComponent(escape(atob(str))); }catch(e){ return ''; } }

function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr){
  const seedFn = xmur3(seedStr);
  return mulberry32(seedFn());
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function pickN(rng, arr, n){
  const copy = arr.slice(); const out=[];
  while(copy.length && out.length<n){ out.push(copy.splice(Math.floor(rng()*copy.length),1)[0]); }
  return out;
}
function qs(str){
  const out = {};
  (str||'').replace(/^[#?]/,'').split('&').forEach(p=>{
    if(!p) return;
    const [k,v] = p.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v||'');
  });
  return out;
}
function buildQS(obj){
  return Object.keys(obj).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(obj[k])).join('&');
}

/* ===================== CONTENT SYSTEM ===================== */
// Expandable, data-driven. New relationships / occasions / vibes / lines can be added
// here without touching any rendering or animation logic.

const RELATIONSHIPS = [
  {id:'friend', label:'Friend', category:'friend'},
  {id:'bestfriend', label:'Best Friend', category:'friend'},
  {id:'boyfriend', label:'Boyfriend', category:'romantic'},
  {id:'girlfriend', label:'Girlfriend', category:'romantic'},
  {id:'husband', label:'Husband', category:'romantic'},
  {id:'wife', label:'Wife', category:'romantic'},
  {id:'mother', label:'Mother', category:'elder'},
  {id:'father', label:'Father', category:'elder'},
  {id:'brother', label:'Brother', category:'sibling'},
  {id:'sister', label:'Sister', category:'sibling'},
  {id:'son', label:'Son', category:'child'},
  {id:'daughter', label:'Daughter', category:'child'},
  {id:'student', label:'Student', category:'academic'},
  {id:'teacher', label:'Teacher', category:'academic'},
  {id:'cousin', label:'Cousin', category:'sibling'},
  {id:'uncle', label:'Uncle', category:'elder'},
  {id:'aunt', label:'Aunt', category:'elder'},
  {id:'grandmother', label:'Grandmother', category:'elder'},
  {id:'grandfather', label:'Grandfather', category:'elder'},
  {id:'lifepartner', label:'Life Partner', category:'romantic'},
  {id:'other', label:'Other', category:'other'},
];

const OCCASIONS = [
  {id:'birthday', label:'Birthday', emoji:'🎂', title:'Happy Birthday', scene:'birthday'},
  {id:'anniversary', label:'Anniversary', emoji:'💍', title:'Happy Anniversary', scene:'romantic'},
  {id:'wedding', label:'Wedding', emoji:'💒', title:'Congratulations', scene:'romantic'},
  {id:'congratulations', label:'Congratulations', emoji:'🏆', title:'Congratulations', scene:'achievement'},
  {id:'graduation', label:'Graduation', emoji:'🎓', title:'Congrats, Grad', scene:'achievement'},
  {id:'love', label:'Love', emoji:'❤️', title:'With Love', scene:'romantic'},
  {id:'bestwishes', label:'Best Wishes', emoji:'🌟', title:'Best Wishes', scene:'soft'},
  {id:'thankyou', label:'Thank You', emoji:'🙏', title:'Thank You', scene:'soft'},
  {id:'getwell', label:'Get Well Soon', emoji:'🌷', title:'Get Well Soon', scene:'soft'},
  {id:'goodluck', label:'Good Luck', emoji:'🍀', title:'Good Luck', scene:'achievement'},
  {id:'newbeginning', label:'New Beginning', emoji:'🌅', title:'New Beginnings', scene:'soft'},
  {id:'friendship', label:'Friendship', emoji:'🤝', title:'To Friendship', scene:'friend'},
  {id:'festival', label:'Festival', emoji:'🎊', title:'Happy Celebrations', scene:'friend'},
  {id:'other', label:'Other', emoji:'✨', title:'A Special Wish', scene:'soft'},
];

const VIBES = [
  {id:'emotional', label:'Emotional', emoji:'❤️', accent:'#ff9ab0', accent2:'#ffd39a', bg:'#26122a', particle:'hearts'},
  {id:'funny', label:'Funny', emoji:'😂', accent:'#ffd23f', accent2:'#ff6b6b', bg:'#1c1033', particle:'confetti-round'},
  {id:'elegant', label:'Elegant', emoji:'✨', accent:'#e9c46a', accent2:'#f4f1ea', bg:'#0e0b12', particle:'sparkle'},
  {id:'cute', label:'Cute', emoji:'🥰', accent:'#ffb6d9', accent2:'#c9a7ff', bg:'#2a1830', particle:'hearts-soft'},
  {id:'energetic', label:'Energetic', emoji:'🎉', accent:'#ff5e7e', accent2:'#ffd23f', bg:'#160b2e', particle:'confetti-fast'},
  {id:'romantic', label:'Romantic', emoji:'💕', accent:'#ff4d7d', accent2:'#ffd6e8', bg:'#220f1e', particle:'petals'},
  {id:'motivational', label:'Motivational', emoji:'🌟', accent:'#4dd8ff', accent2:'#ffd23f', bg:'#0b1330', particle:'sparkle'},
];

function relById(id){ return RELATIONSHIPS.find(r=>r.id===id) || RELATIONSHIPS[RELATIONSHIPS.length-1]; }
function occById(id){ return OCCASIONS.find(o=>o.id===id) || OCCASIONS[OCCASIONS.length-1]; }
function vibeById(id){ return VIBES.find(v=>v.id===id) || VIBES[0]; }

// Sentence pools by relationship category — used by the generative engine.
const OPENERS = {
  friend: ["Hey {name}, just so you know —", "{name}, my favorite human,", "To the friend who makes everything better,", "Okay {name}, real talk —"],
  romantic: ["{name}, my love,", "To the one who has my whole heart,", "{name},", "Every day with you, {name},"],
  elder: ["{name},", "To the most wonderful {rel} anyone could ask for,", "Dear {name},"],
  sibling: ["{name},", "Hey {rel},", "To my partner in crime,"],
  child: ["My dearest {name},", "{name}, my heart,", "To my incredible {rel},"],
  academic: ["{name},", "To a truly outstanding {rel},", "Dear {name},"],
  other: ["{name},", "To someone truly special,", "Dear {name},"]
};

const CLOSINGS = {
  friend: ["Cheers to us", "Your favorite person", "Always in your corner"],
  romantic: ["Forever yours", "All my love, always", "Yours, completely"],
  elder: ["With all my love and gratitude", "With love and respect", "Always grateful for you"],
  sibling: ["Love you always", "Your sibling, always", "With love"],
  child: ["With endless pride and love", "Loving you always", "Proud of you, always"],
  academic: ["With admiration", "With respect and gratitude", "Wishing you the best"],
  other: ["Warmly", "With appreciation", "Thinking of you"]
};

const VIBE_ADJ = {
  emotional: "heartfelt", funny: "wonderfully ridiculous", elegant: "graceful",
  cute: "utterly adorable", energetic: "electric", romantic: "tender", motivational: "inspiring"
};

const BODY_LINES = {
  birthday: [
    "Another year of you in the world is something worth celebrating properly — {adj} joy, better memories, and everything good headed your way.",
    "May this year bring you as much happiness as you bring to everyone around you, wrapped in a little extra {adj} magic.",
    "Here's to candles, cake, and a year ahead that's as {adj} and bright as you are."
  ],
  anniversary: [
    "Every year with you adds another chapter I wouldn't trade for anything — here's to a love that keeps getting more {adj}.",
    "Through everything, this has stayed true and {adj}. Happy anniversary — may there be so many more.",
    "Some things only get better with time, and this is one of them. Cheers to us, and to a future just as {adj}."
  ],
  wedding: [
    "May your life together be filled with laughter, patience, and a love that stays {adj} through every season.",
    "Here's to a partnership built on trust, joy, and an ever-growing, {adj} kind of love.",
    "Wishing you two a lifetime of inside jokes, quiet mornings, and {adj} moments together."
  ],
  congratulations: [
    "You worked for this, you earned this, and it shows — congratulations on something truly {adj}.",
    "Every bit of effort you put in led here. Enjoy this {adj} moment fully — you deserve it.",
    "This is proof of what happens when hard work meets heart. Congratulations, truly."
  ],
  graduation: [
    "From late nights to this moment — you did it. Here's to the next {adj} chapter waiting for you.",
    "This cap and gown represent every ounce of effort you put in. So proud of this {adj} milestone.",
    "The world is lucky to have someone like you stepping into it next. Congratulations, grad."
  ],
  love: [
    "You make ordinary days feel {adj}, and I don't think I say that enough.",
    "Loving you is the easiest, most {adj} thing I do — today and every day.",
    "Just a reminder, in case you needed one: you are deeply, {adj}ly loved."
  ],
  bestwishes: [
    "Sending you nothing but {adj} energy and good things for whatever comes next.",
    "Wishing you a path ahead that's as {adj} and smooth as you deserve.",
    "May everything you're hoping for find its way to you, in the most {adj} way."
  ],
  thankyou: [
    "What you did meant more than you know — thank you, from somewhere {adj} and real.",
    "I don't say it enough, so here it is plainly: thank you, truly, for being so {adj}.",
    "Gratitude doesn't always find the right words, but this is my {adj} attempt at it."
  ],
  getwell: [
    "Sending you gentle, {adj} energy for a smooth and speedy recovery.",
    "Rest up — the world is quieter and less {adj} without you in it fully.",
    "Wishing you comfort, patience, and a swift return to feeling like yourself again."
  ],
  goodluck: [
    "You've got this. Sending {adj} luck and even more confidence your way.",
    "Whatever happens, you've already shown up with {adj} effort — that's what matters most.",
    "Go get it. Rooting for a {adj}, well-deserved win."
  ],
  newbeginning: [
    "New chapters are nerve-wracking and {adj} all at once — may this one treat you especially well.",
    "Here's to fresh starts, brave choices, and a {adj} road ahead.",
    "Change is hard, but so are you. Wishing you a truly {adj} new beginning."
  ],
  friendship: [
    "Not everyone gets a friendship this {adj} — I don't take it for granted.",
    "Here's to more inside jokes, more chaos, and a friendship that keeps being {adj}.",
    "Grateful doesn't cover it, but it's a start: thank you for being so {adj} to know."
  ],
  festival: [
    "Wishing you a celebration full of light, warmth, and {adj} moments with the people you love.",
    "May this festival bring you joy, good food, and a truly {adj} time.",
    "Here's to celebrating well — a {adj} season, start to finish."
  ],
  other: [
    "Just wanted to send something {adj} your way today.",
    "Thinking of you and wishing you something genuinely {adj}.",
    "A small, {adj} reminder that you're appreciated."
  ]
};

// Hand-curated marquee templates for the brief's explicit example combinations —
// used when present, otherwise the generative engine above fills the gap.
const CURATED = {
  'birthday|student': [
    (n)=>`Here's to another year of showing up, working hard, and getting one step closer to everything you're building. Happy birthday, ${n} — the effort is paying off.`,
    (n)=>`New year, new chapter, same relentless drive. Wishing you a birthday as bright as your future, ${n}.`
  ],
  'birthday|mother': [
    (n)=>`Mom, you've given so much of yourself to everyone around you — today is entirely for you. Happy birthday, ${n}. I love you more than words hold.`,
    (n)=>`Every good thing I know, I learned watching you. Happy birthday to the heart of our family, ${n}.`
  ],
  'birthday|father': [
    (n)=>`Steady, strong, and always there — happy birthday, ${n}. Thank you for everything you've quietly given us.`,
    (n)=>`The example you've set means more than you know. Wishing you a birthday as solid and good as you are, ${n}.`
  ],
  'birthday|friend': [
    (n)=>`Another year of you being ridiculous, loyal, and impossible to replace. Happy birthday, ${n}! Let's cause some chaos.`,
    (n)=>`Cake first, questions later. Happy birthday to one of the best people I know, ${n}.`
  ],
  'anniversary|girlfriend': [
    (n)=>`Every year with you feels like the best decision I keep getting to make again. Happy anniversary, ${n} — here's to more.`,
    (n)=>`You are still, and always, my favorite person to love. Happy anniversary, ${n}.`
  ],
  'congratulations|teacher': [
    (n)=>`The impact you make rarely gets said out loud enough — so here it is: thank you, and congratulations, ${n}.`,
  ],
};

function tone(relCategory){
  return OPENERS[relCategory] ? relCategory : 'other';
}

function generateMessage({relationshipId, occasionId, vibeId, recipientName, seed}){
  const rel = relById(relationshipId);
  const occ = occById(occasionId);
  const key = occasionId+'|'+relationshipId;
  const rng = makeRng(seed || (relationshipId+occasionId+vibeId+recipientName));

  if(CURATED[key]){
    const fn = pick(rng, CURATED[key]);
    return fn(recipientName);
  }

  const cat = tone(rel.category);
  const opener = pick(rng, OPENERS[cat]).replace(/\{name\}/g, recipientName).replace(/\{rel\}/g, rel.label.toLowerCase());
  const bodyPool = BODY_LINES[occasionId] || BODY_LINES.other;
  const adj = VIBE_ADJ[vibeId] || 'wonderful';
  const body = pick(rng, bodyPool).replace(/\{adj\}/g, adj);
  const closing = pick(rng, CLOSINGS[cat]);
  return `${opener} ${body}`;
}

function chooseVibe(rng, relationshipId, occasionId){
  const rel = relById(relationshipId);
  const map = {
    romantic: ['romantic','emotional','cute'],
    elder: ['emotional','elegant'],
    sibling: ['funny','energetic'],
    child: ['emotional','cute'],
    academic: ['motivational','elegant'],
    friend: ['funny','energetic','cute'],
    other: ['elegant','emotional']
  };
  const pool = map[rel.category] || VIBES.map(v=>v.id);
  return pick(rng, pool);
}

/* ===================== ROUTER ===================== */
let STATE = { senderName:'', linkId:'' };

function currentRoute(){
  const hash = location.hash || '';
  if(hash.startsWith('#wish')) return {name:'wish', params: qs(hash.replace('#wish',''))};
  if(hash.startsWith('#create')) return {name:'create'};
  return {name:'home'};
}

function navigate(hash){
  location.hash = hash;
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', ()=>{ initCanvases(); render(); });

function render(){
  window.scrollTo(0,0);
  const route = currentRoute();
  $app.innerHTML = '';
  setVibeTheme(null); // reset to default theme outside wish stage
  if(route.name === 'home') renderHome();
  else if(route.name === 'create') renderCreate();
  else if(route.name === 'wish') renderWishEntry(route.params);
}

/* ===================== SHARED CHROME ===================== */
function Topbar(showBack){
  return el('div',{class:'topbar'},
    el('a',{class:'brand', href:'#', 'aria-label':'Wishly home', onclick:(e)=>{e.preventDefault(); navigate('');}},
      el('span',{class:'seal','aria-hidden':'true'}), 'Wishly'
    ),
    el('span',{class:'privacy-pill'}, 'No sign-up · No data stored')
  );
}

function Footer(){
  return el('footer',{class:'app-footer'}, 'Made with Wishly ✨ — your information is used only to create your wish and is never stored in a database.');
}

/* ===================== HOME ===================== */
function renderHome(){
  const screen = el('div',{class:'screen'});
  screen.appendChild(Topbar());

  const wrap = el('div',{class:'wrap center-col hero'});
  wrap.appendChild(el('div',{class:'eyebrow fade-el', style:'animation-delay:.05s'}, 'A surprise, made just for them'));
  wrap.appendChild(el('h1',{class:'fade-el', style:'animation-delay:.15s'}, 'Make someone\u2019s day special ', el('span',null,'❤️')));
  wrap.appendChild(el('p',{class:'sub fade-el', style:'animation-delay:.25s'}, 'Create a beautiful, personalized wish and send it as a surprise — no sign-up, no forms for them to fill out for you. They personalize it themselves when they open it.'));
  const actions = el('div',{class:'hero-actions fade-el', style:'animation-delay:.35s'},
    el('button',{class:'btn btn-primary btn-block', onclick:()=>navigate('#create')}, 'Create a Surprise ✨'),
    el('button',{class:'btn btn-ghost btn-block', onclick:()=>document.getElementById('how-it-works').scrollIntoView({behavior: reducedMotion?'auto':'smooth'})}, 'See How It Works')
  );
  wrap.appendChild(actions);
  screen.appendChild(wrap);

  const showcaseData = [
    {emoji:'🎂', label:'Birthday', sub:'Cake, candles & confetti', c1:'#5a3a12', c2:'#26170a'},
    {emoji:'🤝', label:'Friendship', sub:'Playful & bright', c1:'#1c3a4a', c2:'#0e1c26'},
    {emoji:'❤️', label:'Love', sub:'Petals & warm light', c1:'#4a1c2e', c2:'#1e0b13'},
    {emoji:'👨‍👩‍👧', label:'Family', sub:'Warm & elegant', c1:'#3a2a12', c2:'#1a1308'},
    {emoji:'🎓', label:'Graduation', sub:'Achievement & pride', c1:'#12304a', c2:'#08141f'},
    {emoji:'💍', label:'Wedding', sub:'Romantic & cinematic', c1:'#3a1230', c2:'#170a14'},
  ];
  const strip = el('div',{class:'showcase', 'aria-label':'Example wish styles'});
  showcaseData.forEach(s=>{
    strip.appendChild(el('div',{class:'show-card', style:`background:linear-gradient(160deg, ${s.c1}, ${s.c2});`},
      el('span',{class:'emo','aria-hidden':'true'}, s.emoji),
      el('div',{class:'lbl'}, s.label),
      el('div',{class:'sub'}, s.sub)
    ));
  });
  screen.appendChild(strip);

  const how = el('div',{class:'how-it-works wrap', id:'how-it-works'});
  how.appendChild(el('h2', null, 'How it works'));
  const steps = [
    ['Create your surprise', 'Enter your name and get a personal link in seconds — no account needed.'],
    ['Send the link', 'Share it on WhatsApp, Messenger, Facebook, or anywhere you like.'],
    ['They open & personalize', 'Your recipient adds their name, relationship, and occasion.'],
    ['A cinematic wish plays', 'A unique animated experience unfolds — never quite the same twice.'],
    ['They keep or share the card', 'A beautiful final card can be downloaded or shared right back.'],
  ];
  steps.forEach((s,i)=>{
    how.appendChild(el('div',{class:'step'},
      el('div',{class:'num'}, String(i+1).padStart(2,'0')),
      el('div',{class:'txt'}, el('h3',null,s[0]), el('p',null,s[1]))
    ));
  });
  screen.appendChild(how);
  screen.appendChild(Footer());
  $app.appendChild(screen);
}

/* ===================== CREATE (SENDER) ===================== */
function renderCreate(){
  const screen = el('div',{class:'screen'});
  screen.appendChild(Topbar());
  const wrap = el('div',{class:'wrap center-col'});

  let created = false;
  const formCard = el('div',{class:'card'});
  formCard.appendChild(el('h2',{style:'margin:0 0 6px;font-size:24px;'}, 'Create Your Surprise'));
  formCard.appendChild(el('p',{style:'color:var(--ink-dim);font-size:14.5px;margin:0 0 22px;'}, 'Your name, and who it\u2019s for.'));

  const field = el('div',{class:'field'});
  field.appendChild(el('label',{for:'sender-name'}, 'Your Name ', el('span',{class:'req'},'*')));
  const input = el('input',{class:'input', id:'sender-name', type:'text', maxlength:'40', placeholder:'Enter your name', autocomplete:'name'});
  const errMsg = el('div',{class:'err-msg', role:'alert'}, 'Please enter your name to continue.');
  field.appendChild(input); field.appendChild(errMsg);
  formCard.appendChild(field);

  const relField = el('div',{class:'field'});
  relField.appendChild(el('label',null, 'Who are you sending this to? ', el('span',{class:'req'},'*')));
  const relGrid = el('div',{class:'chip-grid', role:'group','aria-label':'Recipient relationship'});
  let selectedRel = null;
  RELATIONSHIPS.forEach(r=>{
    const chip = el('div',{class:'chip', tabindex:'0', role:'button', 'aria-pressed':'false'}, r.label);
    chip.dataset.id = r.id;
    chip.addEventListener('click', ()=>{ selectedRel = r.id; syncChips(relGrid, r.id, RELATIONSHIPS); relErr.classList.remove('show'); });
    chip.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }});
    relGrid.appendChild(chip);
  });
  const relErr = el('div',{class:'err-msg', role:'alert'}, 'Please select who this surprise is for.');
  relField.appendChild(relGrid); relField.appendChild(relErr);
  formCard.appendChild(relField);

  const occField = el('div',{class:'field'});
  occField.appendChild(el('label',null, 'What\u2019s the occasion? ', el('span',{class:'req'},'*')));
  const occGrid = el('div',{class:'chip-grid', role:'group','aria-label':'Occasion'});
  let selectedOcc = null;
  OCCASIONS.forEach(o=>{
    const chip = el('div',{class:'chip', tabindex:'0', role:'button', 'aria-pressed':'false'}, o.emoji+' '+o.label);
    chip.dataset.id = o.id;
    chip.addEventListener('click', ()=>{ selectedOcc = o.id; syncChips(occGrid, o.id, OCCASIONS); occErr.classList.remove('show'); });
    chip.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }});
    occGrid.appendChild(chip);
  });
  const occErr = el('div',{class:'err-msg', role:'alert'}, 'Please select the occasion.');
  occField.appendChild(occGrid); occField.appendChild(occErr);
  formCard.appendChild(occField);

  const createBtn = el('button',{class:'btn btn-primary btn-block'}, 'Create Surprise ✨');
  formCard.appendChild(createBtn);
  wrap.appendChild(formCard);
  wrap.appendChild(el('p',{class:'privacy-note'}, 'Your information is used only to create your personalized wish experience and is not stored in a database.'));

  const resultHolder = el('div');
  wrap.appendChild(resultHolder);
  screen.appendChild(wrap);
  screen.appendChild(Footer());
  $app.appendChild(screen);

  createBtn.addEventListener('click', ()=>{
    const name = input.value.trim();
    let ok = true;
    if(!name){
      input.classList.add('err'); errMsg.classList.add('show'); ok = false;
    } else { input.classList.remove('err'); errMsg.classList.remove('show'); }
    if(!selectedRel){
      relErr.classList.add('show'); ok = false;
    } else relErr.classList.remove('show');
    if(!selectedOcc){
      occErr.classList.add('show'); ok = false;
    } else occErr.classList.remove('show');
    if(!ok){
      const firstErr = formCard.querySelector('.err-msg.show');
      if(firstErr) firstErr.scrollIntoView({behavior: reducedMotion?'auto':'smooth', block:'center'});
      else input.focus();
      return;
    }
    const id = Math.random().toString(36).slice(2,8);
    STATE.senderName = name; STATE.linkId = id;
    const link = location.origin + location.pathname + '#wish?' + buildQS({from: b64e(name), id, rel: selectedRel, occ: selectedOcc});

    formCard.querySelector('#sender-name').setAttribute('disabled','true');
    relGrid.querySelectorAll('.chip').forEach(c=> c.style.pointerEvents='none');
    occGrid.querySelectorAll('.chip').forEach(c=> c.style.pointerEvents='none');
    createBtn.setAttribute('disabled','true');
    createBtn.textContent = 'Created ✓';

    resultHolder.innerHTML = '';
    const resCard = el('div',{class:'card', style:'margin-top:18px;'});
    resCard.appendChild(el('h3',{style:'margin:0 0 4px;font-size:19px;'}, 'Your surprise is ready! 🎁'));
    resCard.appendChild(el('p',{style:'color:var(--ink-dim);font-size:14px;margin:0 0 16px;'}, 'Send this link to the person you want to surprise.'));
    resCard.appendChild(el('div',{class:'link-box'}, el('span',{style:'flex:1;'}, link)));

    const shareGrid = el('div',{class:'share-grid', style:'margin-top:16px;'});
    shareGrid.appendChild(shareButton('WhatsApp', '💬', ()=>{
      window.open(`https://wa.me/?text=${encodeURIComponent(name+' has created a special surprise for you! Open it here: '+link)}`, '_blank');
    }));
    shareGrid.appendChild(shareButton('Facebook', '📘', ()=>{
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
    }));
    shareGrid.appendChild(shareButton('Messenger', '✈️', ()=>{
      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(link)}&app_id=0&redirect_uri=${encodeURIComponent(link)}`, '_blank');
    }));
    shareGrid.appendChild(shareButton('Copy Link', '🔗', ()=>{
      copyToClipboard(link); toast('Link copied!');
    }));
    resCard.appendChild(shareGrid);

    const moreRow = el('div',{class:'btn-row', style:'margin-top:14px;'});
    if(navigator.share){
      moreRow.appendChild(el('button',{class:'btn btn-ghost btn-sm', onclick:()=>{
        navigator.share({title:'A surprise for you ✨', text:`${name} has created a special surprise for you!`, url:link}).catch(()=>{});
      }}, 'Share More'));
    }
    moreRow.appendChild(el('button',{class:'btn btn-ghost btn-sm', onclick:()=>navigate('#wish?'+buildQS({from:b64e(name), id, rel:selectedRel, occ:selectedOcc}))}, 'Preview as Recipient'));
    resCard.appendChild(moreRow);

    resultHolder.appendChild(resCard);
    resCard.scrollIntoView({behavior: reducedMotion?'auto':'smooth', block:'center'});
  });

  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') createBtn.click(); });
}

function shareButton(label, icon, onClick){
  return el('button',{class:'share-btn', onclick:onClick}, el('span',{class:'ic','aria-hidden':'true'},icon), label);
}

function copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

/* ===================== WISH (RECIPIENT) ===================== */
function renderWishEntry(params){
  let senderName = params.from ? b64d(params.from) : '';
  if(!senderName) senderName = 'Someone';
  renderWelcome(senderName, params);
}

function renderWelcome(senderName, params){
  const screen = el('div',{class:'cinema'});
  screen.appendChild(el('div',{class:'glow-ring','aria-hidden':'true'}));
  screen.appendChild(el('div',{class:'kicker fade-el'}, 'A surprise has arrived'));
  screen.appendChild(el('h1',{class:'fade-el', style:'animation-delay:.15s'}, el('span',{class:'from-name'}, senderName), ' has created a special surprise for you\u2026'));
  const openBtn = el('button',{class:'btn btn-primary fade-el', style:'animation-delay:.35s;margin-top:18px;', onclick:()=>renderRecipientForm(senderName, params)}, 'OPEN MY SURPRISE ✨');
  screen.appendChild(openBtn);
  $app.appendChild(screen);
  openBtn.focus({preventScroll:true});
}

function renderRecipientForm(senderName, params, prefill){
  prefill = prefill || {};
  const screen = el('div',{class:'screen'});
  screen.appendChild(Topbar());
  const wrap = el('div',{class:'wrap center-col'});
  const card = el('div',{class:'card'});
  card.appendChild(el('div',{class:'eyebrow'}, 'From '+senderName));
  card.appendChild(el('h2',{style:'margin:0 0 22px;font-size:24px;'}, 'Tell us about you'));

  // Name
  const nameField = el('div',{class:'field'});
  nameField.appendChild(el('label',{for:'r-name'}, 'Your Name ', el('span',{class:'req'},'*')));
  const nameInput = el('input',{class:'input', id:'r-name', type:'text', maxlength:'40', placeholder:'Enter your name', value: prefill.name||''});
  const nameErr = el('div',{class:'err-msg', role:'alert'}, 'Please enter your name.');
  nameField.appendChild(nameInput); nameField.appendChild(nameErr);
  card.appendChild(nameField);

  // Relationship — locked if the sender already chose it, otherwise selectable (older links)
  const lockedRelId = params && params.rel ? params.rel : null;
  const relField = el('div',{class:'field'});
  const relErr = el('div',{class:'err-msg', role:'alert'}, 'Please select a relationship.');
  let selectedRel = prefill.rel || lockedRelId || null;
  let relGrid = null;
  if(lockedRelId){
    const lockedLabel = relById(lockedRelId).label;
    relField.appendChild(el('label',null, 'Your relationship'));
    relField.appendChild(el('div',{class:'chip selected', style:'display:inline-flex;cursor:default;pointer-events:none;'}, lockedLabel+' 🔒'));
    relField.appendChild(el('div',{style:'font-size:12.5px;color:var(--ink-faint);margin-top:8px;'}, senderName+' set this when they created your surprise.'));
  } else {
    relField.appendChild(el('label',null, 'What\u2019s your relationship? ', el('span',{class:'req'},'*')));
    relGrid = el('div',{class:'chip-grid', role:'group','aria-label':'Relationship'});
    RELATIONSHIPS.forEach(r=>{
      const chip = el('div',{class:'chip'+(selectedRel===r.id?' selected':''), tabindex:'0', role:'button', 'aria-pressed': selectedRel===r.id?'true':'false'}, r.label);
      chip.addEventListener('click', ()=>{ selectedRel=r.id; syncChips(relGrid, r.id, RELATIONSHIPS); relErr.classList.remove('show'); });
      chip.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }});
      chip.dataset.id = r.id;
      relGrid.appendChild(chip);
    });
    relField.appendChild(relGrid);
  }
  relField.appendChild(relErr);
  card.appendChild(relField);

  // Occasion — locked if the sender already chose it, otherwise selectable (older links)
  const lockedOccId = params && params.occ ? params.occ : null;
  const occField = el('div',{class:'field'});
  const occErr = el('div',{class:'err-msg', role:'alert'}, 'Please select an occasion.');
  let selectedOcc = prefill.occ || lockedOccId || null;
  let occGrid = null;
  if(lockedOccId){
    const lockedOcc = occById(lockedOccId);
    occField.appendChild(el('label',null, 'Occasion'));
    occField.appendChild(el('div',{class:'chip selected', style:'display:inline-flex;cursor:default;pointer-events:none;'}, lockedOcc.emoji+' '+lockedOcc.label+' 🔒'));
    occField.appendChild(el('div',{style:'font-size:12.5px;color:var(--ink-faint);margin-top:8px;'}, senderName+' set this when they created your surprise.'));
  } else {
    occField.appendChild(el('label',null, 'What\u2019s the occasion? ', el('span',{class:'req'},'*')));
    occGrid = el('div',{class:'chip-grid', role:'group','aria-label':'Occasion'});
    OCCASIONS.forEach(o=>{
      const chip = el('div',{class:'chip'+(selectedOcc===o.id?' selected':''), tabindex:'0', role:'button', 'aria-pressed': selectedOcc===o.id?'true':'false'}, o.emoji+' '+o.label);
      chip.addEventListener('click', ()=>{ selectedOcc=o.id; syncChips(occGrid, o.id, OCCASIONS); occErr.classList.remove('show'); });
      chip.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }});
      chip.dataset.id = o.id;
      occGrid.appendChild(chip);
    });
    occField.appendChild(occGrid);
  }
  occField.appendChild(occErr);
  card.appendChild(occField);

  // Vibe (optional)
  const vibeField = el('div',{class:'field'});
  vibeField.appendChild(el('label',null, 'Choose Your Vibe ', el('span',{style:'color:var(--ink-faint);font-weight:500;'},'(optional)')));
  const vibeGrid = el('div',{class:'vibe-grid'});
  let selectedVibe = prefill.vibe || null;
  VIBES.forEach(v=>{
    const chip = el('div',{class:'vibe-chip'+(selectedVibe===v.id?' selected':''), tabindex:'0', role:'button'},
      el('span',{class:'e','aria-hidden':'true'}, v.emoji), el('span',{class:'t'}, v.label));
    chip.addEventListener('click', ()=>{ selectedVibe = (selectedVibe===v.id)? null : v.id; syncChips(vibeGrid, selectedVibe, VIBES); });
    chip.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }});
    chip.dataset.id = v.id;
    vibeGrid.appendChild(chip);
  });
  vibeField.appendChild(vibeGrid);
  const surpriseBtn = el('button',{class:'surprise-me-btn'}, '✨ Surprise Me');
  surpriseBtn.addEventListener('click', ()=>{
    const rng = makeRng((nameInput.value||'x')+Date.now());
    selectedVibe = pick(rng, VIBES.map(v=>v.id));
    syncChips(vibeGrid, selectedVibe, VIBES);
    toast('We picked a vibe for you ✨');
  });
  vibeField.appendChild(surpriseBtn);
  card.appendChild(vibeField);

  const submitBtn = el('button',{class:'btn btn-primary btn-block', style:'margin-top:8px;'}, 'CREATE MY WISH ❤️');
  card.appendChild(submitBtn);

  wrap.appendChild(card);
  wrap.appendChild(el('p',{class:'privacy-note'}, 'Your information is used only to create your personalized wish experience and is not stored in a database.'));
  screen.appendChild(wrap);
  screen.appendChild(Footer());
  $app.appendChild(screen);

  submitBtn.addEventListener('click', ()=>{
    let ok = true;
    const name = nameInput.value.trim();
    if(!name){ nameInput.classList.add('err'); nameErr.classList.add('show'); ok=false; } else { nameInput.classList.remove('err'); nameErr.classList.remove('show'); }
    if(!selectedRel){ relErr.classList.add('show'); ok=false; } else relErr.classList.remove('show'); // always set when locked
    if(!selectedOcc){ occErr.classList.add('show'); ok=false; } else occErr.classList.remove('show');
    if(!ok){
      const firstErr = card.querySelector('.err-msg.show');
      if(firstErr) firstErr.scrollIntoView({behavior: reducedMotion?'auto':'smooth', block:'center'});
      return;
    }
    let vibe = selectedVibe;
    const rng = makeRng(name+selectedRel+selectedOcc+Date.now());
    if(!vibe) vibe = chooseVibe(rng, selectedRel, selectedOcc);

    renderGenerating(senderName, {name, rel:selectedRel, occ:selectedOcc, vibe}, params);
  });
}

function syncChips(container, selectedId, dataArr){
  Array.from(container.children).forEach(c=>{
    const on = c.dataset.id === selectedId;
    c.classList.toggle('selected', on);
    c.setAttribute('aria-pressed', on?'true':'false');
  });
}

/* ===================== GENERATING / CINEMATIC ===================== */
function renderGenerating(senderName, data, params){
  const screen = el('div',{class:'cinema'});
  const kicker = el('div',{class:'kicker fade-el'}, 'Just a moment');
  const heading = el('h1',{class:'fade-el', style:'animation-delay:.15s'}, 'Creating something special for you\u2026');
  screen.appendChild(el('div',{class:'glow-ring','aria-hidden':'true'}));
  screen.appendChild(kicker);
  screen.appendChild(heading);
  const skipBtn = el('button',{class:'skip'}, 'Skip');
  screen.appendChild(skipBtn);
  $app.appendChild(screen);

  let advanced = false;
  function advance(){
    if(advanced) return; advanced = true;
    heading.textContent = 'This wish was made especially for\u2026';
    heading.classList.remove('fade-el'); void heading.offsetWidth; heading.classList.add('fade-el');
    setTimeout(()=>{
      heading.innerHTML = ''; heading.appendChild(el('span',{class:'from-name'}, data.name));
      setTimeout(()=> renderWishExperience(senderName, data, params), reducedMotion?150: 1100);
    }, reducedMotion?100:1200);
  }
  const timer = setTimeout(advance, reducedMotion?200:2600);
  skipBtn.addEventListener('click', ()=>{ clearTimeout(timer); if(!advanced){ advanced=true; renderWishExperience(senderName, data, params); } });
}

/* ===================== VIBE THEME ===================== */
function setVibeTheme(vibe){
  const root = document.documentElement.style;
  if(!vibe){
    root.setProperty('--vibe-accent', '#e8b85c');
    root.setProperty('--vibe-accent-2', '#ff9ab0');
    root.setProperty('--vibe-bg', '#150e27');
    return;
  }
  root.setProperty('--vibe-accent', vibe.accent);
  root.setProperty('--vibe-accent-2', vibe.accent2);
  root.setProperty('--vibe-bg', vibe.bg);
}

/* ===================== WISH EXPERIENCE (ANIMATED SCENES) ===================== */
function renderWishExperience(senderName, data, params){
  const occ = occById(data.occ);
  const vibe = vibeById(data.vibe);
  setVibeTheme(vibe);

  const stage = el('div',{class:'stage'});
  const obj = el('div',{class:'scene-obj'});
  stage.appendChild(obj);
  $app.innerHTML = '';
  $app.appendChild(stage);

  const message = generateMessage({relationshipId:data.rel, occasionId:data.occ, vibeId:data.vibe, recipientName:data.name, seed:data.name+data.rel+data.occ+Date.now()});

  const scenePlan = buildScenePlan(occ.scene, vibe);
  let step = 0;

  // Name reveal + message as final in-sequence step before card
  scenePlan.push({title:null, custom:'reveal', duration: reducedMotion?300:2600});

  function play2(){
    if(step >= scenePlan.length){ renderFinalCard(senderName, data, occ, vibe, message, params); return; }
    const s = scenePlan[step];
    obj.innerHTML='';
    if(s.custom === 'reveal'){
      obj.appendChild(el('div',{class:'stage-text-kicker'}, 'A wish, just for'));
      obj.appendChild(el('div',{class:'stage-name pop-in'}, data.name));
      obj.appendChild(el('div',{class:'stage-message pop-in', style:'animation-delay:.25s;margin-top:10px;'}, message));
      burstParticles(vibe.particle, 40);
    } else {
      if(s.emoji) obj.appendChild(el('div',{class:'emoji-hero pop-in','aria-hidden':'true'}, s.emoji));
      if(s.kicker) obj.appendChild(el('div',{class:'stage-text-kicker'}, s.kicker));
      if(s.title) obj.appendChild(el('div',{class:'stage-title'}, s.title));
      if(s.burst) burstParticles(vibe.particle, s.burstCount || 60);
    }
    step++;
    setTimeout(play2, reducedMotion ? 220 : s.duration);
  }
  play2();
}

function buildScenePlan(sceneType, vibe){
  const plans = {
    birthday: [
      {emoji:'🎁', kicker:'', title:null, duration:1300},
      {emoji:'✨', kicker:'The gift opens\u2026', duration:1100, burst:true, burstCount:50},
      {emoji:'🎈', kicker:'Balloons rising\u2026', duration:1200, burst:true, burstCount:70},
      {emoji:'🎂', kicker:'Make a wish\u2026', duration:1400, burst:true, burstCount:90},
    ],
    romantic: [
      {emoji:'🌹', kicker:'', duration:1300, burst:true, burstCount:40},
      {emoji:'💍', kicker:'A moment, just for you\u2026', duration:1300, burst:true, burstCount:60},
      {emoji:'💕', kicker:'', duration:1300, burst:true, burstCount:80},
    ],
    achievement: [
      {emoji:'🎓', kicker:'', duration:1200, burst:true, burstCount:30},
      {emoji:'🏆', kicker:'Every bit of effort, recognized\u2026', duration:1300, burst:true, burstCount:70},
      {emoji:'🌟', kicker:'', duration:1200, burst:true, burstCount:80},
    ],
    friend: [
      {emoji:'🎈', kicker:'', duration:1100, burst:true, burstCount:50},
      {emoji:'🎊', kicker:'Let\u2019s celebrate\u2026', duration:1300, burst:true, burstCount:90},
    ],
    soft: [
      {emoji:'🌷', kicker:'', duration:1400, burst:true, burstCount:24},
      {emoji:'🌤️', kicker:'', duration:1300, burst:true, burstCount:30},
    ],
  };
  return (plans[sceneType] || plans.soft).map(s=>s);
}

/* ===================== FINAL CARD ===================== */
function renderFinalCard(senderName, data, occ, vibe, message, params){
  setVibeTheme(vibe);
  const screen = el('div',{class:'screen'});
  screen.appendChild(Topbar());
  const wrap = el('div',{class:'wrap final-card-wrap'});

  const fc = el('div',{class:'final-card', id:'final-card-el'});
  fc.appendChild(el('div',{class:'fc-emoji','aria-hidden':'true'}, occ.emoji));
  fc.appendChild(el('div',{class:'fc-title'}, occ.title.toUpperCase()));
  fc.appendChild(el('div',{class:'fc-name'}, data.name));
  fc.appendChild(el('div',{class:'fc-msg'}, message));
  fc.appendChild(el('div',{class:'fc-sign'}, 'With love, ', senderName, ' ✨'));
  fc.appendChild(el('div',{class:'fc-brand'}, 'Wishly ✨'));
  wrap.appendChild(fc);

  burstParticles(vibe.particle, 70);

  const shareTitle = el('h3',{style:'margin:26px 0 12px;font-size:17px;'}, 'Share this wish');
  wrap.appendChild(shareTitle);

  const link = location.origin + location.pathname + '#wish?' + buildQS({from: b64e(senderName), id: (params&&params.id)||''});
  const shareGrid = el('div',{class:'share-grid'});
  shareGrid.appendChild(shareButton('WhatsApp', '💬', ()=>{
    window.open(`https://wa.me/?text=${encodeURIComponent('I just received the sweetest surprise wish! '+link)}`, '_blank');
  }));
  shareGrid.appendChild(shareButton('Facebook', '📘', ()=>{
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
  }));
  shareGrid.appendChild(shareButton('Messenger', '✈️', ()=>{
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(link)}&app_id=0&redirect_uri=${encodeURIComponent(link)}`, '_blank');
  }));
  shareGrid.appendChild(shareButton('Copy Link', '🔗', ()=>{ copyToClipboard(link); toast('Link copied!'); }));
  wrap.appendChild(shareGrid);

  const actions = el('div',{class:'actions-stack'});
  if(navigator.share){
    actions.appendChild(el('button',{class:'btn btn-ghost btn-block', onclick:()=>{
      navigator.share({title: occ.title, text: message, url: link}).catch(()=>{});
    }}, 'Share via\u2026'));
  }
  actions.appendChild(el('button',{class:'btn btn-primary btn-block', onclick:()=> downloadCard(senderName, data, occ, vibe, message)}, 'Download Card ⬇'));
  actions.appendChild(el('button',{class:'btn btn-ghost btn-block', onclick:()=> renderRecipientForm(senderName, params, {name:data.name})}, 'Create Another Wish ❤️'));
  actions.appendChild(el('button',{class:'btn btn-ghost btn-block', onclick:()=> navigate('')}, 'Back to Home'));
  wrap.appendChild(actions);

  screen.appendChild(wrap);
  screen.appendChild(Footer());
  $app.innerHTML='';
  $app.appendChild(screen);
}

function downloadCard(senderName, data, occ, vibe, message){
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  function hexToRgb(hex){
    const h = hex.replace('#','');
    const n = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  const bgRgb = hexToRgb(vibe.bg);
  const accRgb = hexToRgb(vibe.accent);

  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0, `rgba(${accRgb[0]},${accRgb[1]},${accRgb[2]},0.28)`);
  grad.addColorStop(0.55, `rgb(${bgRgb[0]},${bgRgb[1]},${bgRgb[2]})`);
  grad.addColorStop(1, `rgb(${Math.max(bgRgb[0]-10,0)},${Math.max(bgRgb[1]-10,0)},${Math.max(bgRgb[2]-10,0)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle = `rgba(${accRgb[0]},${accRgb[1]},${accRgb[2]},0.5)`;
  ctx.lineWidth = 3;
  ctx.strokeRect(28,28,W-56,H-56);

  ctx.textAlign='center';
  ctx.fillStyle = '#f4eefc';
  ctx.font = '92px sans-serif';
  ctx.fillText(occ.emoji, W/2, 260);

  ctx.font = '700 54px Georgia, serif';
  ctx.fillStyle = '#f4eefc';
  ctx.fillText(occ.title.toUpperCase(), W/2, 380);

  ctx.font = 'italic 64px Georgia, serif';
  ctx.fillStyle = vibe.accent;
  ctx.fillText(data.name, W/2, 470);

  ctx.font = '32px Georgia, serif';
  ctx.fillStyle = '#c8bcdb';
  wrapText(ctx, message, W/2, 580, 820, 46, 6);

  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillStyle = '#f4eefc';
  ctx.fillText('With love, '+senderName+' ✨', W/2, H-160);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#8f80ab';
  ctx.letterSpacing = '3px';
  ctx.fillText('WISHLY', W/2, H-90);

  canvas.toBlob((blob)=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wishly-${data.name.replace(/\s+/g,'_')}-${occ.id}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('Card downloaded!');
  }, 'image/png');
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = text.split(' ');
  let line = ''; let lines = [];
  for(let i=0;i<words.length;i++){
    const test = line + words[i] + ' ';
    if(ctx.measureText(test).width > maxWidth && line !== ''){
      lines.push(line); line = words[i] + ' ';
    } else line = test;
  }
  lines.push(line);
  if(lines.length > maxLines){ lines = lines.slice(0,maxLines); lines[maxLines-1] = lines[maxLines-1].trim()+'\u2026'; }
  const startY = y - ((lines.length-1)*lineHeight)/2;
  lines.forEach((l,i)=> ctx.fillText(l.trim(), x, startY + i*lineHeight));
}

/* ===================== PARTICLE ENGINE ===================== */
let pCanvas, pCtx, bCanvas, bCtx, particles = [], rafId = null;
function initCanvases(){
  pCanvas = document.getElementById('particle-canvas');
  pCtx = pCanvas.getContext('2d');
  bCanvas = document.getElementById('bg-canvas');
  bCtx = bCanvas.getContext('2d');
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  drawAmbientStars();
  loop();
}
function resizeCanvases(){
  [pCanvas, bCanvas].forEach(c=>{
    c.width = window.innerWidth * devicePixelRatio;
    c.height = window.innerHeight * devicePixelRatio;
  });
  drawAmbientStars();
}
function drawAmbientStars(){
  bCtx.clearRect(0,0,bCanvas.width,bCanvas.height);
  const dpr = devicePixelRatio;
  const rng = makeRng('stars-fixed-seed');
  const count = Math.min(90, Math.floor((bCanvas.width*bCanvas.height)/90000));
  for(let i=0;i<count;i++){
    const x = rng()*bCanvas.width, y = rng()*bCanvas.height, r = rng()*1.6*dpr+0.3;
    bCtx.beginPath();
    bCtx.fillStyle = `rgba(244,238,252,${0.15+rng()*0.35})`;
    bCtx.arc(x,y,r,0,Math.PI*2);
    bCtx.fill();
  }
}

const PARTICLE_GLYPHS = {
  'hearts': ['❤️','💛','💕'],
  'hearts-soft': ['💗','💖','🩷'],
  'petals': ['🌸','🌹','🥀'],
  'sparkle': ['✨','⭐','🌟'],
  'confetti-round': ['🎊','🎉','😂'],
  'confetti-fast': ['🎉','🎊','⚡'],
};

function burstParticles(type, count){
  if(reducedMotion) count = Math.min(count, 12);
  const dpr = devicePixelRatio;
  const glyphs = PARTICLE_GLYPHS[type] || ['✨'];
  const w = pCanvas.width, h = pCanvas.height;
  for(let i=0;i<count;i++){
    particles.push({
      x: w/2 + (Math.random()-0.5)*w*0.5,
      y: h*0.35 + (Math.random()-0.5)*h*0.15,
      vx: (Math.random()-0.5)*4*dpr,
      vy: (-Math.random()*5-2)*dpr,
      g: 0.09*dpr,
      rot: Math.random()*Math.PI*2,
      vr: (Math.random()-0.5)*0.2,
      size: (14+Math.random()*18)*dpr,
      glyph: glyphs[Math.floor(Math.random()*glyphs.length)],
      life: 0,
      maxLife: 90+Math.random()*60,
      opacity: 1
    });
  }
  if(particles.length > 400) particles.splice(0, particles.length-400);
}

function loop(){
  pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  particles.forEach(p=>{
    p.life++;
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr;
    p.opacity = Math.max(0, 1 - p.life/p.maxLife);
    pCtx.save();
    pCtx.globalAlpha = p.opacity;
    pCtx.translate(p.x, p.y);
    pCtx.rotate(p.rot);
    pCtx.font = p.size+'px sans-serif';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText(p.glyph, 0, 0);
    pCtx.restore();
  });
  particles = particles.filter(p=> p.life < p.maxLife && p.y < pCanvas.height+80);
  rafId = requestAnimationFrame(loop);
}

})();
