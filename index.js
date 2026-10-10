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
const ROMANTIC_FIELDS=['love','desire','passion','arousal','obsession','jealousy'];
const RELATIONSHIP_MODES={romantic:'Романтические',platonic:'Платонические',neutral:'Нейтральные'};
const normalizeRelationshipMode=v=>['romantic','platonic','neutral'].includes(v)?v:'romantic';
const USER_FEELING_LABEL={calm:'Спокойная',happy:'Весёлая',sad:'Грустная',angry:'Злая',upset:'Расстроенная',anxious:'Тревожная',excited:'Взволнованная',tender:'Нежная',embarrassed:'Смущённая',irritated:'Раздражённая',stressed:'Напряжённая',afraid:'Испуганная',confident:'Уверенная',lonely:'Одинокая',interested:'Заинтересованная',content:'Удовлетворённая',disappointed:'Разочарованная',jealous:'Ревнивая',inLove:'Влюблённая',affectionate:'Ласковая',playful:'Игривaя',wary:'Настороженная',confused:'Растерянная',tired:'Уставшая',bored:'Скучающая',determined:'Решительная',guilty:'Виноватая',proud:'Гордая',hopeful:'Надеющаяся',curious:'Любопытная'};
const USER_FEELING_DEFAULTS=Object.fromEntries(Object.keys(USER_FEELING_LABEL).map(k=>[k,0]));

/* Built-in library. Keep this list neutral; user can add/edit their own records in the UI. */
const KINKS=[
['dominance','Доминирование','psych'],['submission','Подчинение','psych'],['praise','Похвала','psych'],['teasing','Поддразнивание','psych'],
['control','Контроль','psych'],['care','Забота','psych'],['sensitivity','Сенсорика','physical'],['restriction','Ограничение движений','physical'],
['roleplay','Ролевой сценарий','situational'],['risk','Риск','situational'],['romance','Романтика','romantic'],['gentle','Мягкость','romantic'],
['intensity','Эмоциональная выразительность','psych']
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
intensity:['emotional expression','emotional intensity','эмоциональн выразительн','выразительн эмоций']
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
intensity:'Эмоции персонажа могут быть заметнее внешне. Это не означает сексуальную эскалацию, грубость или повышение откровенности сцены.'
};

const CAT_LABEL={psych:'Психологические',physical:'Физические / сенсорные',situational:'Ситуационные',romantic:'Романтические'};

