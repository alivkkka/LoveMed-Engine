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

const defaults=()=>({enabled:true,autoTrack:true,autoReaction:true,relationshipMode:'romantic',npcRelationships:[],relation:Object.fromEntries(REL_FIELDS.map(([k])=>[k,0])),activeFeelings:[],lastShift:'',diagnosis:[],diagnosisManual:{added:[],removed:[]},anamnesis:[],anamnesisAt:0,reactionIntensity:55,reactionChance:35,reactionCooldown:4,initiative:80,reactionCooldownRemaining:0,lastReaction:'',lastReactionId:'',randomKinkId:'',randomKinkIds:[],randomKinkPendingIds:[],manualKinkSelection:[],manualKinkPendingIds:[],randomKinkAt:0,contacts:[],history:[],historyNotice:true,anamnesisSummary:'',userFeelings:[],userEmotionScores:{...USER_FEELING_DEFAULTS},charName:'',updatedAt:Date.now(),diagnostics:{lastParseAt:0,lastParseStatus:'Ожидает проверки',lastParseError:''}});
const ctx=()=>{try{return getContext?.()||globalThis.SillyTavern?.getContext?.()||{};}catch{return {};}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const npcNameKey=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const clamp=(n,min=0,max=REL_MAX)=>Math.max(min,Math.min(max,Number(n)||0));
const RELATIONSHIP_IMPACTS={none:0,minor:2,major:6};
function normalizeRelationshipImpact(value){return Object.prototype.hasOwnProperty.call(RELATIONSHIP_IMPACTS,value)?value:'none';}

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
 const normalizedImpact=normalizeRelationshipImpact(impact);
 const limit=RELATIONSHIP_IMPACTS[normalizedImpact];
 const maxChangedFeelings=normalizedImpact==='major'?4:normalizedImpact==='minor'?2:0;
 // A reply may change only a small number of relationship scores; do not let a model raise every feeling at once.
 const eligible=Object.entries(deltas||{}).map(([key,value],index)=>({key,value:Number(value),index}))
  .filter(x=>x.key in r.relation&&relationshipAllows(r.mode,x.key)&&Number.isFinite(x.value)&&x.value!==0)
  .sort((a,b)=>(r.mode==='romantic'&&a.key==='love'?-1:r.mode==='romantic'&&b.key==='love'?1:0)||Math.abs(b.value)-Math.abs(a.value)||a.index-b.index)
  .slice(0,maxChangedFeelings);
 for(const {key,value} of eligible){
  const bounded=Math.max(-limit,Math.min(limit,value));
  r.relation[key]=clamp(r.relation[key]+bounded);
 }
 if(Array.isArray(activeFeelings))r.activeFeelings=activeFeelings.filter(k=>REL_LABEL[k]&&relationshipAllows(r.mode,k)).slice(0,6); if(r.mode==='romantic'&&!r.activeFeelings.includes('love'))r.activeFeelings=['love',...r.activeFeelings].slice(0,6);
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
 s.initiative=Math.max(0,Math.min(100,Number(s.initiative ?? 80)||0));
 s.diagnostics=Object.assign({},d.diagnostics,raw?.diagnostics||{});
 s.historyNotice=raw?.historyNotice!==false;
 s.randomKinkIds=Array.isArray(raw?.randomKinkIds)?raw.randomKinkIds:((raw?.randomKinkId?[raw.randomKinkId]:[]));
 s.randomKinkPendingIds=Array.isArray(raw?.randomKinkPendingIds)?raw.randomKinkPendingIds.filter(id=>allKinks().some(k=>k.id===id)):[];
 s.manualKinkSelection=Array.isArray(raw?.manualKinkSelection)?raw.manualKinkSelection.filter(id=>allKinks().some(k=>k.id===id)):[];
 s.manualKinkPendingIds=Array.isArray(raw?.manualKinkPendingIds)?raw.manualKinkPendingIds.filter(id=>allKinks().some(k=>k.id===id)):[];
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

function preferenceText(){
 const ch=charObject();if(!ch)return'';
 const chunks=[],seen=new WeakSet();
 const preferenceKey=/^(?:kinks?|fetishes?|kink[_ -]?preferences?|fetish[_ -]?preferences?|sexual[_ -]?preferences?|preferences)$/i;
 function walk(value,key='',depth=0){
  if(depth>8||value==null)return;
  if(typeof value==='string'){
   if(preferenceKey.test(key)&&value.trim())chunks.push(value.trim());
   return;
  }
  if(typeof value!=='object'||seen.has(value))return;seen.add(value);
  if(Array.isArray(value)){value.slice(0,250).forEach(item=>walk(item,key,depth+1));return;}
  for(const [childKey,childValue] of Object.entries(value))walk(childValue,childKey,depth+1);
 }
 walk(ch,'character');
 // Character cards commonly store everything in a long description. In that case,
 // accept only explicitly labelled preference sections, never arbitrary mentions elsewhere.
 const lines=cardText().split(/\r?\n/),labels=/^(?:[-*•#> ]*)?(?:kinks?|fetishes?|kink preferences?|fetish preferences?|sexual preferences?|intimate preferences?|preferences)\s*[:：=–—-]?\s*(.*)$/i;
 const boundary=/^(?:[-*•#> ]*)?(?:name|age|gender|sex|appearance|personality|character|personality traits|scenario|background|backstory|occupation|likes|dislikes|limits|boundaries|hard limits|soft limits|description|relationships|relationships?|speech|speech style|notes|example dialogue|first message|greeting|биография|внешность|характер|сценарий|возраст|имя|предпочтения пользователя|ограничения|границы|не любит|любит)\s*[:：=–—-]/i;
 let collecting=false;
 for(const rawLine of lines){
  const line=rawLine.trim();if(!line)continue;
  const match=line.match(labels);
  if(match){collecting=true;if(match[1])chunks.push(match[1]);continue;}
  if(collecting&&boundary.test(line)){collecting=false;continue;}
  if(collecting)chunks.push(line);
 }
 return [...new Set(chunks)].join('\n');
}
function scan(){
 const source=preferenceText();
 if(!source.trim())return[];
 const low=normalizeCueText(source);
 return [...new Set(allKinks().filter(k=>{
  const terms=[k.name,...(k.words||[])].filter(Boolean).map(normalizeCueText).filter(w=>w.length>1);
  return terms.some(w=>low.includes(w));
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
 s.diagnosisManual=dm;syncDiagnosis(s);
 const diagnosed=new Set(s.diagnosis);s.manualKinkSelection=(s.manualKinkSelection||[]).filter(x=>diagnosed.has(x));s.manualKinkPendingIds=(s.manualKinkPendingIds||[]).filter(x=>diagnosed.has(x));s.randomKinkIds=(s.randomKinkIds||[]).filter(x=>diagnosed.has(x));s.randomKinkPendingIds=(s.randomKinkPendingIds||[]).filter(x=>diagnosed.has(x));if(!diagnosed.has(s.randomKinkId))s.randomKinkId='';
 saveState(s);render();toast(enabled?'Добавлено в диагноз':'Убрано из диагноза');
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
 // The main relationship card always means {{char}}'s relationship TO {{user}}, never feelings about the surrounding scene.
 // Without an explicit direct interaction flag, preserve both scores and salient feelings exactly as they were.
 const directCharUserInteraction=p.char_user_interaction===true;
 if(directCharUserInteraction){
  // In romantic mode, a meaningful interaction must not leave love frozen at zero just because the model copied a zero delta.
  // This fallback only applies to non-routine beats and never overrides an explicit negative love delta or a clear setback.
  const relationDeltas={...(p.relation&&typeof p.relation==='object'?p.relation:{})};
  const loveDelta=Number(relationDeltas.love)||0;
  const impact=normalizeRelationshipImpact(p.impact);
  const setback=/предатель|отверг|расстав|разрыв|изменил|изменя|унизи|оскорб|серьёзн(?:ая|ый) ссор|серьезн(?:ая|ый) ссор|обидел|причинил боль|betray|reject|break.?up|cheat|humiliat|insult|serious fight/i.test(String(p.shift||''));
  if(s.relationshipMode==='romantic'&&loveDelta===0&&(impact==='minor'||impact==='major')&&!setback){
   relationDeltas.love=impact==='major'?6:2;
  }
  const mainRelation=applyRelationshipChanges({id:'main-char',name:charName(),mode:s.relationshipMode,relation:s.relation,activeFeelings:s.activeFeelings},relationDeltas,p.active_feelings,p.impact);
  s.relation=mainRelation.relation;s.activeFeelings=mainRelation.activeFeelings;
  const mainChanges=Object.fromEntries(PATIENT_FEELING_KEYS.map(key=>[key,Number((((Number(s.relation[key])||0)-(Number(previousRelation[key])||0))/2).toFixed(1))]).filter(([,delta])=>delta!==0));
  const mainFeelingsChanged=JSON.stringify(previousFeelings)!==JSON.stringify(s.activeFeelings||[]);
  if(Object.keys(mainChanges).length||mainFeelingsChanged){
   const changeText=Object.entries(mainChanges).map(([key,delta])=>`${REL_LABEL[key]} ${delta>0?'+':''}${delta}%`).join(' · ');
   const summary=[String(p.shift||'').trim(),changeText,mainFeelingsChanged?`Актуальные чувства: ${(s.activeFeelings||[]).map(k=>REL_LABEL[k]).join(', ')||'не выделены'}`:''].filter(Boolean).join(' — ');
   s.history.unshift({ts:Date.now(),type:'Отношения {{char}} → {{user}}',text:summary||'Обновлены актуальные чувства'});s.history=s.history.slice(0,80);
  }
 }
 // The {{user}} card is updated only when the packet explicitly confirms that {{user}} participates in this scene.
 // NPC-only scenes must never invent or change the user's current emotions.
 if(p.user_in_scene===true){
  if(p.user_emotion_scores&&typeof p.user_emotion_scores==='object'){Object.keys(USER_FEELING_LABEL).forEach(k=>s.userEmotionScores[k]=0);for(const[k,v]of Object.entries(p.user_emotion_scores))if(k in USER_FEELING_LABEL)s.userEmotionScores[k]=Math.max(0,Math.min(100,Number(v)||0));}
  if(Array.isArray(p.user_feelings))s.userFeelings=p.user_feelings.filter(k=>USER_FEELING_LABEL[k]).slice(0,6);
  if(!p.user_emotion_scores&&Array.isArray(p.user_feelings)){Object.keys(s.userEmotionScores).forEach(k=>s.userEmotionScores[k]=0);s.userFeelings.forEach(k=>s.userEmotionScores[k]=70);}
 }
 if(directCharUserInteraction&&p.shift)s.lastShift=String(p.shift).slice(0,300);
 if(Array.isArray(p.contacts))for(const n of p.contacts){if(!n?.name||isProtectedIdentityName(n.name))continue;const x=s.contacts.find(v=>npcNameKey(v.name)===npcNameKey(n.name));if(!x)continue;x.relation=String(n.relation||x.relation).slice(0,100);x.notes=String(n.notes||x.notes).slice(0,300);x.updatedAt=Date.now();}
 if(Array.isArray(p.npc_updates))for(const update of p.npc_updates){
  // NPC records are also NPC -> {{user}} relationships; ignore NPC-NPC / {{char}}-NPC dynamics.
  if(update?.user_interaction!==true||!update?.name||isProtectedIdentityName(update.name))continue;
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
 if(directCharUserInteraction&&p.shift&&s.lastShift!==previousShift){s.history.unshift({ts:Date.now(),type:'Состояние',text:s.lastShift});s.history=s.history.slice(0,80);}
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
 const cycleText=f?(x.m.mes.slice(0,f.start)+' '+x.m.mes.slice(f.end)):x.m.mes;
 detectCycleCandidates(cycleText,x.i);
 // A rolled cue is a scene-level task, not a one-reply hint. Keep it active until the model
 // explicitly confirms that the cue was concretely portrayed in the narrative.
 const active=Array.isArray(s.randomKinkPendingIds)?s.randomKinkPendingIds:[];
 if(f&&active.length){
  const declared=Array.isArray(f.packet?.scene_kinks_used)?f.packet.scene_kinks_used.filter(id=>typeof id==='string'):[];
  const used=active.filter(id=>declared.includes(id));
  if(used.length){
   s.randomKinkPendingIds=active.filter(id=>!used.includes(id));
   const names=used.map(id=>kink(id).name);
   s.history.unshift({ts:Date.now(),type:'Реактив',text:`Кубик: сцена подтвердила использование — ${names.join(', ')}. ${s.randomKinkPendingIds.length?`Остались активны: ${s.randomKinkPendingIds.map(id=>kink(id).name).join(', ')}.`:'Все выпавшие кинки использованы; кубик завершён.'}`});
   s.history=s.history.slice(0,80);
  }
 }
 if(!f){
  s.diagnostics={lastParseAt:Date.now(),lastParseStatus:'Служебный пакет не найден — показатели не обновлены',lastParseError:'Модель не вернула корректный [[LOVEMED_STATE]] блок. Активный кубик сохранён до подтверждения использования в сцене.'};
  saveState(s);return false;
 }
 applyPacket(s,f.packet);
 s.diagnostics={lastParseAt:Date.now(),lastParseStatus:'Служебный пакет принят ✓',lastParseError:''};
 x.m.mes=(x.m.mes.slice(0,f.start)+x.m.mes.slice(f.end)).trimEnd();try{c.chat[x.i]=x.m;c.saveChat?.();}catch{}saveState(s);if(s.historyNotice&&f.packet?.shift)toast(`🩺 Новое наблюдение: ${String(f.packet.shift).slice(0,90)}`);return true;
}
function reactionPrompt(s){
 const diagnosis=Array.isArray(s.diagnosis)?s.diagnosis:[];
 if(!s.autoReaction||!diagnosis.length)return'';
 const valid=new Set(diagnosis);
 // Existing rolled cues stay active across as many replies as needed; do not reroll or obey cooldown.
 const alreadyActive=[...new Set((Array.isArray(s.randomKinkPendingIds)?s.randomKinkPendingIds:[]).filter(id=>valid.has(id)))];
 let picks=alreadyActive;
 if(!picks.length){
  // An explicit dice roll overrides the cooldown; cooldown only limits automatic spontaneous rolls.
  picks=Array.isArray(s.randomKinkIds)?s.randomKinkIds.filter(id=>valid.has(id)):[];
  if(!picks.length&&s.randomKinkId&&valid.has(s.randomKinkId))picks=[s.randomKinkId];
  if(!picks.length){
   if(s.reactionCooldownRemaining>0){s.reactionCooldownRemaining--;saveState(s);return'';}
   if(Math.random()*100>s.reactionChance)return'';
   const pool=diagnosis.filter(id=>id!==s.lastReactionId);
   const source=pool.length?pool:diagnosis;
   picks=[source[Math.floor(Math.random()*source.length)]];
  }
  picks=[...new Set(picks)].slice(0,2);
  s.randomKinkPendingIds=[...picks];
  s.randomKinkId='';s.randomKinkIds=[];s.randomKinkAt=0;
  s.lastReaction=kink(picks[0]||'').name||'';s.lastReactionId=picks[0]||'';
  s.reactionCooldownRemaining=Math.max(1,s.reactionCooldown);
  saveState(s);
 }
 const names=picks.map(id=>kink(id).name),cueIds=picks.join(', ');
 const i=s.reactionIntensity,mode=i>=80?'желание и импульс выражены ярко и уверенно':i>=60?'импульс заметен и может переходить в действие':i>=35?'умеренный, но ощутимый импульс':'лёгкий внутренний импульс';
 const candidates=names.length>1?`Active scene cues from diagnosis: ${names.join(' / ')} (IDs: ${cueIds}).`:`Active scene cue from diagnosis: ${names[0]||'none'} (ID: ${cueIds}).`;
 return`[LOVEMED REACTIVITY — ACTIVE SCENE TASK; PERSIST UNTIL USED] ${candidates}
These cues are persistent scene-level goals, NOT one-reply hints. Keep developing the SAME active cue(s) across consecutive replies, even if the scene takes many messages. Do not reroll, replace, or forget them between replies. Make the cue recognizable through concrete actions, dialogue, choices, and scene details—not merely by naming it or thinking about it. If two cues are active, combine them naturally in the same scene when feasible; do not force an unrelated second cue.
Evaluate the current tension and use the cue with matching intensity:
- HIGH tension (argument + attraction, unresolved desire, strong chemistry, charged conflict) → {{char}} may fully lean into the cue and escalate toward fitting intimacy if the established scene and boundaries support it.
- MEDIUM tension → clear flirtation, purposeful touch, suggestive actions, or moving the scene toward more privacy/intimacy.
- LOW / calm tension → show a subtle but concrete expression that advances the cue, without forcing a sudden escalation.
Do not control {{user}} or dictate their consent/actions. Keep the character recognizable and the scene paced. In the final LOVEMED_STATE packet, include the field scene_kinks_used as an array of exact IDs ONLY for active cues that have been concretely portrayed in the narrative of this reply. Leave it empty if none has yet been genuinely used. Merely mentioning a cue, thinking about it, or promising it later does not count. Intensity ${i}/100 scales how bold the expression is: ${mode}.`;
}
function rollRandomKink(){
 const s=getState(),valid=new Set(allKinks().map(k=>k.id));
 // The die must use the already-saved diagnosis, never rescan the source card.
 const pool=[...new Set((Array.isArray(s.diagnosis)?s.diagnosis:[]).filter(id=>valid.has(id)))];
 if(!pool.length){toast('В диагнозе нет предпочтений для выбора. Сначала сформируйте диагноз и проверьте список.');return;}
 const shuffled=[...pool];
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const first=shuffled[0],firstCat=kink(first).cat;
 const compatible={psych:['psych','romantic'],romantic:['romantic','psych'],physical:['physical','situational'],situational:['situational','physical']};
 const secondPool=shuffled.slice(1).filter(id=>(compatible[firstCat]||[firstCat]).includes(kink(id).cat));
 const picks=[first];
 // Usually one focused cue; sometimes a second cue is added only from a compatible category.
 if(secondPool.length&&Math.random()<0.45)picks.push(secondPool[Math.floor(Math.random()*secondPool.length)]);
 s.randomKinkIds=picks;s.randomKinkId=picks[0]||'';s.randomKinkPendingIds=[];s.randomKinkAt=Date.now();
 // A manual Spark choice and a random roll should not compete in the same scene.
 s.manualKinkPendingIds=[];
 saveState(s).then(()=>{render();toast(`🎲 Задача для сцены: ${picks.map(id=>kink(id).name).join(' · ')}`);});
}
function toggleManualKink(id){
 const s=getState(),diagnosed=new Set(s.diagnosis||[]);if(!diagnosed.has(id)){toast('Выбирать можно только кинки из текущего диагноза');return;}
 const selected=new Set(s.manualKinkSelection||[]);if(selected.has(id))selected.delete(id);else selected.add(id);
 s.manualKinkSelection=[...selected];saveState(s).then(()=>render());
}
function activateManualKinks(){
 const s=getState(),diagnosed=new Set(s.diagnosis||[]),selected=[...new Set(s.manualKinkSelection||[])].filter(id=>diagnosed.has(id));
 if(!selected.length){toast('Сначала выбери один или несколько пунктов из диагноза');return;}
 s.manualKinkPendingIds=selected;
 // Clear random cues so the explicit choice is the sole focus of the next response.
 s.randomKinkId='';s.randomKinkIds=[];s.randomKinkPendingIds=[];s.randomKinkAt=0;
 saveState(s).then(()=>{render();toast(`✨ Искра активирована на следующий ответ: ${selected.map(id=>kink(id).name).join(' · ')}`);});
}
function clearManualKinks(){
 const s=getState();s.manualKinkSelection=[];s.manualKinkPendingIds=[];saveState(s).then(()=>{render();toast('Ручной выбор очищен');});
}
function clearManualKinksAfterReply(){
 const s=getState();if(!(s.manualKinkPendingIds||[]).length)return;
 s.manualKinkPendingIds=[];saveState(s);
}

function cycleContinuityPrompt(){
 try{
  const c=getCycleState(),sum=cycleSummary(c),preg=pregnancySummary(c);
  const recent=(c.events||[]).filter(e=>e.status==='confirmed'&&e.type!=='other').slice(-5).map(e=>`${e.date} ${e.type}: ${String(e.description||'').replace(/\s+/g,' ').slice(0,100)}${e.conceptionResult?` [conception=${e.conceptionResult}]`:''}`).join(' | ');
  const status=c.pregnancyConfirmed&&c.pregnancyStatus==='confirmed'?'CONFIRMED':c.pregnancyStatus==='ended'?'ENDED':c.pregnancyStatus==='not-pregnant'?'NOT CONFIRMED':c.pregnancyStatus==='possible'?'POSSIBLE':'UNKNOWN';
  const duration=preg?`${preg.weeks} weeks ${preg.days} days (display estimate)`:'not tracked';
  return `\n[LOVEMED CANONICAL CYCLE / PREGNANCY STATE — PERSISTENT MEMORY; THIS CHAT ONLY]\nStored state is authoritative and survives RP summarization because LoveMed stores it separately. Never reset, restart, infer a new cycle from a summary, or reroll a previously checked conception event just because the chat was summarized or older messages disappeared. Update only when a genuinely new, explicit RP event provides evidence. Do not invent symptoms, periods, sex, contraception, pregnancy, or elapsed story time. If the scene does not explicitly advance time, preserve the existing state.\nCycle: last period start=${c.lastPeriodStart||'unknown'}; cycle length=${c.cycleLength} days; period length=${c.periodLength} days; approximate current phase=${sum.phase}; next period estimate=${sum.next}.\nPregnancy status=${status}; saved conception date=${c.conceptionDate||'none'}; estimated due date=${c.estimatedDueDate||'none'}; current displayed duration=${duration}. These are persistent game-state values, not facts to recalculate from the message count. A saved successful/unsuccessful conception result is immutable unless the user explicitly edits the state.\nRecent confirmed cycle events (reference only): ${recent||'none recorded'}.\nDo not narrate or announce these private mechanics unless relevant to the scene; never control {{user}} or decide their thoughts/feelings.\n[/LOVEMED CANONICAL CYCLE / PREGNANCY STATE]\n`;
 }catch{return '';}
}
function prompt(opts={}){
 const s=getState();if(!s.enabled)return'';
 const rel=visible(s).map(k=>`${REL_LABEL[k]}=${Math.round(s.relation[k])}`).join(', ');
 const allRelScores=Object.fromEntries(REL_FIELDS.map(([k])=>[k,Math.round(clamp(s.relation[k]))]));
 const manualSparkIds=opts.includeReaction?[...new Set(s.manualKinkPendingIds||[])].filter(id=>(s.diagnosis||[]).includes(id)):[];
 const rx=opts.includeReaction&&!manualSparkIds.length?reactionPrompt(s):'';
 const manualSpark=manualSparkIds.length?`[LOVEMED MANUAL SPARK — PRIORITY FOR THIS REPLY ONLY] The user explicitly selected these kinks from the saved diagnosis: ${manualSparkIds.map(id=>{const k=kink(id);return `${k.name}${k.description?` (${k.description})`:''}`;}).join('; ')}. Treat this as a direct scene direction, not an optional suggestion and not merely background information. Build the next RP reply around the selected kink(s) in a concrete, recognizable way; do not silently ignore, replace, or dilute the selection. Let the scene progress through character-consistent actions and dialogue rather than just naming the kink. If multiple kinks are selected, weave them together naturally where feasible. Keep the scene coherent, preserve established characterization and boundaries, and never dictate {{user}}'s actions or consent. This one-shot directive applies to the next generated reply only.`:'';
 const relationMode=s.relationshipMode==='romantic'?'РОМАНТИЧЕСКАЯ — романтическая динамика разрешена.':s.relationshipMode==='platonic'?'ПЛАТОНИЧЕСКАЯ — развивай дружбу, доверие, симпатию и близость без автоматического развития романтических показателей.':'НЕЙТРАЛЬНАЯ — не предполагай романтическую или близкую связь; меняй отношения только при явных признаках текущей сцены.';
 const relKeys=REL_FIELDS.map(([k])=>k).join(', ');
 const userKeys=Object.keys(USER_FEELING_LABEL).join(', ');
 const npcList=(s.npcRelationships||[]).filter(n=>!isProtectedIdentityName(n.name)).slice(0,30).map(n=>({name:n.name,info:n.info||'',mode:n.mode,relation:n.relation,active_feelings:(n.activeFeelings||[]).filter(k=>relationshipAllows(n.mode,k)),last_shift:n.lastShift||'',recent_history:(n.history||[]).slice(-3).map(e=>({shift:e.shift,changes:e.changes,active_feelings:e.activeFeelings}))}));
 const npcContext=npcList.length?JSON.stringify(npcList):'[]';
 const initiative=s.initiative;
 const initiativeGuide=initiative>=76?'high: {{char}} regularly shows initiative in both calm and charged scenes — flirting, purposeful proximity, light touches, suggestive comments, and when tension rises may escalate further into intimacy. Does not wait for {{user}} to always make the first move, but also does not turn every scene into sex.':initiative>=51?'moderate-high: often initiates light advances and flirting in calm scenes; in charged moments can push further toward intimacy.':initiative>=26?'low-moderate: occasional small gestures and light flirting; stronger moves mainly when tension is present.':'low: mostly responsive, rare initiative.';
 return`\n[LOVEMED — PRIVATE MEDICAL CONTINUITY]
${cycleContinuityPrompt()}Patient: ${charName()}
Relationship mode: ${relationMode}
ROMANTIC LOVE TRACK (mandatory when relationship mode is romantic): love is a core, always-tracked relationship metric, not an optional side emotion. Keep the LOVE score visible from the beginning, even at 0%. Treat this score as the character's developing romantic attachment/fixation toward {{user}}, including private preoccupation, jealousy, protectiveness, possessiveness, noticing details, seeking proximity, remembering small things, or caring despite irritation. It does NOT require the character to admit love, behave sweetly, or consciously understand their feelings. Pride, denial, emotional distance, and a cold outward tone are NOT reasons to freeze the internal love score. In every direct {{char}}↔{{user}} interaction, evaluate love independently and include 'love' in active_feelings in romantic mode. A routine exchange can leave it unchanged, but when a concrete emotional beat occurs, love should usually move even if the character hides the reaction. For a modest but meaningful beat (curiosity, unexpected concern, lingering attention, a small moment of trust or tension), use +2 internal points (displayed as +1%) unless the scene supports a decrease. For a powerful emotional beat, use +6 internal points (displayed as +3%). Love may coexist with anger, resentment, fear, or desire; do not confuse love with kindness or a confession. Do not raise love merely because a message occurred, because {{user}} is present, or because of temporary arousal alone. For a supported setback, use -2 or -6 internal points respectively; do not reduce it just because the character acts proud, denies attachment, or has a quiet reply. Never decay love automatically with time or routine replies. Platonic and neutral modes must not assume or develop romantic love.
CHARACTER INITIATIVE SETTING: ${initiative}/100 (${initiativeGuide}) This is separate from emotional expressiveness and random cue chance. Do not treat user-not-initiated as a blanket ban on character initiative. Do not use low/unknown relationship scores as an automatic reason for endless passivity; let plausible interest and initiative emerge through the roleplay. In platonic or neutral mode, do not assume romance or sex; initiative should remain appropriate to the established relationship. Never dictate {{user}}'s actions, thoughts, consent, or response. Initiative is an invitation/action by {{char}}, not permission to control {{user}}. Respect established characterization, context, boundaries, and pacing. {{char}} can show initiative and desire in calm scenes through flirting and light advances; stronger sexual escalation should mainly happen when real tension or mutual heat is present.
Current salient relationship indicators: ${rel||'не определены'}
Current full relationship scores for {{char}} (0-200): ${JSON.stringify(allRelScores)}
Full relationship vocabulary: ${relKeys}
Saved preference records: ${(s.diagnosis||[]).length}. These are reference data only, NOT active instructions. Do not introduce or escalate any saved preference unless a temporary LOVEMED REACTIVITY cue is provided for this reply; even then, that cue is optional and may be ignored when it does not fit the scene.
${s.lastShift?`Recent observation: ${s.lastShift}`:''}
Known NPC relationship records (update ONLY these named characters; do not invent new records here): ${npcContext}
${manualSpark}
${rx}
Write the complete in-character RP response first, with a natural ending; do not stop mid-sentence or let the bookkeeping packet replace or truncate the narrative. Then append this compact private machine-readable packet at the very end, without explaining it. Keep the packet minimal and valid JSON. Analyze the current RP/context actually available to you, especially the current {{user}} actions, words and emotional cues. Never treat {{user}} as an NPC or add {{user}}, {{char}}, the current character name, or the user's persona name to contacts/NPC records. NPCs are ONLY those explicitly listed in Known NPC relationship records. Never create records in contacts or npc_updates.
Relationship deltas are SIGNED changes, not absolute scores: use positive numbers when a feeling genuinely grows, negative numbers when it weakens, and 0 when unchanged. Love, desire, anger, fear, hate, trust, affection, jealousy, irritation, sadness and joy must respond independently to events: during a conflict, love can fall while anger, resentment or hate rises; during reconciliation, anger can fall while trust or affection rises. Do not freeze feelings at old values, and do not make all emotions rise together. Negative deltas are expected and important: after rejection, conflict, distance, disappointment, fear, reconciliation, comfort, or changed circumstances, reduce whichever indicators no longer fit. When a temporary emotion from the previous scene no longer fits (for example arousal, anger, fear, irritation, stress, or tension), let it subside with a small negative delta even if there is no dramatic event; do not automatically decay enduring feelings such as love or trust just because a reply passed. Do not monotonically increase values. Before choosing deltas, classify the actual emotional significance of this reply with impact: 'none' for routine conversation, presence, repeated affection without a meaningful development, or time passing; 'minor' for a concrete but ordinary emotional beat; 'major' only for a genuine turning point such as a serious betrayal, confession, breakup, rescue, or major reconciliation. For impact='none', every relationship delta must be 0. For 'minor', change at most 2 feelings, each by up to 2 internal points (= 1 displayed percentage point); for 'major', change at most 4 feelings, each by up to 6 internal points (= 3 displayed percentage points). Use the same magnitude for decreases: an ordinary emotional beat may be +1% or -1%; a vivid, strongly emotional turning point may be +3% or -3%. These are maximum steps, not mandatory changes: use 0 for routine replies and only move the feelings actually affected. The extension enforces both the per-feeling limit and the number of changed feelings in code. Missing or invalid impact means 'none', never 'minor'. Do not label routine dialogue as major. Usually change only one or two feelings that the event actually affects, not every positive feeling together. A routine message, time passing, or a character merely being present is not by itself a reason to change any score. Keep RP character-led and emotionally varied. Follow the established tone and level of detail of the scene instead of abruptly moralizing, censoring, euphemizing, or skipping past an event that the scene has already established. Light initiative, flirting and character-driven advances are welcome even in calm scenes. Full sexual or heavy kink escalation should stay meaningful and mainly appear when tension or mutual attraction is already present — do not turn ordinary roleplay into constant porn. Values are clamped to 0-200, so if a score is near 200 it can still decrease; if near 0 it can still increase. Base each delta on the current full scores and the current scene, not a generic trend. Choose up to 6 current salient relationship keys from the full vocabulary; active_feelings must reflect the CURRENT scene, not permanently repeat the same six. In PLATONIC or NEUTRAL mode, romantic relationship keys must stay unchanged and must not be selected as salient. In NEUTRAL mode, do not assume an existing bond unless the current scene provides evidence. CRITICAL TARGET RULE: Every relationship score shown in LoveMed is exclusively about that character's relationship TO {{user}}. It is NOT a general mood meter and must NEVER describe feelings toward Stella, another NPC, the environment, or events unrelated to {{user}}. The top-level relation and active_feelings belong to {{char}}'s feelings toward {{user}} only. Set char_user_interaction=true when {{char}} responds to {{user}}'s current RP action/dialogue, directly addresses them, acts toward them, or has a clear in-scene reaction to them (including a proud refusal, avoidance, concealed concern, or deliberate silence that responds to what {{user}} did). Do not let pride or emotional denial turn a real response into false. Set char_user_interaction=false only for a genuinely NPC-only/off-screen beat where {{user}} is not the target of the response; then set every top-level relation delta to 0 and do not change top-level active_feelings, shift, or history. Merely sharing a scene, being mentioned, or the user's presence elsewhere is NOT direct interaction. Example: “Zane is stuck in his car dealing with Stella's ongoing emotional tirade” is Zane–Stella dynamics, not Zane–{{user}}; it must not change {{char}} → {{user}} relationship scores.
NPC relationship records in LoveMed also mean that NPC's relationship TO {{user}}, not their relationship with {{char}} or another NPC. For each known NPC, only include an npc_updates entry when that NPC directly interacts with {{user}} in the current reply, and set user_interaction=true on that entry. If an NPC interacts only with {{char}} or another NPC, omit it entirely. Never record NPC-to-NPC feelings in LoveMed's relationship metrics. Do not duplicate the same changes across {{char}} and an NPC unless each separately directly interacts with {{user}} and the scene independently supports the changes. Apply strict impact rules independently. Use that NPC's recent_history and last_shift to maintain continuity. Omit uninvolved NPCs. Never create or rename NPCs via npc_updates. Respect each NPC's mode independently: in platonic or neutral mode, romantic keys must stay unchanged and cannot be active. NPC deltas update their existing values in either direction. For {{user}}, first decide whether {{user}} is actually present or directly participating in the current scene. Set user_in_scene=true only when the current scene contains {{user}}'s own action/dialogue or a direct interaction with them; otherwise set user_in_scene=false. In an NPC-only scene (for example, {{char}} dealing with another NPC while {{user}} is absent), set user_in_scene=false and do not infer or update the user's emotions. When user_in_scene=true, choose up to 6 current emotions from this exact vocabulary: ${userKeys}. Return user_feelings as the current list of emotions; do not assign percentages or intensity scores to {{user}}, because the user controls their own character. Reflect only emotions supported by the user's words/actions and the current scene. If evidence is insufficient, return an empty user_feelings list.
[[LOVEMED_STATE]]{"impact":"none","char_user_interaction":false,"relation":{"trust":0,"affection":0,"love":0,"sympathy":0,"friendship":0,"respect":0,"desire":0,"passion":0,"arousal":0,"obsession":0,"tenderness":0,"admiration":0,"jealousy":0,"resentment":0,"irritation":0,"anger":0,"fear":0,"sadness":0,"disappointment":0,"joy":0,"fondness":0,"stress":0,"tension":0,"antipathy":0,"hate":0},"active_feelings":[],"user_in_scene":false,"user_feelings":[],"shift":"","contacts":[],"npc_updates":[],"scene_kinks_used":[]}
[[/LOVEMED_STATE]]
IMPORTANT PACKET RULE: The JSON block immediately above is a STRUCTURE TEMPLATE, not an example result. Set scene_kinks_used to an array of exact active cue IDs only when those cues have been concretely portrayed in the narrative of this reply; leave it [] otherwise. Do not mark a cue used merely because it was mentioned, thought about, or promised for later. Never copy its default values blindly. Replace impact, char_user_interaction, relation deltas, active_feelings, user_in_scene, user_feelings, shift, contacts, and npc_updates based on the actual current RP reply. If this reply responds to {{user}} in-scene, set char_user_interaction=true. In romantic mode, when the scene contains a meaningful emotional beat, do not leave love at 0 delta merely because {{char}} is proud, distant, or denies feelings; use the gradual love progression rules above. Routine replies may still use impact="none" and zero deltas. Never mention this service packet in roleplay.`;
}
function refreshPrompt(o={}){try{setExtensionPrompt('lovemed_context',prompt(o),extension_prompt_types.IN_CHAT,0);}catch{}}
function toast(t){const e=document.createElement('div');e.className='lm-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2200);}
function ui(){try{const u=Object.assign({showFab:true,x:null,y:120,tab:'card'},JSON.parse(localStorage.getItem(UI_KEY)||'{}'));if(u.tab==='diag')u.tab='user';return u;}catch{return{showFab:true,x:null,y:120,tab:'card'};}}
function saveUI(x){try{localStorage.setItem(UI_KEY,JSON.stringify(x));}catch{}}
const userCardDefaults=()=>({name:'',age:'',sex:'',gender:'',secondarySex:'',avatar:'',cycleHistory:'',ovulation:'',menstruation:'',pregnancy:'',children:'',notes:'',rpObservation:'',pregnancyChance:25,pregnancyCheckAt:0,pregnancyResult:'',pregnancyCheckedLength:0,pregnancyCheckedTail:'',updatedAt:0});
function userCardKey(){return `lovemed_user_card:${chatKey()}`;}
function getUserCard(){try{return Object.assign(userCardDefaults(),JSON.parse(localStorage.getItem(userCardKey())||'{}'));}catch{return userCardDefaults();}}
function saveUserCard(data){const x=Object.assign(userCardDefaults(),data||{},{updatedAt:Date.now()});try{localStorage.setItem(userCardKey(),JSON.stringify(x));}catch{}return x;}

/* ---------- Cycle & pregnancy module: chat-scoped, isolated from existing cards ---------- */
const cycleDefaults=()=>({schemaVersion:3,lastPeriodStart:'',cycleLength:28,periodLength:5,pregnancyStatus:'unknown',pregnancyConfirmed:false,pregnancyChance:25,conceptionNoticeEnabled:true,conceptionDate:'',estimatedDueDate:'',pregnancyOriginEventId:'',contraceptionNotes:'',notes:'',events:[],updatedAt:0});
function cycleKey(){return `lovemed_cycle_v1:${chatKey()}`;}
function normalizeCycleEvent(raw={}){
 const allowed=['contact','contraception','period','symptom','test','pregnancy','other'];
 const statuses=['pending','confirmed','rejected'];
 return {id:String(raw.id||uid()),date:String(raw.date||new Date().toISOString().slice(0,10)).slice(0,10),type:allowed.includes(raw.type)?raw.type:'other',description:String(raw.description||'').slice(0,2000),status:statuses.includes(raw.status)?raw.status:'pending',source:String(raw.source||'manual').slice(0,30),sourceRef:String(raw.sourceRef||'').slice(0,200),messageIndex:Number.isFinite(Number(raw.messageIndex))?Number(raw.messageIndex):-1,conceptionChecked:!!raw.conceptionChecked,conceptionResult:['pregnant','not-pregnant','skipped'].includes(raw.conceptionResult)?raw.conceptionResult:'',conceptionChance:Math.max(0,Math.min(90,Number(raw.conceptionChance)||0)),conceptionReason:String(raw.conceptionReason||'').slice(0,500),conceptionNoticeDueAt:Number(raw.conceptionNoticeDueAt)||0,conceptionNoticeShownAt:Number(raw.conceptionNoticeShownAt)||0,createdAt:Number(raw.createdAt)||Date.now(),updatedAt:Number(raw.updatedAt)||Date.now()};
}
function getCycleState(){
 const base=cycleDefaults();let raw=null;
 try{raw=JSON.parse(localStorage.getItem(cycleKey())||'null');}catch{}
 const x=Object.assign(base,raw&&typeof raw==='object'?raw:{});
 x.cycleLength=Math.max(20,Math.min(45,Number(x.cycleLength)||28));
 x.periodLength=Math.max(2,Math.min(10,Number(x.periodLength)||5));
 x.pregnancyChance=Math.max(0,Math.min(90,Number(x.pregnancyChance)||0));
 x.pregnancyStatus=['unknown','not-pregnant','possible','pending-confirmation','confirmed','ended'].includes(x.pregnancyStatus)?x.pregnancyStatus:'unknown';
 x.pregnancyConfirmed=!!x.pregnancyConfirmed;x.conceptionNoticeEnabled=x.conceptionNoticeEnabled!==false;x.conceptionDate=String(x.conceptionDate||'').slice(0,10);x.estimatedDueDate=String(x.estimatedDueDate||'').slice(0,10);x.pregnancyOriginEventId=String(x.pregnancyOriginEventId||'');x.schemaVersion=3;
 x.events=(Array.isArray(x.events)?x.events:[]).filter(e=>e&&typeof e==='object').map(normalizeCycleEvent).slice(-200);
 return x;
}
function saveCycleState(data){
 const x=Object.assign(cycleDefaults(),data||{},{updatedAt:Date.now()});
 x.cycleLength=Math.max(20,Math.min(45,Number(x.cycleLength)||28));
 x.periodLength=Math.max(2,Math.min(10,Number(x.periodLength)||5));
 x.pregnancyChance=Math.max(0,Math.min(90,Number(x.pregnancyChance)||0));x.conceptionNoticeEnabled=x.conceptionNoticeEnabled!==false;x.conceptionDate=String(x.conceptionDate||'').slice(0,10);x.estimatedDueDate=String(x.estimatedDueDate||'').slice(0,10);x.pregnancyOriginEventId=String(x.pregnancyOriginEventId||'');x.schemaVersion=3;
 x.events=(Array.isArray(x.events)?x.events:[]).map(normalizeCycleEvent).slice(-200);
 try{localStorage.setItem(cycleKey(),JSON.stringify(x));}catch{toast('Не удалось сохранить цикл: хранилище недоступно');}
 return x;
}
function cycleSummary(c=getCycleState()){
 if(!c.lastPeriodStart)return {day:null,phase:'Не определена',next:'—',estimatedOvulation:'—'};
 const start=new Date(`${c.lastPeriodStart}T12:00:00`);if(Number.isNaN(start.getTime()))return {day:null,phase:'Не определена',next:'—',estimatedOvulation:'—'};
 const today=new Date();today.setHours(12,0,0,0);const elapsed=Math.floor((today-start)/86400000);if(elapsed<0)return {day:null,phase:'Дата в будущем',next:'—',estimatedOvulation:'—'};
 const day=(elapsed%c.cycleLength)+1;const nextDate=new Date(start);nextDate.setDate(nextDate.getDate()+Math.floor(elapsed/c.cycleLength+1)*c.cycleLength);
 const ovulation=new Date(start);ovulation.setDate(ovulation.getDate()+Math.max(1,c.cycleLength-14));
 let phase=day<=c.periodLength?'Менструация':day<c.cycleLength-18?'Фолликулярная фаза':day<=c.cycleLength-11?'Ориентировочное фертильное окно':'Лютеиновая фаза';
 return {day,phase,next:nextDate.toISOString().slice(0,10),estimatedOvulation:ovulation.toISOString().slice(0,10)};
}
function cycleTextHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function detectCycleCandidates(text,messageIndex){
 const body=String(text||'').replace(/\[\[LOVEMED_STATE\]\][\s\S]*?\[\[\/LOVEMED_STATE\]\]/g,' ').trim();
 if(body.length<30)return 0;
 const normalized=body.toLocaleLowerCase().replace(/[ё]/g,'е');
 const hash=`${chatKey()}:${messageIndex}:${cycleTextHash(normalized)}`;
 const c=getCycleState();
 const rules=[
  {type:'period',re:/(?:начал(?:ась|ся|ись) менструац|пошл[аи] месячн|кровотечен.{0,35}(?:менстру|месячн)|period started|started (?:her|my) period|menstruation began|menstrual bleeding)/i,label:'В тексте обнаружено возможное начало менструации'},
  {type:'contraception',re:/(?:презерватив|контрацепц|противозачаточ|таблетк.{0,25}(?:от беременности|контрацеп)|экстренн.{0,20}контрацеп|condom|contraception|birth control|morning.after pill)/i,label:'В тексте упоминается контрацепция'},
  {type:'contact',re:/(?:занима(?:лись|ется|ются) сексом|секс.{0,25}(?:без презерватива|без защиты|защитой)|половой акт|проникновен.{0,30}(?:влагалищ|вагин)|кончил.{0,35}(?:внутр|в неё|в нее|внутри)|эякуляц|незащищенн.{0,25}(?:секс|акт)|unprotected sex|had sex|sexual intercourse|ejaculat.{0,30}(?:inside|in her)|came inside)/i,label:'В тексте обнаружен возможный сексуальный контакт'},
  {type:'symptom',re:/(?:тошнот|утренн.{0,15}тошнот|бол.{0,15}груд.{0,20}(?:цикл|менстру|набух)|спазм.{0,20}(?:живот|матк)|тянущ.{0,20}низ живота|pregnancy symptoms|morning sickness|nausea|tender breasts|abdominal cramps)/i,label:'В тексте упоминается возможный симптом'},
  {type:'test',re:/(?:тест.{0,25}(?:на беременность|показал|отрицательн|положительн)|беременност.{0,20}тест|pregnancy test|tested positive|tested negative)/i,label:'В тексте упоминается тест на беременность'},
  {type:'pregnancy',re:/(?:оказал.{0,20}беремен|подтвердил.{0,20}беремен|беременна|беременен|беременность подтвержден|pregnant|pregnancy confirmed|positive pregnancy test)/i,label:'В тексте есть прямое упоминание беременности'}
 ];
 const matches=[];for(const rule of rules){const m=body.match(rule.re);if(!m)continue;const before=body.slice(Math.max(0,(m.index||0)-45),m.index||0);if(rule.type!=='contraception'&&rule.type!=='test'&&/(?:не|нет|без|не была|не был|не является|отрицательн|ложн|не беременн|not|never|no |without|isn't|is not|negative)/i.test(before))continue;matches.push({rule,match:m[0]});}
 if(!matches.length)return 0;
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;let added=0;
 for(const {rule,match} of matches){
  if(c.events.some(e=>e.source==='auto'&&e.sourceRef===hash&&e.type===rule.type))continue;
  const at=body.toLocaleLowerCase().indexOf(match.toLocaleLowerCase()),excerpt=body.slice(Math.max(0,at-130),Math.min(body.length,at+match.length+170)).replace(/\s+/g,' ').trim(),autoContact=rule.type==='contact';
  // A single intimate scene often spans several consecutive RP replies. Merge contact
  // detections from nearby messages into one scene event, so it gets only one conception roll.
  const recentContact=autoContact?c.events.filter(e=>e.source==='auto'&&e.type==='contact'&&e.status!=='rejected').map(e=>{
   let idx=Number(e.messageIndex);if(!Number.isFinite(idx)||idx<0){const m=String(e.sourceRef||'').match(/:(\d+):[a-z0-9]+$/i);idx=m?Number(m[1]):-1;}return {event:e,index:idx};
  }).filter(x=>x.index>=0&&messageIndex>=x.index&&messageIndex-x.index<=6).sort((a,b)=>b.index-a.index)[0]:null;
  if(recentContact){
   const event=recentContact.event;event.messageIndex=messageIndex;event.sourceRef=hash;event.updatedAt=Date.now();
   const addendum=`Продолжение той же сцены (сообщение ${messageIndex+1}): «${excerpt.slice(0,240)}».`;
   if(!event.description.includes(addendum))event.description=(event.description+' '+addendum).slice(0,2000);
   // Do not run another conception roll for the same multi-message scene.
   added++;continue;
  }
  const description=`${rule.label}. Фрагмент сцены: «${excerpt.slice(0,420)}». ${autoContact?'Событие автоматически обработано игровой системой.':'Проверь контекст перед подтверждением.'}`;
  const event=normalizeCycleEvent({id:uid(),date:today,type:rule.type,description,status:autoContact?'confirmed':'pending',source:'auto',sourceRef:hash,messageIndex});c.events.push(event);
  if(autoContact)calculateConceptionForEvent(c,event);
  added++;
 }
 if(added){c.events=c.events.slice(-200);saveCycleState(c);armPendingConceptionNotice();const conceived=c.events.some(e=>e.sourceRef===hash&&e.type==='contact'&&e.conceptionResult==='pregnant');toast(`🌙 LoveMed: ${added===1?'найдено событие':`найдено событий: ${added}`} — ${conceived?'беременность отмечена автоматически при успешной проверке':'проверь журнал во вкладке «Цикл»'}`);} 

 return added;
}
function showCycleTestNotice(){
 const prior=document.querySelector('.lm-conception-notice');prior?.remove();
 const node=document.createElement('aside');node.className='lm-conception-notice lm-conception-notice-test';node.setAttribute('role','status');
 node.innerHTML='<button class="lm-conception-notice-close" type="button" aria-label="Закрыть уведомление">×</button><div class="lm-conception-notice-row"><span class="lm-conception-notice-icon">♡</span><div class="lm-conception-notice-copy"><div class="lm-conception-notice-kicker">LOVEMED · ПРЕДПРОСМОТР</div><div class="lm-conception-notice-title">Тестовое уведомление</div><p>Так будет выглядеть сюрприз о зачатии. Это только проверка оформления — состояние цикла и беременность не изменены.</p></div></div>';
 document.body.appendChild(node);node.querySelector('button')?.addEventListener('click',()=>node.remove());setTimeout(()=>node.remove(),9000);toast('Предпросмотр: данные цикла не изменены');
}
function saveCycleSettings(){
 const c=getCycleState();c.lastPeriodStart=document.querySelector('#lmCycleLastPeriod')?.value||'';c.cycleLength=Number(document.querySelector('#lmCycleLength')?.value)||28;c.periodLength=Number(document.querySelector('#lmCyclePeriodLength')?.value)||5;c.pregnancyStatus=document.querySelector('#lmCyclePregnancyStatus')?.value||'unknown';c.pregnancyChance=Number(document.querySelector('#lmCyclePregnancyChance')?.value)||0;c.conceptionNoticeEnabled=!!document.querySelector('#lmCycleNoticeEnabled')?.checked;c.contraceptionNotes=document.querySelector('#lmCycleContraception')?.value.trim()||'';c.notes=document.querySelector('#lmCycleNotes')?.value.trim()||'';c.pregnancyConfirmed=c.pregnancyStatus==='confirmed';saveCycleState(c);render();toast('Настройки цикла сохранены');
}
function addCycleEvent(){
 const date=document.querySelector('#lmCycleEventDate')?.value||new Date().toISOString().slice(0,10),type=document.querySelector('#lmCycleEventType')?.value||'other',description=(document.querySelector('#lmCycleEventDescription')?.value||'').trim();
 if(!description){toast('Добавь описание события');return;}
 const c=getCycleState();c.events.push(normalizeCycleEvent({id:uid(),date,type,description,status:'pending',source:'manual'}));saveCycleState(c);render();toast('Событие добавлено в журнал на проверку');
}
function cyclePhaseForDate(date,c=getCycleState()){
 if(!c.lastPeriodStart||!date)return 'Не определена';const start=new Date(`${c.lastPeriodStart}T12:00:00`),target=new Date(`${date}T12:00:00`);if(Number.isNaN(start.getTime())||Number.isNaN(target.getTime()))return 'Не определена';const elapsed=Math.floor((target-start)/86400000);if(elapsed<0)return 'Не определена';const day=(elapsed%c.cycleLength)+1;return day<=c.periodLength?'Менструация':day<c.cycleLength-18?'Фолликулярная фаза':day<=c.cycleLength-11?'Ориентировочное фертильное окно':'Лютеиновая фаза';
}
function shiftIsoDate(dateText,days){
 if(!dateText)return '';const d=new Date(`${dateText}T12:00:00`);if(Number.isNaN(d.getTime()))return '';d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function pregnancySummary(c=getCycleState()){
 if(c.pregnancyStatus!=='confirmed'||!c.pregnancyConfirmed||!c.conceptionDate)return null;
 const start=new Date(`${c.conceptionDate}T12:00:00`),today=new Date();today.setHours(12,0,0,0);if(Number.isNaN(start.getTime()))return null;
 const elapsed=Math.max(0,Math.floor((today-start)/86400000)),gestationalDays=elapsed+14,weeks=Math.floor(gestationalDays/7),days=gestationalDays%7,due=c.estimatedDueDate||shiftIsoDate(c.conceptionDate,266),dueDate=new Date(`${due}T12:00:00`);
 return {weeks,days,elapsed,conceptionDate:c.conceptionDate,dueDate:due,daysToDue:Number.isNaN(dueDate.getTime())?null:Math.ceil((dueDate-today)/86400000)};
}
function markPregnancyFromConception(c,event){
 c.pregnancyStatus='confirmed';c.pregnancyConfirmed=true;
 if(!c.conceptionDate){c.conceptionDate=String(event.date||new Date().toISOString().slice(0,10));c.estimatedDueDate=shiftIsoDate(c.conceptionDate,266);c.pregnancyOriginEventId=String(event.id||'');}
}
function calculateConceptionForEvent(c,event){
 if(event.conceptionChecked)return event.conceptionResult||'skipped';event.conceptionChecked=true;
 if(event.type!=='contact'){event.conceptionResult='skipped';event.conceptionReason='Не является событием полового контакта.';return 'skipped';}
 if(c.pregnancyStatus==='confirmed'&&c.pregnancyConfirmed){event.conceptionResult='skipped';event.conceptionReason='Беременность уже отмечена как подтверждённая; повторная проверка не выполнялась.';return 'skipped';}
 const text=String(event.description||'').toLocaleLowerCase().replace(/[ё]/g,'е'),notes=String(c.contraceptionNotes||'').toLocaleLowerCase().replace(/[ё]/g,'е');
 const failure=/(?:порвал(?:ся|ась|ся)|лопнул|повредил(?:ся|ась)|соскользнул|пропустил.{0,20}таблет|забыл.{0,20}таблет|сбой.{0,20}контрац|не сработал|missed pill|condom (?:broke|split|tore|slipped)|contraception failed|birth control failed)/i.test(text);
 const explicitUnprotected=/(?:без (?:презерватива|защиты|контрацепц)|не использовал\w*.{0,25}(?:презерватив|контрацепц|защит)|контрацепц\w*.{0,20}не использовал|контрацепц\w*.{0,20}не применял|незащищенн|эякуляц|кончил.{0,30}(?:внутр|в нее|в неё|внутри)|сперма.{0,25}внутр|unprotected|came inside|ejaculat.{0,30}inside|without a condom|no condom|no contraception|no birth control|not using contraception|did not use a condom|didn't use a condom)/i.test(text);
 const notesSayNoProtection=/(?:без (?:презерватива|защиты|контрацепц)|не использ\w*.{0,25}(?:презерватив|контрацепц|защит)|контрацепц\w*.{0,20}не использ\w*|no contraception|no birth control|not using contraception)/i.test(notes);
 const protectionMentioned=/(?:презерватив|контрацепц|противозачаточ|контрацептив|birth control|condom|contraceptive pill|on the pill)/i.test(text)||/(?:презерватив|контрацепц|противозачаточ|контрацептив|birth control|condom|pill)/i.test(notes);
 const protectionActuallyUsed=protectionMentioned&&!notesSayNoProtection&&!explicitUnprotected&&!/(?:не использ\w*.{0,25}(?:презерватив|контрацепц|защит)|контрацепц\w*.{0,20}не использ\w*|no contraception|no birth control|not using contraception|without a condom|no condom)/i.test(text);
 let chance=Math.max(0,Math.min(90,Number(c.pregnancyChance)||0));const phase=cyclePhaseForDate(event.date,c);if(phase==='Ориентировочное фертильное окно')chance+=20;else if(phase==='Менструация')chance-=10;
 if(protectionActuallyUsed&&!failure)chance=Math.round(chance*0.08);else if(protectionMentioned&&failure)chance=Math.min(90,Math.max(chance,Number(c.pregnancyChance)||25));
 chance=Math.max(0,Math.min(90,Math.round(chance)));event.conceptionChance=chance;event.conceptionReason=`Игровая проверка: ${phase}; ${protectionActuallyUsed&&!failure?'в описании упомянута контрацепция':failure?'обнаружен возможный сбой контрацепции':explicitUnprotected?'есть маркер незащищённого контакта':'контрацепция явно не указана'}.`;
 event.conceptionResult=Math.random()*100<chance?'pregnant':'not-pregnant';
 if(event.conceptionResult==='pregnant'){markPregnancyFromConception(c,event);if(c.conceptionNoticeEnabled){event.conceptionNoticeDueAt=Date.now()+20000+Math.floor(Math.random()*70000);event.conceptionNoticeShownAt=0;}}
 return event.conceptionResult;
}
let conceptionNoticeTimer=null;
function isLoveMedOpen(){const overlay=document.querySelector('#lmOverlay');return !!overlay&&!overlay.classList.contains('hidden');}
function showConceptionNotice(eventId,expectedChat){
 if(chatKey()!==expectedChat)return;const c=getCycleState(),event=c.events.find(e=>e.id===eventId);if(!event||event.status!=='confirmed'||event.conceptionResult!=='pregnant'||!event.conceptionNoticeDueAt||event.conceptionNoticeShownAt)return;
 if(isLoveMedOpen()){conceptionNoticeTimer=setTimeout(()=>showConceptionNotice(eventId,expectedChat),5000);return;}
 const prior=document.querySelector('.lm-conception-notice');prior?.remove();const node=document.createElement('aside');node.className='lm-conception-notice';node.setAttribute('role','status');node.innerHTML='<button class="lm-conception-notice-close" type="button" aria-label="Закрыть уведомление">×</button><div class="lm-conception-notice-row"><span class="lm-conception-notice-icon">♡</span><div class="lm-conception-notice-copy"><div class="lm-conception-notice-kicker">LOVEMED · СОБЫТИЕ</div><div class="lm-conception-notice-title">Зачатие произошло</div><p>Беременность отмечена. Срок и примерная дата родов — во вкладке «Цикл».</p></div></div>';document.body.appendChild(node);node.querySelector('button')?.addEventListener('click',()=>node.remove());setTimeout(()=>node.remove(),9000);
 event.conceptionNoticeShownAt=Date.now();markPregnancyFromConception(c,event);event.updatedAt=Date.now();saveCycleState(c);armPendingConceptionNotice();
}
function armConceptionNotice(eventId,dueAt,expectedChat=chatKey()){
 if(conceptionNoticeTimer)clearTimeout(conceptionNoticeTimer);if(!dueAt)return;const wait=Math.max(0,dueAt-Date.now());conceptionNoticeTimer=setTimeout(()=>showConceptionNotice(eventId,expectedChat),wait);
}
function armPendingConceptionNotice(){if(conceptionNoticeTimer)clearTimeout(conceptionNoticeTimer);conceptionNoticeTimer=null;const c=getCycleState(),event=c.events.filter(e=>e.status==='confirmed'&&e.conceptionResult==='pregnant'&&e.conceptionNoticeDueAt&&!e.conceptionNoticeShownAt).sort((a,b)=>a.conceptionNoticeDueAt-b.conceptionNoticeDueAt)[0];if(event)armConceptionNotice(event.id,event.conceptionNoticeDueAt,chatKey());}
function updateCycleEvent(id,status){const c=getCycleState(),event=c.events.find(e=>e.id===id);if(!event)return;event.status=status;event.updatedAt=Date.now();if(status==='confirmed'&&event.type==='pregnancy'){c.pregnancyStatus='confirmed';c.pregnancyConfirmed=true;}if(status==='confirmed'&&event.type==='contact'&&!event.conceptionChecked){calculateConceptionForEvent(c,event);}if(status==='rejected'&&event.conceptionNoticeDueAt&&!event.conceptionNoticeShownAt)event.conceptionNoticeDueAt=0;saveCycleState(c);render();if(event.type==='contact'&&status==='confirmed'){if(event.conceptionResult==='pregnant'&&event.conceptionNoticeDueAt){armPendingConceptionNotice();toast('Событие подтверждено. LoveMed сохранил результат игровой проверки.');}else if(event.conceptionResult==='not-pregnant'){toast('Событие подтверждено. Результат игровой проверки сохранён.');}else toast('Событие подтверждено; повторный расчёт не выполнялся.');}else toast(status==='confirmed'?'Событие подтверждено':status==='rejected'?'Событие отклонено':'Событие возвращено на проверку');if(status==='rejected')armPendingConceptionNotice();}
function deleteCycleEvent(id){const c=getCycleState();c.events=c.events.filter(e=>e.id!==id);saveCycleState(c);render();toast('Событие удалено');}
function cyclePage(){
 const c=getCycleState(),sum=cycleSummary(c),preg=pregnancySummary(c),statusLabels={unknown:'Не определена', 'not-pregnant':'Не подтверждена',possible:'Возможна по игровым условиям','pending-confirmation':'Ожидает подтверждения',confirmed:'Подтверждена в сюжете',ended:'Завершена'},typeLabels={contact:'Половой контакт',contraception:'Контрацепция',period:'Менструация',symptom:'Симптом',test:'Тест',pregnancy:'Беременность',other:'Другое'},statusText={pending:'На проверке',confirmed:'Подтверждено',rejected:'Отклонено'};
 const events=[...c.events].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
 return `<div class="lm-card lm-cycle-page"><section class="lm-section"><div class="lm-cycle-heading"><div><span class="lm-label">LOVEMED · PERSONAL HEALTH</span><h3>Цикл и беременность</h3><p class="lm-note">Отдельный журнал состояния {{user}}. Даты и фазы пока являются ориентировочными игровыми оценками.</p></div><span class="lm-cycle-mark">♡</span></div><div class="lm-cycle-summary"><article><small>ДЕНЬ ЦИКЛА</small><strong>${sum.day===null?'—':sum.day}</strong><span>${sum.phase==='Не определена'?'Задай начало цикла':esc(sum.phase)}</span></article><article><small>СЛЕДУЮЩАЯ МЕНСТРУАЦИЯ</small><strong>${sum.next==='—'?'—':esc(sum.next)}</strong><span>Предварительная оценка</span></article><article><small>БЕРЕМЕННОСТЬ</small><strong>${esc(statusLabels[c.pregnancyStatus]||statusLabels.unknown)}</strong><span>${c.pregnancyConfirmed?'Отмечена как подтверждённая в сюжете':'Игровой статус'}</span></article></div>${preg?`<div class="lm-pregnancy-tracker"><div><small>СРОК БЕРЕМЕННОСТИ</small><strong>${preg.weeks} нед. ${preg.days} дн.</strong><span>Отсчёт ведётся автоматически по дате зачатия</span></div><div><small>ПРИМЕРНАЯ ДАТА РОДОВ</small><strong>${esc(preg.dueDate||'—')}</strong><span>${preg.daysToDue===null?'Срок не рассчитан':preg.daysToDue>=0?`Около ${preg.daysToDue} дн. осталось`:`Расчётная дата прошла на ${Math.abs(preg.daysToDue)} дн.`}</span></div></div>`:''}</section>
 <section class="lm-section"><h3>Настройки цикла</h3><p class="lm-note">LoveMed замечает маркеры в новых ответах. Найденный половой контакт автоматически проходит один игровой бросок зачатия; остальные события появляются на проверку; учитываются заданный шанс, примерная фаза цикла и явные упоминания контрацепции. При успешном результате беременность сохраняется сразу, а компактное уведомление появляется с задержкой 20–90 секунд, когда панель LoveMed свёрнута. Срок и ориентировочная дата родов рассчитываются автоматически. Это игровая механика, не медицинский прогноз.</p><div class="lm-cycle-form"><label>Начало последней менструации<input id="lmCycleLastPeriod" type="date" value="${esc(c.lastPeriodStart)}"></label><label>Длина цикла (дней)<input id="lmCycleLength" type="number" min="20" max="45" value="${c.cycleLength}"></label><label>Длительность менструации (дней)<input id="lmCyclePeriodLength" type="number" min="2" max="10" value="${c.periodLength}"></label><label>Статус беременности<select id="lmCyclePregnancyStatus"><option value="unknown" ${c.pregnancyStatus==='unknown'?'selected':''}>Не определена</option><option value="not-pregnant" ${c.pregnancyStatus==='not-pregnant'?'selected':''}>Не подтверждена</option><option value="possible" ${c.pregnancyStatus==='possible'?'selected':''}>Возможна по игровым условиям</option><option value="pending-confirmation" ${c.pregnancyStatus==='pending-confirmation'?'selected':''}>Ожидает подтверждения</option><option value="confirmed" ${c.pregnancyStatus==='confirmed'?'selected':''}>Подтверждена в сюжете</option><option value="ended" ${c.pregnancyStatus==='ended'?'selected':''}>Завершена</option></select></label><label>Игровая вероятность (%)<input id="lmCyclePregnancyChance" type="number" min="0" max="90" value="${c.pregnancyChance}"></label><label class="lm-cycle-wide lm-cycle-notice-toggle"><input id="lmCycleNoticeEnabled" type="checkbox" ${c.conceptionNoticeEnabled!==false?'checked':''}> Показывать сюрприз-уведомление, если игровая проверка определит зачатие</label><label class="lm-cycle-wide">Контрацепция / правила текущего сюжета<textarea id="lmCycleContraception" rows="2" placeholder="Что используется, когда принято, известные пропуски…">${esc(c.contraceptionNotes)}</textarea></label><label class="lm-cycle-wide">Заметки<textarea id="lmCycleNotes" rows="2" placeholder="Особенности цикла, отклонения, сюжетные условия…">${esc(c.notes)}</textarea></label></div><button id="lmCycleSaveSettings" type="button" class="lm-primary">Сохранить настройки</button><button id="lmCycleTestNotice" type="button" class="lm-secondary lm-cycle-test-notice">♡ Проверить уведомление на экране</button><p class="lm-note lm-cycle-persistence-note">Состояние цикла и беременности сохраняется отдельно от переписки и суммари для этого чата. Сокращение истории не должно обнулять записанные события или повторно запускать старые проверки.</p></section>
 <section class="lm-section"><h3>Журнал событий · ${(c.events.filter(e=>e.status==='pending').length)} на проверке</h3><p class="lm-note">События, найденные автоматически, помечаются как «Распознано из РП». Подтверждай только то, что действительно произошло; отклонённые события не участвуют в дальнейших расчётах.</p><div class="lm-cycle-form lm-cycle-event-form"><label>Дата события<input id="lmCycleEventDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Тип<select id="lmCycleEventType">${Object.entries(typeLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="lm-cycle-wide">Описание<textarea id="lmCycleEventDescription" rows="2" maxlength="2000" placeholder="Что произошло в РП? Не добавляй предположения, которых не было в тексте."></textarea></label></div><button id="lmCycleAddEvent" type="button" class="lm-primary">＋ Добавить событие</button><div class="lm-cycle-events">${events.map(e=>`<article class="lm-cycle-event"><div class="lm-cycle-event-top"><span>${esc(typeLabels[e.type]||typeLabels.other)}</span>${e.source==='auto'?'<span class="lm-cycle-source">Распознано из РП</span>':''}<time>${esc(e.date)}</time><span class="lm-cycle-status ${e.status}">${esc(statusText[e.status]||statusText.pending)}</span></div><p>${esc(e.description)}</p><div class="lm-cycle-event-actions">${e.status!=='confirmed'?`<button type="button" data-cycle-confirm="${esc(e.id)}" class="lm-secondary">Подтвердить</button>`:''}${e.status!=='rejected'?`<button type="button" data-cycle-reject="${esc(e.id)}" class="lm-secondary">Отклонить</button>`:''}<button type="button" data-cycle-delete="${esc(e.id)}" class="lm-cycle-delete">Удалить</button></div></article>`).join('')||'<div class="lm-cycle-empty">Пока нет событий. Когда в ответах персонажа встретятся маркеры цикла, контрацепции, контакта, симптомов или теста, они появятся здесь на проверку.</div>'}</div></section></div>`;
}
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
 if(u.pregnancy)tags.push('Беременность');
 if(u.children)tags.push('Дети');
 return tags;
}
function roleplayText(){
 const c=ctx();if(!c?.chat)return'';
 return c.chat.map(m=>typeof m?.mes==='string'?m.mes:'').filter(Boolean).join('\n');
}
function pregnancyRiskFromRP(text,u,contextText=''){
 const cycle=getCycleState(),cycleInfo=cycleSummary(cycle),baseChance=Math.max(0,Math.min(90,Number(cycle.pregnancyChance)||0));
 const raw=String(text||'').replace(/\[\[LOVEMED_STATE\]\][\s\S]*?\[\[\/LOVEMED_STATE\]\]/g,' ');
 const contextRaw=String(contextText||raw).replace(/\[\[LOVEMED_STATE\]\][\s\S]*?\[\[\/LOVEMED_STATE\]\]/g,' ');
 const sentences=raw.split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
 const explicitPositive=/(?:беременна\b|беременность\s+(?:подтверждена|подтвердилась|подтвердился|установлена|обнаружена)|тест\s+(?:положителен|положительный|показал\s+две\s+полоски)|зачатие\s+подтверждено|оплодотворение\s+подтверждено|pregnan(?:t|cy)\s+(?:is\s+)?confirmed|she\s+is\s+pregnant|positive\s+pregnancy\s+test|pregnancy\s+test\s+(?:was\s+)?positive|conception\s+(?:was\s+)?confirmed)/i;
 const explicitNegative=/(?:не\s+беременна\b|беременность\s+(?:не\s+подтверждена|исключена|отсутствует)|тест\s+(?:отрицателен|отрицательный)|не\s+зачат|оплодотворение\s+не\s+произошло|not\s+pregnant|pregnancy\s+(?:is\s+)?(?:not\s+confirmed|ruled\s+out|negative)|negative\s+pregnancy\s+test|no\s+conception|did\s+not\s+conceive)/i;
 let explicit=null;
 for(const sentence of sentences){
  if(explicitNegative.test(sentence))explicit={status:'explicit_negative',reason:'В тексте РП прямо указано, что беременность не подтверждена.'};
  else if(explicitPositive.test(sentence))explicit={status:'explicit_positive',reason:'В тексте РП прямо подтверждена беременность.'};
 }
 if(explicit)return {...explicit,risk:explicit.status==='explicit_positive',confirmed:explicit.status==='explicit_positive',chance:explicit.status==='explicit_positive'?100:0,eventCount:0};
 const sexPattern=/(?:занимал(?:ись|ась|ся)?\s+секс|занялись\s+секс|половой\s+акт|сексуальн(?:ый|ая)\s+контакт|проникновени|совокупил(?:ись|ся|ась)?|переспал(?:и|а)?|интимн(?:ая|ый)\s+связь|сексом|had\s+sex|have\s+sex|slept\s+with|sexual\s+contact|intercourse|penetrat(?:ed|es|ing|ion)|fucked|made\s+love|they\s+had\s+intimacy)/i;
 const insidePattern=/(?:семяизвержен[^.\n]{0,100}(?:внутр|туда|в\s+не[её]|в\s+него)|кончил[^.\n]{0,100}(?:внутр|туда|в\s+не[её]|в\s+него)|кончил\s+в\s+не[её]|эякуляц[^.\n]{0,100}внутр|came\s+(?:inside|in\s+her|inside\s+her)|ejaculat\w*\s+(?:inside|in\s+her)|finished\s+inside|cum(?:med)?\s+inside|filled\s+her\s+with\s+(?:his\s+)?cum|released\s+(?:inside|inside\s+her))/i;
 const negation=/(?:не\s+был(?:о|а|и)?|не\s+происходил|не\s+произош[её]л|не\s+занимал(?:ись|ась|ся)?|никакого\s+секса|без\s+секса|отказал(?:ась|ся)|остановил(?:ась|ся)|не\s+дошло\s+до|did\s+not\s+have\s+sex|didn't\s+have\s+sex|no\s+sex\s+(?:occurred|happened)|stopped\s+before|never\s+had\s+sex)/i;
 const sexSentences=sentences.filter(x=>(sexPattern.test(x)||insidePattern.test(x))&&!negation.test(x));
 if(!sexSentences.length)return {status:'no_sex_found',risk:false,confirmed:false,chance:0,eventCount:0,reason:'В новых фрагментах РП не обнаружено явного описания полового контакта.'};
 const countedEvents=sexSentences.reduce((n,x)=>n+(sexPattern.test(x)||insidePattern.test(x)?1:0),0);
 const describedMultiple=/(?:дважды|два\s+раза|оба\s+раза|twice|two\s+times|both\s+times)/i.test(raw)?2:1;
 const eventCount=Math.max(1,Math.min(5,countedEvents,5),describedMultiple);
 const contraceptionTaken=/(?:противозачаточн\w*|контрацептив\w*|контрацепц\w*|таблетк\w*\s+(?:от\s+беременност\w*|контрацептив\w*)|пью\s+таблетк\w*|выпил\w*\s+(?:таблетк\w*|противозачаточн\w*)|принял\w*\s+(?:таблетк\w*|контрацептив\w*)|приняла\s+таблетк\w*|birth\s*control(?:\s+pills?)?|contraceptive\s+pills?|oral\s+contracept\w*|took\s+(?:her\s+)?(?:birth\s*control|contraceptive)\s+pills?|took\s+the\s+pill|on\s+the\s+pill|she\s+took\s+(?:her\s+)?pill|morning[- ]after\s+pill|plan\s*b|contraception\s+was\s+used|using\s+contraception)/i.test(contextRaw);
 const contraceptionFailure=/(?:забыл\w*\s+(?:выпить|принять)\s+таблетк\w*|пропустил\w*\s+таблетк\w*|не\s+принял\w*\s+таблетк\w*|таблетк\w*\s+не\s+сработал\w*|контрацепц\w*\s+подвел\w*|контрацептив\w*\s+не\s+сработал\w*|missed\s+(?:a\s+)?pill|forgot\s+to\s+take\s+(?:the\s+)?pill|skipped\s+(?:her\s+)?pill|pill\s+(?:failed|didn't\s+work|did\s+not\s+work)|contraception\s+failed|birth\s*control\s+failed|contraceptive\s+failure)/i.test(contextRaw);
 const condom=/(?:презерватив\w*|condom\w*)/i.test(raw);
 const inside=sexSentences.some(x=>insidePattern.test(x));
 const unprotected=inside||/(?:без\s+(?:презерватива|защиты)|незащищ[её]н\w*|беззащитн\w*|презерватив\w*\s+не\s+был|не\s+использовал\w*\s+(?:презерватив|защиту)|without\s+(?:a\s+)?condom|unprotected\s+sex|no\s+condom|condom\s+(?:broke|split|tore|failed))/i.test(raw);
 if(contraceptionTaken&&!contraceptionFailure){
  const base=baseChance;
  // A small fictional per-scene failure chance keeps the RP tracker dynamic without treating contraception as automatically ineffective.
  const chance=Math.max(0,Math.min(90,Math.round(base*0.04*eventCount*10)/10));
  return {status:'contraception_taken',risk:true,confirmed:false,chance,eventCount,inside,contraceptionTaken:true,contraceptionFailure:false,reason:`В РП обнаружен половой контакт${inside?' с эякуляцией внутрь':''}; приём контрацептивов упомянут, явных признаков пропуска или сбоя не найдено. Игровой шанс сбоя: ${chance}%.`};
 }
 if(contraceptionFailure){
  const base=baseChance;
  return {status:'contraception_failure',risk:true,confirmed:false,chance:base,eventCount,inside,contraceptionTaken,contraceptionFailure:true,reason:`В РП обнаружены признаки пропуска или сбоя контрацепции; для игровой проверки используется базовый шанс ${base}%.`};
 }
 if(condom&&!unprotected)return {status:'condom_protection',risk:false,confirmed:false,chance:0,eventCount,inside:false,reason:'В РП упомянут презерватив; признаков его повреждения или отказа не найдено.'};
 if(!unprotected)return {status:'insufficient_evidence',risk:false,confirmed:false,chance:0,eventCount,reason:'Половой контакт обнаружен, но текст не подтверждает эякуляцию внутрь, отсутствие защиты или сбой контрацепции.'};
 let chance=Number(u.pregnancyChance);if(!Number.isFinite(chance))chance=25;
 if(cycleInfo.phase==='Ориентировочное фертильное окно')chance+=20;
 if(cycleInfo.phase==='Менструация')chance-=10;
 chance=Math.max(0,Math.min(90,chance));
 return {status:'unprotected',risk:true,confirmed:false,chance,eventCount,inside,contraceptionTaken:false,contraceptionFailure:false,reason:`В РП обнаружен незащищённый половой контакт${inside?' с эякуляцией внутрь':''}; игровой шанс беременности ${chance}%.`};
}
function checkUserRP(){
 const u=getUserCard(),rp=roleplayText();
 if(!rp){toast('В текущем чате пока нет РП для проверки');return;}
 const checkedLength=Math.max(0,Number(u.pregnancyCheckedLength)||0),checkedTail=String(u.pregnancyCheckedTail||'');
 let fresh=rp;
 if(checkedLength>0&&rp.length>=checkedLength&&rp.slice(Math.max(0,checkedLength-checkedTail.length),checkedLength).endsWith(checkedTail))fresh=rp.slice(checkedLength);
 if(checkedLength>0&&!fresh.trim()){
  if(u.rpObservation){toast('Новых фрагментов РП нет. Последнее наблюдение уже сохранено на карте.');return;}
 }
 const r=pregnancyRiskFromRP(fresh,u,rp),now=new Date().toLocaleString();
 let outcome='';
 if(r.status==='explicit_positive'){
  u.pregnancy='Беременность подтверждена в РП.';u.pregnancyResult='Беременность прямо подтверждена текстом РП; повторный случайный расчёт не выполнялся.';outcome='Беременность прямо подтверждена в тексте РП.';
 }else if(r.status==='explicit_negative'){
  u.pregnancy='Беременность не подтверждена в РП.';u.pregnancyResult='В тексте РП прямо указано, что беременность не подтверждена.';outcome='В тексте РП прямо указано, что беременность не подтверждена.';
 }else if(r.status==='no_sex_found'){
  outcome='В новых сообщениях не найдено достаточно явных признаков полового контакта для проверки беременности.';
  if(!u.pregnancyResult)u.pregnancyResult='Проверка выполнена; недостаточно данных о половом контакте для игрового расчёта.';
 }else if(r.status==='insufficient_evidence'){
  outcome='Половой контакт обнаружен, но данных о защите или эякуляции внутрь недостаточно; результат беременности не разыгрывался.';
  u.pregnancyResult='Проверка РП: недостаточно данных о защите/эякуляции внутрь. Беременность случайным образом не назначалась.';
 }else if(r.status==='condom_protection'){
  outcome='В РП обнаружен презерватив; признаков сбоя защиты нет. В рамках игровой проверки защита сработала.';
  u.pregnancy='Беременность не наступила по текущей игровой проверке.';u.pregnancyResult='Защита презервативом в РП не описана как нарушенная; беременность не наступила в рамках игровой проверки.';
 }else if(r.risk){
  const pregnant=r.confirmed||Math.random()*100<r.chance;
  if(pregnant){
   const childSex=randomChildSex();u.pregnancy='Беременность: подтверждена по результату проверки РП.';u.children=u.children||`Будущий ребёнок: ${childSex}`;
   if(r.status==='contraception_taken'){
    outcome=`Игровая проверка определила редкий сбой контрацепции (${r.chance}% на этот фрагмент РП): беременность наступила, несмотря на упомянутый приём таблеток. Пол ребёнка пока не определён достоверно (${childSex} — случайный игровой результат).`;
    u.pregnancyResult=`Беременность наступила в результате игрового броска несмотря на упомянутый приём контрацептивов (расчётный шанс сбоя ${r.chance}%). Пол ребёнка: ${childSex} (случайный игровой результат).`;
   }else if(r.status==='contraception_failure'){
    outcome=`Беременность наступила в игровой проверке: в РП были признаки пропуска/сбоя контрацепции, шанс ${r.chance}%.`;
    u.pregnancyResult=`Беременность определена по игровой проверке после признаков сбоя контрацепции (шанс ${r.chance}%). Пол ребёнка: ${childSex} (случайный игровой результат).`;
   }else{
    outcome=`Беременность наступила по игровой проверке (шанс ${r.chance}%). Пол ребёнка: ${childSex} (случайный игровой результат).`;
    u.pregnancyResult=`Беременность определена по игровой проверке. Шанс: ${r.chance}%. Пол ребёнка: ${childSex} (случайный игровой результат).`;
   }
  }else{
   u.pregnancy='Беременность не подтверждена по последней проверке РП.';
   if(r.status==='contraception_taken'){
    outcome=`Противозачаточные в РП упомянуты как принятые; в рамках игровой проверки контрацепция сработала. Беременность не наступила (вероятность сбоя ${r.chance}%).`;
    u.pregnancyResult=`Контрацепция сработала в рамках игровой проверки. Приём противозачаточных упомянут, явных признаков пропуска/сбоя нет; беременность не наступила (игровой шанс сбоя ${r.chance}%).`;
   }else if(r.status==='contraception_failure'){
    outcome=`В РП есть признаки пропуска/сбоя контрацепции, но игровой бросок не подтвердил беременность (шанс ${r.chance}%).`;
    u.pregnancyResult=`Признаки сбоя контрацепции найдены, но беременность не наступила по игровому броску (шанс ${r.chance}%).`;
   }else{
    outcome=`Беременность не наступила по игровой проверке (шанс был ${r.chance}%).`;
    u.pregnancyResult=`Беременность не наступила по игровой проверке; расчётный шанс составлял ${r.chance}%.`;
   }
  }
 }else{
  outcome=r.reason||'Проверка выполнена; дополнительных признаков не обнаружено.';
 }
 const evidence=`Проверка по РП · ${now}. ${r.reason||''}`.trim();
 u.rpObservation=[evidence,outcome].filter(Boolean).join('\n\n').slice(0,1200);
 u.pregnancyCheckAt=Date.now();u.pregnancyCheckedLength=rp.length;u.pregnancyCheckedTail=rp.slice(-500);
 saveUserCard(u);render();
 if(r.status==='contraception_taken')toast(outcome.includes('беременность наступила')?'Проверка РП: обнаружен игровой сбой контрацепции':'Проверка РП: контрацепция сработала по игровому результату');
 else if(r.status==='no_sex_found')toast('Проверка РП завершена; наблюдение сохранено, новых признаков полового контакта нет');
 else if(r.risk)toast(outcome.includes('беременность наступила')?'Проверка РП: беременность определена':'Проверка РП: беременность не подтверждена');
 else toast('Проверка РП завершена; наблюдение сохранено на карте пользователя');
}
function sUserFeelings(){try{return userVisibleFeelings(getState());}catch{return [];}}
function relationList(s){return REL_FIELDS.filter(([k])=>s.relationshipMode!=='platonic'||!ROMANTIC_FIELDS.includes(k));}
function allRelationPanel(s){return `<details class="lm-all-emotions"><summary>♡ Посмотреть все эмоции</summary><div class="lm-all-emotions-list">${relationList(s).map(([k])=>`<label><span>${REL_LABEL[k]}</span><b>${Math.round(s.relation[k])}</b><input data-rel="${k}" type="range" min="0" max="200" value="${clamp(s.relation[k])}"></label>`).join('')}</div></details>`;}
const PATIENT_FEELING_KEYS=['love','hate','anger','fear','arousal','desire','trust','affection','jealousy','irritation','sadness','joy','tenderness','respect'];
function patientFeelingsHtml(s){
 const romantic=s.relationshipMode==='romantic';
 const active=(s.activeFeelings||[]).filter(k=>PATIENT_FEELING_KEYS.includes(k)&&(!romantic||k!=='love'));
 const ranked=PATIENT_FEELING_KEYS.filter(k=>k!=='love'&&Number(s.relation?.[k])>0).sort((a,b)=>(Number(s.relation[b])||0)-(Number(s.relation[a])||0));
 const keys=[...new Set([...active,...ranked])].slice(0,8);
 const lovePercent=Math.round(clamp(s.relation?.love)/2);
 const loveFrame=romantic?`<div class="lm-love-track"><div class="lm-love-track-head"><span class="lm-love-track-icon">♡</span><div><b>Любовь к {{user}}</b><small>Растёт постепенно вместе с историей</small></div><strong>${lovePercent}%</strong></div><div class="lm-love-track-rail"><span style="width:${lovePercent}%"></span></div></div>`:'';
 return `${loveFrame}<div class="lm-patient-feelings">${keys.length?keys.map(k=>`<span class="lm-patient-feeling"><b>${esc(REL_LABEL[k])}</b> ${Math.round(clamp(s.relation[k])/2)}%</span>`).join(''):'<span class="lm-npc-dynamics-empty">Чувства пока не определены</span>'}</div>`;
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
   <div class="lm-idcard-quote">${esc(u.rpObservation||u.notes||'Состояние пользователя: данные наблюдения пока не заполнены. Нажмите «Проверить состояние по РП», чтобы создать первое наблюдение.')}</div>
   <div class="lm-idcard-actions"><button id="lmCheckUserRP" type="button" class="lm-primary">🩺 Проверить состояние по РП</button><button id="lmSaveUserCard" type="button" class="lm-secondary">Сохранить данные</button><button id="lmRefreshUserCard" type="button" class="lm-secondary">Обновить из персоны</button></div>
   <details class="lm-idcard-edit"><summary>Редактировать данные карты</summary>
    <div class="lm-user-grid">
     <label>Имя<input id="lmUserName" value="${esc(u.name)}" placeholder="Имя"></label><label>Возраст<input id="lmUserAge" value="${esc(u.age)}" placeholder="Не указан"></label>
     <label>Пол<input id="lmUserSex" value="${esc(u.sex)}" placeholder="Не указан"></label><label>Гендер<input id="lmUserGender" value="${esc(u.gender)}" placeholder="Не указан"></label>
     <label>Вторичный пол<input id="lmUserSecondary" value="${esc(u.secondarySex)}" placeholder="Не указан"></label><label>Аватар<input id="lmUserAvatar" value="${esc(u.avatar)}" placeholder="Автоматически из персоны"></label>
    </div>
    <div class="lm-history-grid">
     <label>Беременность<textarea id="lmUserPregnancy" placeholder="История беременностей...">${esc(u.pregnancy)}</textarea></label>
     <label>Дети<textarea id="lmUserChildren" placeholder="Имя, пол, возраст...">${esc(u.children)}</textarea></label><label>Результат проверки РП<textarea id="lmUserPregResult" placeholder="Результат последней проверки...">${esc(u.pregnancyResult)}</textarea></label><label>Состояние / заметки<textarea id="lmUserNotes" placeholder="Описание состояния...">${esc(u.notes)}</textarea></label>
    </div>
    <button id="lmSaveUserHistory" type="button" class="lm-primary">Сохранить историю</button>
   </details>
  </div>`;
}
function collectUserIdentity(){return {name:document.querySelector('#lmUserName')?.value.trim()||'',age:document.querySelector('#lmUserAge')?.value.trim()||'',sex:document.querySelector('#lmUserSex')?.value.trim()||'',gender:document.querySelector('#lmUserGender')?.value.trim()||'',secondarySex:document.querySelector('#lmUserSecondary')?.value.trim()||'',avatar:document.querySelector('#lmUserAvatar')?.value.trim()||getUserCard().avatar||''};}
function saveUserIdentity(){saveUserCard(Object.assign(getUserCard(),collectUserIdentity()));render();toast('Данные пользователя сохранены');}
function saveUserHistory(){saveUserCard(Object.assign(getUserCard(),{pregnancy:document.querySelector('#lmUserPregnancy')?.value.trim()||'',children:document.querySelector('#lmUserChildren')?.value.trim()||'',pregnancyResult:document.querySelector('#lmUserPregResult')?.value.trim()||'',notes:document.querySelector('#lmUserNotes')?.value.trim()||''}));render();toast('История пользователя сохранена');}
function bindUserCard(){
 const overlay=document.querySelector('#lmOverlay');
 if(!overlay||overlay.dataset.userDelegated)return;
 overlay.dataset.userDelegated='1';
 overlay.addEventListener('click',e=>{
  const btn=e.target.closest?.('#lmSaveUserCard,#lmSaveUserHistory,#lmRefreshUserCard,#lmCheckUserRP,#lmRollKink,#lmResetKinkRoll,#lmActivateManualKinks,#lmClearManualKinks,[data-manual-kink],[data-save-char-card],[data-reset-char-card],[data-user-avatar-picker]');
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
  else if(btn.id==='lmActivateManualKinks')activateManualKinks();
  else if(btn.id==='lmClearManualKinks')clearManualKinks();
  else if(btn.matches('[data-manual-kink]'))toggleManualKink(btn.dataset.manualKink);
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
  if(['lmUserName','lmUserAge','lmUserSex','lmUserGender','lmUserSecondary'].includes(id)){
   const u=getUserCard();
   if(id==='lmUserName')u.name=e.target.value.trim();
   if(id==='lmUserAge')u.age=e.target.value.trim();
   if(id==='lmUserSex')u.sex=e.target.value.trim();
   if(id==='lmUserGender')u.gender=e.target.value.trim();
   if(id==='lmUserSecondary')u.secondarySex=e.target.value.trim();
   saveUserCard(u);
  }
  if(['lmUserPregnancy','lmUserChildren','lmUserPregResult','lmUserNotes'].includes(id)){
   const u=getUserCard();
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
 if(tab==='cycle')return cyclePage();
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
 return `<div class="lm-card"><section class="lm-section"><h3>Реактивность пациента</h3><div class="lm-sliders"><label>Выразительность эмоциональной реакции <b>${s.reactionIntensity}</b><input id="lmIntensity" type="range" min="0" max="100" value="${s.reactionIntensity}"></label><p class="lm-note">Этот параметр регулирует только заметность эмоций, а не инициативность персонажа, откровенность сцены или обязательную сексуальную эскалацию. Даже при высоком значении персонаж сохраняет характер, границы и естественный темп сюжета.</p><label>Вероятность спонтанной реакции <b>${s.reactionChance}%</b><input id="lmChance" type="range" min="0" max="100" value="${s.reactionChance}"></label><label>Пауза между спонтанными реакциями (ответов) <b>${s.reactionCooldown}</b><input id="lmCooldown" type="range" min="1" max="12" value="${s.reactionCooldown}"></label><label>Инициативность персонажа <b>${s.initiative}/100</b><input id="lmInitiative" type="range" min="0" max="100" value="${s.initiative}"></label><p class="lm-note">Отдельно регулирует, насколько часто персонаж сам делает первый шаг: флиртует, сокращает дистанцию, инициирует прикосновения или поцелуй и предлагает близость, если это соответствует характеру и сцене. Высокое значение не управляет действиями и согласием {{user}} и не означает автоматическую сексуальную эскалацию.</p></div></section><section class="lm-section lm-random-react"><h3>🎲 Ситуативный кубик</h3><p class="lm-note">Кубик выбирает один или два совместимых варианта строго из сохранённого диагноза. Это задача для целой сцены: выбранные кинки остаются активными между ответами и сбрасываются только после явного подтверждения, что каждый из них был конкретно воплощён в сцене.</p><div class="lm-random-react-row"><button id="lmRollKink" type="button" class="lm-primary lm-dice-button">🎲 Бросить кубик для сцены</button><button id="lmResetKinkRoll" type="button" class="lm-secondary lm-dice-reset" ${randomNames.length?'':'disabled'}>↻ Сбросить</button><div class="lm-random-result">${randomNames.length?`Варианты: <b>${esc(randomNames.join(' · '))}</b>`:'Варианты ещё не выбраны'}</div></div></section><section class="lm-section lm-manual-spark"><h3>✨ Искра — ручной выбор</h3><p class="lm-note">Выбери один или несколько пунктов из готового диагноза. После активации LoveMed передаст их модели как приоритетное указание на следующий ответ, а не как необязательную случайную подсказку. Модель всё равно сохраняет связность сцены и контроль пользователя над своей героиней.</p><div class="lm-manual-kink-grid">${(s.diagnosis||[]).map(id=>{const k=kink(id),selected=(s.manualKinkSelection||[]).includes(id),pending=(s.manualKinkPendingIds||[]).includes(id);return `<button type="button" class="lm-manual-kink-btn ${selected?'selected':''} ${pending?'pending':''}" data-manual-kink="${esc(id)}" aria-pressed="${selected?'true':'false'}"><span>${esc(k.name)}</span><em>${pending?'⚡ Активно':selected?'✓ Выбрано':'＋'}</em></button>`;}).join('')||'<i>Сначала сформируй диагноз на главной вкладке.</i>'}</div><div class="lm-manual-spark-actions"><button id="lmActivateManualKinks" type="button" class="lm-primary" ${(s.manualKinkSelection||[]).length?'':'disabled'}>✨ Активировать на следующий ответ</button><button id="lmClearManualKinks" type="button" class="lm-secondary">Очистить выбор</button></div>${(s.manualKinkPendingIds||[]).length?`<div class="lm-random-result lm-manual-pending">На следующий ответ: <b>${esc(s.manualKinkPendingIds.map(id=>kink(id).name).join(' · '))}</b></div>`:''}</section>${libraryPage(s)}</div>`;
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
 document.querySelector('#lmCycleSaveSettings')?.addEventListener('click',saveCycleSettings);
 document.querySelector('#lmCycleTestNotice')?.addEventListener('click',showCycleTestNotice);
 document.querySelector('#lmCycleAddEvent')?.addEventListener('click',addCycleEvent);
 document.querySelectorAll('[data-cycle-confirm]').forEach(b=>b.addEventListener('click',()=>updateCycleEvent(b.dataset.cycleConfirm,'confirmed')));
 document.querySelectorAll('[data-cycle-reject]').forEach(b=>b.addEventListener('click',()=>updateCycleEvent(b.dataset.cycleReject,'rejected')));
 document.querySelectorAll('[data-cycle-delete]').forEach(b=>b.addEventListener('click',()=>deleteCycleEvent(b.dataset.cycleDelete)));
 document.querySelectorAll('.lm-tabs [data-tab]').forEach(b=>b.onclick=()=>{const u=ui();u.tab=b.dataset.tab;saveUI(u);render();});
 document.querySelectorAll('[data-rel]').forEach(x=>x.oninput=async e=>{const st=getState();st.relation[e.target.dataset.rel]=Number(e.target.value);await saveState(st);render();});
 document.querySelectorAll('[data-user-feeling]').forEach(x=>x.oninput=async e=>{const st=getState();st.userEmotionScores[e.target.dataset.userFeeling]=Number(e.target.value);st.userFeelings=userVisibleFeelings(st);await saveState(st);render();});
 [['#lmIntensity','reactionIntensity'],['#lmChance','reactionChance'],['#lmCooldown','reactionCooldown'],['#lmInitiative','initiative']].forEach(([q,k])=>document.querySelector(q)?.addEventListener('input',async e=>{const st=getState();st[k]=Number(e.target.value);await saveState(st);}));
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
 document.body.insertAdjacentHTML('beforeend',`<div id="lmOverlay" class="lm-overlay hidden"><section class="lm-panel"><header class="lm-head"><div><div class="lm-kicker">LOVEMED · MEDICAL RECORD v0.4.40</div><h2>Медицинская карта</h2><p>Наблюдение за динамикой отношений</p></div><button id="lmClose" class="lm-close">×</button></header><nav class="lm-tabs">${[['card','🩺 Карта пациента'],['user','👤 Моя карта'],['cycle','🌙 Цикл'],['react','🧪 Реактивность'],['contacts','👥 Контакты'],['history','📋 История'],['system','⚙ Служебное']].map(x=>`<button data-tab="${x[0]}">${x[1]}</button>`).join('')}</nav><main id="lmBody"></main></section></div>`);
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
 ensureFab();ensurePanel();ensureSettings();ensureWand();refreshPrompt();armPendingConceptionNotice();
 on(event_types.CHAT_CHANGED,()=>setTimeout(()=>{ensureFab();ensureSettings();ensureWand();render();refreshPrompt();armPendingConceptionNotice();},250));
 on(event_types.MESSAGE_RECEIVED,()=>setTimeout(parseLatest,250));
 on(event_types.GENERATION_STARTED,()=>refreshPrompt({includeReaction:true}));
 on(event_types.GENERATION_ENDED,()=>{parseLatest();clearManualKinksAfterReply();refreshPrompt();const overlay=document.querySelector('#lmOverlay');if(overlay&&!overlay.classList.contains('hidden'))render();});
 on(event_types.CHARACTER_EDITED,refreshPrompt);
 window.addEventListener('resize',placeFab);
 setInterval(()=>{ensureFab();ensureSettings();ensureWand();},2000);
}
init();
