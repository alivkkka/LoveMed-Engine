import { setExtensionPrompt, extension_prompt_types, eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';

const META_KEY='lovemed_state_v1', UI_KEY='lovemed_ui_v1', LIBRARY_KEY='lovemed_library_v2', LEGACY_LIBRARY_KEY='lovemed_library_v1', REL_MAX=200;

const REL_FIELDS=[
['trust','Доверие'],['affection','Привязанность'],['love','Любовь'],['sympathy','Симпатия'],['friendship','Дружба'],['respect','Уважение'],
['desire','Желание'],['passion','Страсть'],['arousal','Возбуждение'],['obsession','Одержимость'],['tenderness','Нежность'],['admiration','Восхищение'],
['jealousy','Ревность'],['resentment','Обида'],['irritation','Раздражение'],['anger','Злость'],['fear','Страх'],['sadness','Грусть'],
['disappointment','Разочарование'],['joy','Радость'],['fondness','Умиление'],['stress','Стресс'],['tension','Напряжение'],['antipathy','Антипатия'],['hate','Ненависть']
];
const REL_LABEL=Object.fromEntries(REL_FIELDS), DEFAULT_VISIBLE=['love','trust','affection','desire','tension','tenderness'];

/* Built-in library. Keep this list neutral; user can add/edit their own records in the UI. */
const KINKS=[
['dominance','Доминирование','psych'],['submission','Подчинение','psych'],['praise','Похвала','psych'],['teasing','Поддразнивание','psych'],
['control','Контроль','psych'],['care','Забота','psych'],['sensitivity','Сенсорика','physical'],['restriction','Ограничение движений','physical'],
['roleplay','Ролевой сценарий','situational'],['risk','Риск','situational'],['romance','Романтика','romantic'],['gentle','Мягкость','romantic'],
['intensity','Интенсивность','physical']
];

const KINK_WORDS={
dominance:['dominant','domination','dominance','доминир'],
submission:['submissive','submission','подчинен','подчинён','послушн'],
praise:['praise','похвал','умница'],
teasing:['teasing','tease','дразн','поддразн','провоцир'],
control:['control','контроль'],
care:['care','caring','забота'],
sensitivity:['sensory','sensitivity','сенсор','чувствитель'],
restriction:['restriction','restraint','ограничен','фиксац'],
roleplay:['roleplay','role play','ролевая игра','ролевые игры'],
risk:['risk','danger','риск','опасн'],
romance:['romance','romantic','романтик','романтика'],
gentle:['gentle','soft','tender','мягк','нежн'],
intensity:['intensity','intense','интенсив','сильн']
};

const KINK_DESC={
dominance:'Динамика лидерства и инициативы.',
submission:'Динамика уступки инициативы партнёру.',
praise:'Положительная реакция на похвалу и одобрение.',
teasing:'Игровое поддразнивание и провокация.',
control:'Тема контроля и управляемости ситуации.',
care:'Забота, поддержка и внимание к партнёру.',
sensitivity:'Выраженная чувствительность к сенсорным стимулам.',
restriction:'Тема ограничения свободы движения.',
roleplay:'Интерес к ролевым сценариям и образам.',
risk:'Интерес к рискованным или напряжённым ситуациям.',
romance:'Романтическая близость и эмоциональный подтекст.',
gentle:'Предпочтение мягкой и бережной динамики.',
intensity:'Предпочтение более выраженной эмоциональной динамики.'
};

const CAT_LABEL={psych:'Психологические',physical:'Физические / сенсорные',situational:'Ситуационные',romantic:'Романтические'};

const defaults=()=>({enabled:true,autoTrack:true,autoReaction:true,relation:Object.fromEntries(REL_FIELDS.map(([k])=>[k,0])),activeFeelings:[],lastShift:'',diagnosis:[],diagnosisManual:{added:[],removed:[]},anamnesis:[],anamnesisAt:0,reactionIntensity:55,reactionChance:35,reactionCooldown:4,reactionCooldownRemaining:0,lastReaction:'',contacts:[],history:[],charName:'',updatedAt:Date.now(),diagnostics:{lastParseAt:0,lastParseStatus:'Ожидает проверки',lastParseError:''}});
const ctx=()=>{try{return getContext?.()||globalThis.SillyTavern?.getContext?.()||{};}catch{return {};}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const clamp=(n,min=0,max=REL_MAX)=>Math.max(min,Math.min(max,Number(n)||0));

function merge(raw){
 const d=defaults(),s=Object.assign(d,raw||{});
 s.relation=Object.assign({},d.relation,raw?.relation||{});
 for(const k of ['activeFeelings','diagnosis','anamnesis','contacts','history'])if(!Array.isArray(s[k]))s[k]=[];
 s.diagnostics=Object.assign({},d.diagnostics,raw?.diagnostics||{});
 const dm=raw?.diagnosisManual||{};s.diagnosisManual={added:Array.isArray(dm.added)?dm.added:[],removed:Array.isArray(dm.removed)?dm.removed:[]};
 return s;
}
function chatKey(){
 const c=ctx(),who=c.groupId?`group-${c.groupId}`:`char-${c.characterId??'none'}`,chat=c.chatId||c.chatFile||c.chatMetadata?.chat_id||c.chatMetadata?.file_name||'current';
 return `${who}:${String(chat)}`.replace(/[^a-zA-Z0-9_.:-]/g,'_').slice(0,220);
}
function getState(){
 const c=ctx();let m=null,b=null;
 try{m=c.chatMetadata?.[META_KEY]||null;}catch{}
 try{b=JSON.parse(localStorage.getItem(`lovemed_backup:${chatKey()}`)||'null');}catch{}
 return merge(m&&b?((b.updatedAt||0)>(m.updatedAt||0)?b:m):(m||b));
}
async function saveState(s=getState()){
 s.updatedAt=Date.now();const c=ctx();
 try{if(c.chatMetadata)c.chatMetadata[META_KEY]=s;await c.saveMetadata?.();}catch{}
 try{localStorage.setItem(`lovemed_backup:${chatKey()}`,JSON.stringify(s));}catch{}
 refreshPrompt();
}

/* ---------- Persistent library ---------- */
function normalizeLibraryState(raw){
 const empty={custom:[],overrides:{},deleted:[]};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return empty;
 return {
  custom:Array.isArray(raw.custom)?raw.custom:[],
  overrides:raw.overrides&&typeof raw.overrides==='object'?raw.overrides:{},
  deleted:Array.isArray(raw.deleted)?raw.deleted:[]
 };
}
function getLibraryState(){
 try{
  const current=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
  if(current&&typeof current==='object'&&!Array.isArray(current))return normalizeLibraryState(current);
  const legacy=JSON.parse(localStorage.getItem(LEGACY_LIBRARY_KEY)||'null');
  if(Array.isArray(legacy)){
   const migrated={custom:legacy,overrides:{},deleted:[]};
   localStorage.setItem(LIBRARY_KEY,JSON.stringify(migrated));
   return migrated;
  }
 }catch{}
 return {custom:[],overrides:{},deleted:[]};
}
function saveLibraryState(state){try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(normalizeLibraryState(state)));}catch{}}
function baseKink(id){
 const x=KINKS.find(k=>k[0]===id);
 if(!x)return null;
 return {id:x[0],name:x[1],cat:x[2],description:KINK_DESC[x[0]]||'',words:[...(KINK_WORDS[x[0]]||[]) ]};
}
function builtinKink(id){
 const base=baseKink(id);if(!base)return null;
 const state=getLibraryState();
 if(state.deleted.includes(id))return null;
 return Object.assign(base,state.overrides[id]||{});
}
function allKinks(){
 const state=getLibraryState();
 const builtins=KINKS.map(k=>builtinKink(k[0])).filter(Boolean);
 const custom=state.custom.filter(k=>k&&k.id&&k.name).map(k=>({
  id:String(k.id),name:String(k.name),cat:CAT_LABEL[k.cat]?k.cat:'psych',
  description:String(k.description||''),words:Array.isArray(k.words)?k.words.map(String):[]
 }));
 return builtins.concat(custom);
}
function isBuiltin(id){return !!baseKink(id);}
function sameRecord(a,b){
 return String(a.name||'')===String(b.name||'') &&
  String(a.cat||'psych')===String(b.cat||'psych') &&
  String(a.description||'')===String(b.description||'') &&
  JSON.stringify((a.words||[]).map(String))===JSON.stringify((b.words||[]).map(String));
}
function effectiveRecord(data){
 return {id:String(data.id),name:String(data.name||'').trim(),cat:CAT_LABEL[data.cat]?data.cat:'psych',description:String(data.description||'').trim(),words:Array.isArray(data.words)?data.words.map(x=>String(x).trim()).filter(Boolean):[]};
}
function saveLibraryRecord(data){
 const record=effectiveRecord(data);if(!record.name)return false;
 const state=getLibraryState();
 if(isBuiltin(record.id)){
  const base=baseKink(record.id);
  if(sameRecord(record,base))delete state.overrides[record.id];
  else state.overrides[record.id]=record;
  state.deleted=state.deleted.filter(id=>id!==record.id);
 }else{
  const i=state.custom.findIndex(k=>k.id===record.id);
  if(i>=0)state.custom[i]=record;else state.custom.push(record);
 }
 saveLibraryState(state);return true;
}
function deleteLibraryRecord(id){
 const state=getLibraryState();
 if(isBuiltin(id)){
  if(!state.deleted.includes(id))state.deleted.push(id);
  delete state.overrides[id];
 }else state.custom=state.custom.filter(k=>k.id!==id);
 saveLibraryState(state);
}
function restoreBuiltin(id){
 if(!isBuiltin(id))return;
 const state=getLibraryState();
 state.deleted=state.deleted.filter(x=>x!==id);
 delete state.overrides[id];
 saveLibraryState(state);
}
function addCustom(name,cat,description,words){
 const state=getLibraryState();
 state.custom.push({id:`custom-${uid()}`,name,cat,description,words});
 saveLibraryState(state);
}
function deletedBuiltins(){return getLibraryState().deleted.map(baseKink).filter(Boolean);}