const defaults=()=>({enabled:true,autoTrack:true,autoReaction:true,relationshipMode:'romantic',npcRelationships:[],relation:Object.fromEntries(REL_FIELDS.map(([k])=>[k,0])),activeFeelings:[],lastShift:'',diagnosis:[],diagnosisManual:{added:[],removed:[]},anamnesis:[],anamnesisAt:0,reactionIntensity:55,reactionChance:35,reactionCooldown:4,reactionCooldownRemaining:0,lastReaction:'',lastReactionId:'',randomKinkId:'',randomKinkIds:[],randomKinkPendingIds:[],randomKinkAt:0,contacts:[],history:[],historyNotice:true,anamnesisSummary:'',userFeelings:[],userEmotionScores:{...USER_FEELING_DEFAULTS},charName:'',updatedAt:Date.now(),diagnostics:{lastParseAt:0,lastParseStatus:'Ожидает проверки',lastParseError:''}});
const ctx=()=>{try{return getContext?.()||globalThis.SillyTavern?.getContext?.()||{};}catch{return {};}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const npcNameKey=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const clamp=(n,min=0,max=REL_MAX)=>Math.max(min,Math.min(max,Number(n)||0));
const RELATIONSHIP_IMPACTS={none:0,minor:3,major:8};
function normalizeRelationshipImpact(value){return Object.prototype.hasOwnProperty.call(RELATIONSHIP_IMPACTS,value)?value:'minor';}

/* Shared relationship core. Main {{char}} and future NPC records use the same schema/rules. */
function createRelationshipRecord(raw={}){
 const mode=normalizeRelationshipMode(raw.mode||raw.relationshipMode||'neutral');
 const relation=Object.fromEntries(REL_FIELDS.map(([k])=>[k,clamp(raw.relation?.[k])]));
 return {id:String(raw.id||uid()),name:String(raw.name||'NPC').slice(0,100),info:String(raw.info||raw.notes||'').slice(0,2000),mode,relation,
  activeFeelings:(Array.isArray(raw.activeFeelings)?raw.activeFeelings:[]).filter(k=>REL_LABEL[k]).slice(0,6),
  lastShift:String(raw.lastShift||'').slice(0,300),
  history:(Array.isArray(raw.history)?raw.history:[]).filter(e=>e&&typeof e==='object').map(e=>({ts:Number(e.ts)||Date.now(),shift:String(e.shift||'').slice(0,300),changes:Object.fromEntries(Object.entries(e.changes||{}).filter(([k,v])=>k in REL_LABEL&&Number.isFinite(Number(v))).map(([k,v])=>[k,Number(v)])),activeFeelings:(Array.isArray(e.activeFeelings)?e.activeFeelings:[]).filter(k=>REL_LABEL[k]).slice(0,6)})).slice(-30),
  updatedAt:Number(raw.updatedAt)||Date.now()};
}
function normalizeRelationshipRecord(raw){return createRelationshipRecord(raw&&typeof raw==='object'?raw:{});}
function protectedIdentityNames(){
 const c=ctx();let cardName='',personaName='';try{cardName=getUserCard()?.name||'';}catch{}
 try{personaName=String(userPersonaText().match(/(?:^|\n)\s*(?:name|имя)\s*[:：]\s*([^\n,;]+)/i)?.[1]||'').trim();}catch{}
 return [...new Set([charName(),c?.name1,c?.userName,c?.personaName,c?.userPersonaName,c?.persona?.name,c?.userPersona?.name,c?.personaData?.name,c?.user?.name,cardName,personaName,'{{user}}','{{char}}'].map(npcNameKey).filter(Boolean))];
}
function isProtectedIdentityName(value){
 const name=npcNameKey(value);if(!name)return true;
 return protectedIdentityNames().includes(name)||['user','the user','пользователь','главный герой'].includes(name);
}
function relationshipAllows(mode,key){return mode==='romantic'||!ROMANTIC_FIELDS.includes(key);}
function applyRelationshipChanges(record,deltas={},activeFeelings,impact='minor'){
 const r=normalizeRelationshipRecord(record);
 const limit=RELATIONSHIP_IMPACTS[normalizeRelationshipImpact(impact)];
 for(const [key,value] of Object.entries(deltas||{})){
  if(!(key in r.relation)||!relationshipAllows(r.mode,key)||limit===0)continue;
  const requested=Number(value);if(!Number.isFinite(requested))continue;
  const bounded=Math.max(-limit,Math.min(limit,requested));
  r.relation[key]=clamp(r.relation[key]+bounded);
 }
 if(Array.isArray(activeFeelings))r.activeFeelings=activeFeelings.filter(k=>REL_LABEL[k]&&relationshipAllows(r.mode,k)).slice(0,6);
 r.updatedAt=Date.now();return r;
}
function merge(raw){
 const d=defaults(),s=Object.assign(d,raw||{});
 s.relation=Object.assign({},d.relation,raw?.relation||{});
 for(const k of ['activeFeelings','diagnosis','anamnesis','contacts','history','userFeelings','npcRelationships'])if(!Array.isArray(s[k]))s[k]=[];
 const uniqueNpcs=new Map();
 for(const record of s.npcRelationships.map(normalizeRelationshipRecord).filter(r=>!isProtectedIdentityName(r.name))){
  const key=npcNameKey(record.name),previous=uniqueNpcs.get(key);
  if(!previous){uniqueNpcs.set(key,record);continue;}
  const newest=record.updatedAt>=previous.updatedAt?record:previous;
  newest.info=newest.info||previous.info||record.info;
  newest.history=[...(previous.history||[]),...(record.history||[])].sort((a,b)=>a.ts-b.ts).slice(-30);
  newest.lastShift=newest.lastShift||previous.lastShift||record.lastShift;
  uniqueNpcs.set(key,newest);
 }
 s.npcRelationships=[...uniqueNpcs.values()];
 // Migrate legacy contacts only when they are genuine NPCs; never turn {{user}} or {{char}} into an NPC.
 s.contacts=s.contacts.filter(contact=>contact?.name&&!isProtectedIdentityName(contact.name));
 for(const contact of s.contacts){const key=npcNameKey(contact.name);if(!s.npcRelationships.some(r=>npcNameKey(r.name)===key))s.npcRelationships.push(createRelationshipRecord({id:contact.id||uid(),name:contact.name,mode:'neutral',info:contact.notes||''}));}
 s.userFeelings=s.userFeelings.filter(k=>USER_FEELING_LABEL[k]).slice(0,6);
 s.userEmotionScores=Object.assign({},USER_FEELING_DEFAULTS,raw?.userEmotionScores||{});
 for(const k of Object.keys(s.userEmotionScores))s.userEmotionScores[k]=Math.max(0,Math.min(100,Number(s.userEmotionScores[k])||0));
 if(s.userFeelings.length&&!Object.values(s.userEmotionScores).some(v=>v>0))s.userFeelings.forEach(k=>s.userEmotionScores[k]=70);
 s.relationshipMode=normalizeRelationshipMode(raw?.relationshipMode);
 s.diagnostics=Object.assign({},d.diagnostics,raw?.diagnostics||{});
 s.historyNotice=raw?.historyNotice!==false;
 s.randomKinkIds=Array.isArray(raw?.randomKinkIds)?raw.randomKinkIds:((raw?.randomKinkId?[raw.randomKinkId]:[]));
 s.randomKinkPendingIds=Array.isArray(raw?.randomKinkPendingIds)?raw.randomKinkPendingIds.filter(id=>allKinks().some(k=>k.id===id)):[];
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
 const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const field=(labels)=>{
  const label=labels.join('|');
  const re=new RegExp('^(?:[-*•]\\s*)?(?:'+label+')\\s*[:：=–—-]\\s*(.*?)\\s*$','i');
  for(const line of lines){const m=line.match(re);if(!m?.[1])continue;
   const value=m[1].replace(/\s{2,}/g,' ').replace(/[.。]+$/,'').trim();
   if(value&&value.length<=80&&!/^(?:unknown|не указан(?:а|о)?|n\/a|none|нет данных)$/i.test(value))return value;
  }
  return '';
 };
 const ageLine=field(['возраст','age']);
 const ageMatch=ageLine.match(/\b\d{1,3}\b/);
 return {
  age:ageMatch?ageMatch[0]:'',
  sex:field(['биологический пол','пол','sex','biological sex']),
  gender:field(['гендер','gender','gender identity']),
  secondarySex:field(['вторичный пол','вторичная половая роль','secondary sex','omegaverse sex'])
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
 const allowed=k=>relationshipAllows(s.relationshipMode,k);
 const a=(s.activeFeelings||[]).filter(k=>REL_LABEL[k]&&allowed(k));
 const r=REL_FIELDS.map(([k])=>[k,clamp(s.relation[k])]).filter(x=>x[1]>0&&allowed(x[0])).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 const fallback=(s.relationshipMode==='romantic'?DEFAULT_VISIBLE:['trust','affection','sympathy','friendship','respect','tenderness']).filter(allowed);
 return[...new Set([...a,...r,...fallback])].slice(0,6);
}
function userVisibleFeelings(s){
 const scores=Object.entries(Object.assign({},USER_FEELING_DEFAULTS,s.userEmotionScores||{})).filter(([k])=>USER_FEELING_LABEL[k]);
 const selected=(s.userFeelings||[]).filter(k=>USER_FEELING_LABEL[k]);
 const ranked=scores.filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k])=>k);
 return[...new Set([...selected,...ranked])].slice(0,6);
}
function parsePacket(text){const o='[[LOVEMED_STATE]]',c='[[/LOVEMED_STATE]]',p=text.lastIndexOf(o);if(p<0)return null;const q=text.indexOf(c,p+o.length);if(q<0)return null;try{return{packet:JSON.parse(text.slice(p+o.length,q).trim()),start:p,end:q+c.length};}catch{return null;}}
function applyPacket(s,p){
 const previousRelation={...s.relation},previousFeelings=[...(s.activeFeelings||[])],previousShift=s.lastShift||'';
 const mainRelation=applyRelationshipChanges({id:'main-char',name:charName(),mode:s.relationshipMode,relation:s.relation,activeFeelings:s.activeFeelings},p.relation,p.active_feelings,p.impact);
 s.relation=mainRelation.relation;s.activeFeelings=mainRelation.activeFeelings;
 const mainChanges=Object.fromEntries(PATIENT_FEELING_KEYS.map(key=>[key,Number((((Number(s.relation[key])||0)-(Number(previousRelation[key])||0))/2).toFixed(1))]).filter(([,delta])=>delta!==0));
 const mainFeelingsChanged=JSON.stringify(previousFeelings)!==JSON.stringify(s.activeFeelings||[]);
 if(Object.keys(mainChanges).length||mainFeelingsChanged){
  const changeText=Object.entries(mainChanges).map(([key,delta])=>`${REL_LABEL[key]} ${delta>0?'+':''}${delta}%`).join(' · ');
  const summary=[String(p.shift||'').trim(),changeText,mainFeelingsChanged?`Актуальные чувства: ${(s.activeFeelings||[]).map(k=>REL_LABEL[k]).join(', ')||'не выделены'}`:''].filter(Boolean).join(' — ');
  s.history.unshift({ts:Date.now(),type:'Отношения {{char}}',text:summary||'Обновлены актуальные чувства'});s.history=s.history.slice(0,80);
 }
 if(p.user_emotion_scores&&typeof p.user_emotion_scores==='object'){Object.keys(USER_FEELING_LABEL).forEach(k=>s.userEmotionScores[k]=0);for(const[k,v]of Object.entries(p.user_emotion_scores))if(k in USER_FEELING_LABEL)s.userEmotionScores[k]=Math.max(0,Math.min(100,Number(v)||0));}
 if(Array.isArray(p.user_feelings))s.userFeelings=p.user_feelings.filter(k=>USER_FEELING_LABEL[k]).slice(0,6);
 if(!p.user_emotion_scores&&Array.isArray(p.user_feelings)){Object.keys(s.userEmotionScores).forEach(k=>s.userEmotionScores[k]=0);s.userFeelings.forEach(k=>s.userEmotionScores[k]=70);}
 if(p.shift)s.lastShift=String(p.shift).slice(0,300);
 if(Array.isArray(p.contacts))for(const n of p.contacts){if(!n?.name||isProtectedIdentityName(n.name))continue;const x=s.contacts.find(v=>npcNameKey(v.name)===npcNameKey(n.name));if(!x)continue;x.relation=String(n.relation||x.relation).slice(0,100);x.notes=String(n.notes||x.notes).slice(0,300);x.updatedAt=Date.now();}
 if(Array.isArray(p.npc_updates))for(const update of p.npc_updates){
  if(!update?.name||isProtectedIdentityName(update.name))continue;
  const nr=s.npcRelationships.find(v=>npcNameKey(v.name)===npcNameKey(update.name));if(!nr)continue;
  const before={...nr.relation},beforeFeelings=[...(nr.activeFeelings||[])];
  const changed=applyRelationshipChanges(nr,update.relation,update.active_feelings,update.impact||p.impact);nr.relation=changed.relation;nr.activeFeelings=changed.activeFeelings;
  const actualChanges=Object.fromEntries(REL_FIELDS.map(([key])=>[key,Math.round((nr.relation[key]||0)-(before[key]||0))]).filter(([,delta])=>delta!==0));
  const shift=String(update.shift||'').trim().slice(0,300),feelingsChanged=JSON.stringify(beforeFeelings)!==JSON.stringify(nr.activeFeelings||[]);
  if(Object.keys(actualChanges).length||feelingsChanged||(shift&&shift!==nr.lastShift)){
   nr.lastShift=shift||nr.lastShift||'Динамика отношений обновлена';
   nr.history=[...(nr.history||[]),{ts:Date.now(),shift:nr.lastShift,changes:actualChanges,activeFeelings:[...(nr.activeFeelings||[])]}].slice(-30);
  }else if(shift)nr.lastShift=shift;
  nr.updatedAt=Date.now();
 }
 if(p.shift&&s.lastShift!==previousShift){s.history.unshift({ts:Date.now(),type:'Состояние',text:s.lastShift});s.history=s.history.slice(0,80);}
}
function normalizeCueText(value){return String(value||'').toLocaleLowerCase().normalize('NFKC').replace(/[ё]/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function detectUsedKinks(text,ids){
 const body=normalizeCueText(text);const used=[];
 for(const id of ids||[]){const record=kink(id);const terms=[record.name,...(record.words||[])].map(normalizeCueText).filter(term=>term.length>=4);
  if(terms.some(term=>body.includes(term)))used.push(id);
 }
 return used;
}
function parseLatest(){
 const c=ctx();if(!c?.chat)return false;const x=[...c.chat].map((m,i)=>({m,i})).reverse().find(v=>!v.m.is_user&&typeof v.m.mes==='string');if(!x)return false;
 const f=parsePacket(x.m.mes),s=getState();
 const pending=Array.isArray(s.randomKinkPendingIds)?s.randomKinkPendingIds:[];
 const used=detectUsedKinks(x.m.mes.slice(0,f?f.start:undefined),pending);
 if(pending.length){s.randomKinkPendingIds=[];if(used.length){const names=used.map(id=>kink(id).name);s.history.unshift({ts:Date.now(),type:'Реактив',text:`Кубик автоматически сброшен после использования: ${names.join(', ')}.`});s.history=s.history.slice(0,80);}else if(!f){s.history.unshift({ts:Date.now(),type:'Реактив',text:'Выбранные варианты кубика сброшены после следующего ответа, чтобы не переносить их в дальнейший РП.'});s.history=s.history.slice(0,80);}}
 if(!f){if(pending.length)saveState(s);return false;}
 applyPacket(s,f.packet);
 s.diagnostics={lastParseAt:Date.now(),lastParseStatus:'Служебный пакет принят ✓',lastParseError:''};
 x.m.mes=(x.m.mes.slice(0,f.start)+x.m.mes.slice(f.end)).trimEnd();try{c.chat[x.i]=x.m;c.saveChat?.();}catch{}saveState(s);if(s.historyNotice&&f.packet?.shift)toast(`🩺 Новое наблюдение: ${String(f.packet.shift).slice(0,90)}`);return true;
}
function reactionPrompt(s){
 if(!s.autoReaction||!(s.anamnesis||[]).length)return'';
 if(s.reactionCooldownRemaining>0){s.reactionCooldownRemaining--;saveState(s);return'';}
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
 s.randomKinkPendingIds=[...picks];
 s.randomKinkId='';s.randomKinkIds=[];s.randomKinkAt=0;s.lastReaction=names[0]||'';s.lastReactionId=picks[0]||'';
 s.reactionCooldownRemaining=Math.max(1,s.reactionCooldown);
 saveState(s);
 const i=s.reactionIntensity,mode=i>=80?'эмоция может быть внешне очень заметной, но без автоматической эскалации':i>=60?'заметная эмоция или инициатива, если это естественно':i>=35?'умеренная эмоциональная реакция':'сдержанная внутренняя реакция';
 const candidates=names.length>1?`Optional candidate cues: ${names.join(' / ')}.`:`Optional candidate cue: ${names[0]||'none'}.`;
 return`[LOVEMED REACTIVITY — THIS REPLY ONLY] ${candidates}
Treat these as optional character cues, never as a checklist or an instruction to perform a kink. Choose at most ONE cue, and only if the current scene genuinely supports it; otherwise ignore all of them. Preserve the character's established personality, emotional nuance, consent, boundaries, and narrative pacing. Do not escalate sexual content just because a cue exists. Do not turn ordinary RP into pornographic content, do not introduce explicit sexual activity unless {{user}} has clearly initiated or the established scene naturally and consensually supports it, and never control {{user}}'s actions or consent. Intensity ${i}/100 affects only how visible an emotion is, never explicitness or escalation: ${mode}.`;
}
function rollRandomKink(){
 const s=getState(),pool=[...new Set((s.anamnesis||[]).filter(id=>allKinks().some(k=>k.id===id)))];
 if(!pool.length){toast('Сначала проведите анамнез и получите хотя бы один реактив.');return;}
 const shuffled=[...pool].sort(()=>Math.random()-0.5);
 const withoutLast=shuffled.filter(id=>id!==s.lastReactionId);
 const source=withoutLast.length>=Math.min(3,pool.length)?withoutLast:shuffled;
 const picks=source.slice(0,Math.min(3,source.length));
 s.randomKinkIds=picks;s.randomKinkId=picks[0]||'';s.randomKinkPendingIds=[];s.randomKinkAt=Date.now();
 saveState(s).then(()=>{render();toast(`🎲 Варианты: ${picks.map(id=>kink(id).name).join(' · ')}`);});
}

function prompt(opts={}){
 const s=getState();if(!s.enabled)return'';
 const rel=visible(s).map(k=>`${REL_LABEL[k]}=${Math.round(s.relation[k])}`).join(', ');
 const allRelScores=Object.fromEntries(REL_FIELDS.map(([k])=>[k,Math.round(clamp(s.relation[k]))]));
 const rx=opts.includeReaction?reactionPrompt(s):'';
 const relationMode=s.relationshipMode==='romantic'?'РОМАНТИЧЕСКАЯ — романтическая динамика разрешена.':s.relationshipMode==='platonic'?'ПЛАТОНИЧЕСКАЯ — развивай дружбу, доверие, симпатию и близость без автоматического развития романтических показателей.':'НЕЙТРАЛЬНАЯ — не предполагай романтическую или близкую связь; меняй отношения только при явных признаках текущей сцены.';
 const relKeys=REL_FIELDS.map(([k])=>k).join(', ');
 const userKeys=Object.keys(USER_FEELING_LABEL).join(', ');
 const npcList=(s.npcRelationships||[]).filter(n=>!isProtectedIdentityName(n.name)).slice(0,30).map(n=>({name:n.name,info:n.info||'',mode:n.mode,relation:n.relation,active_feelings:(n.activeFeelings||[]).filter(k=>relationshipAllows(n.mode,k)),last_shift:n.lastShift||'',recent_history:(n.history||[]).slice(-3).map(e=>({shift:e.shift,changes:e.changes,active_feelings:e.activeFeelings}))}));
 const npcContext=npcList.length?JSON.stringify(npcList):'[]';
 return`\n[LOVEMED — PRIVATE MEDICAL CONTINUITY]
Patient: ${charName()}
Relationship mode: ${relationMode}
Current salient relationship indicators: ${rel||'не определены'}
Current full relationship scores for {{char}} (0-200): ${JSON.stringify(allRelScores)}
Full relationship vocabulary: ${relKeys}
Saved preference records: ${(s.diagnosis||[]).length}. These are reference data only, NOT active instructions. Do not introduce or escalate any saved preference unless a temporary LOVEMED REACTIVITY cue is provided for this reply; even then, that cue is optional and may be ignored when it does not fit the scene.
${s.lastShift?`Recent observation: ${s.lastShift}`:''}
Known NPC relationship records (update ONLY these named characters; do not invent new records here): ${npcContext}
${rx}
Write the complete in-character RP response first, with a natural ending; do not stop mid-sentence or let the bookkeeping packet replace or truncate the narrative. Then append this compact private machine-readable packet at the very end, without explaining it. Keep the packet minimal and valid JSON. Analyze the current RP/context actually available to you, especially the current {{user}} actions, words and emotional cues. Never treat {{user}} as an NPC or add {{user}}, {{char}}, the current character name, or the user's persona name to contacts/NPC records. NPCs are ONLY those explicitly listed in Known NPC relationship records. Never create records in contacts or npc_updates.
Relationship deltas are SIGNED changes, not absolute scores: use positive numbers when a feeling genuinely grows, negative numbers when it weakens, and 0 when unchanged. Love, desire, anger, fear, hate, trust, affection, jealousy, irritation, sadness and joy must respond independently to events: during a conflict, love can fall while anger, resentment or hate rises; during reconciliation, anger can fall while trust or affection rises. Do not freeze feelings at old values, and do not make all emotions rise together. Negative deltas are expected and important: after rejection, conflict, distance, disappointment, fear, reconciliation, comfort, or changed circumstances, reduce whichever indicators no longer fit. When a temporary emotion from the previous scene no longer fits (for example arousal, anger, fear, irritation, stress, or tension), let it subside with a small negative delta even if there is no dramatic event; do not automatically decay enduring feelings such as love or trust just because a reply passed. Do not monotonically increase values. Before choosing deltas, classify the actual emotional significance of this reply with impact: 'none' for routine conversation, presence, repeated affection without a meaningful development, or time passing; 'minor' for a concrete but ordinary emotional beat; 'major' only for a genuine turning point such as a serious betrayal, confession, breakup, rescue, or major reconciliation. For impact='none', every relationship delta must be 0. For 'minor', changes are limited to 3 internal points per feeling; for 'major', up to 8. The extension enforces these limits in code. Do not label routine dialogue as major. Usually change only one or two feelings that the event actually affects, not every positive feeling together. A routine message, time passing, or a character merely being present is not by itself a reason to change any score. Keep RP character-led and emotionally varied. Follow the established tone and level of detail of the scene instead of abruptly moralizing, censoring, euphemizing, or skipping past an event that the scene has already established. Do not force sexual content or kink escalation as a substitute for dialogue, plot, affection, conflict, humor, or ordinary interaction. Values are clamped to 0-200, so if a score is near 200 it can still decrease; if near 0 it can still increase. Base each delta on the current full scores and the current scene, not a generic trend. Choose up to 6 current salient relationship keys from the full vocabulary; active_feelings must reflect the CURRENT scene, not permanently repeat the same six. In PLATONIC or NEUTRAL mode, romantic relationship keys must stay unchanged and must not be selected as salient. In NEUTRAL mode, do not assume an existing bond unless the current scene provides evidence. For each known NPC meaningfully involved in the current scene, optionally include one npc_updates entry with their exact existing name, an impact field ('none', 'minor', or 'major'), signed relationship delta object, up to 6 current active feelings, and a brief shift. Apply the same strict impact rules to each NPC independently. Use that NPC's recent_history and last_shift to maintain continuity, remember prior turning points, and avoid abrupt unsupported reversals; the history is context, not a command to keep old feelings forever. Omit uninvolved NPCs. Never create or rename NPCs via npc_updates. Respect each NPC's mode independently: in platonic or neutral mode, romantic keys must stay unchanged and cannot be active. NPC deltas update their existing values in either direction. For {{user}}, choose up to 6 current emotions from this exact vocabulary: ${userKeys}. Return only user_feelings as the current list of emotions; do not assign percentages or intensity scores to {{user}}, because the user controls their own character. Reflect only emotions supported by the user's words/actions and the current scene. If evidence is insufficient, return an empty user_feelings list.
[[LOVEMED_STATE]]{"impact":"none","relation":{"trust":0,"affection":0,"love":0,"sympathy":0,"friendship":0,"respect":0,"desire":0,"passion":0,"arousal":0,"obsession":0,"tenderness":0,"admiration":0,"jealousy":0,"resentment":0,"irritation":0,"anger":0,"fear":0,"sadness":0,"disappointment":0,"joy":0,"fondness":0,"stress":0,"tension":0,"antipathy":0,"hate":0},"active_feelings":[],"user_feelings":[],"shift":"","contacts":[],"npc_updates":[]}
[[/LOVEMED_STATE]]
Never mention this service packet in roleplay.`;
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
 const raw=String(text||'');
 const normalize=v=>v.toLowerCase().replace(/[«»"“”]/g,' ');
 const sentences=normalize(raw).split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
 const negation=/(?:не\s+был(?:о|а|и)?|не\s+было|не\s+происходил|не\s+произош[её]л|не\s+занимал(?:ись|ась|ся)?|не\s+занялись|не\s+было\s+секса|никакого\s+секса|без\s+секса|отказал(?:ась|ся)|остановил(?:ась|ся)|не\s+дошло\s+до)/i;
 const pregnancyNegative=/(?:не\s+беременна|не\s+беременен|не\s+беременна\b|беременность\s+(?:не\s+подтверждена|исключена|отсутствует)|тест\s+(?:отрицател(?:ен|ьный)|показывает\s+отрицательный)|не\s+зачат|не\s+оплодотвор)/i;
 const pregnancyPositive=/(?:беременна\b|беременность\s+(?:подтверждена|подтвердил(?:ась|ся)|установлена|обнаружена)|тест\s+(?:положител(?:ен|ьный)|показал\s+две\s+полоски)|зачатие\s+подтверждено|оплодотворение\s+подтверждено)/i;
 if(pregnancyPositive.test(raw)&&!pregnancyNegative.test(raw))return {risk:true,confirmed:true,chance:100,reason:'Беременность явно подтверждена в РП'};
 const sexPositive=/(?:занимал(?:ись|ась|ся)?\s+секс|занялись\s+секс|половой\s+акт|сексуальн(?:ый|ая)\s+контакт|проникновени|совокупил(?:ись|ся|ась)?|переспал(?:и|а)?|интимн(?:ая|ый)\s+связь|сексом)/i;
 const sexSentences=sentences.filter(x=>sexPositive.test(x)&&!negation.test(x));
 if(!sexSentences.length)return {risk:false,confirmed:false,chance:0,reason:'Половой контакт в РП не обнаружен'};
 const sexText=sexSentences.join(' ');
 const protectedEvent=/(?:презерватив|контрацепц|контрацептив|защищ[её]н(?:ный|но|ым)?\s+секс|таблетк[аи]\s+от\s+беремен|спирал)/i.test(sexText);
 if(protectedEvent)return {risk:false,confirmed:false,chance:0,reason:'Обнаружен половой контакт с упоминанием защиты'};
 const unprotected=/(?:без\s+(?:презерватива|защиты)|беззащитн|незащищ|презерватив(?:а|ом)?\s+не\s+был|не\s+использовал(?:и)?\s+(?:презерватив|защиту)|семяизвержен[^.\n]{0,80}(?:внутр|туда|в неё|в нее)|кончил[^.\n]{0,80}(?:внутр|туда|в неё|в нее))/i.test(sexText);
 if(!unprotected)return {risk:false,confirmed:false,chance:0,reason:'Половой контакт найден, но незащищённость не подтверждена'};
 let chance=Number(u.pregnancyChance);if(!Number.isFinite(chance))chance=25;
 if(/овуляц|овулятор/i.test(sexText)||/овуляц|овулятор/i.test(String(u.ovulation||'')))chance+=20;
 if(/менструац|месячн/i.test(sexText)||/менструац|месячн/i.test(String(u.menstruation||'')))chance-=10;
 chance=Math.max(0,Math.min(90,chance));
 return {risk:true,confirmed:false,chance,reason:`Незащищённый половой контакт обнаружен; расчётный шанс ${chance}%`};
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
function sUserFeelings(){try{return userVisibleFeelings(getState());}catch{return [];}}
function relationList(s){return REL_FIELDS.filter(([k])=>s.relationshipMode!=='platonic'||!ROMANTIC_FIELDS.includes(k));}
function allRelationPanel(s){return `<details class="lm-all-emotions"><summary>♡ Посмотреть все эмоции</summary><div class="lm-all-emotions-list">${relationList(s).map(([k])=>`<label><span>${REL_LABEL[k]}</span><b>${Math.round(s.relation[k])}</b><input data-rel="${k}" type="range" min="0" max="200" value="${clamp(s.relation[k])}"></label>`).join('')}</div></details>`;}
const PATIENT_FEELING_KEYS=['love','hate','anger','fear','arousal','desire','trust','affection','jealousy','irritation','sadness','joy','tenderness','respect'];
function patientFeelingsHtml(s){
 const active=(s.activeFeelings||[]).filter(k=>PATIENT_FEELING_KEYS.includes(k));
 const ranked=PATIENT_FEELING_KEYS.filter(k=>Number(s.relation?.[k])>0).sort((a,b)=>(Number(s.relation[b])||0)-(Number(s.relation[a])||0));
 const keys=[...new Set([...active,...ranked])].slice(0,8);
 return `<div class="lm-patient-feelings">${keys.length?keys.map(k=>`<span class="lm-patient-feeling"><b>${esc(REL_LABEL[k])}</b> ${Math.round(clamp(s.relation[k])/2)}%</span>`).join(''):'<span class="lm-npc-dynamics-empty">Чувства пока не определены</span>'}</div>`;
}
function allUserEmotionPanel(s){return `<details class="lm-all-emotions lm-user-all-emotions"><summary>♡ Посмотреть все эмоции</summary><div class="lm-all-emotions-list">${Object.entries(USER_FEELING_LABEL).map(([k,label])=>`<label><span>${esc(label)}</span><b>${Math.round(Number(s.userEmotionScores?.[k])||0)}</b><input data-user-feeling="${k}" type="range" min="0" max="100" value="${Math.max(0,Math.min(100,Number(s.userEmotionScores?.[k])||0))}"></label>`).join('')}</div></details>`;}
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
   <section class="lm-user-feelings"><div class="lm-idcard-mini-title">ТЕКУЩЕЕ СОСТОЯНИЕ</div><div class="lm-feeling-chips">${sUserFeelings().map(k=>`<span><i>✦</i>${esc(USER_FEELING_LABEL[k])}</span>`).join('')||'<span><i>✦</i>Состояние пока не определено</span>'}</div></section>
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
  const btn=e.target.closest?.('#lmSaveUserCard,#lmSaveUserHistory,#lmRefreshUserCard,#lmCheckUserRP,#lmRollKink,#lmResetKinkRoll,[data-save-char-card],[data-reset-char-card],[data-user-avatar-picker]');
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
  else if(btn.id==='lmResetKinkRoll'){const st=getState();st.randomKinkId='';st.randomKinkIds=[];st.randomKinkPendingIds=[];st.randomKinkAt=0;saveState(st).then(()=>{render();toast('Кубик сброшен');});}
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
  <label class="lm-relationship-mode">Тип связи<select data-relationship-mode>
   <option value="romantic" ${s.relationshipMode==='romantic'?'selected':''}>💞 Романтические</option>
   <option value="platonic" ${s.relationshipMode==='platonic'?'selected':''}>🤝 Платонические</option>
   <option value="neutral" ${s.relationshipMode==='neutral'?'selected':''}>🧩 Нейтральные</option>
  </select></label>
  <p class="lm-note">Романтические — LoveMed может развивать любовь и влечение. Платонические — только дружеская/эмоциональная связь без автоматической романтики. Нейтральные — тип связи не задан, поэтому LoveMed не предполагает близость и ждёт явных признаков из РП.</p>
  <div class="lm-idcard-actions"><button data-save-char-card="${esc(key)}" type="button" class="lm-primary">Сохранить данные карты</button><button data-reset-char-card="${esc(key)}" type="button" class="lm-secondary">Сбросить ручные данные</button></div>
 </details>`;
}
function saveCharCardFromRoot(root,key=''){
 const member=key?groupMemberByKey(key):null;
 const data={};['name','age','sex','gender','secondarySex'].forEach(k=>data[k]=root?.querySelector?.(`[data-char-field="${k}"]`)?.value.trim()||'');
 saveCharCard(data,member);
 if(!member){const st=getState();st.relationshipMode=normalizeRelationshipMode(root?.querySelector?.('[data-relationship-mode]')?.value);saveState(st);}
 render();toast(member?`Карта ${charProfile(member).name} сохранена`:'Карта {{char}} сохранена');
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
   <section class="lm-idcard-metrics"><div class="lm-idcard-mini-title">ТЕКУЩИЕ ЧУВСТВА · %</div>${patientFeelingsHtml(s)}</section>
   <section class="lm-idcard-diagnosis"><div class="lm-idcard-mini-title">ДИАГНОЗ</div><div class="lm-tags">${diagnosis.length?diagnosis.map(k=>`<span class="lm-tag">${esc(kink(k).name)}<button type="button" data-remove-diagnosis="${esc(k)}" title="Убрать из диагноза">×</button></span>`).join(''):'<i>Пока не установлен.</i>'}</div></section>
   <section class="lm-anamnesis-summary"><div class="lm-idcard-mini-title">АНАМНЕЗ</div><div>${esc(s.anamnesisSummary||'Анамнез ещё не обновлялся.')}</div></section>
   <button id="lmAnamnesis" type="button" class="lm-primary lm-anamnesis-button">🩺 Провести анамнез карточки пациента</button>
   ${charCardEditorPage(s)}
  </div>`;
 }
if(tab==='react'){
 const randomIds=Array.isArray(s.randomKinkIds)&&s.randomKinkIds.length?s.randomKinkIds:(Array.isArray(s.randomKinkPendingIds)&&s.randomKinkPendingIds.length?s.randomKinkPendingIds:(s.randomKinkId?[s.randomKinkId]:[]));
 const randomNames=randomIds.map(id=>kink(id).name);
 return `<div class="lm-card"><section class="lm-section"><h3>Реактивность пациента</h3><div class="lm-sliders"><label>Выразительность эмоциональной реакции <b>${s.reactionIntensity}</b><input id="lmIntensity" type="range" min="0" max="100" value="${s.reactionIntensity}"></label><p class="lm-note">Этот параметр регулирует только заметность эмоций и инициативы, а не откровенность сцены и не обязательную сексуальную эскалацию. Даже при высоком значении персонаж сохраняет характер, границы и естественный темп сюжета.</p><label>Вероятность спонтанной реакции <b>${s.reactionChance}%</b><input id="lmChance" type="range" min="0" max="100" value="${s.reactionChance}"></label><label>Пауза между спонтанными реакциями (ответов) <b>${s.reactionCooldown}</b><input id="lmCooldown" type="range" min="1" max="12" value="${s.reactionCooldown}"></label></div></section><section class="lm-section lm-random-react"><h3>🎲 Ситуативный кубик</h3><p class="lm-note">Кубик выбирает до трёх вариантов из анамнеза только как необязательные подсказки. Модель не обязана использовать их: приоритет у текущей сцены, характера, согласия и темпа РП. Использованные варианты автоматически сбрасываются после ответа.</p><div class="lm-random-react-row"><button id="lmRollKink" type="button" class="lm-primary lm-dice-button">🎲 Выбрать варианты</button><button id="lmResetKinkRoll" type="button" class="lm-secondary lm-dice-reset" ${randomNames.length?'':'disabled'}>↻ Сбросить</button><div class="lm-random-result">${randomNames.length?`Варианты: <b>${esc(randomNames.join(' · '))}</b>`:'Варианты ещё не выбраны'}</div></div></section>${libraryPage(s)}</div>`;
}
 if(tab==='contacts')return `<div class="lm-card lm-contacts-page"><section class="lm-section"><div class="lm-contacts-head"><div><h3>Контакты</h3><p class="lm-note">Компактный список отношений с NPC.</p></div><button type="button" id="lmNpcAddToggle" class="lm-npc-add" title="Добавить NPC">＋</button></div><div id="lmNpcForm" class="lm-npc-form hidden"><input id="lmNpcName" type="text" maxlength="100" placeholder="Имя NPC"><select id="lmNpcMode"><option value="romantic">💞 Романтические</option><option value="platonic">🤝 Платонические</option><option value="neutral" selected>🧩 Нейтральные</option></select><textarea id="lmNpcInfo" maxlength="2000" rows="3" placeholder="Информация о NPC: внешность, характер, роль в сюжете…"></textarea><button type="button" id="lmNpcAddSave" class="lm-npc-save">Добавить</button></div>${(s.npcRelationships||[]).map(n=>`<article class="lm-npc-row"><div class="lm-npc-row-content"><span class="lm-npc-row-heart">♡</span><div class="lm-npc-row-person"><span class="lm-npc-row-name" title="${esc(n.name)}">${esc(n.name)}</span>${n.info?`<span class="lm-npc-row-info" title="${esc(n.info)}">${esc(n.info)}</span>`:'<span class="lm-npc-row-info lm-npc-row-info-empty">Описание не добавлено</span>'}${npcDynamicsHtml(n)}${npcHistoryHtml(n)}</div></div><div class="lm-npc-row-footer"><select data-npc-mode="${esc(n.id)}" aria-label="Тип отношений с ${esc(n.name)}"><option value="romantic" ${n.mode==='romantic'?'selected':''}>💞 Романтические</option><option value="platonic" ${n.mode==='platonic'?'selected':''}>🤝 Платонические</option><option value="neutral" ${n.mode==='neutral'?'selected':''}>🧩 Нейтральные</option></select><button type="button" class="lm-npc-edit" data-edit-npc="${esc(n.id)}" title="Редактировать NPC" aria-label="Редактировать ${esc(n.name)}">✎</button><button type="button" class="lm-npc-delete" data-del-npc="${esc(n.id)}" title="Удалить NPC" aria-label="Удалить ${esc(n.name)}">×</button></div><div class="lm-npc-edit-panel hidden" data-npc-edit-panel="${esc(n.id)}"><div class="lm-npc-edit-panel-title">Редактирование NPC</div><label>Имя NPC<input data-npc-edit-field="name" type="text" maxlength="100" autocomplete="off" value="${esc(n.name||'')}"></label><label>Информация о NPC<textarea data-npc-edit-field="info" maxlength="2000" rows="3" placeholder="Внешность, характер, роль в сюжете…">${esc(n.info||'')}</textarea></label><label>Тип отношений<select data-npc-edit-field="mode"><option value="romantic" ${n.mode==='romantic'?'selected':''}>💞 Романтические</option><option value="platonic" ${n.mode==='platonic'?'selected':''}>🤝 Платонические</option><option value="neutral" ${n.mode==='neutral'?'selected':''}>🧩 Нейтральные</option></select></label><div class="lm-npc-edit-actions"><button type="button" class="lm-npc-edit-cancel" data-npc-edit-cancel>Отмена</button><button type="button" class="lm-npc-save" data-npc-edit-save="${esc(n.id)}">Сохранить</button></div></div></article>`).join('')||'<i>Пока нет NPC. Нажми ＋, чтобы добавить первого.</i>'}</section></div>`;
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

const NPC_METRIC_GROUPS=[
 {label:'Связь',keys:['trust','affection','love','sympathy','friendship','respect','tenderness','admiration','fondness','joy']},
 {label:'Влечение',keys:['desire','passion','arousal','obsession','jealousy']},
 {label:'Стресс',keys:['stress','tension']},
 {label:'Негатив',keys:['resentment','irritation','anger','fear','sadness','disappointment','antipathy','hate']}
];
const NPC_METRIC_ICON={trust:'🤝',affection:'💗',love:'❤️',sympathy:'🫶',friendship:'🫂',respect:'🛡️',tenderness:'🌷',admiration:'✨',fondness:'🥹',joy:'😊',desire:'❤️‍🔥',passion:'🔥',arousal:'💓',obsession:'🌀',jealousy:'💚',stress:'😵‍💫',tension:'⚡',resentment:'💢',irritation:'😒',anger:'😡',fear:'😨',sadness:'🌧️',disappointment:'💔',antipathy:'⛔',hate:'🖤'};
function npcDynamicsHtml(n){
 const groups=NPC_METRIC_GROUPS.map(group=>{
  const values=group.keys.map(k=>({key:k,label:REL_LABEL[k],value:Math.round(clamp(n.relation?.[k])/2)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,4);
  return values.length?`<span class="lm-npc-dynamics-group"><b>${group.label}:</b> ${values.map(x=>`${NPC_METRIC_ICON[x.key]||'•'} ${esc(x.label.toLocaleLowerCase())} ${x.value}%`).join(' · ')}</span>`:'';
 }).filter(Boolean);
 return `<div class="lm-npc-dynamics" title="Проценты — шкала 0–100; исходные значения отношений хранятся на шкале 0–200">${groups.join('')} ${groups.length?'':'<span class="lm-npc-dynamics-empty">Динамика пока не определена</span>'}</div>`;
}
function npcHistoryHtml(n){
 const history=(n.history||[]).slice(-6).reverse();
 const entries=history.map(e=>{const date=new Date(Number(e.ts)||Date.now()).toLocaleString();const changes=Object.entries(e.changes||{}).filter(([k,v])=>k in REL_LABEL&&Number(v)!==0).map(([k,v])=>`${REL_LABEL[k]} ${Number(v)>0?'+':''}${Number(v)}`).join(' · ');return `<li><time>${esc(date)}</time><span>${esc(e.shift||'Динамика отношений обновлена')}</span>${changes?`<small>${esc(changes)}</small>`:''}</li>`;}).join('');
 return `<button type="button" class="lm-npc-history-toggle" data-npc-history="${esc(n.id)}" aria-expanded="false">↻ История динамики (${(n.history||[]).length})</button><div id="lmNpcHistory-${esc(n.id)}" class="lm-npc-history-panel hidden">${entries?`<ol>${entries}</ol>`:'<span class="lm-npc-history-empty">История появится после изменения отношений в РП.</span>'}</div>`;
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
 document.querySelectorAll('[data-user-feeling]').forEach(x=>x.oninput=async e=>{const st=getState();st.userEmotionScores[e.target.dataset.userFeeling]=Number(e.target.value);st.userFeelings=userVisibleFeelings(st);await saveState(st);render();});
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
 document.querySelector('#lmNpcAddToggle')?.addEventListener('click',()=>{const f=document.querySelector('#lmNpcForm');f?.classList.toggle('hidden');if(!f?.classList.contains('hidden'))document.querySelector('#lmNpcName')?.focus();});
 document.querySelector('#lmNpcAddSave')?.addEventListener('click',async()=>{const name=(document.querySelector('#lmNpcName')?.value||'').trim().slice(0,100),info=(document.querySelector('#lmNpcInfo')?.value||'').trim().slice(0,2000),mode=normalizeRelationshipMode(document.querySelector('#lmNpcMode')?.value||'neutral');if(!name){toast('Введи имя NPC');return;}if(isProtectedIdentityName(name)){toast('Это имя {{user}} или {{char}} — их нельзя добавить как NPC');return;}const st=getState();if((st.npcRelationships||[]).some(n=>npcNameKey(n.name)===npcNameKey(name))){toast('NPC с таким именем уже есть');return;}const id=uid();st.npcRelationships.push(createRelationshipRecord({id,name,info,mode}));st.contacts.push({id,name,relation:mode==='romantic'?'Романтические':mode==='platonic'?'Платонические':'Нейтральные',notes:info,updatedAt:Date.now()});await saveState(st);render();toast('NPC добавлен');});
 document.querySelectorAll('[data-npc-history]').forEach(button=>button.addEventListener('click',()=>{const panel=document.getElementById(`lmNpcHistory-${button.dataset.npcHistory}`);if(!panel)return;const opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);button.setAttribute('aria-expanded',String(opening));}));
 const closeNpcEditor=(panel)=>{if(panel)panel.classList.add('hidden');};
 document.querySelectorAll('[data-edit-npc]').forEach(button=>button.addEventListener('click',()=>{const row=button.closest('.lm-npc-row'),panel=row?.querySelector('[data-npc-edit-panel]');if(!panel)return;const opening=panel.classList.contains('hidden');document.querySelectorAll('[data-npc-edit-panel]').forEach(p=>{if(p!==panel)p.classList.add('hidden');});panel.classList.toggle('hidden',!opening);if(opening)panel.querySelector('[data-npc-edit-field="name"]')?.focus();}));
 document.querySelectorAll('[data-npc-edit-cancel]').forEach(button=>button.addEventListener('click',()=>closeNpcEditor(button.closest('[data-npc-edit-panel]'))));
 document.querySelectorAll('[data-npc-edit-save]').forEach(button=>button.addEventListener('click',async()=>{const id=button.dataset.npcEditSave,panel=button.closest('[data-npc-edit-panel]');if(!id||!panel)return;const name=(panel.querySelector('[data-npc-edit-field="name"]')?.value||'').trim().slice(0,100),info=(panel.querySelector('[data-npc-edit-field="info"]')?.value||'').trim().slice(0,2000),mode=normalizeRelationshipMode(panel.querySelector('[data-npc-edit-field="mode"]')?.value||'neutral');if(!name){toast('Введи имя NPC');return;}if(isProtectedIdentityName(name)){toast('Это имя {{user}} или {{char}} — их нельзя использовать для NPC');return;}const st=getState(),npc=st.npcRelationships.find(n=>n.id===id);if(!npc)return;if(st.npcRelationships.some(n=>n.id!==id&&npcNameKey(n.name)===npcNameKey(name))){toast('NPC с таким именем уже есть');return;}const oldName=npc.name;npc.name=name;npc.info=info;npc.mode=mode;npc.updatedAt=Date.now();const contact=st.contacts.find(c=>c.id===id||npcNameKey(c.name)===npcNameKey(oldName));if(contact){contact.id=id;contact.name=name;contact.notes=info;contact.relation=mode==='romantic'?'Романтические':mode==='platonic'?'Платонические':'Нейтральные';contact.updatedAt=Date.now();}await saveState(st);render();toast('NPC обновлён; история и показатели сохранены');}));
 document.querySelectorAll('[data-npc-mode]').forEach(sel=>sel.addEventListener('change',async()=>{const st=getState(),npc=st.npcRelationships.find(n=>n.id===sel.dataset.npcMode);if(!npc)return;npc.mode=normalizeRelationshipMode(sel.value);npc.updatedAt=Date.now();const contact=st.contacts.find(c=>c.id===npc.id||npcNameKey(c.name)===npcNameKey(npc.name));if(contact){contact.relation=npc.mode==='romantic'?'Романтические':npc.mode==='platonic'?'Платонические':'Нейтральные';contact.updatedAt=Date.now();}await saveState(st);render();toast('Тип отношений обновлён');}));
 document.querySelectorAll('[data-del-npc]').forEach(b=>b.onclick=async()=>{const st=getState(),npc=st.npcRelationships.find(n=>n.id===b.dataset.delNpc);if(!npc)return;st.npcRelationships=st.npcRelationships.filter(n=>n.id!==b.dataset.delNpc);st.contacts=st.contacts.filter(c=>c.id!==b.dataset.delNpc&&npcNameKey(c.name)!==npcNameKey(npc.name));await saveState(st);render();toast('NPC удалён');});
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
 document.body.insertAdjacentHTML('beforeend',`<div id="lmOverlay" class="lm-overlay hidden"><section class="lm-panel"><header class="lm-head"><div><div class="lm-kicker">LOVEMED · MEDICAL RECORD v0.4.24</div><h2>Медицинская карта</h2><p>Наблюдение за динамикой отношений</p></div><button id="lmClose" class="lm-close">×</button></header><nav class="lm-tabs">${[['card','🩺 Карта пациента'],['user','👤 Моя карта'],['react','🧪 Реактивность'],['contacts','👥 Контакты'],['history','📋 История'],['system','⚙ Служебное']].map(x=>`<button data-tab="${x[0]}">${x[1]}</button>`).join('')}</nav><main id="lmBody"></main></section></div>`);
 document.querySelector('#lmClose').onclick=()=>{editorId=null;document.querySelector('#lmOverlay').classList.add('hidden');syncFab();};
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
function open(){ensurePanel();document.querySelector('#lmOverlay').classList.remove('hidden');syncFab();render();}
function placeFab(){const b=document.querySelector('#lmFabButton');if(!b)return;const u=ui(),p=8,w=b.offsetWidth||42,h=b.offsetHeight||42;b.style.left=Math.max(p,Math.min(innerWidth-w-p,u.x??innerWidth-w-p))+'px';b.style.top=Math.max(p,Math.min(innerHeight-h-p,u.y??120))+'px';b.style.right='auto';b.style.bottom='auto';}
function syncFab(){const b=document.querySelector('#lmFabButton');if(!b)return;const overlay=document.querySelector('#lmOverlay');const panelOpen=!!overlay&&!overlay.classList.contains('hidden');b.style.display=(ui().showFab&&!panelOpen)?'grid':'none';}
function ensureFab(){
 let b=document.querySelector('#lmFabButton');
 if(!b){
  b=document.createElement('button');b.id='lmFabButton';b.className='lm-fab';
  b.type='button';b.setAttribute('aria-label','Открыть LoveMed');b.title='LoveMed';
  b.innerHTML='<svg class="lm-fab-mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lmHeartGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a6fff7"/><stop offset=".52" stop-color="#65d9e6"/><stop offset="1" stop-color="#e28aa8"/></linearGradient></defs><path class="lm-fab-heart" d="M24 39S6.5 28.5 6.5 16.8C6.5 8.9 16.4 5.8 24 14c7.6-8.2 17.5-5.1 17.5 2.8C41.5 28.5 24 39 24 39Z" fill="url(#lmHeartGrad)" stroke="#e7fffd" stroke-width="1.3"/><path d="M21 15.5h6v5.8h5.8v6H27v5.8h-6v-5.8h-5.8v-6H21Z" fill="#551b37" stroke="#fff0f6" stroke-width=".8" stroke-linejoin="round"/><path d="m38 5 1.1 3.2L42 9.4l-2.9 1.1L38 14l-1.1-3.5L34 9.4l2.9-1.2Z" fill="#e2bd63"/><circle cx="9" cy="32" r="1.6" fill="#e2bd63"/></svg>';
  document.body.appendChild(b);
 }
 if(b.dataset.bound)return;b.dataset.bound='1';let d=null,fadeTimer=null;
 const wakeFab=()=>{b.classList.remove('lm-fab-idle');if(fadeTimer)clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>{if(!b.matches(':hover')&&!b.matches(':focus-visible'))b.classList.add('lm-fab-idle');},3800);};
 ['pointermove','pointerenter','focus','touchstart'].forEach(ev=>b.addEventListener(ev,wakeFab,{passive:true}));
 b.addEventListener('pointerleave',()=>{if(fadeTimer)clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>b.classList.add('lm-fab-idle'),900);});
 wakeFab();
 b.onpointerdown=e=>{wakeFab();const r=b.getBoundingClientRect();d={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,m:false};b.setPointerCapture?.(e.pointerId);};
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
 on(event_types.GENERATION_ENDED,()=>{parseLatest();refreshPrompt();const overlay=document.querySelector('#lmOverlay');if(overlay&&!overlay.classList.contains('hidden'))render();});
 on(event_types.CHARACTER_EDITED,refreshPrompt);
 window.addEventListener('resize',placeFab);
 setInterval(()=>{ensureFab();ensureSettings();ensureWand();},2000);
}
init();
