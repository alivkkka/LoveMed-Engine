import { setExtensionPrompt, extension_prompt_types, eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';

const META_KEY='lovemed_state_v1', UI_KEY='lovemed_ui_v1', USER_CARD_KEY='lovemed_user_card_v2', CHAR_CARD_KEY='lovemed_char_card_v1', LIBRARY_KEY='lovemed_library_v2', LEGACY_LIBRARY_KEY='lovemed_library_v1', REL_MAX=200;

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

const defaults=()=>({enabled:true,autoTrack:true,autoReaction:true,relation:Object.fromEntries(REL_FIELDS.map(([k])=>[k,0])),activeFeelings:[],lastShift:'',diagnosis:[],diagnosisManual:{added:[],removed:[]},anamnesis:[],anamnesisAt:0,reactionIntensity:55,reactionChance:35,reactionCooldown:4,reactionCooldownRemaining:0,lastReaction:'',lastReactionId:'',randomKinkId:'',randomKinkIds:[],randomKinkAt:0,contacts:[],history:[],historyNotice:true,anamnesisSummary:'',charName:'',updatedAt:Date.now(),diagnostics:{lastParseAt:0,lastParseStatus:'Ожидает проверки',lastParseError:''}});
const ctx=()=>{try{return getContext?.()||globalThis.SillyTavern?.getContext?.()||{};}catch{return {};}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const clamp=(n,min=0,max=REL_MAX)=>Math.max(min,Math.min(max,Number(n)||0));

function merge(raw){
 const d=defaults(),s=Object.assign(d,raw||{});
 s.relation=Object.assign({},d.relation,raw?.relation||{});
 for(const k of ['activeFeelings','diagnosis','anamnesis','contacts','history'])if(!Array.isArray(s[k]))s[k]=[];
 s.diagnostics=Object.assign({},d.diagnostics,raw?.diagnostics||{});
 s.historyNotice=raw?.historyNotice!==false;
 s.randomKinkIds=Array.isArray(raw?.randomKinkIds)?raw.randomKinkIds:((raw?.randomKinkId?[raw.randomKinkId]:[]));
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

function characterList(){
 const c=ctx();
 if(!c)return [];
 const raw=Array.isArray(c.characters)?c.characters:(c.characters&&typeof c.characters==='object'?Object.values(c.characters):[]);
 if(!c.groupId)return raw;
 const group=c.group || c.groups?.find?.(g=>String(g.id)===String(c.groupId));
 const members=Array.isArray(group?.members)?group.members:[];
 if(!members.length)return raw;
 return members.map(m=>{
  const avatar=typeof m==='string'?m:(m?.avatar||m?.character?.avatar||'');
  const name=typeof m==='object'?(m?.name||m?.character?.name||''):'';
  return raw.find(ch=>{
   const ca=ch?.avatar||ch?.data?.avatar||'';
   const cn=ch?.name||ch?.data?.name||'';
   return (avatar&&ca===avatar)||(name&&cn===name);
  }) || (typeof m==='object'&&m?.character?m.character:null);
 }).filter(Boolean);
}
function groupCharacters(){const c=ctx();return c?.groupId?characterList():[];}
function charObject(){
 const c=ctx();
 if(!c)return null;
 return c.character || c.characters?.[c.characterId] || c.currentCharacter || null;
}
function charName(){const ch=charObject();return ch?.name||ch?.data?.name||'{{char}}';}
function charMemberKey(ch,index=0){
 const raw=String(ch?.avatar||ch?.data?.avatar||ch?.name||ch?.data?.name||`member-${index}`);
 return raw.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,100)||`member-${index}`;
}
function extractProfileFields(text){
 const raw=String(text||'');
 const find=(patterns)=>{for(const re of patterns){const m=raw.match(re);if(m?.[1])return m[1].trim();}return '';};
 return {
  age:find([/(?:возраст|age)\s*[:\-–]?\s*(\d{1,3})/i,/\b(\d{1,3})\s*(?:лет|года|год)\b/i]),
  sex:find([/(?:пол|sex)\s*[:\-–]?\s*([^\n,;]+)/i]),
  gender:find([/(?:гендер|gender)\s*[:\-–]?\s*([^\n,;]+)/i]),
  secondarySex:find([/(?:вторичн(?:ый|ая)\s+пол|secondary\s+sex|omegaverse\s+sex)\s*[:\-–]?\s*([^\n,;]+)/i])
 };
}
function extractCharacterText(ch){
 if(!ch)return'';
 const out=[],seen=new WeakSet();
 const skip=/^(avatar|image|thumbnail|chat|date_last_chat|create_date|mes|messages)$/i;
 const important=/^(name|description|personality|scenario|first_mes|mes_example|creator_notes|system_prompt|post_history_instructions|tags|personality_prompt)$/i;
 function walk(v,k='',d=0){
  if(d>8||v==null)return;
  if(typeof v==='string'){if(v.trim()&&v.length<100000)out.push(v.trim());return;}
  if(typeof v!=='object'||seen.has(v))return;seen.add(v);
  if(skip.test(k)&&!important.test(k))return;
  if(Array.isArray(v)){v.slice(0,250).forEach(x=>walk(x,k,d+1));return;}
  Object.entries(v).forEach(([kk,vv])=>walk(vv,kk,d+1));
 }
 walk(ch,'character');
 return out.join('\n');
}
function cardText(){
 const ch=charObject();
 return extractCharacterText(ch);
}
function charProfile(){
 const ch=charObject(),text=cardText(),fields=extractProfileFields(text),manual=getCharCard(ch);
 const a=ch?.avatar||ch?.data?.avatar||'';
 return {name:manual.name||(ch?.name||ch?.data?.name)||'{{char}}',age:manual.age||fields.age,sex:manual.sex||fields.sex,gender:manual.gender||fields.gender,secondarySex:manual.secondarySex||fields.secondarySex,avatar:a?`/characters/${encodeURIComponent(a)}`:'',memberKey:ch?charMemberKey(ch):''};
}

function scan(){
 const t=cardText();
 if(!t)return[];
 const low=t.toLowerCase();
 return [...new Set(allKinks().filter(k=>{
  const terms=[k.name,...(k.words||[])].filter(Boolean).map(String);
  return terms.some(w=>w.length>1&&low.includes(w.toLowerCase()));
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
let anamnesisRunning=false;
function addHistory(text,type='Наблюдение'){
 const s=getState();
 s.history=Array.isArray(s.history)?s.history:[];
 s.history.unshift({ts:Date.now(),type,text:String(text||'')});
 s.history=s.history.slice(0,80);
 saveState(s);
}
function anamnesis(){
 if(anamnesisRunning)return;
 anamnesisRunning=true;
 try{
  const s=getState(),before=new Set(s.anamnesis||[]),f=scan();
  s.diagnosisManual={added:[],removed:[]};
  s.anamnesis=f;
  s.diagnosis=[...f];
  s.anamnesisAt=Date.now();
  const added=f.filter(id=>!before.has(id)).map(id=>kink(id).name);
  const removed=[...before].filter(id=>!f.includes(id)).map(id=>kink(id).name);
  const changes=[];
  if(added.length)changes.push(`обнаружено новое: ${added.join(', ')}`);
  if(removed.length)changes.push(`больше не обнаружено: ${removed.join(', ')}`);
  const text=changes.length?`Анамнез обновлён: ${changes.join('; ')}.`:`Анамнез обновлён: значимых изменений не обнаружено.`;
  s.anamnesisSummary=text;
  s.history.unshift({ts:Date.now(),type:'Анамнез',text});
  s.history=s.history.slice(0,80);
  saveState(s);render();toast(added.length||removed.length?`Анамнез обновлён: ${added.length+removed.length} изменений`:'Анамнез обновлён');
 }catch(err){console.error('[LoveMed] Card scan failed:',err);toast('Не удалось просканировать карточку. Проверьте консоль SillyTavern.');}
 finally{anamnesisRunning=false;}
}
function addManualHistory(){
 const type=document.querySelector('#lmHistoryType')?.value||'Наблюдение';
 const text=document.querySelector('#lmHistoryText')?.value.trim()||'';
 if(!text){toast('Введите текст наблюдения');return;}
 const s=getState();s.history.unshift({ts:Date.now(),type,text});s.history=s.history.slice(0,80);saveState(s);render();toast('Запись добавлена в историю');
}
function editHistoryEntry(ts){
 const s=getState(),item=(s.history||[]).find(x=>String(x.ts)===String(ts));
 if(!item)return;
 const text=window.prompt('Изменить запись журнала:',item.text||'');
 if(text===null)return;
 const value=text.trim();if(!value){toast('Запись не может быть пустой');return;}
 item.text=value;saveState(s);render();toast('Запись обновлена');
}
function deleteHistoryEntry(ts){const s=getState();s.history=(s.history||[]).filter(x=>String(x.ts)!==String(ts));saveState(s);render();toast('Запись удалена');}
function clearHistory(){const s=getState();s.history=[];saveState(s);historyExpanded=false;render();toast('История наблюдений очищена');}
function historyDate(ts){
 const d=new Date(ts),today=new Date();
 const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
 if(same(d,today))return 'СЕГОДНЯ';
 const y=new Date(today);y.setDate(today.getDate()-1);if(same(d,y))return 'ВЧЕРА';
 return d.toLocaleDateString(undefined,{day:'2-digit',month:'2-digit',year:'numeric'});
}
function historyPage(s){
 const items=Array.isArray(s.history)?s.history:[];
 const shown=historyExpanded?items:items.slice(0,10);
 const groups=[];shown.forEach(x=>{const label=historyDate(x.ts);let g=groups.find(v=>v.label===label);if(!g){g={label,items:[]};groups.push(g)}g.items.push(x)});
 return `<div class="lm-card lm-history-page"><section class="lm-section lm-journal-section">
  <div class="lm-journal-head"><div><h3>📜 Журнал наблюдений</h3><div class="lm-journal-count">${items.length} ${items.length===1?'запись':items.length<5?'записи':'записей'} · автоматические события сохраняются здесь</div></div><button id="lmAddHistoryToggle" type="button" class="lm-journal-add">＋</button></div>
  <div id="lmHistoryComposer" class="lm-history-composer hidden"><div class="lm-history-composer-row"><select id="lmHistoryType"><option>Наблюдение</option><option>Состояние</option><option>Отношения</option><option>Реактив</option><option>Медицинское</option><option>Другое</option></select><textarea id="lmHistoryText" rows="2" placeholder="Короткая запись…"></textarea><button id="lmAddHistory" type="button" class="lm-primary lm-history-save">Сохранить</button></div></div>
  <div class="lm-journal-toolbar">${items.length>10?`<button id="lmHistoryMore" type="button" class="lm-secondary">${historyExpanded?'Скрыть старые':'Показать ещё'}</button>`:''}${items.length?'<button id="lmClearHistory" type="button" class="lm-secondary lm-history-clear">Очистить</button>':''}</div>
  <div class="lm-journal-list">${groups.map(g=>`<div class="lm-journal-date">${g.label}</div>${g.items.map(x=>`<article class="lm-journal-entry"><time>${new Date(x.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><div class="lm-journal-type">${esc(x.type||'Наблюдение')}</div><div class="lm-journal-text">${esc(x.text)}</div><div class="lm-journal-actions"><button type="button" data-edit-history="${esc(x.ts)}" title="Изменить">✎</button><button type="button" data-del-history="${esc(x.ts)}" title="Удалить">🗑</button></div></article>`).join('')}`).join('')||'<div class="lm-journal-empty">Журнал пока пуст. Значимые изменения появятся здесь автоматически.</div>'}</div>
 </section></div>`;
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
 if(s.lastShift){s.history.unshift({ts:Date.now(),type:'Состояние',text:s.lastShift});s.history=s.history.slice(0,80);}
}
function parseLatest(){
 const c=ctx();if(!c?.chat)return false;const x=[...c.chat].map((m,i)=>({m,i})).reverse().find(v=>!v.m.is_user&&typeof v.m.mes==='string');if(!x)return false;
 const f=parsePacket(x.m.mes);if(!f)return false;const s=getState();applyPacket(s,f.packet);
 s.diagnostics={lastParseAt:Date.now(),lastParseStatus:'Служебный пакет принят ✓',lastParseError:''};
 x.m.mes=(x.m.mes.slice(0,f.start)+x.m.mes.slice(f.end)).trimEnd();try{c.chat[x.i]=x.m;c.saveChat?.();}catch{}saveState(s);if(s.historyNotice&&f.packet?.shift)toast(`🩺 Новое наблюдение: ${String(f.packet.shift).slice(0,90)}`);return true;
}
function reactionPrompt(s){
 if(!s.autoReaction||!(s.anamnesis||[]).length)return'';
 if(s.reactionCooldownRemaining>0){s.reactionCooldownRemaining--;return'';}
 const valid=new Set(s.anamnesis||[]);
 let picks=Array.isArray(s.randomKinkIds)?s.randomKinkIds.filter(id=>valid.has(id)):[];
 if(!picks.length&&s.randomKinkId&&valid.has(s.randomKinkId))picks=[s.randomKinkId];
 if(!picks.length){
  if(Math.random()*100>s.reactionChance)return'';
  const pool=(s.anamnesis||[]).filter(id=>id!==s.lastReactionId);
  const source=pool.length?pool:s.anamnesis;
  picks=[source[Math.floor(Math.random()*source.length)]];
 }
 picks=[...new Set(picks)].slice(0,3);
 const names=picks.map(id=>kink(id).name);
 s.randomKinkId='';s.randomKinkIds=[];s.randomKinkAt=0;s.lastReaction=names[0]||'';s.lastReactionId=picks[0]||'';
 s.reactionCooldownRemaining=Math.max(1,s.reactionCooldown);
 const i=s.reactionIntensity,mode=i>=80?'заметная инициатива, если сцена естественно к этому ведёт':i>=60?'ясный намёк или инициатива':i>=35?'лёгкий флирт, жест или подтекст':'слабая внутренняя реакция';
 const candidates=names.length>1?`Candidate preferences: ${names.join(' / ')}.`:`Candidate preference: ${names[0]||'не определено'}.`;
 return`[LOVEMED REACTIVITY — next reply only] ${candidates}
Read the current scene and choose the ONE most contextually appropriate preference from these candidates. Use at most one as the optional focus of this reply. Do not deliberately combine the candidates or the rest of the diagnosis. Do not force escalation, do not invent a preference that is not listed, and keep the choice natural for the current situation.
Intensity ${i}/100: ${mode}.`;
}
function rollRandomKink(){
 const s=getState(),pool=[...new Set((s.anamnesis||[]).filter(id=>allKinks().some(k=>k.id===id)))];
 if(!pool.length){toast('Сначала проведите анамнез и получите хотя бы один реактив.');return;}
 const shuffled=[...pool].sort(()=>Math.random()-0.5);
 const withoutLast=shuffled.filter(id=>id!==s.lastReactionId);
 const source=withoutLast.length>=Math.min(3,pool.length)?withoutLast:shuffled;
 const picks=source.slice(0,Math.min(3,source.length));
 s.randomKinkIds=picks;s.randomKinkId=picks[0]||'';s.randomKinkAt=Date.now();
 saveState(s).then(()=>{render();toast(`🎲 Варианты: ${picks.map(id=>kink(id).name).join(' · ')}`);});
}

function prompt(opts={}){
 const s=getState();if(!s.enabled)return'';
 const rel=visible(s).map(k=>`${REL_LABEL[k]}=${Math.round(s.relation[k])}`).join(', ');
 const diag=(s.diagnosis||[]).map(k=>kink(k).name).join('; ')||'не установлен',rx=opts.includeReaction?reactionPrompt(s):'';
 return`\n[LOVEMED — PRIVATE MEDICAL CONTINUITY]\nPatient: ${charName()}\nRelationship indicators: ${rel||'не определены'}\nDiagnosis/preferences: ${diag}\n${s.lastShift?`Recent observation: ${s.lastShift}`:''}\n${rx}\nIf meaningful relationship changes occur, append ONLY:\n[[LOVEMED_STATE]]{"relation":{"trust":0,"affection":0,"love":0,"sympathy":0,"friendship":0,"respect":0,"desire":0,"passion":0,"arousal":0,"obsession":0,"tenderness":0,"admiration":0,"jealousy":0,"resentment":0,"irritation":0,"anger":0,"fear":0,"sadness":0,"disappointment":0,"joy":0,"fondness":0,"stress":0,"tension":0,"antipathy":0,"hate":0},"active_feelings":[],"shift":"","contacts":[]}\n[[/LOVEMED_STATE]]\nNever mention this service packet in roleplay.`;
}
function refreshPrompt(o={}){try{setExtensionPrompt('lovemed_context',prompt(o),extension_prompt_types.IN_CHAT,0);}catch{}}
function toast(t){const e=document.createElement('div');e.className='lm-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2200);}
function ui(){try{const u=Object.assign({showFab:true,x:null,y:120,tab:'card'},JSON.parse(localStorage.getItem(UI_KEY)||'{}'));if(u.tab==='diag')u.tab='user';return u;}catch{return{showFab:true,x:null,y:120,tab:'card'};}}
function saveUI(x){try{localStorage.setItem(UI_KEY,JSON.stringify(x));}catch{}}
const userCardDefaults=()=>({name:'',age:'',sex:'',gender:'',secondarySex:'',avatar:'',cycleHistory:'',ovulation:'',menstruation:'',pregnancy:'',children:'',notes:'',pregnancyChance:25,pregnancyCheckAt:0,pregnancyResult:'',updatedAt:0});
function userCardKey(){return `lovemed_user_card:${chatKey()}`;}
function getUserCard(){try{return Object.assign(userCardDefaults(),JSON.parse(localStorage.getItem(userCardKey())||'{}'));}catch{return userCardDefaults();}}
function saveUserCard(data){const x=Object.assign(userCardDefaults(),data||{},{updatedAt:Date.now()});try{localStorage.setItem(userCardKey(),JSON.stringify(x));}catch{}return x;}
function charCardKey(member=null){
 const suffix=member&&ctx()?.groupId?`:${charMemberKey(member)}`:'';
 return `lovemed_char_card:${chatKey()}${suffix}`;
}
const charCardDefaults=()=>({name:'',age:'',sex:'',gender:'',secondarySex:'',updatedAt:0});
function getCharCard(member=null){try{return Object.assign(charCardDefaults(),JSON.parse(localStorage.getItem(charCardKey(member))||'{}'));}catch{return charCardDefaults();}}
function saveCharCard(data,member=null){const x=Object.assign(charCardDefaults(),data||{},{updatedAt:Date.now()});try{localStorage.setItem(charCardKey(member),JSON.stringify(x));}catch{}return x;}
function userPersonaText(){
 const c=ctx(),out=[],seen=new WeakSet();
 const roots=[c?.name1,c?.userName,c?.persona,c?.userPersona,c?.personaDescription,c?.userPersonaDescription,c?.personaData,c?.user,document.querySelector('#persona_description')?.value,document.querySelector('#your_name')?.value];
 function walk(v,d=0){
  if(d>5||v==null)return;
  if(typeof v==='string'){if(v.trim()&&v.length<30000)out.push(v.trim());return;}
  if(typeof v!=='object'||seen.has(v))return;seen.add(v);
  if(Array.isArray(v)){v.slice(0,40).forEach(x=>walk(x,d+1));return;}
  Object.values(v).forEach(vv=>walk(vv,d+1));
 }
 roots.forEach(v=>walk(v));
 return [...new Set(out)].join('\n');
}
function userPersonaAvatar(){
 const c=ctx(),roots=[c?.userAvatar,c?.user_avatar,c?.persona?.avatar,c?.user?.avatar,c?.personaData?.avatar];
 const direct=roots.find(x=>typeof x==='string'&&x.trim());
 if(direct)return String(direct);
 const img=document.querySelector('#user_avatar_block .avatar-container .avatar.selected img') || document.querySelector('#user_avatar_block .avatar.selected img');
 return img?.currentSrc||img?.src||'';
}
function extractUserFields(text){return extractProfileFields(text);}
function refreshUserCardFromPersona(){
 const current=getUserCard(),text=userPersonaText(),parsed=extractUserFields(text);
 if(!current.name){const c=ctx();current.name=String(c?.name1||c?.userName||document.querySelector('#your_name')?.value||'').trim();}
 for(const [k,v] of Object.entries(parsed))if(k!=='sex'&&!current[k]&&v)current[k]=v;
 if(!current.avatar){const a=userPersonaAvatar();if(a)current.avatar=a;}
 return saveUserCard(current);
}
function userAvatarUrl(value){
 const v=String(value||'').trim();
 if(!v)return'';
 if(/^data:/i.test(v)||/^https?:\/\//i.test(v)||v.startsWith('/'))return v;
 return `/User Avatars/${encodeURIComponent(v)}`;
}
function idCardHeader(kind,label){
 return `<div class="lm-idcard-title"><span class="lm-heart lm-heart-left">♥</span><div><div class="lm-idcard-kicker">${label}</div><div class="lm-idcard-name">ID карта</div></div><span class="lm-heart lm-heart-right">♥</span></div>`;
}
function idField(label,value){return `<div class="lm-id-field"><span>${label}</span><b>${esc(value||'—')}</b></div>`;}
function userCardTags(u){
 const tags=[];
 if(u.cycleHistory)tags.push('Цикл');
 if(u.ovulation)tags.push('Овуляция');
 if(u.menstruation)tags.push('Менструация');
 if(u.pregnancy)tags.push('Беременность');
 if(u.children)tags.push('Дети');
 return tags;
}
function roleplayText(){
 const c=ctx();if(!c?.chat)return'';
 return c.chat.map(m=>typeof m?.mes==='string'?m.mes:'').filter(Boolean).join('\n');
}
function pregnancyRiskFromRP(text,u){
 const t=String(text||'').toLowerCase();
 const explicitRisk=/(без\s+(?:презерватива|защиты)|беззащитн|незащищ|внутр[ьи]\s+(?:не)?|семяизвержен[^.\n]{0,80}(?:внутр|туда|в неё|в нее)|зачат|оплодотвор|беремен)/i.test(t);
 if(!explicitRisk)return {risk:false,confirmed:/(зачат|оплодотвор|беремен)/i.test(t),chance:0,reason:'Признаков риска не найдено'};
 let chance=Number(u.pregnancyChance);if(!Number.isFinite(chance))chance=25;
 if(/овуляц|овулятор/i.test(t)||/овуляц|овулятор/i.test(String(u.ovulation||'')))chance+=20;
 if(/менструац|месячн/i.test(t)||/менструац|месячн/i.test(String(u.menstruation||'')))chance-=10;
 if(/контрац|презерватив|защищ[её]н|таблетк[аи]|спирал/i.test(t))chance-=20;
 chance=Math.max(0,Math.min(90,chance));
 return {risk:true,confirmed:/(зачат|оплодотвор|беремен)/i.test(t),chance,reason:`Риск обнаружен; расчётный шанс ${chance}%`};
}
function randomChildSex(){return Math.random()<0.5?'девочка':'мальчик';}
function checkUserRP(){
 const u=getUserCard(),rp=roleplayText();
 if(!rp){toast('В текущем чате пока нет РП для проверки');return;}
 const r=pregnancyRiskFromRP(rp,u);
 if(!r.risk){u.pregnancyCheckAt=Date.now();u.pregnancyResult='Риск беременности в РП не обнаружен.';saveUserCard(u);render();toast('Проверка РП: признаков риска не найдено');return;}
 let pregnant=false;
 if(r.confirmed) pregnant=true;
 else pregnant=Math.random()*100<r.chance;
 u.pregnancyCheckAt=Date.now();
 if(pregnant){
  const childSex=randomChildSex();
  u.pregnancy='Беременность: подтверждена по результату проверки РП.';
  u.children=u.children||`Будущий ребёнок: ${childSex}`;
  u.pregnancyResult=`Беременность определена. Пол ребёнка пока вероятностный: ${childSex}.`;
  u.notes=u.notes||'Состояние обновлено по проверке текущего РП.';
  saveUserCard(u);render();toast('Проверка РП: беременность определена');
 }else{
  u.pregnancy='Беременность не подтверждена.';
  u.pregnancyResult=`Риск был обнаружен, но случайный результат не подтвердил беременность (${r.chance}%).`;
  saveUserCard(u);render();toast(`Проверка РП: беременность не наступила (${r.chance}%)`);
 }
}
function userCardPage(){
 const u=refreshUserCardFromPersona(),av=userAvatarUrl(u.avatar),tags=userCardTags(u);
 const childInfo=u.children||'—';
 return `<div class="lm-idcard lm-user-idcard">
   <div class="lm-idcard-spark lm-spark-1">✦</div><div class="lm-idcard-spark lm-spark-2">✧</div>
   ${idCardHeader('user','PERSONAL MEDICAL ID · {{user}}')}
   <div class="lm-idcard-main">
    <button type="button" class="lm-idcard-photo lm-user-avatar-picker" data-user-avatar-picker title="Нажмите, чтобы выбрать аватар">${av?`<img src="${esc(av)}" alt="">`:'<span>♡<small>нажмите для аватара</small></span>'}</button><input id="lmUserAvatarFile" type="file" accept="image/*" hidden>
    <div class="lm-idcard-fields">
      ${idField('ИМЯ',u.name||'{{user}}')}
      ${idField('ВОЗРАСТ',u.age)}
      ${idField('ПОЛ',u.sex)}
      ${idField('ГЕНДЕР',u.gender)}
      ${idField('ВТОРИЧНЫЙ ПОЛ',u.secondarySex)}
      ${idField('БЕРЕМЕННОСТЬ',u.pregnancy||'—')}
      ${idField('ПОЛ / ДАННЫЕ РЕБЁНКА',childInfo)}
    </div>
   </div>
   <div class="lm-idcard-tags">${tags.map(t=>`<span><i>♥</i>${esc(t)}</span>`).join('')||'<span><i>♥</i>Наблюдение не заполнено</span>'}</div>
   <div class="lm-idcard-quote">${esc(u.notes||'Состояние пользователя: данные наблюдения пока не заполнены.')}</div>
   <section class="lm-user-health"><div class="lm-idcard-mini-title">СОСТОЯНИЕ ЦИКЛА</div>
    <label class="lm-health-row"><span>ЦИКЛ</span><input id="lmUserCycle" value="${esc(u.cycleHistory)}" placeholder="Не указан" aria-label="Цикл"></label>
    <label class="lm-health-row"><span>ОВУЛЯЦИЯ</span><input id="lmUserOvulation" value="${esc(u.ovulation)}" placeholder="Не указана" aria-label="Овуляция"></label>
    <label class="lm-health-row"><span>МЕНСТРУАЦИЯ</span><input id="lmUserMenstruation" value="${esc(u.menstruation)}" placeholder="Не указана" aria-label="Менструация"></label>
   </section>
   <div class="lm-idcard-actions"><button id="lmCheckUserRP" type="button" class="lm-primary">🩺 Проверить состояние по РП</button><button id="lmSaveUserCard" type="button" class="lm-secondary">Сохранить данные</button><button id="lmRefreshUserCard" type="button" class="lm-secondary">Обновить из персоны</button></div>
   <details class="lm-idcard-edit"><summary>Редактировать данные карты</summary>
    <div class="lm-user-grid">
     <label>Имя<input id="lmUserName" value="${esc(u.name)}" placeholder="Имя"></label><label>Возраст<input id="lmUserAge" value="${esc(u.age)}" placeholder="Не указан"></label>
     <label>Пол<input id="lmUserSex" value="${esc(u.sex)}" placeholder="Не указан"></label><label>Гендер<input id="lmUserGender" value="${esc(u.gender)}" placeholder="Не указан"></label>
     <label>Вторичный пол<input id="lmUserSecondary" value="${esc(u.secondarySex)}" placeholder="Не указан"></label><label>Шанс беременности<input id="lmUserPregChance" type="number" min="0" max="90" value="${esc(u.pregnancyChance)}" placeholder="25"></label><label>Аватар<input id="lmUserAvatar" value="${esc(u.avatar)}" placeholder="Автоматически из персоны"></label>
    </div>
    <div class="lm-history-grid">
     <label>Беременность<textarea id="lmUserPregnancy" placeholder="История беременностей...">${esc(u.pregnancy)}</textarea></label>
     <label>Дети<textarea id="lmUserChildren" placeholder="Имя, пол, возраст...">${esc(u.children)}</textarea></label><label>Результат проверки РП<textarea id="lmUserPregResult" placeholder="Результат последней проверки...">${esc(u.pregnancyResult)}</textarea></label><label>Состояние / заметки<textarea id="lmUserNotes" placeholder="Описание состояния...">${esc(u.notes)}</textarea></label>
    </div>
    <button id="lmSaveUserHistory" type="button" class="lm-primary">Сохранить историю</button>
   </details>
  </div>`;
}
function collectUserIdentity(){let pc=Number(document.querySelector('#lmUserPregChance')?.value);if(!Number.isFinite(pc))pc=25;return {name:document.querySelector('#lmUserName')?.value.trim()||'',age:document.querySelector('#lmUserAge')?.value.trim()||'',sex:document.querySelector('#lmUserSex')?.value.trim()||'',gender:document.querySelector('#lmUserGender')?.value.trim()||'',secondarySex:document.querySelector('#lmUserSecondary')?.value.trim()||'',avatar:document.querySelector('#lmUserAvatar')?.value.trim()||getUserCard().avatar||'',pregnancyChance:Math.max(0,Math.min(90,pc))};}
function saveUserIdentity(){saveUserCard(Object.assign(getUserCard(),collectUserIdentity()));render();toast('Данные пользователя сохранены');}
function saveUserHistory(){saveUserCard(Object.assign(getUserCard(),{cycleHistory:document.querySelector('#lmUserCycle')?.value.trim()||'',ovulation:document.querySelector('#lmUserOvulation')?.value.trim()||'',menstruation:document.querySelector('#lmUserMenstruation')?.value.trim()||'',pregnancy:document.querySelector('#lmUserPregnancy')?.value.trim()||'',children:document.querySelector('#lmUserChildren')?.value.trim()||'',pregnancyResult:document.querySelector('#lmUserPregResult')?.value.trim()||'',notes:document.querySelector('#lmUserNotes')?.value.trim()||''}));render();toast('История пользователя сохранена');}
function bindUserCard(){
 const overlay=document.querySelector('#lmOverlay');
 if(!overlay||overlay.dataset.userDelegated)return;
 overlay.dataset.userDelegated='1';
 overlay.addEventListener('click',e=>{
  const btn=e.target.closest?.('#lmSaveUserCard,#lmSaveUserHistory,#lmRefreshUserCard,#lmCheckUserRP,#lmRollKink,[data-save-char-card],[data-reset-char-card],[data-user-avatar-picker]');
  if(!btn)return;
  if(btn.matches('[data-user-avatar-picker]')){
   e.preventDefault();e.stopPropagation();
   document.querySelector('#lmUserAvatarFile')?.click();
   return;
  }
  e.preventDefault();e.stopPropagation();
  if(btn.id==='lmSaveUserCard')saveUserIdentity();
  else if(btn.id==='lmSaveUserHistory')saveUserHistory();
  else if(btn.id==='lmRefreshUserCard'){refreshUserCardFromPersona();render();toast('Данные обновлены из персоны');}
  else if(btn.id==='lmCheckUserRP')checkUserRP();
  else if(btn.matches('[data-save-char-card]'))saveCharCardFromRoot(btn.closest('[data-char-card-edit]'),btn.dataset.saveCharCard||'');
  else if(btn.matches('[data-reset-char-card]'))resetCharCard(btn.dataset.resetCharCard||'');
  else if(btn.id==='lmRollKink')rollRandomKink();
 });
 overlay.addEventListener('change',e=>{
  if(e.target?.id!=='lmUserAvatarFile')return;
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){toast('Нужен файл изображения');e.target.value='';return;}
  if(file.size>12*1024*1024){toast('Изображение слишком большое (максимум 12 МБ)');e.target.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{const src=String(reader.result||''),img=new Image();img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height)),w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const cx=canvas.getContext('2d');cx.drawImage(img,0,0,w,h);let data=canvas.toDataURL('image/jpeg',0.82);if(data.length>1200000)data=canvas.toDataURL('image/jpeg',0.65);const u=getUserCard();u.avatar=data;saveUserCard(u);if(!getUserCard().avatar){toast('Не удалось сохранить аватар: хранилище переполнено');return;}render();toast('Аватар сохранён');};img.onerror=()=>toast('Не удалось обработать изображение');img.src=src;};
  reader.onerror=()=>toast('Не удалось прочитать изображение');reader.readAsDataURL(file);
 });
 overlay.addEventListener('change',e=>{
  const id=e.target?.id;
  if(['lmUserName','lmUserAge','lmUserSex','lmUserGender','lmUserSecondary','lmUserPregChance'].includes(id)){
   const u=getUserCard();
   if(id==='lmUserName')u.name=e.target.value.trim();
   if(id==='lmUserAge')u.age=e.target.value.trim();
   if(id==='lmUserSex')u.sex=e.target.value.trim();
   if(id==='lmUserGender')u.gender=e.target.value.trim();
   if(id==='lmUserSecondary')u.secondarySex=e.target.value.trim();
   if(id==='lmUserPregChance'){const n=Number(e.target.value);u.pregnancyChance=Number.isFinite(n)?Math.max(0,Math.min(90,n)):25;}
   saveUserCard(u);
  }
  if(['lmUserCycle','lmUserOvulation','lmUserMenstruation','lmUserPregnancy','lmUserChildren','lmUserPregResult','lmUserNotes'].includes(id)){
   const u=getUserCard();
   if(id==='lmUserCycle')u.cycleHistory=e.target.value.trim();
   if(id==='lmUserOvulation')u.ovulation=e.target.value.trim();
   if(id==='lmUserMenstruation')u.menstruation=e.target.value.trim();
   if(id==='lmUserPregnancy')u.pregnancy=e.target.value.trim();
   if(id==='lmUserChildren')u.children=e.target.value.trim();
   if(id==='lmUserPregResult')u.pregnancyResult=e.target.value.trim();
   if(id==='lmUserNotes')u.notes=e.target.value.trim();
   saveUserCard(u);
  }
 });
}

function avatar(){return charProfile().avatar;}

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

function groupMemberByKey(key){return groupCharacters().find((ch,i)=>charMemberKey(ch,i)===String(key))||null;}
function charCardEditorPage(s,member=null,index=0){
 const cp=charProfile(member),key=member?charMemberKey(member,index):'',label=member?`Редактировать данные карты ${cp.name}`:'Редактировать данные карты {{char}}';
 return `<details class="lm-idcard-edit lm-char-card-edit" ${member?'':'open'} data-char-card-edit="${esc(key)}">
  <summary>${esc(label)}</summary>
  <p class="lm-note">Ручные значения имеют приоритет над автоматическим анализом карточки бота. Например, если автор указал возраст, но LoveMed его не распознал, его можно вписать здесь.</p>
  <div class="lm-user-grid">
   <label>Имя<input data-char-field="name" value="${esc(cp.name)}" placeholder="Имя"></label><label>Возраст<input data-char-field="age" value="${esc(cp.age)}" placeholder="Не указан"></label>
   <label>Пол<input data-char-field="sex" value="${esc(cp.sex)}" placeholder="Не указан"></label><label>Гендер<input data-char-field="gender" value="${esc(cp.gender)}" placeholder="Не указан"></label>
   <label>Вторичный пол<input data-char-field="secondarySex" value="${esc(cp.secondarySex)}" placeholder="Не указан"></label>
  </div>
  <div class="lm-idcard-actions"><button data-save-char-card="${esc(key)}" type="button" class="lm-primary">Сохранить данные карты</button><button data-reset-char-card="${esc(key)}" type="button" class="lm-secondary">Сбросить ручные данные</button></div>
 </details>`;
}
function saveCharCardFromRoot(root,key=''){
 const member=key?groupMemberByKey(key):null;
 const data={};['name','age','sex','gender','secondarySex'].forEach(k=>data[k]=root?.querySelector?.(`[data-char-field="${k}"]`)?.value.trim()||'');
 saveCharCard(data,member);render();toast(member?`Карта ${charProfile(member).name} сохранена`:'Карта {{char}} сохранена');
}
function resetCharCard(key=''){
 const member=key?groupMemberByKey(key):null;
 localStorage.removeItem(charCardKey(member));render();toast(member?`Ручные данные карты ${charProfile(member).name} сброшены`:'Ручные данные карты {{char}} сброшены');
}
function page(tab,s){
 if(tab==='user')return userCardPage();
 if(tab==='card'){
  const diagnosis=diagnosisFor(s),cp=charProfile(),tags=diagnosis.map(k=>kink(k).name);
  return `<div class="lm-idcard lm-char-idcard">
   <div class="lm-idcard-spark lm-spark-1">✦</div><div class="lm-idcard-spark lm-spark-2">✧</div>
   ${idCardHeader('char','PATIENT MEDICAL ID · {{char}}')}
   <div class="lm-idcard-main">
    <div class="lm-idcard-photo">${cp.avatar?`<img src="${esc(cp.avatar)}" alt="">`:'<span>♡</span>'}</div>
    <div class="lm-idcard-fields">
      ${idField('ИМЯ',cp.name)}
      ${idField('ВОЗРАСТ',cp.age)}
      ${idField('ПОЛ',cp.sex)}
      ${idField('ГЕНДЕР',cp.gender)}
      ${idField('ВТОРИЧНЫЙ ПОЛ',cp.secondarySex)}
      ${idField('СОСТОЯНИЕ',s.lastShift||'Наблюдение продолжается')}
    </div>
   </div>
   <div class="lm-idcard-tags">${tags.map(t=>`<span><i>♥</i>${esc(t)}</span>`).join('')||'<span><i>♥</i>Диагноз не установлен</span>'}</div>
   <div class="lm-idcard-quote">${esc(s.lastShift||'Описание состояния появится после наблюдения и анализа карточки.')}</div>
   <section class="lm-idcard-metrics"><div class="lm-idcard-mini-title">МЕДИЦИНСКИЕ ПОКАЗАТЕЛИ</div><div class="lm-rel">${visible(s).map(k=>`<label><span>${REL_LABEL[k]}</span><b>${Math.round(s.relation[k])}</b><input data-rel="${k}" type="range" min="0" max="200" value="${clamp(s.relation[k])}"></label>`).join('')}</div></section>
   <section class="lm-idcard-diagnosis"><div class="lm-idcard-mini-title">ДИАГНОЗ</div><div class="lm-tags">${diagnosis.length?diagnosis.map(k=>`<span class="lm-tag">${esc(kink(k).name)}<button type="button" data-remove-diagnosis="${esc(k)}" title="Убрать из диагноза">×</button></span>`).join(''):'<i>Пока не установлен.</i>'}</div></section>
   <section class="lm-anamnesis-summary"><div class="lm-idcard-mini-title">АНАМНЕЗ</div><div>${esc(s.anamnesisSummary||'Анамнез ещё не обновлялся.')}</div></section>
   <button id="lmAnamnesis" type="button" class="lm-primary lm-anamnesis-button">🩺 Провести анамнез карточки пациента</button>
   ${charCardEditorPage(s)}
  </div>`;
 }
if(tab==='react'){
 const randomIds=Array.isArray(s.randomKinkIds)&&s.randomKinkIds.length?s.randomKinkIds:(s.randomKinkId?[s.randomKinkId]:[]);
 const randomNames=randomIds.map(id=>kink(id).name);
 return `<div class="lm-card"><section class="lm-section"><h3>Реактивность пациента</h3><div class="lm-sliders"><label>Интенсивность реакции <b>${s.reactionIntensity}</b><input id="lmIntensity" type="range" min="0" max="100" value="${s.reactionIntensity}"></label><label>Вероятность спонтанной реакции <b>${s.reactionChance}%</b><input id="lmChance" type="range" min="0" max="100" value="${s.reactionChance}"></label><label>Период наблюдения <b>${s.reactionCooldown}</b><input id="lmCooldown" type="range" min="1" max="12" value="${s.reactionCooldown}"></label></div></section><section class="lm-section lm-random-react"><h3>🎲 Ситуативный кубик</h3><p class="lm-note">Кубик выбирает до трёх подходящих вариантов из диагноза. В момент генерации модель смотрит на текущую сцену и выбирает из них <b>один</b> самый естественный вариант. Остальные предпочтения не навязываются.</p><div class="lm-random-react-row"><button id="lmRollKink" type="button" class="lm-primary lm-dice-button">🎲 Выбрать варианты</button><div class="lm-random-result">${randomNames.length?`Варианты: <b>${esc(randomNames.join(' · '))}</b>`:'Варианты ещё не выбраны'}</div></div></section>${libraryPage(s)}</div>`;
}
 if(tab==='contacts')return `<div class="lm-card lm-contacts-page"><section class="lm-section"><h3>Сопутствующие лица</h3><p class="lm-note">Персонажи, влияющие на состояние пациента и отношения.</p>${s.contacts.map(n=>`<article class="lm-npc-idcard"><div class="lm-npc-corner">✦ ♡</div><div class="lm-npc-photo">♡</div><div class="lm-npc-body"><div class="lm-idcard-kicker">CONTACT MEDICAL ID</div><div class="lm-npc-name">${esc(n.name)}</div><div class="lm-npc-fields">${idField('ОТНОШЕНИЕ',n.relation||'Не определено')}</div><div class="lm-idcard-tags"><span><i>♥</i>Контакт</span>${n.relation?`<span><i>♥</i>${esc(n.relation)}</span>`:''}</div><div class="lm-idcard-quote">${esc(n.notes||'Сопутствующее лицо в текущем наблюдении.')}</div></div><button class="lm-npc-delete" data-del-contact="${esc(n.id)}" title="Удалить">×</button></article>`).join('')||'<i>Пока нет наблюдаемых контактов.</i>'}</section></div>`;
 if(tab==='history')return historyPage(s);
 return `<div class="lm-card"><section class="lm-section"><h3>Служебная диагностика</h3><label class="lm-check"><input id="lmEnabled" type="checkbox" ${s.enabled?'checked':''}> Включить LoveMed</label><label class="lm-check"><input id="lmAutoTrack" type="checkbox" ${s.autoTrack?'checked':''}> Автоматически обновлять показатели</label><label class="lm-check"><input id="lmAutoReaction" type="checkbox" ${s.autoReaction?'checked':''}> Разрешить спонтанные реакции</label><p class="lm-note">${esc(s.diagnostics.lastParseStatus)}</p><button id="lmParse" class="lm-secondary">Проверить последний ответ модели</button><label class="lm-check"><input id="lmFab" type="checkbox" ${ui().showFab?'checked':''}> Показывать плавающую кнопку</label></section></div>`;
}

function editorPage(k,s){
 const builtin=isBuiltin(k.id), deleted=getLibraryState().deleted.includes(k.id), inDiagnosis=diagnosisFor(s).includes(k.id);
 return `<div class="lm-card lm-editor-inline">
   <header class="lm-inline-head"><div><div class="lm-label">РЕДАКТОР БИБЛИОТЕКИ</div><h3>${esc(k.name)}</h3></div><button type="button" id="lmEditorClose" class="lm-close lm-inline-close">×</button></header>
   <div class="lm-editor-body">
    <label>Название<input id="lmEditName" value="${esc(k.name||'')}"></label>
    <label>Категория<select id="lmEditCat">${Object.entries(CAT_LABEL).map(([x,v])=>`<option value="${x}" ${x===(k.cat||'psych')?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Описание<textarea id="lmEditDesc">${esc(k.description||'')}</textarea></label>
    <label>Ключевые слова<input id="lmEditWords" value="${esc((k.words||[]).join(', '))}" placeholder="слово1, слово2, слово3"></label>
    <div class="lm-editor-actions">
      <button type="button" id="lmEditorSave" class="lm-primary">Сохранить изменения</button>
      <button type="button" id="lmEditorDiagnosis" class="lm-secondary">${inDiagnosis?'Убрать из диагноза':'Добавить в диагноз'}</button>
      <button type="button" id="lmEditorDelete" class="lm-danger" ${deleted?'style="display:none"':''}>${builtin?'Удалить встроенную запись':'Удалить запись'}</button>
      <button type="button" id="lmEditorRestore" class="lm-secondary" ${builtin&&!deleted?'':'style="display:none"'}>Восстановить исходную запись</button>
    </div>
   </div>
 </div>`;
}

let editorId=null;
let historyExpanded=false;
function openEditor(id){
 const k=allKinks().find(x=>x.id===id)||getLibraryState().custom.find(x=>x.id===id);
 if(!k)return;
 editorId=id;
 render();
 requestAnimationFrame(()=>document.querySelector('#lmBody')?.scrollTo({top:0,behavior:'instant'}));
}
function closeEditor(){editorId=null;render();}
function bindEditor(){
 document.querySelector('#lmEditorClose')?.addEventListener('click',closeEditor);
 document.querySelector('#lmEditorSave')?.addEventListener('click',()=>{
  if(!editorId)return;
  const name=document.querySelector('#lmEditName')?.value.trim()||'';
  const cat=document.querySelector('#lmEditCat')?.value||'psych';
  const description=document.querySelector('#lmEditDesc')?.value.trim()||'';
  const words=(document.querySelector('#lmEditWords')?.value||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  if(!name){toast('Введите название');return;}
  saveLibraryRecord({id:editorId,name,cat,description,words});
  const id=editorId;closeEditor();toast('Запись сохранена');
 });
 document.querySelector('#lmEditorDiagnosis')?.addEventListener('click',()=>{
  if(!editorId)return;
  const id=editorId, active=diagnosisFor(getState()).includes(id);
  setDiagnosisManual(id,!active);
 });
 document.querySelector('#lmEditorDelete')?.addEventListener('click',()=>{
  if(!editorId)return;
  const id=editorId, builtin=isBuiltin(id);
  deleteLibraryRecord(id);closeEditor();toast(builtin?'Встроенная запись скрыта':'Запись удалена');
 });
 document.querySelector('#lmEditorRestore')?.addEventListener('click',()=>{
  if(!editorId)return;
  const id=editorId;restoreBuiltin(id);closeEditor();toast('Исходная запись восстановлена');
 });
}

function render(){
 const b=document.querySelector('#lmBody');if(!b)return;
 const s=getState(),u=ui();
 if(editorId){
  const k=allKinks().find(x=>x.id===editorId)||getLibraryState().custom.find(x=>x.id===editorId);
  if(!k){editorId=null;} else {b.innerHTML=editorPage(k,s);bindEditor();return;}
 }
 b.innerHTML=page(u.tab,s);bind();
}

function bind(){
 bindUserCard();
 document.querySelectorAll('.lm-tabs [data-tab]').forEach(b=>b.onclick=()=>{const u=ui();u.tab=b.dataset.tab;saveUI(u);render();});
 document.querySelectorAll('[data-rel]').forEach(x=>x.oninput=async e=>{const st=getState();st.relation[e.target.dataset.rel]=Number(e.target.value);await saveState(st);render();});
 [['#lmIntensity','reactionIntensity'],['#lmChance','reactionChance'],['#lmCooldown','reactionCooldown']].forEach(([q,k])=>document.querySelector(q)?.addEventListener('input',async e=>{const st=getState();st[k]=Number(e.target.value);await saveState(st);}));
 document.querySelector('#lmAddKink')?.addEventListener('click',()=>{
  const n=document.querySelector('#lmKinkName')?.value.trim()||'',d=document.querySelector('#lmKinkDesc')?.value.trim()||'',cat=document.querySelector('#lmKinkCat')?.value||'psych';
  const words=(document.querySelector('#lmKinkWords')?.value||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  if(!n){toast('Введите название');return;} addCustom(n,cat,d,words.length?words:[n.toLowerCase()]);render();toast('Запись добавлена');
 });
 document.querySelectorAll('[data-edit-kink]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editKink));
 document.querySelectorAll('[data-del-kink]').forEach(b=>b.onclick=()=>{deleteLibraryRecord(b.dataset.delKink);render();toast('Запись удалена');});
 document.querySelectorAll('[data-restore-kink]').forEach(b=>b.onclick=()=>{restoreBuiltin(b.dataset.restoreKink);render();toast('Исходная запись восстановлена');});
 document.querySelectorAll('[data-remove-diagnosis]').forEach(b=>b.onclick=()=>removeDiagnosisOnly(b.dataset.removeDiagnosis));
 document.querySelectorAll('[data-add-diagnosis]').forEach(b=>b.onclick=()=>setDiagnosisManual(b.dataset.addDiagnosis,true));
 document.querySelectorAll('[data-del-contact]').forEach(b=>b.onclick=async()=>{const st=getState();st.contacts=st.contacts.filter(x=>x.id!==b.dataset.delContact);await saveState(st);render();});
 document.querySelector('#lmAddHistory')?.addEventListener('click',addManualHistory);
 document.querySelector('#lmAddHistoryToggle')?.addEventListener('click',()=>{const x=document.querySelector('#lmHistoryComposer');if(!x)return;x.classList.toggle('hidden');if(!x.classList.contains('hidden'))document.querySelector('#lmHistoryText')?.focus();});
 document.querySelectorAll('[data-edit-history]').forEach(b=>b.onclick=()=>editHistoryEntry(b.dataset.editHistory));
 document.querySelectorAll('[data-del-history]').forEach(b=>b.onclick=()=>deleteHistoryEntry(b.dataset.delHistory));
 document.querySelector('#lmHistoryMore')?.addEventListener('click',()=>{historyExpanded=!historyExpanded;render();});
 document.querySelector('#lmClearHistory')?.addEventListener('click',clearHistory);
 [['#lmEnabled','enabled'],['#lmAutoTrack','autoTrack'],['#lmAutoReaction','autoReaction']].forEach(([q,k])=>document.querySelector(q)?.addEventListener('change',async e=>{const st=getState();st[k]=e.target.checked;await saveState(st);}));
 document.querySelector('#lmParse')?.addEventListener('click',()=>toast(parseLatest()?'Пакет принят ✓':'Пакет не найден'));
 document.querySelector('#lmFab')?.addEventListener('change',e=>{const u=ui();u.showFab=e.target.checked;saveUI(u);syncFab();});
}

function ensurePanel(){
 if(document.querySelector('#lmOverlay'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="lmOverlay" class="lm-overlay hidden"><section class="lm-panel"><header class="lm-head"><div><div class="lm-kicker">LOVEMED · MEDICAL RECORD v0.3.2</div><h2>Медицинская карта</h2><p>Наблюдение за динамикой отношений</p></div><button id="lmClose" class="lm-close">×</button></header><nav class="lm-tabs">${[['card','🩺 Карта пациента'],['user','👤 Моя карта'],['react','🧪 Реактивность'],['contacts','👥 Контакты'],['history','📋 История'],['system','⚙ Служебное']].map(x=>`<button data-tab="${x[0]}">${x[1]}</button>`).join('')}</nav><main id="lmBody"></main></section></div>`);
 document.querySelector('#lmClose').onclick=()=>{editorId=null;document.querySelector('#lmOverlay').classList.add('hidden');};
 const overlay=document.querySelector('#lmOverlay');
 if(overlay&&!overlay.dataset.lovemedDelegated){
  overlay.dataset.lovemedDelegated='1';
  overlay.addEventListener('click',e=>{
   const btn=e.target.closest?.('#lmAnamnesis, #lmAnamnesis2');
   if(!btn)return;
   e.preventDefault();
   e.stopPropagation();
   if(btn.id==='lmAnamnesis'||btn.id==='lmAnamnesis2'){anamnesis();return;}
     });
 }
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