function charName(){const c=ctx(),ch=c?.characters?.[c?.characterId];return ch?.name||ch?.data?.name||'{{char}}';}
function cardText(){
 const c=ctx();if(!c||c.groupId)return'';const ch=c.characters?.[c.characterId];if(!ch)return'';
 const out=[],seen=new WeakSet(),skip=/^(avatar|image|thumbnail|chat|date_last_chat|create_date)$/i;
 function walk(v,k='',d=0){
  if(d>5||v==null||skip.test(k))return;
  if(typeof v==='string'){if(v.trim()&&v.length<50000)out.push(v.trim());return;}
  if(typeof v!=='object'||seen.has(v))return;seen.add(v);
  if(Array.isArray(v)){v.slice(0,150).forEach(x=>walk(x,k,d+1));return;}
  Object.entries(v).forEach(([kk,vv])=>walk(vv,kk,d+1));
 }
 walk(ch,'character');return out.join('\n').toLowerCase();
}
function scan(){
 const t=cardText();if(!t)return[];
 return [...new Set(allKinks().filter(k=>{
  const terms=[k.name,...(k.words||[])].filter(Boolean).map(String);
  return terms.some(w=>t.includes(w.toLowerCase()));
 }).map(k=>k.id))];
}
function kink(id){return allKinks().find(k=>k.id===id)||baseKink(id)||{id,name:id,cat:'psych',description:'',words:[]};}
function diagnosisFor(s,found=s.anamnesis||[]){
 const valid=new Set(allKinks().map(k=>k.id));
 const added=(s.diagnosisManual?.added||[]).filter(id=>valid.has(id));
 const removed=new Set((s.diagnosisManual?.removed||[]).filter(id=>valid.has(id)));
 return [...new Set([...found,...added])].filter(id=>valid.has(id)&&!removed.has(id));
}
function syncDiagnosis(s){s.diagnosis=diagnosisFor(s);return s.diagnosis;}
function setDiagnosisManual(id,enabled){
 const s=getState(),dm=s.diagnosisManual||{added:[],removed:[]};
 dm.added=Array.isArray(dm.added)?dm.added:[];dm.removed=Array.isArray(dm.removed)?dm.removed:[];
 if(enabled){
  if(!dm.added.includes(id))dm.added.push(id);
  dm.removed=dm.removed.filter(x=>x!==id);
 }else{
  if(!dm.removed.includes(id))dm.removed.push(id);
  dm.added=dm.added.filter(x=>x!==id);
 }
 s.diagnosisManual=dm;syncDiagnosis(s);saveState(s);render();toast(enabled?'Добавлено в диагноз':'Убрано из диагноза');
}
function removeDiagnosisOnly(id){setDiagnosisManual(id,false);}
function anamnesis(){
 const s=getState(),f=scan();s.anamnesis=f;syncDiagnosis(s);s.anamnesisAt=Date.now();
 s.history.unshift({ts:Date.now(),text:`Анамнез обновлён: обнаружено ${f.length} совпадений.`});
 s.history=s.history.slice(0,40);saveState(s);render();toast(`Анамнез: найдено ${f.length}`);
}
function visible(s){
 const a=(s.activeFeelings||[]).filter(k=>REL_LABEL[k]);
 const r=REL_FIELDS.map(([k])=>[k,clamp(s.relation[k])]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 return[...new Set([...a,...r,...DEFAULT_VISIBLE])].slice(0,6);
}
function parsePacket(text){const o='[[LOVEMED_STATE]]',c='[[/LOVEMED_STATE]]',p=text.lastIndexOf(o);if(p<0)return null;const q=text.indexOf(c,p+o.length);if(q<0)return null;try{return{packet:JSON.parse(text.slice(p+o.length,q).trim()),start:p,end:q+c.length};}catch{return null;}}
function applyPacket(s,p){
 if(p.relation)for(const[k,v]of Object.entries(p.relation))if(k in s.relation)s.relation[k]=clamp(s.relation[k]+Number(v));
 if(Array.isArray(p.active_feelings))s.activeFeelings=p.active_feelings.filter(k=>REL_LABEL[k]).slice(0,6);
 if(p.shift)s.lastShift=String(p.shift).slice(0,300);
 if(Array.isArray(p.contacts))for(const n of p.contacts){if(!n?.name)continue;let x=s.contacts.find(v=>v.name.toLowerCase()===String(n.name).toLowerCase());if(!x){x={id:uid(),name:String(n.name),relation:'Не определено',notes:''};s.contacts.push(x);}x.relation=String(n.relation||x.relation).slice(0,100);x.notes=String(n.notes||x.notes).slice(0,300);x.updatedAt=Date.now();}
 s.history.unshift({ts:Date.now(),text:s.lastShift||'Медицинские показатели обновлены.'});s.history=s.history.slice(0,40);
}
function parseLatest(){
 const c=ctx();if(!c?.chat)return false;const x=[...c.chat].map((m,i)=>({m,i})).reverse().find(v=>!v.m.is_user&&typeof v.m.mes==='string');if(!x)return false;
 const f=parsePacket(x.m.mes);if(!f)return false;const s=getState();applyPacket(s,f.packet);
 s.diagnostics={lastParseAt:Date.now(),lastParseStatus:'Служебный пакет принят ✓',lastParseError:''};
 x.m.mes=(x.m.mes.slice(0,f.start)+x.m.mes.slice(f.end)).trimEnd();try{c.chat[x.i]=x.m;c.saveChat?.();}catch{}saveState(s);return true;
}
function reactionPrompt(s){
 if(!s.autoReaction||!(s.anamnesis||[]).length)return'';
 if(s.reactionCooldownRemaining>0){s.reactionCooldownRemaining--;return'';}
 if(Math.random()*100>s.reactionChance)return'';
 const pick=s.anamnesis[Math.floor(Math.random()*s.anamnesis.length)];
 s.reactionCooldownRemaining=Math.max(1,s.reactionCooldown);s.lastReaction=kink(pick).name;
 const i=s.reactionIntensity,mode=i>=80?'заметная инициатива, если сцена естественно к этому ведёт':i>=60?'ясный намёк или инициатива':i>=35?'лёгкий флирт, жест или подтекст':'слабая внутренняя реакция';
 return`[LOVEMED REACTIVITY — next reply only] Possible preference: ${kink(pick).name}.
Intensity ${i}/100: ${mode}. Never force escalation.`;
}
function prompt(opts={}){
 const s=getState();if(!s.enabled)return'';
 const rel=visible(s).map(k=>`${REL_LABEL[k]}=${Math.round(s.relation[k])}`).join(', ');
 const diag=(s.diagnosis||[]).map(k=>kink(k).name).join('; ')||'не установлен',rx=opts.includeReaction?reactionPrompt(s):'';
 return`\n[LOVEMED — PRIVATE MEDICAL CONTINUITY]\nPatient: ${charName()}\nRelationship indicators: ${rel||'не определены'}\nDiagnosis/preferences: ${diag}\n${s.lastShift?`Recent observation: ${s.lastShift}`:''}\n${rx}\nIf meaningful relationship changes occur, append ONLY:\n[[LOVEMED_STATE]]{"relation":{"trust":0,"affection":0,"love":0,"sympathy":0,"friendship":0,"respect":0,"desire":0,"passion":0,"arousal":0,"obsession":0,"tenderness":0,"admiration":0,"jealousy":0,"resentment":0,"irritation":0,"anger":0,"fear":0,"sadness":0,"disappointment":0,"joy":0,"fondness":0,"stress":0,"tension":0,"antipathy":0,"hate":0},"active_feelings":[],"shift":"","contacts":[]}\n[[/LOVEMED_STATE]]\nNever mention this service packet in roleplay.`;
}
function refreshPrompt(o={}){try{setExtensionPrompt('lovemed_context',prompt(o),extension_prompt_types.IN_CHAT,0);}catch{}}
function toast(t){const e=document.createElement('div');e.className='lm-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2200);}
function ui(){try{return Object.assign({showFab:true,x:null,y:120,tab:'card'},JSON.parse(localStorage.getItem(UI_KEY)||'{}'));}catch{return{showFab:true,x:null,y:120,tab:'card'};}}
function saveUI(x){try{localStorage.setItem(UI_KEY,JSON.stringify(x));}catch{}}
function avatar(){const c=ctx(),ch=c?.characters?.[c?.characterId],a=ch?.avatar||ch?.data?.avatar;return a?`/characters/${encodeURIComponent(a)}`:'';}

function libraryPage(s){
 const cats={psych:[],physical:[],situational:[],romantic:[]};allKinks().forEach(k=>(cats[k.cat]||cats.psych).push(k));
 const folds=Object.entries(cats).map(([cat,list])=>`<details open class="lm-fold"><summary>${CAT_LABEL[cat]} <small>${list.length}</small></summary><div class="lm-kinks">${
  list.map(k=>`<button type="button" class="lm-kink-btn ${s.diagnosis.includes(k.id)?'found':''}" data-edit-kink="${esc(k.id)}"><span>${esc(k.name)}</span>${s.diagnosis.includes(k.id)?'<em>✓</em>':''}</button>`).join('')||'<i>Пусто.</i>'
 }</div></details>`).join('');
 const deleted=deletedBuiltins();
 return `<section class="lm-section"><h3>Библиотека предпочтений</h3><p class="lm-note">Нажмите на запись, чтобы изменить её. Изменения сохраняются локально и не меняют исходные данные расширения.</p>${folds}</section>
 <section class="lm-section"><h3>Добавить в мою библиотеку</h3><div class="lm-custom-form"><input id="lmKinkName" placeholder="Название"><select id="lmKinkCat">${Object.entries(CAT_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><textarea id="lmKinkDesc" placeholder="Описание"></textarea><input id="lmKinkWords" placeholder="Ключевые слова через запятую"><button id="lmAddKink" class="lm-secondary">+ Добавить запись</button></div></section>
 <section class="lm-section"><h3>Мои записи</h3><div class="lm-custom-list">${getLibraryState().custom.map(k=>`<div class="lm-custom-row"><button type="button" class="lm-custom-edit" data-edit-kink="${esc(k.id)}"><b>${esc(k.name)}</b><small>${esc(CAT_LABEL[k.cat]||'')}</small><span>${esc(k.description||'')}</span></button><button type="button" data-del-kink="${esc(k.id)}" title="Удалить">×</button></div>`).join('')||'<i>Пока пусто.</i>'}</div></section>
 <section class="lm-section lm-deleted"><h3>Удалённые встроенные записи</h3><p class="lm-note">Их можно восстановить. Исходные данные при этом не изменяются.</p>${deleted.map(k=>`<div class="lm-deleted-row"><span>${esc(k.name)}</span><button type="button" class="lm-secondary lm-small" data-restore-kink="${esc(k.id)}">Восстановить исходную запись</button></div>`).join('')||'<i>Нет удалённых записей.</i>'}</section>`;
}

function page(tab,s){
 if(tab==='card'){const diagnosis=diagnosisFor(s);return `<div class="lm-card"><div class="lm-patient"><div class="lm-avatar">${avatar()?`<img src="${esc(avatar())}">`:'🩺'}</div><div><div class="lm-label">ПАЦИЕНТ</div><h3>${esc(charName())}</h3><div class="lm-facts"><span><b>Возраст</b><em>будет извлечён из карточки</em></span><span><b>Ориентация</b><em>будет извлечена из карточки</em></span></div></div></div><section class="lm-section"><h3>Медицинские показатели</h3><p class="lm-note">Автоматическая динамика отношений.</p><div class="lm-rel">${visible(s).map(k=>`<label><span>${REL_LABEL[k]}</span><b>${Math.round(s.relation[k])}</b><input data-rel="${k}" type="range" min="0" max="200" value="${clamp(s.relation[k])}"></label>`).join('')}</div></section><section class="lm-diagnosis"><div class="lm-section-title">ДИАГНОЗ · ${diagnosis.length} записей</div><div class="lm-tags">${diagnosis.length?diagnosis.map(k=>`<span class="lm-tag">${esc(kink(k).name)}<button type="button" data-remove-diagnosis="${esc(k)}" title="Убрать из диагноза">×</button></span>`).join(''):'<i>Диагноз ещё не установлен.</i>'}</div></section><button id="lmAnamnesis" class="lm-primary">🩺 Провести анамнез карточки пациента</button></div>`;}
 if(tab==='react')return `<div class="lm-card"><section class="lm-section"><h3>Реактивность пациента</h3><div class="lm-sliders"><label>Интенсивность реакции <b>${s.reactionIntensity}</b><input id="lmIntensity" type="range" min="0" max="100" value="${s.reactionIntensity}"></label><label>Вероятность спонтанной реакции <b>${s.reactionChance}%</b><input id="lmChance" type="range" min="0" max="100" value="${s.reactionChance}"></label><label>Период наблюдения <b>${s.reactionCooldown}</b><input id="lmCooldown" type="range" min="1" max="12" value="${s.reactionCooldown}"></label></div></section>${libraryPage(s)}</div>`;
 if(tab==='diag')return `<div class="lm-card"><section class="lm-section"><h3>Анамнез</h3><p class="lm-note">${s.anamnesisAt?`Последнее обследование: ${new Date(s.anamnesisAt).toLocaleString()}`:'Обследование ещё не проводилось.'}</p><button id="lmAnamnesis2" class="lm-primary">Провести повторное обследование</button><div class="lm-anamnesis-list">${s.anamnesis.map(k=>`<article class="lm-found"><b>${esc(kink(k).name)}</b><p>${esc(kink(k).description||'Обнаружено в карточке пациента.')}</p></article>`).join('')||'<p class="lm-note">Совпадений не найдено.</p>'}</div></section></div>`;
 if(tab==='contacts')return `<div class="lm-card"><section class="lm-section"><h3>Сопутствующие лица</h3><p class="lm-note">Персонажи, влияющие на состояние пациента и отношения.</p>${s.contacts.map(n=>`<article class="lm-contact"><div><b>${esc(n.name)}</b><small>${esc(n.relation||'')}</small><p>${esc(n.notes||'')}</p></div><button data-del-contact="${esc(n.id)}">Удалить</button></article>`).join('')||'<i>Пока нет наблюдаемых контактов.</i>'}</section></div>`;
 if(tab==='history')return `<div class="lm-card"><section class="lm-section"><h3>История наблюдений</h3>${s.history.slice(0,20).map(x=>`<article class="lm-history"><time>${new Date(x.ts).toLocaleString()}</time><span>${esc(x.text)}</span></article>`).join('')||'<i>История пока пуста.</i>'}</section></div>`;
 return `<div class="lm-card"><section class="lm-section"><h3>Служебная диагностика</h3><label class="lm-check"><input id="lmEnabled" type="checkbox" ${s.enabled?'checked':''}> Включить LoveMed</label><label class="lm-check"><input id="lmAutoTrack" type="checkbox" ${s.autoTrack?'checked':''}> Автоматически обновлять показатели</label><label class="lm-check"><input id="lmAutoReaction" type="checkbox" ${s.autoReaction?'checked':''}> Разрешить спонтанные реакции</label><p class="lm-note">${esc(s.diagnostics.lastParseStatus)}</p><button id="lmParse" class="lm-secondary">Проверить последний ответ модели</button><label class="lm-check"><input id="lmFab" type="checkbox" ${ui().showFab?'checked':''}> Показывать плавающую кнопку</label></section></div>`;
}

function ensureEditor(){
 if(document.querySelector('#lmEditor'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="lmEditor" class="lm-editor hidden"><section class="lm-editor-card"><header><div><div class="lm-label">РЕДАКТОР БИБЛИОТЕКИ</div><h3 id="lmEditorTitle">Запись</h3></div><button id="lmEditorClose" class="lm-close">×</button></header><div class="lm-editor-body"><label>Название<input id="lmEditName"></label><label>Категория<select id="lmEditCat">${Object.entries(CAT_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Описание<textarea id="lmEditDesc"></textarea></label><label>Ключевые слова<input id="lmEditWords" placeholder="слово1, слово2, слово3"></label><div class="lm-editor-actions"><button id="lmEditorSave" class="lm-primary">Сохранить изменения</button><button id="lmEditorDiagnosis" class="lm-secondary">Добавить в диагноз</button><button id="lmEditorDelete" class="lm-danger">Удалить запись</button><button id="lmEditorRestore" class="lm-secondary">Восстановить исходную запись</button></div></div></section></div>`);
 document.querySelector('#lmEditorClose').onclick=closeEditor;
 document.querySelector('#lmEditor').addEventListener('click',e=>{if(e.target.id==='lmEditor')closeEditor();});
}
let editorId=null;
function openEditor(id){
 const k=allKinks().find(x=>x.id===id)||getLibraryState().custom.find(x=>x.id===id);if(!k)return;
 editorId=id;ensureEditor();
 document.querySelector('#lmEditorTitle').textContent=k.name;
 document.querySelector('#lmEditName').value=k.name||'';
 document.querySelector('#lmEditCat').value=k.cat||'psych';
 document.querySelector('#lmEditDesc').value=k.description||'';
 document.querySelector('#lmEditWords').value=(k.words||[]).join(', ');
 const builtin=isBuiltin(id);
 const deleted=getLibraryState().deleted.includes(id);
 document.querySelector('#lmEditorDelete').textContent=builtin?'Удалить встроенную запись':'Удалить запись';
 const inDiagnosis=diagnosisFor(getState()).includes(id);
 const diagButton=document.querySelector('#lmEditorDiagnosis');if(diagButton){diagButton.textContent=inDiagnosis?'Убрать из диагноза':'Добавить в диагноз';diagButton.dataset.active=inDiagnosis?'1':'0';}
 document.querySelector('#lmEditorRestore').style.display=builtin&&!deleted?'block':'none';
 document.querySelector('#lmEditorDelete').style.display=deleted?'none':'block';
 document.querySelector('#lmEditor').classList.remove('hidden');
}
function closeEditor(){editorId=null;document.querySelector('#lmEditor')?.classList.add('hidden');}
function bindEditor(){
 const editor=document.querySelector('#lmEditor');
 if(!editor||editor.dataset.bound==='1')return;
 editor.dataset.bound='1';
 document.querySelector('#lmEditorSave').onclick=()=>{
  if(!editorId)return;
  const name=document.querySelector('#lmEditName').value.trim(),cat=document.querySelector('#lmEditCat').value,description=document.querySelector('#lmEditDesc').value.trim();
  const words=document.querySelector('#lmEditWords').value.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  if(!name){toast('Введите название');return;}
  saveLibraryRecord({id:editorId,name,cat,description,words});
  closeEditor();render();toast('Запись сохранена');
 };
 document.querySelector('#lmEditorDiagnosis')?.addEventListener('click',()=>{
  if(!editorId)return;
  const id=editorId;const active=document.querySelector('#lmEditorDiagnosis')?.dataset.active==='1';closeEditor();setDiagnosisManual(id,!active);
 });
 document.querySelector('#lmEditorDelete').onclick=()=>{
  if(!editorId)return;
  const id=editorId;deleteLibraryRecord(id);closeEditor();render();toast(isBuiltin(id)?'Встроенная запись скрыта':'Запись удалена');
 };
 document.querySelector('#lmEditorRestore').onclick=()=>{
  if(!editorId)return;
  restoreBuiltin(editorId);closeEditor();render();toast('Исходная запись восстановлена');
 };
}

function render(){const b=document.querySelector('#lmBody');if(!b)return;const s=getState(),u=ui();b.innerHTML=page(u.tab,s);bind();}

function bind(){
 // Events are delegated from the stable overlay, so rerendering #lmBody never kills buttons.
 if(window.__loveMedPanelEventsBound)return;
 const overlay=document.querySelector('#lmOverlay');
 if(!overlay)return;
 window.__loveMedPanelEventsBound=true;
 overlay.addEventListener('click',async e=>{
  const tab=e.target.closest('[data-tab]');
  if(tab){const u=ui();u.tab=tab.dataset.tab;saveUI(u);render();return;}
  const edit=e.target.closest('[data-edit-kink]');
  if(edit){openEditor(edit.dataset.editKink);return;}
  const remDiag=e.target.closest('[data-remove-diagnosis]');
  if(remDiag){removeDiagnosisOnly(remDiag.dataset.removeDiagnosis);return;}
  const del=e.target.closest('[data-del-kink]');
  if(del){deleteLibraryRecord(del.dataset.delKink);render();toast('Запись удалена');return;}
  const restore=e.target.closest('[data-restore-kink]');
  if(restore){restoreBuiltin(restore.dataset.restoreKink);render();toast('Исходная запись восстановлена');return;}
  const anam=e.target.closest('#lmAnamnesis,#lmAnamnesis2');
  if(anam){anamnesis();return;}
  const add=e.target.closest('#lmAddKink');
  if(add){
   const n=document.querySelector('#lmKinkName')?.value.trim()||'',d=document.querySelector('#lmKinkDesc')?.value.trim()||'',cat=document.querySelector('#lmKinkCat')?.value||'psych';
   const words=(document.querySelector('#lmKinkWords')?.value||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
   if(!n){toast('Введите название');return;}
   addCustom(n,cat,d,words.length?words:[n.toLowerCase()]);render();toast('Запись добавлена');return;
  }
  const contact=e.target.closest('[data-del-contact]');
  if(contact){const st=getState();st.contacts=st.contacts.filter(x=>x.id!==contact.dataset.delContact);await saveState(st);render();return;}
  if(e.target.closest('#lmParse')){toast(parseLatest()?'Пакет принят ✓':'Пакет не найден');return;}
 });
 overlay.addEventListener('input',async e=>{
  if(e.target.matches('[data-rel]')){const st=getState();st.relation[e.target.dataset.rel]=Number(e.target.value);await saveState(st);render();return;}
  const sliders={'#lmIntensity':'reactionIntensity','#lmChance':'reactionChance','#lmCooldown':'reactionCooldown'};
  const key=Object.entries(sliders).find(([q])=>e.target.matches(q))?.[1];
  if(key){const st=getState();st[key]=Number(e.target.value);await saveState(st);return;}
 });
 overlay.addEventListener('change',async e=>{
  const toggles={'#lmEnabled':'enabled','#lmAutoTrack':'autoTrack','#lmAutoReaction':'autoReaction'};
  const key=Object.entries(toggles).find(([q])=>e.target.matches(q))?.[1];
  if(key){const st=getState();st[key]=e.target.checked;await saveState(st);return;}
  if(e.target.matches('#lmFab')){const u=ui();u.showFab=e.target.checked;saveUI(u);syncFab();return;}
 });
}

function ensurePanel(){
 if(document.querySelector('#lmOverlay'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="lmOverlay" class="lm-overlay hidden"><section class="lm-panel"><header class="lm-head"><div><div class="lm-kicker">LOVEMED · MEDICAL RECORD v0.2.1</div><h2>Медицинская карта</h2><p>Наблюдение за динамикой отношений</p></div><button id="lmClose" class="lm-close">×</button></header><nav class="lm-tabs">${[['card','🩺 Карта пациента'],['react','🧪 Реактивность'],['diag','🔬 Анамнез'],['contacts','👤 Контакты'],['history','📋 История'],['system','⚙ Служебное']].map(x=>`<button data-tab="${x[0]}">${x[1]}</button>`).join('')}</nav><main id="lmBody"></main></section></div>`);
 document.querySelector('#lmClose').onclick=()=>document.querySelector('#lmOverlay').classList.add('hidden');
 bind();
 ensureEditor();
}
function open(){ensurePanel();document.querySelector('#lmOverlay').classList.remove('hidden');render();}
function placeFab(){const b=document.querySelector('#lmFabButton');if(!b)return;const u=ui(),p=8,w=b.offsetWidth||42,h=b.offsetHeight||42;b.style.left=Math.max(p,Math.min(innerWidth-w-p,u.x??innerWidth-w-p))+'px';b.style.top=Math.max(p,Math.min(innerHeight-h-p,u.y??120))+'px';b.style.right='auto';b.style.bottom='auto';}
function syncFab(){const b=document.querySelector('#lmFabButton');if(b)b.style.display=ui().showFab?'grid':'none';}
function ensureFab(){
 let b=document.querySelector('#lmFabButton');
 if(!b){b=document.createElement('button');b.id='lmFabButton';b.className='lm-fab';b.textContent='🩺';document.body.appendChild(b);}
 if(b.dataset.bound)return;b.dataset.bound='1';let d=null;
 b.onpointerdown=e=>{const r=b.getBoundingClientRect();d={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,m:false};b.setPointerCapture?.(e.pointerId);};
 b.onpointermove=e=>{if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.sx,dy=e.clientY-d.sy;if(Math.hypot(dx,dy)>6)d.m=true;if(!d.m)return;const p=8,w=b.offsetWidth,h=b.offsetHeight;b.style.left=Math.max(p,Math.min(innerWidth-w-p,e.clientX-d.ox))+'px';b.style.top=Math.max(p,Math.min(innerHeight-h-p,e.clientY-d.oy))+'px';e.preventDefault();};
 b.onpointerup=e=>{if(!d)return;const moved=d.m;d=null;if(moved){const r=b.getBoundingClientRect(),u=ui();u.x=Math.round(r.left);u.y=Math.round(r.top);saveUI(u);}else open();};
 placeFab();syncFab();
}
function ensureSettings(){
 const host=document.querySelector('#extensions_settings2')||document.querySelector('#extensions_settings');if(!host||document.querySelector('#lmSettings'))return;
 const w=document.createElement('div');w.id='lmSettings';w.className='lovemed-settings inline-drawer';
 w.innerHTML='<div class="inline-drawer-toggle inline-drawer-header"><b>🩺 LoveMed — Medical Card of Love</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><button id="lmOpenSettings" class="menu_button">🩺 Открыть медицинскую карту</button><label><input id="lmShowSettingsFab" type="checkbox"> Показывать плавающую кнопку</label><p>Библиотека пользовательских предпочтений сохраняется отдельно от карты текущего персонажа.</p></div>';
 host.appendChild(w);w.querySelector('#lmOpenSettings').onclick=open;const c=w.querySelector('#lmShowSettingsFab');c.checked=ui().showFab;c.onchange=e=>{const u=ui();u.showFab=e.target.checked;saveUI(u);syncFab();};
}
function ensureWand(){
 const m=document.querySelector('#extensionsMenu');if(!m||document.querySelector('#lmWand'))return;
 const x=document.createElement('div');x.id='lmWand';x.className='list-group-item flex-container flexGap5 interactable';x.innerHTML='<i class="fa-solid fa-stethoscope"></i><span>LoveMed — Медицинская карта</span>';x.onclick=e=>{e.preventDefault();open();};m.appendChild(x);
}
function on(t,f){try{eventSource?.on?.(t,f);}catch{}}
function init(){
 ensureFab();ensurePanel();ensureSettings();ensureWand();refreshPrompt();
 on(event_types.CHAT_CHANGED,()=>setTimeout(()=>{ensureFab();ensureSettings();ensureWand();render();refreshPrompt();},250));
 on(event_types.MESSAGE_RECEIVED,()=>setTimeout(parseLatest,250));
 on(event_types.GENERATION_STARTED,()=>refreshPrompt({includeReaction:true}));
 on(event_types.GENERATION_ENDED,()=>{parseLatest();refreshPrompt();});
 on(event_types.CHARACTER_EDITED,refreshPrompt);
 window.addEventListener('resize',placeFab);
 setInterval(()=>{ensureFab();ensureSettings();ensureWand();},2000);
}
init();
