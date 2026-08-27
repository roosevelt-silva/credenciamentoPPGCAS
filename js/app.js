(function(){
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const state = { raw: [], candidates: [], selected: new Set(), fileStatus: [], lineAssignments: new Map(), formationAssignments: new Map(), currentFormation: new Map() };

const ARTICLE_W = {A1:1,A2:.875,A3:.75,A4:.625,B1:.5,B2:.375,B3:.25,B4:.125};
const BOOK_W = {L1:2,L2:1.6,L3:1.2,L4:.8,L5:.4};
const CHAPTER_W = {C1:1,C2:.8,C3:.6,C4:.4,C5:.2};
const TECH_W = {T1:2,T2:1.5,T3:1,T4:.5,T5:.1};
const Q_ORDER = ['A1','A2','A3','A4','B1','B2','B3','B4'];

const CURRENT_PPGCAS_ROSTER = (()=>{
  const src=(typeof window!=='undefined' && window.PPGCAS_DOCENTES_ATUAIS && Array.isArray(window.PPGCAS_DOCENTES_ATUAIS.docentes)) ? window.PPGCAS_DOCENTES_ATUAIS.docentes : [];
  if(src.length) return src.map(d=>({
    name:String(d.nome||d.name||'').trim(),
    line:Number(d.linha||d.line)||0,
    category:String(d.categoria||d.category||'permanent'),
    lattes:String(d.lattes||'').trim()
  })).filter(d=>d.name);
  return [
    {name:'Adeliane Castro da Costa',line:2,category:'permanent'},
    {name:'David Michel de Oliveira',line:2,category:'permanent'},
    {name:'Dirceu Guilherme de Souza Ramos',line:2,category:'permanent'},
    {name:'Eduardo Vignoto Fernandes',line:2,category:'permanent'},
    {name:'Fernando Henrique Cristovan',line:1,category:'permanent'},
    {name:'Giselle Soares Passos',line:2,category:'permanent'},
    {name:'Hanstter Hallison Alves Rezende',line:2,category:'permanent'},
    {name:'Lívia Cristina de Resende Izidoro',line:2,category:'permanent'},
    {name:'Ludmila Grego Maia',line:2,category:'permanent'},
    {name:'Marcos Gonçalves de Santana',line:2,category:'permanent'},
    {name:'Paulo de Tarso Garcia',line:1,category:'permanent'},
    {name:'Rafael Menezes da Costa',line:1,category:'permanent'},
    {name:'Roosevelt Alves da Silva',line:1,category:'permanent'},
    {name:'Rosângela Maria Rodrigues',line:2,category:'permanent'}
  ];
})();
const LINE_LABELS={1:'Linha 1 · Mecanismos e processos biológicos',2:'Linha 2 · Promoção de Saúde/Diagnósticos e tratamento de doenças'};
const CNPQ_TAXONOMY=window.PPGCAS_CNPQ_AREAS||{grandesAreas:[]};
const GREAT_AREAS=CNPQ_TAXONOMY.grandesAreas.length?CNPQ_TAXONOMY.grandesAreas.map(g=>g.nome):['Ciências Exatas e da Terra','Ciências Biológicas','Engenharias','Ciências da Saúde','Ciências Agrárias','Ciências Sociais Aplicadas','Ciências Humanas','Lingüística, Letras e Artes','Outra'];
const FORMATION_CSV_PATH='data/formacao_docentes.csv';
let formationSource='arquivo CSV institucional';
let formationLoadedAt=0;
let formationReloading=false;

function cnpqGreatForArea(area){
  for(const g of CNPQ_TAXONOMY.grandesAreas||[]){ if((g.areas||[]).some(a=>a[1]===area)) return g.nome; }
  return '';
}
function inferGreatArea(area){
  const exact=cnpqGreatForArea(String(area||'').trim()); if(exact) return exact;
  const s=norm(area);
  if(!s || s==='NAO INFORMADO') return '';
  if(/MEDIC|ENFERMAG|ODONTO|FARMACIA|SAUDE|EDUCACAO FISICA|FISIOTER|FONOAUDIO|NUTRICAO|TERAPIA OCUP/.test(s)) return 'Ciências da Saúde';
  if(/BIOLOG|GENET|BIOQUIM|BIOFIS|MICROBIO|PARASIT|IMUNO|FISIOLOG|FARMACOLOG|BOTAN|ZOOLOG|MORFOLOG|ECOLOG/.test(s)) return 'Ciências Biológicas';
  if(/FISIC|QUIMIC|MATEMAT|COMPUT|GEOCIEN|ASTRON|ESTATIST|OCEANOGRAF/.test(s)) return 'Ciências Exatas e da Terra';
  if(/ENGENH/.test(s)) return 'Engenharias';
  if(/AGRONOM|VETERIN|ZOOTEC|ALIMENT|FLOREST|AGRICOL|PESCA|RECURSOS PESQUEIROS/.test(s)) return 'Ciências Agrárias';
  if(/DIREITO|ADMINISTR|ECONOM|CONTAB|ARQUITET|URBAN|COMUNIC|SERVICO SOCIAL|TURISMO|PLANEJAMENTO URB/.test(s)) return 'Ciências Sociais Aplicadas';
  if(/EDUCAC|PSICOLOG|SOCIOLOG|ANTROPOLOG|FILOSOF|HISTOR|GEOGRAF|CIENCIA POLIT/.test(s)) return 'Ciências Humanas';
  if(/LINGUIST|LETRAS|ARTES|MUSICA/.test(s)) return GREAT_AREAS.find(g=>norm(g).includes('LINGUIST'))||'Lingüística, Letras e Artes';
  if(/BIOETICA|CIENCIAS AMBIENTAIS|DEFESA|ROBOTICA|MECATRONICA|MICROELETRONICA|DIVULGACAO CIENTIFICA/.test(s)) return 'Outra';
  return '';
}
function greatAreaOptions(selected=''){
  let html=`<option value="">Não classificada</option>`+GREAT_AREAS.map(g=>`<option value="${esc(g)}" ${g===selected?'selected':''}>${esc(g)}</option>`).join('');
  if(selected && !GREAT_AREAS.includes(selected)) html+=`<option value="${esc(selected)}" selected>${esc(selected)} · valor atual</option>`;
  return html;
}
function cnpqAreaOptions(selected='',great=''){
  let entries=[];
  const g=(CNPQ_TAXONOMY.grandesAreas||[]).find(x=>x.nome===great);
  entries=g?(g.areas||[]):CNPQ_TAXONOMY.grandesAreas.flatMap(x=>x.areas||[]);
  let html='<option value="">Não classificada</option>'+entries.map(([code,name])=>`<option value="${esc(name)}" ${name===selected?'selected':''}>${esc(code)} · ${esc(name)}</option>`).join('');
  if(selected && !CNPQ_TAXONOMY.grandesAreas.some(x=>(x.areas||[]).some(a=>a[1]===selected))) html+=`<option value="${esc(selected)}" selected>${esc(selected)} · valor atual</option>`;
  return html;
}
function samePerson(a,b){ return norm(a)===norm(b); }
function isCurrentPermanentName(name){ return CURRENT_PPGCAS_ROSTER.some(r=>r.category==='permanent' && samePerson(r.name,name)); }
function isInRosterBase(name,base){ return CURRENT_PPGCAS_ROSTER.some(r=>samePerson(r.name,name) && (base==='all' || r.category==='permanent')); }

function parseDelimited(text,delimiter=';'){
  const src=String(text||'').replace(/^\uFEFF/,'');
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(quoted){
      if(ch==='"' && src[i+1]==='"'){field+='"';i++;}
      else if(ch==='"') quoted=false;
      else field+=ch;
    }else{
      if(ch==='"') quoted=true;
      else if(ch===delimiter){row.push(field);field='';}
      else if(ch==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
      else field+=ch;
    }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>norm(h).replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,''));
  return rows.filter(r=>r.some(v=>String(v).trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));
}
function csvGet(row,...names){
  for(const n of names){const k=norm(n).replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,''); if(row[k]!==undefined) return row[k];}
  return '';
}
function applyFormationCsvText(csvText, sourceLabel){
  state.currentFormation.clear();
  CURRENT_PPGCAS_ROSTER.filter(r=>r.category==='permanent').forEach(r=>state.currentFormation.set(norm(r.name),{area:'',great:''}));
  const rows=parseDelimited(csvText,';');
  const byName=new Map(rows.map(r=>[norm(csvGet(r,'nome','docente')),r]).filter(([k])=>k));
  CURRENT_PPGCAS_ROSTER.filter(r=>r.category==='permanent').forEach(r=>{
    const d=byName.get(norm(r.name))||{};
    const area=csvGet(d,'area_disciplinar','area disciplinar','area');
    const great=csvGet(d,'grande_area','grande area')||inferGreatArea(area);
    state.currentFormation.set(norm(r.name),{area:String(area||'').trim(),great:String(great||'').trim()});
  });
  const first=rows.find(r=>csvGet(r,'limite_area_disciplinar','limite area disciplinar')||csvGet(r,'limite_grande_area','limite grande area'))||{};
  const dl=Number(String(csvGet(first,'limite_area_disciplinar','limite area disciplinar')).replace(',','.'));
  const gl=Number(String(csvGet(first,'limite_grande_area','limite grande area')).replace(',','.'));
  if($('#disciplinaryLimit') && Number.isFinite(dl) && dl>0) $('#disciplinaryLimit').value=String(dl);
  if($('#greatAreaLimit') && Number.isFinite(gl) && gl>0) $('#greatAreaLimit').value=String(gl);
  formationSource=sourceLabel;
  formationLoadedAt=Date.now();
}
async function loadFormationCsv({rerender=true}={}){
  if(formationReloading) return;
  formationReloading=true;
  try{
    if(location.protocol==='file:'){
      if(window.PPGCAS_FORMACAO_CSV){
        applyFormationCsvText(window.PPGCAS_FORMACAO_CSV,'base incorporada · atualização local');
      }else{
        throw new Error('base incorporada não encontrada');
      }
    }else{
      const url=FORMATION_CSV_PATH+'?v='+Date.now();
      const res=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      applyFormationCsvText(await res.text(),FORMATION_CSV_PATH);
    }
  }catch(e){
    if(window.PPGCAS_FORMACAO_CSV){
      try{applyFormationCsvText(window.PPGCAS_FORMACAO_CSV,'base incorporada · fallback');}
      catch(_){formationSource=`base de formação não carregada (${e.message||e})`;}
    }else formationSource=`base de formação não carregada (${e.message||e})`;
  }finally{
    formationReloading=false;
  }
  updateFormationStorageStatus();
  if(rerender && state.candidates.length) renderFormationSimulator();
}
function updateFormationStorageStatus(){
  const el=$('#formationStorageStatus'); if(!el) return;
  const rows=currentFormationRows();
  const area=rows.filter(r=>r.area).length, great=rows.filter(r=>r.great).length;
  const loaded=formationLoadedAt?new Date(formationLoadedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  el.innerHTML=`<b>Base de formação:</b> ${esc(formationSource)} · Área disciplinar ${area}/${rows.length} · Grande Área ${great}/${rows.length} · última leitura ${loaded}.`;
}

function researchLine(v){
  const s=norm(v);
  if(!s) return 0;
  if(s.includes('MECANISM') || s.match(/(?:^|\s)LINHA\s*1(?:\s|$)/)) return 1;
  if(s.includes('PROMO') || s.includes('DIAGNOST') || s.includes('TRATAMENTO') || s.match(/(?:^|\s)LINHA\s*2(?:\s|$)/)) return 2;
  return 0;
}
function prettyField(s){
  const raw=String(s??'').trim();
  if(!raw) return 'Não informado';
  if(raw===raw.toUpperCase()) return prettyName(raw);
  return raw.replace(/\s+/g,' ').trim();
}
function hhi2(n1,n2){ const total=n1+n2; if(!total) return 0; const p1=n1/total,p2=n2/total; return p1*p1+p2*p2; }

function norm(s){ return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim(); }
function key(s){ return norm(s).replace(/[^A-Z0-9]+/g,'_'); }
function num(v){
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  if(v===null||v===undefined||v==='') return 0;
  let s=String(v).trim();
  if(!s) return 0;
  s=s.replace(/R\$|\s/g,'');
  if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s=s.replace(',','.');
  const n=Number(s); return Number.isFinite(n)?n:0;
}
function intYear(v){ const n=Math.round(num(v)); return n>=1900&&n<=2100?n:0; }
function fmt(v,d=2){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function money(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}); }
function compactMoney(v){
  const n=Number(v||0);
  if(n>=1000000) return 'R$ '+fmt(n/1000000,n>=10000000?1:2)+' mi';
  if(n>=1000) return 'R$ '+fmt(n/1000,n>=100000?0:1)+' mil';
  return 'R$ '+fmt(n,0);
}
function pct(v){ return fmt(v,1)+'%'; }
function uniquePersonCount(items){
  const vals=(items||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean).map(norm);
  return new Set(vals).size;
}
function median(arr){ const a=arr.filter(Number.isFinite).slice().sort((x,y)=>x-y); if(!a.length)return 0; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function esc(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function prettyName(s){
  const raw=String(s??'').trim().replace(/[_-]+/g,' ');
  if(!raw) return '';
  const lowerWords=new Set(['da','de','do','das','dos','e']);
  return raw.split(/\s+/).filter(Boolean).map((part,i)=>{
    if(/^[IVXLCDM]+$/i.test(part) && part.length<=5) return part.toUpperCase();
    if(part.length<=3 && /^[A-Z]{2,3}$/.test(part)) return part.toUpperCase();
    const simple=part.toLowerCase();
    if(i>0 && lowerWords.has(simple)) return simple;
    return simple.split(/(')/).map(seg => seg === "'" ? seg : (seg ? seg.charAt(0).toUpperCase()+seg.slice(1) : seg)).join('');
  }).join(' ');
}
function cleanPerson(s){ const x=String(s??'').trim(); if(!x||/^#/.test(x)||norm(x)==='FULANO DA SILVA') return ''; return prettyName(x); }
function validText(s){ const x=String(s??'').trim(); return x && !/^#/.test(x); }
function qValue(q){ return ARTICLE_W[q]??BOOK_W[q]??CHAPTER_W[q]??TECH_W[q]??0; }
function parseQualis(v){
  const s=norm(v).replace(/[-–—]/g,' ');
  const m=s.match(/(?:^|\s)(A[1-4]|B[1-4]|L[1-5]|C[1-5]|T[1-5])(?:\s|$)/);
  if(m) return m[1];
  const compact=s.replace(/\s/g,'');
  const m2=compact.match(/(A[1-4]|B[1-4]|L[1-5]|C[1-5]|T[1-5])/);
  return m2?m2[1]:'';
}
function isExplicitNoQualis(v){
  const s=norm(v).replace(/[^A-Z0-9/]+/g,' ').trim();
  if(!s) return true;
  return /^(SEM QUALIS|SEM ESTRATO|NAO POSSUI QUALIS|NAO TEM QUALIS|S Q|N A|NA)$/.test(s);
}
function category(type,q){
  if(q && /^[AB]/.test(q)) return 'article';
  if(q && /^L/.test(q)) return 'book';
  if(q && /^C/.test(q)) return 'chapter';
  if(q && /^T/.test(q)) return 'tech';
  const t=norm(type);
  if(t.includes('CAPIT')) return 'chapter';
  if(t.includes('LIVRO')) return 'book';
  if(t.includes('ARTIGO')) return 'article';
  if(t.includes('TECN')||t.includes('PRODUTO TEC')) return 'tech';
  return 'other';
}
function sheetBy(wb, tokens){
  const wanted=tokens.map(key);
  for(const [name,s] of wb.sheets){ const k=key(name); if(wanted.every(t=>k.includes(t))) return s; }
  return null;
}
function val(sh,ref){ return sh?sh.get(ref):null; }
function text(sh,ref){ const v=val(sh,ref); return v===null||v===undefined?'':String(v).trim(); }

function extractName(info, fileName){
  const direct=text(info,'B4');
  if(validText(direct) && norm(direct)!=='FULANO DA SILVA') return prettyName(direct);
  if(info){
    for(let r=3;r<=10;r++){
      const x=text(info,'B'+r); const nx=norm(x);
      if(validText(x) && x.length>5 && !nx.includes('EMAIL') && !nx.includes('NOME COMPLETO') && nx!=='FULANO DA SILVA') return prettyName(x);
    }
  }
  return prettyName(fileName.replace(/\.(xlsx|xlsm)$/i,'').replace(/[_-]+/g,' '));
}

function parseProducts(sh){
  const out=[];
  if(!sh) return out;
  const max=Math.max(sh.maxRow||705,705);
  let pnum=1;
  for(let r=6;r<=Math.min(max,900);r+=7,pnum++){
    const type=text(sh,'B'+r), year=intYear(val(sh,'C'+r)), qRaw=text(sh,'D'+r), vehicle=text(sh,'H'+r), title=text(sh,'I'+r), line=text(sh,'N'+r);
    const ppg=[],grad=[]; let ppgPrincipal=false,gradPrincipal=false;
    for(let rr=r;rr<r+7;rr++){
      const a=cleanPerson(text(sh,'J'+rr)); if(a) ppg.push(a);
      const g=cleanPerson(text(sh,'L'+rr)); if(g) grad.push(g);
      if(norm(text(sh,'K'+rr)).match(/SIM|YES|X/)) ppgPrincipal=true;
      if(norm(text(sh,'M'+rr)).match(/SIM|YES|X/)) gradPrincipal=true;
    }
    const meaningful=[type,year,qRaw,vehicle,title,line,ppg.length,grad.length].some(Boolean);
    if(!meaningful) continue;
    const q=parseQualis(qRaw);
    out.push({num:pnum,type,year,qualis:q,qualisRaw:qRaw,category:category(type,q),vehicle,title,line,ppg,grad,ppgPrincipal,gradPrincipal});
  }
  return out;
}

function parseTitulados(sh){
  const rows=[]; if(!sh) return rows;
  for(let r=3;r<=Math.max(sh.maxRow||2,120);r++){
    const name=cleanPerson(text(sh,'A'+r)), course=text(sh,'B'+r);
    if(name) rows.push({name,course});
  }
  return rows;
}
function parseDiscentes(sh){
  const rows=[]; if(!sh) return rows;
  for(let r=3;r<=Math.max(sh.maxRow||2,250);r++){ const name=cleanPerson(text(sh,'A'+r)); if(name) rows.push(name); }
  return rows;
}
function parseProjects(sh){
  const rows=[]; if(!sh) return rows;
  for(let r=3;r<=Math.max(sh.maxRow||2,100);r++){
    const name=text(sh,'A'+r), desc=text(sh,'B'+r), start=val(sh,'C'+r), end=val(sh,'D'+r), line=text(sh,'E'+r), funder=text(sh,'F'+r), value=num(val(sh,'G'+r));
    if([name,desc,line,funder,value].some(Boolean)) rows.push({name,desc,start,end,line,funder,value});
  }
  return rows;
}
function parseInfrastructure(sh){
  if(!sh) return {labs:[],approved:[],equipment:[],approvedValue:0,equipmentValue:0};
  const labs=[]; for(let r=4;r<=25;r++){ const x=text(sh,'B'+r); if(validText(x)) labs.push(x); }
  const approved=[]; for(let r=5;r<=25;r++){
    const call=text(sh,'F'+r),date=val(sh,'G'+r),item=text(sh,'H'+r),value=num(val(sh,'L'+r));
    if([call,item,value].some(Boolean)) approved.push({call,date,item,value});
  }
  const equipment=[]; for(let r=30;r<=Math.max(sh.maxRow||30,120);r++){
    const year=val(sh,'A'+r),source=text(sh,'B'+r),call=text(sh,'C'+r),item=text(sh,'D'+r),value=num(val(sh,'H'+r));
    if([source,call,item,value].some(Boolean)) equipment.push({year,source,call,item,value});
  }
  return {labs,approved,equipment,approvedValue:approved.reduce((s,x)=>s+x.value,0),equipmentValue:equipment.reduce((s,x)=>s+x.value,0)};
}
function parseTeaching(info){
  const rows=[]; if(!info) return rows;
  for(let r=27;r<=Math.max(info.maxRow||54,80);r++){
    const discipline=text(info,'G'+r),period=text(info,'H'+r),course=text(info,'I'+r),hours=num(val(info,'J'+r)),students=num(val(info,'K'+r));
    if([discipline,period,course,hours,students].some(Boolean)) rows.push({discipline,period,course,hours,students});
  }
  return rows;
}

async function parseCandidateFile(file){
  const ab=await file.arrayBuffer();
  const wb=await PPGCAS_XLSX.readWorkbook(ab);
  const info=sheetBy(wb,['INFO','DOCENTE']);
  const prod=sheetBy(wb,['PRODUTOS']);
  const tit=sheetBy(wb,['TITULADOS']);
  const disc=sheetBy(wb,['DISCENTES','POS']);
  const proj=sheetBy(wb,['PROJETOS']);
  const infra=sheetBy(wb,['INFRAESTRUTURA']);
  if(!info && !prod) throw new Error('Não reconheci o modelo PPGCAS: abas 1_Info_Docente e 5_Produtos não foram encontradas.');
  const name=extractName(info,file.name);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    fileName:file.name,name,
    doctorateYear:intYear(val(info,'D4')), doctorateArea:prettyField(text(info,'F10')),
    institution:text(info,'E4'), city:text(info,'F4'), email:text(info,'B10'), cnpq:text(info,'J4'),
    products:parseProducts(prod), titulados:parseTitulados(tit), discentesPPG:parseDiscentes(disc),
    projects:parseProjects(proj), infrastructure:parseInfrastructure(infra), teaching:parseTeaching(info),
    sheets:wb.sheetNames
  };
}

function currentConfig(){
  const date=new Date($('#refDate').value+'T12:00:00');
  return {date,year:date.getFullYear(),startYear:date.getFullYear()-3,months:36+date.getMonth(),minIndProd:num($('#minIndProd').value),minIQTF:num($('#minIQTF').value)};
}

function apply20Cap(high,low){ const maxLow=high>0?high*.25:0; return {value:high+Math.min(low,maxLow),glosa:Math.max(0,low-maxLow)}; }

function computeIndProdSubset(products,cfg,includeFn){
  const period=(products||[]).filter(p=>['article','book','chapter','tech'].includes(p.category) && p.year>=cfg.startYear && p.year<=cfg.year && includeFn(p));
  const valid=period.filter(p=>p.qualis && qValue(p.qualis)>0);
  const qualisCounts=Object.fromEntries(Q_ORDER.map(q=>[q,0]));
  const articlesSemQualis=period.filter(p=>p.category==='article' && (!p.qualis || qValue(p.qualis)<=0));
  let artPoints=0,bookPoints=0,chapPoints=0,techPoints=0;
  for(let y=cfg.startYear;y<=cfg.year;y++){
    const year=valid.filter(p=>p.year===y);
    let highA=0,lowA=0,highT=0,lowT=0;
    for(const p of year){
      const w=qValue(p.qualis);
      if(p.category==='article'){
        if(qualisCounts[p.qualis]!==undefined) qualisCounts[p.qualis]++;
        if(['B3','B4'].includes(p.qualis)) lowA+=w; else highA+=w;
      } else if(p.category==='book') bookPoints+=w;
      else if(p.category==='chapter') chapPoints+=w;
      else if(p.category==='tech'){
        if(p.qualis==='T5') lowT+=w; else highT+=w;
      }
    }
    artPoints+=apply20Cap(highA,lowA).value;
    techPoints+=apply20Cap(highT,lowT).value;
  }
  const yearsEq=cfg.months/12;
  const indArt=artPoints/yearsEq, indLiv=bookPoints/yearsEq, indCap=chapPoints/yearsEq, indTec=techPoints/yearsEq;
  return {period,valid,qualisCounts,articlesSemQualis,indArt,indLiv,indCap,indTec,indProd:indArt+indLiv+indCap+indTec};
}

function computeIndicators(raw,cfg){
  const warnings=[];
  const pontuavel = p => ['article','book','chapter','tech'].includes(p.category);

  // Pendências ficam separadas da Situação regulamentar.
  // Regra especial para ARTIGOS sem Qualis:
  // - se o artigo possui ano, ele continua constando como produção do docente;
  // - recebe a marcação "SEM QUALIS" e pontuação zero;
  // - não gera pendência apenas por não possuir Qualis.
  // Produtos sem ANO e sem QUALIS/ESTRATO simultaneamente continuam descartados,
  // pois não há informação mínima para situá-los no período avaliado.
  const pendingItems=[];
  for(const p of raw.products){
    if(!pontuavel(p)) continue;
    const hasYear=!!p.year;
    const hasQualisRaw=validText(p.qualisRaw);
    const hasQualis=!!p.qualis && qValue(p.qualis)>0;

    if(!hasYear && !hasQualisRaw && !hasQualis) continue; // descarta: sem ano E sem Qualis

    if(!hasYear){
      pendingItems.push({product:p,reason:hasQualis?'Ano ausente':'Ano ausente'});
      continue;
    }

    // Produtos com ano fora do período não interferem no credenciamento atual.
    if(p.year<cfg.startYear || p.year>cfg.year) continue;

    if(!hasQualis){
      if(p.category==='article' && isExplicitNoQualis(p.qualisRaw)){
        // Artigo declarado sem Qualis: permanece no histórico, pontua zero e não gera pendência.
        continue;
      }
      if(p.category==='article' && !hasQualisRaw){
        continue;
      }
      pendingItems.push({product:p,reason:hasQualisRaw?'Qualis/estrato informado não reconhecido':'Qualis/estrato ausente'});
    }
  }

  const essentialPendingCount=pendingItems.length;
  const period=raw.products.filter(p=>pontuavel(p) && p.year>=cfg.startYear && p.year<=cfg.year);
  const valid=period.filter(p=>p.qualis && qValue(p.qualis)>0);
  const articlesDeclared=period.filter(p=>p.category==='article');
  const articlesSemQualis=articlesDeclared.filter(p=>!p.qualis || qValue(p.qualis)<=0);

  let artPoints=0,artGlosa=0,bookPoints=0,chapPoints=0,techPoints=0,techGlosa=0,iqtfPoints=0;
  const qualisCounts=Object.fromEntries(Q_ORDER.map(q=>[q,0]));
  const articles=[];
  const chapterSeen=new Map();
  let chapterReviewCount=0;

  for(let y=cfg.startYear;y<=cfg.year;y++){
    const year=valid.filter(p=>p.year===y);
    let highA=0,lowA=0,highT=0,lowT=0;
    for(const p of year){
      const w=qValue(p.qualis);
      if(p.category==='article'){
        articles.push(p); if(qualisCounts[p.qualis]!==undefined) qualisCounts[p.qualis]++;
        if(['B3','B4'].includes(p.qualis)) lowA+=w; else highA+=w;
        if(p.ppg.length) iqtfPoints+=w;
      } else if(p.category==='book') bookPoints+=w;
      else if(p.category==='chapter'){
        const vehicleKey=norm(p.vehicle);
        if(vehicleKey){
          const k=y+'|'+vehicleKey, count=chapterSeen.get(k)||0;
          chapterSeen.set(k,count+1);
          if(count>=2) chapterReviewCount++;
        }
        // Não há identificador inequívoco da obra na planilha; portanto,
        // o limite de dois capítulos por obra é apenas sinalizado para conferência.
        chapPoints+=w;
      } else if(p.category==='tech'){
        if(p.qualis==='T5') lowT+=w; else highT+=w;
      }
    }
    const ac=apply20Cap(highA,lowA); artPoints+=ac.value; artGlosa+=ac.glosa;
    const tc=apply20Cap(highT,lowT); techPoints+=tc.value; techGlosa+=tc.glosa;
  }
  if(artGlosa>1e-9) warnings.push(`Glosa B3+B4 aplicada: ${fmt(artGlosa)} ponto(s) bruto(s) excederam o limite anual de 20%.`);
  if(techGlosa>1e-9) warnings.push(`Glosa T5 aplicada: ${fmt(techGlosa)} ponto(s) bruto(s) excederam o limite anual de 20%.`);
  if(chapterReviewCount) warnings.push(`${chapterReviewCount} capítulo(s) merecem conferência quanto ao limite de dois por obra. O portal não aplicou glosa automática porque a planilha não possui identificador inequívoco da obra.`);

  const yearsEq=cfg.months/12;
  const indArt=artPoints/yearsEq, indLiv=bookPoints/yearsEq, indCap=chapPoints/yearsEq, indTec=techPoints/yearsEq;
  const indProd=indArt+indLiv+indCap+indTec;
  const iqtf=iqtfPoints/yearsEq;
  const topArticles=articles.filter(p=>['A1','A2','A3','A4'].includes(p.qualis));
  const topCount=topArticles.length;
  const topArtPoints=topArticles.reduce((s,p)=>s+(ARTICLE_W[p.qualis]||0),0);
  const topIndArt=topArtPoints/yearsEq;
  const topIndArtPctIndProd=indProd>0?(topIndArt/indProd*100):0;
  const avgArticleWeight=articles.length?articles.reduce((s,p)=>s+(ARTICLE_W[p.qualis]||0),0)/articles.length:0;
  const topPct=articles.length?topCount/articles.length*100:0;
  // Qualidade Qualis usada no escore: percentual do IndProd proveniente de artigos A1–A4.
  const qualisQuality=topIndArtPctIndProd;
  const prodAderente=period.filter(p=>validText(p.line)).length;
  const projectAdherent=raw.projects.filter(p=>validText(p.line)).length;
  const projectFunding=raw.projects.reduce((s,p)=>s+p.value,0);
  const titMD=raw.titulados.filter(t=>{const c=norm(t.course); return c.includes('MESTR')||c.includes('DOUTOR');}).length;
  const iqtfApplicable=titMD>=6;

  if(valid.length===0) warnings.push('Nenhum produto com estrato pontuável foi identificado no período selecionado. Produtos SEM QUALIS podem continuar constando com peso zero.');
  const withoutLine=valid.filter(p=>!validText(p.line)).length;
  if(withoutLine) warnings.push(`${withoutLine} produto(s) pontuável(is) estão sem linha de pesquisa/aderência informada.`);
  if(raw.projects.length===0) warnings.push('Nenhum projeto foi identificado na aba 6_Projetos.');

  const studentProd=computeIndProdSubset(raw.products,cfg,p=>Array.isArray(p.ppg) && p.ppg.length>0);
  const line1Prod=computeIndProdSubset(raw.products,cfg,p=>researchLine(p.line)===1);
  const line2Prod=computeIndProdSubset(raw.products,cfg,p=>researchLine(p.line)===2);
  const line1Count=line1Prod.period.length, line2Count=line2Prod.period.length;
  const dominantLine = line1Prod.indProd>line2Prod.indProd ? 1 : line2Prod.indProd>line1Prod.indProd ? 2 : line1Count>line2Count ? 1 : line2Count>line1Count ? 2 : 0;

  return {period,valid,articles,articlesDeclared,articlesSemQualis,qualisCounts,artPoints,bookPoints,chapPoints,techPoints,artGlosa,techGlosa,chapterReviewCount,
    indArt,indLiv,indCap,indTec,indProd,iqtf,topCount,topIndArt,topIndArtPctIndProd,topPct,avgArticleWeight,qualisQuality,prodAderente,projectAdherent,
    projectFunding,titMD,iqtfApplicable,essentialPendingCount,pendingItems,warnings,yearsEq,
    studentIndProd:studentProd.indProd,studentIndArt:studentProd.indArt,studentIndLiv:studentProd.indLiv,studentIndCap:studentProd.indCap,studentIndTec:studentProd.indTec,
    studentQualisCounts:studentProd.qualisCounts,studentArticlesSemQualis:studentProd.articlesSemQualis,studentProducts:studentProd.period,
    line1IndProd:line1Prod.indProd,line2IndProd:line2Prod.indProd,line1IndArt:line1Prod.indArt,line2IndArt:line2Prod.indArt,line1QualisCounts:line1Prod.qualisCounts,line2QualisCounts:line2Prod.qualisCounts,
    line1ArticlesSemQualis:line1Prod.articlesSemQualis,line2ArticlesSemQualis:line2Prod.articlesSemQualis,line1ProductCount:line1Count,line2ProductCount:line2Count,dominantLine};
}

function statusFor(raw,m,cfg){
  const criteria=[];
  criteria.push({name:'Título de doutorado',state:raw.doctorateYear?'ok':'no',detail:raw.doctorateYear?String(raw.doctorateYear):'não identificado'});
  const adher=(m.prodAderente>0 && m.projectAdherent>0);
  criteria.push({name:'Produção e projeto com aderência ao PPGCAS',state:adher?'ok':'warn',detail:adher?`${m.prodAderente} produtos · ${m.projectAdherent} projetos`:'conferir linhas informadas'});
  const orient=raw.titulados.length>0;
  criteria.push({name:'Titulados informados',state:orient?'ok':'neutral',detail:orient?`${raw.titulados.length} titulado(s) informado(s)`:'nenhum titulado informado — sem gerar pendência'});
  const indOk=m.indProd>=cfg.minIndProd;
  criteria.push({name:`IndProd ≥ ${fmt(cfg.minIndProd)}`,state:indOk?'ok':'no',detail:fmt(m.indProd)});
  if(m.iqtfApplicable){
    const ok=m.iqtf>=cfg.minIQTF; criteria.push({name:`IQTF ≥ ${fmt(cfg.minIQTF)} (≥6 M/D)`,state:ok?'ok':'no',detail:fmt(m.iqtf)});
  } else criteria.push({name:'IQTF',state:'neutral',detail:`não obrigatório (${m.titMD} M/D informados)`});
  const hardFail=criteria.some(c=>c.state==='no');
  // A Situação regulamentar não incorpora pendências de preenchimento.
  // Pendências são exibidas em coluna própria e não mudam Atende/Não atende.
  return {criteria,code:hardFail?'no':'ok',label:hardFail?'Não atende':'Atende'};
}

function evaluateAll(){
  const cfg=currentConfig();
  const evaluated=state.raw.map(raw=>{
    const m=computeIndicators(raw,cfg); const reg=statusFor(raw,m,cfg);
    return {...raw,...m,reg};
  });

  const fundingLogs=evaluated.map(c=>Math.log1p(Math.max(0,c.projectFunding)));
  const projCounts=evaluated.map(c=>c.projects.length);
  const iqtfValues=evaluated.map(c=>Math.max(0,c.iqtf||0));
  const orientValues=evaluated.map(c=>Math.max(0,c.titulados.length));
  // Normalização comparativa X/Xmax em escala 0–100 para os componentes quantitativos.
  // IndProdScore é mantido no modelo de referência regulamentar já usado pelo portal.
  const relativeToMax=(v,arr)=>{
    const max=Math.max(0,...arr.map(x=>Number.isFinite(x)?x:0));
    if(max<=0) return 0;
    return Math.max(0,Math.min(100,(v/max)*100));
  };
  const w={ind:num($('#wInd')?.value??10),qualis:num($('#wQualis')?.value??75),iqtf:num($('#wIQTF')?.value??2),orient:num($('#wOrient')?.value??10),proj:num($('#wProj')?.value??3)};
  const totalW=Object.values(w).reduce((a,b)=>a+b,0)||1;
  for(const c of evaluated){
    // Mantido: mínimo regulamentar = 50 pontos; 2× o mínimo = 100 pontos; teto em 100.
    const indScore=Math.min(100,c.indProd/Math.max(cfg.minIndProd*2,.01)*100);
    // Já é naturalmente 0–100: % do IndProd proveniente de artigos A1–A4.
    const qScore=Math.max(0,Math.min(100,c.qualisQuality));
    // Demais componentes: comparação relativa ao maior valor observado no grupo carregado.
    const iqScore=relativeToMax(Math.max(0,c.iqtf||0),iqtfValues);
    const orientScore=relativeToMax(Math.max(0,c.titulados.length),orientValues);
    const projCountScore=relativeToMax(Math.max(0,c.projects.length),projCounts);
    const fundingScore=relativeToMax(Math.log1p(Math.max(0,c.projectFunding)),fundingLogs);
    const projScore=(projCountScore*.35)+(fundingScore*.65);
    c.components={indScore,qScore,iqScore,orientScore,projScore,projCountScore,fundingScore};
    c.score=(w.ind*indScore+w.qualis*qScore+w.iqtf*iqScore+w.orient*orientScore+w.proj*projScore)/totalW;
    c.qualification=qualification(c);
  }
  for(const c of evaluated){
    const hasL1=c.line1ProductCount>0, hasL2=c.line2ProductCount>0;
    if(hasL1 && !hasL2) state.lineAssignments.set(c.id,1);
    else if(hasL2 && !hasL1) state.lineAssignments.set(c.id,2);
    else if(!hasL1 && !hasL2) state.lineAssignments.set(c.id,0);
    else {
      const current=state.lineAssignments.get(c.id);
      if(current!==1 && current!==2) state.lineAssignments.set(c.id,c.dominantLine||1);
    }
    if(!state.formationAssignments.has(c.id)){
      const area=(c.doctorateArea && c.doctorateArea!=='Não informado')?c.doctorateArea:'';
      state.formationAssignments.set(c.id,{area, great:inferGreatArea(area)});
    }
  }
  // Quando há planilha de um docente permanente atual, usa a área do doutorado como sugestão da base vigente.
  CURRENT_PPGCAS_ROSTER.filter(r=>r.category==='permanent').forEach(r=>{
    const k=norm(r.name), existing=state.currentFormation.get(k);
    const loaded=evaluated.find(c=>samePerson(c.name,r.name));
    const suggested=loaded && loaded.doctorateArea!=='Não informado' ? loaded.doctorateArea : '';
    if(!existing) state.currentFormation.set(k,{area:suggested,great:inferGreatArea(suggested)});
    else if(!existing.area && suggested) state.currentFormation.set(k,{area:suggested,great:existing.great||inferGreatArea(suggested)});
  });
  state.candidates=evaluated;
  renderAll();
}

function qualification(c){
  if(c.reg.code==='no') return 'Não habilitado pelos dados';
  if(c.score>=80) return 'Destaque no grupo';
  if(c.score>=65) return 'Muito competitivo';
  if(c.score>=50) return 'Competitivo';
  return 'Habilitado · menor escore comparativo';
}

function badge(code,label){ return `<span class="badge ${code}">${code==='ok'?'✓':code==='no'?'×':code==='warn'?'!':'·'} ${esc(label)}</span>`; }
function qualBadge(q){ return q?`<span class="badge ${['A1','A2','A3','A4'].includes(q)?'ok':'neutral'}">${esc(q)}</span>`:'<span class="badge neutral">SEM QUALIS</span>'; }
function productQualBadge(p){
  if(p.qualis) return qualBadge(p.qualis);
  if(p.category==='article') return '<span class="badge neutral">SEM QUALIS</span>';
  return '<span class="tiny">—</span>';
}

function sortedCandidates(){
  const prop=$('#sortBy').value; const arr=state.candidates.slice();
  return arr.sort((a,b)=>{
    if(prop==='funding') return b.projectFunding-a.projectFunding;
    return (b[prop]||0)-(a[prop]||0);
  });
}

function renderAll(){
  const has=state.candidates.length>0; $('#results').classList.toggle('hidden',!has); if(!has)return;
  const c=state.candidates;
  $('#kCandidates').textContent=c.length;
  $('#kEligible').textContent=c.filter(x=>x.reg.code==='ok').length;
  $('#kMedian').textContent=fmt(median(c.map(x=>x.indProd)));
  $('#kIQTF').textContent=fmt(median(c.map(x=>x.iqtf)));
  $('#kFunding').textContent=money(c.reduce((s,x)=>s+x.projectFunding,0));
  renderRanking(); renderCharts(); renderComparison(); renderLineSimulator(); renderFormationSimulator(); renderDetails();
}

function renderRanking(){
  const arr=sortedCandidates(); const tb=$('#rankingTable tbody');
  tb.innerHTML=arr.map((c,i)=>{
    const checked=state.selected.has(c.id)?'checked':'';
    return `<tr>
      <td><input class="cmp" type="checkbox" data-id="${esc(c.id)}" ${checked}></td><td class="rank">${i+1}</td>
      <td><div class="candidate">${esc(c.name)}</div><div class="tiny">${esc(c.fileName)}</div></td>
      <td>${badge(c.reg.code,c.reg.label)}</td>
      <td>${c.essentialPendingCount?`<span class="badge warn">! ${c.essentialPendingCount} pendência${c.essentialPendingCount===1?'':'s'}</span>`:'<span class="badge ok">✓ Nenhuma</span>'}</td>
      <td><div class="score">${fmt(c.score,1)}</div><div class="bar"><i style="width:${Math.max(0,Math.min(100,c.score))}%"></i></div></td>
      <td>${esc(c.qualification)}</td><td class="num"><b>${fmt(c.indProd)}</b></td><td class="num">${fmt(c.indArt)}</td>
      <td class="num"><b>${pct(c.topIndArtPctIndProd)}</b></td><td class="num">${fmt(c.avgArticleWeight,3)}</td><td class="num">${fmt(c.iqtf)}</td>
      <td class="num">${c.titulados.length}</td><td class="num">${c.projects.length}</td><td class="num">${money(c.projectFunding)}</td>
    </tr>`;
  }).join('');
  $$('.cmp').forEach(ch=>ch.addEventListener('change',e=>{
    const id=e.target.dataset.id;
    if(e.target.checked){ state.selected.add(id); }
    else state.selected.delete(id);
    renderComparison(); renderLineSimulator(); renderFormationSimulator();
  }));
}

function setupCanvas(canvas,displayHeight=280){ const dpr=window.devicePixelRatio||1; const rect=canvas.getBoundingClientRect(); const w=Math.max(320,rect.width),h=Math.max(220,displayHeight); canvas.style.height=h+'px'; canvas.width=w*dpr;canvas.height=h*dpr; const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h); return {ctx,w,h}; }
function renderCharts(){
  drawIndProd(); drawQualis(); drawQualisHeatmap(); drawStudentQualisHeatmap(); drawLineQualisHeatmap(); drawDoctorateAreaChart(); drawOrientacaoHeatmap(); drawProjetosHeatmap();
}
function drawIndProd(){
  const canvas=$('#chartIndProd'),{ctx,w,h}=setupCanvas(canvas); const arr=state.candidates.slice().sort((a,b)=>b.indProd-a.indProd); if(!arr.length)return;
  const cfg=currentConfig(), left=150,right=25,top=18,bottom=20,plot=w-left-right,rowH=Math.min(36,(h-top-bottom)/arr.length),max=Math.max(cfg.minIndProd*1.2,...arr.map(x=>x.indProd))*1.08;
  ctx.font='12px Arial';ctx.textBaseline='middle';
  arr.forEach((c,i)=>{const y=top+i*rowH+rowH*.18,bh=rowH*.58,bw=plot*(c.indProd/max);ctx.fillStyle='#e5eee9';ctx.fillRect(left,y,plot,bh);ctx.fillStyle='#0b6b45';ctx.fillRect(left,y,bw,bh);ctx.fillStyle='#28443a';const nm=c.name.length>22?c.name.slice(0,20)+'…':c.name;ctx.fillText(nm,8,y+bh/2);ctx.fillStyle='#17332a';ctx.fillText(fmt(c.indProd),left+Math.min(bw+6,plot-34),y+bh/2);});
  const x=left+plot*(cfg.minIndProd/max);ctx.strokeStyle='#b43b3b';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(x,top-4);ctx.lineTo(x,top+arr.length*rowH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a83333';ctx.font='11px Arial';ctx.fillText('mín. '+fmt(cfg.minIndProd),Math.min(x+4,w-62),10);
}
function drawQualis(){
  const canvas=$('#chartQualis'),{ctx,w,h}=setupCanvas(canvas); const totals=Object.fromEntries(Q_ORDER.map(q=>[q,0])); state.candidates.forEach(c=>Q_ORDER.forEach(q=>totals[q]+=c.qualisCounts[q]||0)); const max=Math.max(1,...Object.values(totals)); const pad=28,base=h-34,plotH=h-65,slot=(w-pad*2)/Q_ORDER.length;
  ctx.font='12px Arial';ctx.textAlign='center';ctx.textBaseline='middle'; Q_ORDER.forEach((q,i)=>{const x=pad+i*slot+slot*.2,bw=slot*.6,bh=plotH*totals[q]/max;ctx.fillStyle=i<4?'#0b6b45':'#9badA4';ctx.fillRect(x,base-bh,bw,bh);ctx.fillStyle='#17332a';ctx.fillText(String(totals[q]),x+bw/2,base-bh-10);ctx.fillStyle='#596b62';ctx.fillText(q,x+bw/2,base+14);});ctx.textAlign='left';
}

function drawQualisHeatmap(){
  const canvas=$('#chartQualisHeatmap'); if(!canvas) return;
  const cols=[...Q_ORDER,'SEM QUALIS'];
  const arr=state.candidates.slice().sort((a,b)=>b.indArt-a.indArt);
  const rowH=26;
  const displayHeight=Math.max(240,68 + arr.length*rowH);
  const {ctx,w,h}=setupCanvas(canvas,displayHeight);
  if(!arr.length) return;
  const left=235, top=42, right=16, bottom=20;
  const plotW=w-left-right, plotH=h-top-bottom;
  const cellW=plotW/cols.length, cellH=plotH/arr.length;
  const max=Math.max(1,...arr.flatMap(c=>cols.map(col=>col==='SEM QUALIS'?c.articlesSemQualis.length:(c.qualisCounts[col]||0))));
  ctx.font='11px Arial';
  ctx.textBaseline='middle';
  ctx.textAlign='right';
  arr.forEach((cand,i)=>{
    const y=top+i*cellH+cellH/2;
    const base=cand.name.length>27?cand.name.slice(0,25)+'…':cand.name;
    const nm=`${base} (${fmt(cand.indArt)})`;
    ctx.fillStyle='#28443a';
    ctx.fillText(nm,left-8,y);
  });
  ctx.save();
  ctx.textAlign='center';
  ctx.fillStyle='#596b62';
  ctx.font='10px Arial';
  ctx.fillText('Docente (IndArt)',Math.max(70,left/2),16);
  cols.forEach((col,j)=>{
    const x=left+j*cellW+cellW/2;
    ctx.fillStyle='#596b62';
    ctx.fillText(col,x,16);
  });
  arr.forEach((cand,i)=>{
    cols.forEach((col,j)=>{
      const count=(col==='SEM QUALIS')?cand.articlesSemQualis.length:(cand.qualisCounts[col]||0);
      const t=count/max;
      const alpha=0.14 + 0.78*t;
      const shade= count===0 ? '#f3f6f4' : `rgba(11,107,69,${alpha})`;
      const x=left+j*cellW, y=top+i*cellH;
      ctx.fillStyle=shade;
      ctx.fillRect(x,y,cellW-1,cellH-1);
      ctx.strokeStyle='#ffffff';
      ctx.strokeRect(x,y,cellW-1,cellH-1);
      if(count>0){
        ctx.fillStyle=t>0.58?'#ffffff':'#17332a';
        ctx.font='10px Arial';
        ctx.fillText(String(count),x+cellW/2,y+cellH/2);
      }
    });
  });
  ctx.restore();
  ctx.fillStyle='#596b62';
  ctx.font='11px Arial';
  ctx.textAlign='left';
  ctx.fillText('Cor mais escura = maior número de artigos no estrato.', left, h-8);
}

function drawStudentQualisHeatmap(){
  const canvas=$('#chartStudentQualisHeatmap'); if(!canvas) return;
  const cols=[...Q_ORDER,'SEM QUALIS'];
  const arr=state.candidates.slice().sort((a,b)=>b.studentIndArt-a.studentIndArt);
  const rowH=26;
  const displayHeight=Math.max(240,68 + arr.length*rowH);
  const {ctx,w,h}=setupCanvas(canvas,displayHeight);
  if(!arr.length) return;
  const left=255, top=42, right=16, bottom=20;
  const plotW=w-left-right, plotH=h-top-bottom;
  const cellW=plotW/cols.length, cellH=plotH/arr.length;
  const max=Math.max(1,...arr.flatMap(c=>cols.map(col=>col==='SEM QUALIS'?c.studentArticlesSemQualis.length:(c.studentQualisCounts[col]||0))));
  ctx.font='11px Arial';
  ctx.textBaseline='middle';
  ctx.textAlign='right';
  arr.forEach((cand,i)=>{
    const y=top+i*cellH+cellH/2;
    const base=cand.name.length>25?cand.name.slice(0,23)+'…':cand.name;
    const nm=`${base} (${fmt(cand.studentIndArt)})`;
    ctx.fillStyle='#28443a';
    ctx.fillText(nm,left-8,y);
  });
  ctx.save();
  ctx.textAlign='center';
  ctx.fillStyle='#596b62';
  ctx.font='10px Arial';
  ctx.fillText('Docente (IndArt com discentes)',Math.max(95,left/2),16);
  cols.forEach((col,j)=>{
    const x=left+j*cellW+cellW/2;
    ctx.fillStyle='#596b62';
    ctx.fillText(col,x,16);
  });
  arr.forEach((cand,i)=>{
    cols.forEach((col,j)=>{
      const count=(col==='SEM QUALIS')?cand.studentArticlesSemQualis.length:(cand.studentQualisCounts[col]||0);
      const t=count/max;
      const alpha=0.14 + 0.78*t;
      const shade=count===0?'#f3f6f4':`rgba(11,107,69,${alpha})`;
      const x=left+j*cellW, y=top+i*cellH;
      ctx.fillStyle=shade;
      ctx.fillRect(x,y,cellW-1,cellH-1);
      ctx.strokeStyle='#ffffff';
      ctx.strokeRect(x,y,cellW-1,cellH-1);
      if(count>0){
        ctx.fillStyle=t>0.58?'#ffffff':'#17332a';
        ctx.font='10px Arial';
        ctx.fillText(String(count),x+cellW/2,y+cellH/2);
      }
    });
  });
  ctx.restore();
  ctx.fillStyle='#596b62';
  ctx.font='11px Arial';
  ctx.textAlign='left';
  ctx.fillText('Somente artigos com pelo menos um discente PPG associado; o IndArt entre parênteses usa somente esses artigos.',left,h-8);
}


function drawLineQualisHeatmap(){
  const canvas=$('#chartLineQualis'); if(!canvas) return;
  const arr=state.candidates.slice().sort((a,b)=>(b.line1IndArt+b.line2IndArt)-(a.line1IndArt+a.line2IndArt));
  const cols=[];
  [1,2].forEach(line=>Q_ORDER.forEach(q=>cols.push({line,q})));
  const rowH=26, displayHeight=Math.max(250,82+arr.length*rowH);
  const {ctx,w,h}=setupCanvas(canvas,displayHeight); if(!arr.length)return;
  const left=365,top=58,right=16,bottom=22,plotW=w-left-right,plotH=h-top-bottom;
  const cellW=plotW/cols.length,cellH=plotH/arr.length;
  const counts=(c,col)=> (col.line===1?c.line1QualisCounts[col.q]:c.line2QualisCounts[col.q])||0;
  const max=Math.max(1,...arr.flatMap(c=>cols.map(col=>counts(c,col))));
  ctx.textBaseline='middle';ctx.textAlign='right';ctx.font='11px Arial';
  arr.forEach((c,i)=>{
    const y=top+i*cellH+cellH/2;
    const base=c.name.length>26?c.name.slice(0,24)+'…':c.name;
    const label=`${base} · L1 ${fmt(c.line1IndArt)} | L2 ${fmt(c.line2IndArt)}`;
    ctx.fillStyle='#28443a';ctx.fillText(label,left-8,y);
  });
  ctx.textAlign='center';ctx.font='10px Arial';ctx.fillStyle='#596b62';
  ctx.fillText('Docente · IndArt por linha',Math.max(100,left/2),14);
  ctx.fillText('Linha 1 · Mecanismos e processos biológicos',left+cellW*4,14);
  ctx.fillText('Linha 2 · Promoção/Diagnóstico/Tratamento',left+cellW*12,14);
  cols.forEach((col,j)=>ctx.fillText(col.q,left+j*cellW+cellW/2,35));
  arr.forEach((c,i)=>cols.forEach((col,j)=>{const count=counts(c,col),t=count/max,alpha=.14+.78*t;const x=left+j*cellW,y=top+i*cellH;ctx.fillStyle=count===0?'#f3f6f4':`rgba(11,107,69,${alpha})`;ctx.fillRect(x,y,cellW-1,cellH-1);ctx.strokeStyle='#fff';ctx.strokeRect(x,y,cellW-1,cellH-1);if(count){ctx.fillStyle=t>.58?'#fff':'#17332a';ctx.font='9px Arial';ctx.fillText(String(count),x+cellW/2,y+cellH/2);}}));
  ctx.strokeStyle='#9db5aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left+cellW*8,30);ctx.lineTo(left+cellW*8,h-bottom);ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#596b62';ctx.font='10px Arial';ctx.fillText('Cada célula mostra o nº de artigos; ao lado do nome aparecem os IndArt calculados separadamente para Linha 1 e Linha 2.',left,h-8);
}

function drawDoctorateAreaChart(){
  const canvas=$('#chartDoctorateArea'); if(!canvas) return;
  const groups=new Map();
  state.candidates.forEach(c=>{const a=prettyField(c.doctorateArea);if(!groups.has(a))groups.set(a,[]);groups.get(a).push(c.name);});
  const arr=[...groups.entries()].map(([area,names])=>({area,names,count:names.length})).sort((a,b)=>b.count-a.count||a.area.localeCompare(b.area,'pt-BR'));
  const rowH=31,displayHeight=Math.max(240,60+arr.length*rowH);const {ctx,w,h}=setupCanvas(canvas,displayHeight);if(!arr.length)return;
  const left=Math.min(300,Math.max(185,w*.40)),right=48,top=24,bottom=22,plot=w-left-right,max=Math.max(1,...arr.map(x=>x.count));
  ctx.textBaseline='middle';ctx.font='11px Arial';
  arr.forEach((g,i)=>{const y=top+i*rowH+4,bh=20,bw=plot*g.count/max;ctx.textAlign='right';ctx.fillStyle='#28443a';const lab=g.area.length>42?g.area.slice(0,40)+'…':g.area;ctx.fillText(lab,left-8,y+bh/2);ctx.fillStyle='#e5eee9';ctx.fillRect(left,y,plot,bh);ctx.fillStyle='#0b6b45';ctx.fillRect(left,y,bw,bh);ctx.textAlign='left';ctx.fillStyle='#17332a';ctx.fillText(`${g.count} (${fmt(g.count/state.candidates.length*100,1)}%)`,left+Math.min(bw+6,plot-44),y+bh/2);});
  ctx.textAlign='left';ctx.fillStyle='#596b62';ctx.font='10px Arial';ctx.fillText('Campo utilizado: “Área do título de doutorado” da planilha.',left,h-8);
}

function rosterCounts(base){
  const rows=base==='all'?CURRENT_PPGCAS_ROSTER:CURRENT_PPGCAS_ROSTER.filter(x=>x.category==='permanent');
  return {total:rows.length,l1:rows.filter(x=>x.line===1).length,l2:rows.filter(x=>x.line===2).length};
}
function concentrationSummary(l1,l2){
  const total=l1+l2,p1=total?l1/total*100:0,p2=total?l2/total*100:0,max=Math.max(p1,p2);
  return {total,p1,p2,max,hhi:hhi2(l1,l2)};
}
function lineSelect(c){
  const hasL1=c.line1ProductCount>0, hasL2=c.line2ProductCount>0;
  const assigned=state.lineAssignments.get(c.id)??c.dominantLine??0;
  if(hasL1 && hasL2){
    return `<select class="line-assignment" data-id="${esc(c.id)}"><option value="1" ${assigned===1?'selected':''}>Linha 1</option><option value="2" ${assigned===2?'selected':''}>Linha 2</option></select><div class="tiny">produção nas duas linhas</div>`;
  }
  if(hasL1) return `<span class="badge neutral">Linha 1 · principal</span>`;
  if(hasL2) return `<span class="badge neutral">Linha 2 · principal</span>`;
  return `<span class="badge warn">Linha não definida</span><div class="tiny">sem produção classificada nas linhas</div>`;
}
function renderLineSimulator(){
  const panel=$('#lineImpactPanel'); if(!panel) return;
  const base=$('#rosterBase')?.value||'permanent';
  const current=rosterCounts(base);
  const cur=concentrationSummary(current.l1,current.l2);
  const selected=state.candidates.filter(c=>state.selected.has(c.id));
  let add1=0,add2=0,undefinedCount=0;
  selected.forEach(c=>{
    if(isInRosterBase(c.name,base)) return;
    const line=state.lineAssignments.get(c.id)??c.dominantLine??0;
    if(line===1)add1++; else if(line===2)add2++; else undefinedCount++;
  });
  const projected=concentrationSummary(current.l1+add1,current.l2+add2);
  $('#currentLineSummary').innerHTML=`<div class="composition"><div><b>${current.total}</b><small>docentes na base</small></div><div><b>${fmt(cur.p1,1)}%</b><small>Linha 1 · ${current.l1}</small></div><div><b>${fmt(cur.p2,1)}%</b><small>Linha 2 · ${current.l2}</small></div><div><b>${fmt(cur.hhi,3)}</b><small>HHI atual</small></div></div>`;
  $('#projectedLineSummary').innerHTML=`<div class="composition"><div><b>${projected.total}</b><small>após seleção</small></div><div><b>${fmt(projected.p1,1)}%</b><small>Linha 1 · ${current.l1+add1}</small></div><div><b>${fmt(projected.p2,1)}%</b><small>Linha 2 · ${current.l2+add2}</small></div><div><b>${fmt(projected.hhi,3)}</b><small>HHI projetado</small></div></div><p class="balance ok">Maior proporção entre as linhas: <b>${fmt(projected.max,1)}%</b> · análise de planejamento interno, sem limiar CAPES aplicado.</p>${undefinedCount?`<p class="note"><b>${undefinedCount}</b> selecionado(s) ainda sem linha definida e não incluído(s) na projeção.</p>`:''}`;
  const impactRows=state.candidates.map(c=>{
    if(isInRosterBase(c.name,base)) return `<tr><td>${esc(c.name)}</td><td>${lineSelect(c)}</td><td colspan="3"><span class="badge neutral">já integra a base permanente atual</span></td></tr>`;
    const line=state.lineAssignments.get(c.id)??c.dominantLine??0;
    const s=concentrationSummary(current.l1+(line===1?1:0),current.l2+(line===2?1:0));
    return `<tr><td>${esc(c.name)}</td><td>${lineSelect(c)}</td><td class="num">${line?fmt(s.p1,1)+'%':'—'}</td><td class="num">${line?fmt(s.p2,1)+'%':'—'}</td><td>${line?`<span class="badge neutral">${fmt(s.max,1)}%</span>`:'<span class="badge neutral">sem linha definida</span>'}</td></tr>`;
  }).join('');
  $('#lineImpactTable tbody').innerHTML=impactRows;
  $$('.line-assignment').forEach(sel=>sel.addEventListener('change',e=>{state.lineAssignments.set(e.target.dataset.id,Number(e.target.value));renderLineSimulator();}));
}

function clampPctInput(id,def){
  const el=$(id); const raw=num(el?.value??def); const v=Math.max(0,Math.min(100,raw||def)); if(el) el.value=String(v); return v;
}
function formationOfCandidate(c){
  const a=state.formationAssignments.get(c.id)||{};
  return {area:String(a.area||'').trim(),great:String(a.great||'').trim()};
}
function countValues(values,excludeFn=()=>false){
  const m=new Map();
  values.filter(Boolean).filter(v=>!excludeFn(v)).forEach(v=>m.set(v,(m.get(v)||0)+1));
  return m;
}
function maxConcentration(values,excludeFn=()=>false){
  const vals=values.filter(Boolean); const filtered=vals.filter(v=>!excludeFn(v));
  const counts=countValues(filtered); let label='',count=0;
  for(const [k,v] of counts){ if(v>count){label=k;count=v;} }
  return {total:vals.length,eligibleTotal:filtered.length,label,count,pct:vals.length?count/vals.length*100:0};
}
function currentFormationRows(){
  return CURRENT_PPGCAS_ROSTER.filter(r=>r.category==='permanent').map(r=>{
    const f=state.currentFormation.get(norm(r.name))||{area:'',great:''};
    return {name:r.name,area:String(f.area||'').trim(),great:String(f.great||'').trim()};
  });
}
function fullDistribution(values,total,limit,exemptFn=()=>false){
  const counts=countValues(values.filter(Boolean));
  return Array.from(counts.entries()).map(([label,count])=>({
    label,count,pct:total?count/total*100:0,exempt:exemptFn(label),limit
  })).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'pt-BR'));
}
function formationSummary(entries,discLimit,greatLimit){
  const total=entries.length;
  const areaVals=entries.map(e=>e.area).filter(Boolean);
  const greatVals=entries.map(e=>e.great).filter(Boolean);
  const areaExempt=v=>norm(v).includes('INTERDISCIPLIN');
  const greatExempt=v=>norm(v)==='MULTIDISCIPLINAR';
  const area=maxConcentration(areaVals,areaExempt);
  const great=maxConcentration(greatVals,greatExempt);
  const areaPct=total?area.count/total*100:0;
  const greatPct=total?great.count/total*100:0;
  const areaDistribution=fullDistribution(areaVals,total,discLimit,areaExempt);
  const greatDistribution=fullDistribution(greatVals,total,greatLimit,greatExempt);
  return {total,areaClassified:areaVals.length,greatClassified:greatVals.length,areaLabel:area.label,areaCount:area.count,areaPct,greatLabel:great.label,greatCount:great.count,greatPct,areaOk:areaPct<=discLimit,greatOk:greatPct<=greatLimit,areaDistribution,greatDistribution,complete:areaVals.length===total && greatVals.length===total};
}
function formationDistributionHtml(title,rows,classified,total){
  const coverage=total?classified/total*100:0;
  const items=rows.length?rows.map(r=>{
    const status=r.exempt?'<span class="badge neutral">isenta</span>':(r.pct<=r.limit?'<span class="badge ok">✓</span>':'<span class="badge no">!</span>');
    return `<div class="formation-dist-row"><div class="formation-dist-label"><b>${esc(r.label)}</b><small>${r.count} docente${r.count===1?'':'s'}</small></div><div class="formation-dist-bar"><i style="width:${Math.max(0,Math.min(100,r.pct))}%"></i></div><div class="formation-dist-pct"><b>${fmt(r.pct,1)}%</b>${status}</div></div>`;
  }).join(''):'<p class="note">Nenhuma classificação disponível.</p>';
  return `<div class="formation-dist"><div class="formation-dist-head"><h4>${esc(title)}</h4><span>${classified}/${total} classificados · ${fmt(coverage,1)}%</span></div>${items}</div>`;
}
function renderFormationSimulator(){
  const panel=$('#formationImpactPanel'); if(!panel) return;
  const discLimit=clampPctInput('#disciplinaryLimit',60), greatLimit=clampPctInput('#greatAreaLimit',80);
  const currentRows=currentFormationRows();
  const current=formationSummary(currentRows,discLimit,greatLimit);

  const selectedNew=state.candidates.filter(c=>state.selected.has(c.id) && !isCurrentPermanentName(c.name));
  const additions=selectedNew.map(c=>({name:c.name,...formationOfCandidate(c)}));
  const projectedRows=currentRows.concat(additions);
  const projected=formationSummary(projectedRows,discLimit,greatLimit);

  const coverage=`${current.areaClassified}/${current.total} Área disciplinar · ${current.greatClassified}/${current.total} Grande Área`;
  $('#currentFormationSummary').innerHTML=`<div class="composition"><div><b>${current.total}</b><small>permanentes atuais</small></div><div><b>${current.areaLabel?fmt(current.areaPct,1)+'%':'—'}</b><small>maior Área disciplinar${current.areaLabel?' · '+esc(current.areaLabel):''}</small></div><div><b>${current.greatLabel?fmt(current.greatPct,1)+'%':'—'}</b><small>maior Grande Área${current.greatLabel?' · '+esc(current.greatLabel):''}</small></div><div><b>${esc(coverage)}</b><small>cobertura da classificação</small></div></div>${formationDistributionHtml('Todas as Grandes Áreas atuais',current.greatDistribution,current.greatClassified,current.total)}${formationDistributionHtml('Todas as Áreas disciplinares atuais',current.areaDistribution,current.areaClassified,current.total)}<p class="note">${current.complete?'✓ Base atual completamente classificada.':'! Base atual incompleta: use o link “Editar base de formação” para completar a classificação antes da decisão final.'}</p>`;

  const areaBadge=projected.areaLabel?(projected.areaOk?`<span class="badge ok">✓ Área ${fmt(projected.areaPct,1)}% ≤ ${fmt(discLimit,0)}%</span>`:`<span class="badge no">! Área ${fmt(projected.areaPct,1)}% > ${fmt(discLimit,0)}%</span>`):'<span class="badge neutral">Área não calculável</span>';
  const greatBadge=projected.greatLabel?(projected.greatOk?`<span class="badge ok">✓ Grande Área ${fmt(projected.greatPct,1)}% ≤ ${fmt(greatLimit,0)}%</span>`:`<span class="badge no">! Grande Área ${fmt(projected.greatPct,1)}% > ${fmt(greatLimit,0)}%</span>`):'<span class="badge neutral">Grande Área não calculável</span>';
  const selectionNote=selectedNew.length
    ? `<p class="note"><b>${selectedNew.length} docente${selectedNew.length===1?'':'s'} selecionado${selectedNew.length===1?'':'s'}</b> no ranking e incluído${selectedNew.length===1?'':'s'} nesta projeção.</p>`
    : '<p class="note">Nenhum docente novo está selecionado no ranking. O painel abaixo permanece igual à composição atual até que você marque um ou mais docentes em “Selecionados/inclusos”.</p>';
  $('#projectedFormationSummary').innerHTML=`${selectionNote}<div class="composition"><div><b>${projected.total}</b><small>permanentes projetados</small></div><div><b>${projected.areaLabel?fmt(projected.areaPct,1)+'%':'—'}</b><small>${projected.areaLabel?esc(projected.areaLabel):'Área disciplinar'}</small></div><div><b>${projected.greatLabel?fmt(projected.greatPct,1)+'%':'—'}</b><small>${projected.greatLabel?esc(projected.greatLabel):'Grande Área'}</small></div><div><b>${selectedNew.length}</b><small>novos incluídos</small></div></div>${formationDistributionHtml('Todas as Grandes Áreas projetadas',projected.greatDistribution,projected.greatClassified,projected.total)}${formationDistributionHtml('Todas as Áreas disciplinares projetadas',projected.areaDistribution,projected.areaClassified,projected.total)}<p class="balance ${projected.areaOk&&projected.greatOk?'ok':'no'}">${areaBadge} ${greatBadge}</p>${!projected.complete?'<p class="note">A projeção contém docentes sem classificação completa; revise a base e os candidatos.</p>':''}`;

  $('#formationImpactTable tbody').innerHTML=state.candidates.map(c=>{
    const f=formationOfCandidate(c); const currentMember=isCurrentPermanentName(c.name);
    let areaPct='—',greatPct='—',status='<span class="badge neutral">classifique a formação</span>';
    if(currentMember){ status='<span class="badge neutral">já é permanente atual</span>'; }
    else if(f.area || f.great){
      const s=formationSummary(currentRows.concat([{name:c.name,...f}]),discLimit,greatLimit);
      areaPct=s.areaLabel?fmt(s.areaPct,1)+'%':'—'; greatPct=s.greatLabel?fmt(s.greatPct,1)+'%':'—';
      status=(s.areaOk&&s.greatOk)?'<span class="badge ok">✓ dentro dos limites</span>':'<span class="badge no">! ultrapassa limite</span>';
      if(!s.complete) status+='<div class="tiny">base/classificação incompleta</div>';
    }
    return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.doctorateArea||'Não informado')}</td><td><select class="compact-input candidate-great" data-id="${esc(c.id)}">${greatAreaOptions(f.great)}</select></td><td><select class="compact-input candidate-area" data-id="${esc(c.id)}">${cnpqAreaOptions(f.area,f.great)}</select></td><td class="num">${areaPct}</td><td class="num">${greatPct}</td><td>${status}</td></tr>`;
  }).join('');

  $$('.candidate-area').forEach(el=>el.addEventListener('change',e=>{const id=e.target.dataset.id;const cur=state.formationAssignments.get(id)||{};const area=e.target.value.trim();state.formationAssignments.set(id,{area,great:cnpqGreatForArea(area)||cur.great||inferGreatArea(area)});renderFormationSimulator();}));
  $$('.candidate-great').forEach(el=>el.addEventListener('change',e=>{const id=e.target.dataset.id;const cur=state.formationAssignments.get(id)||{};const great=e.target.value;const keepArea=cur.area && cnpqGreatForArea(cur.area)===great ? cur.area : '';state.formationAssignments.set(id,{area:keepArea,great});renderFormationSimulator();}));
  updateFormationStorageStatus();
}

function drawMetricHeatmap(canvasId, columns, options={}){
  const canvas=$(canvasId); if(!canvas) return;
  const arr=state.candidates.slice().sort((a,b)=>b.indProd-a.indProd);
  const rowH=27;
  const displayHeight=Math.max(240,70 + arr.length*rowH);
  const {ctx,w,h}=setupCanvas(canvas,displayHeight);
  if(!arr.length) return;
  const left=Math.min(190,Math.max(145,w*.34)), top=44, right=14, bottom=22;
  const plotW=Math.max(120,w-left-right), plotH=h-top-bottom;
  const cellW=plotW/columns.length, cellH=plotH/arr.length;
  const colMax=columns.map(col=>Math.max(1,...arr.map(c=>Number(col.get(c))||0)));

  ctx.textBaseline='middle';
  ctx.textAlign='right';
  ctx.font='11px Arial';
  arr.forEach((cand,i)=>{
    const y=top+i*cellH+cellH/2;
    const maxChars=w<650?20:30;
    const nm=cand.name.length>maxChars?cand.name.slice(0,maxChars-2)+'…':cand.name;
    ctx.fillStyle='#28443a';
    ctx.fillText(nm,left-8,y);
  });

  ctx.textAlign='center';
  columns.forEach((col,j)=>{
    const x=left+j*cellW+cellW/2;
    ctx.fillStyle='#596b62';
    ctx.font='10px Arial';
    ctx.fillText(col.label,x,17);
  });

  arr.forEach((cand,i)=>{
    columns.forEach((col,j)=>{
      const value=Number(col.get(cand))||0;
      const t=Math.max(0,Math.min(1,value/colMax[j]));
      const alpha=0.13+0.80*t;
      const shade=value===0?'#f3f6f4':`rgba(11,107,69,${alpha})`;
      const x=left+j*cellW, y=top+i*cellH;
      ctx.fillStyle=shade;
      ctx.fillRect(x,y,cellW-1,cellH-1);
      ctx.strokeStyle='#ffffff';
      ctx.strokeRect(x,y,cellW-1,cellH-1);
      const label=col.format?col.format(value):String(value);
      ctx.fillStyle=t>0.58?'#ffffff':'#17332a';
      ctx.font=(label.length>12?'8':'9')+'px Arial';
      ctx.fillText(label,x+cellW/2,y+cellH/2);
    });
  });

  ctx.textAlign='left';
  ctx.fillStyle='#596b62';
  ctx.font='10px Arial';
  ctx.fillText(options.note||'Cor mais escura = maior valor na coluna.',left,h-8);
}

function drawOrientacaoHeatmap(){
  drawMetricHeatmap('#chartOrientacaoHeatmap',[
    {label:'Orientandos',get:c=>uniquePersonCount(c.discentesPPG)},
    {label:'Titulados',get:c=>uniquePersonCount(c.titulados)},
    {label:'Total',get:c=>uniquePersonCount(c.discentesPPG)+uniquePersonCount(c.titulados)}
  ],{note:'Orientandos = discentes PPG informados; Total = orientandos + titulados.'});
}

function drawProjetosHeatmap(){
  drawMetricHeatmap('#chartProjetosHeatmap',[
    {label:'Nº projetos',get:c=>c.projects.length,format:v=>String(Math.round(v))},
    {label:'Valor projetos',get:c=>c.projectFunding,format:v=>compactMoney(v)}
  ],{note:'A intensidade é normalizada separadamente em cada coluna; os valores reais aparecem nas células.'});
}

function renderComparison(){
  const selected=state.candidates.filter(c=>state.selected.has(c.id)); const panel=$('#comparisonPanel'); panel.classList.toggle('hidden',selected.length===0); if(!selected.length)return;
  $('#compareGrid').innerHTML=selected.map(c=>`<div class="compare-card"><h4>${esc(c.name)}</h4>${badge(c.reg.code,c.reg.label)}
    <div class="metric"><span>Escore</span><b>${fmt(c.score,1)}</b></div><div class="metric"><span>Pendências de dados</span><b>${c.essentialPendingCount}</b></div>
    <div class="metric"><span>IndProd</span><b>${fmt(c.indProd)}</b></div>
    <div class="metric"><span>IndProd com discentes</span><b>${fmt(c.studentIndProd)}</b></div>
    <div class="metric"><span>IndArt</span><b>${fmt(c.indArt)}</b></div><div class="metric"><span>A1–A4 (% do IndProd)</span><b>${pct(c.topIndArtPctIndProd)}</b></div>
    <div class="metric"><span>Qualis médio</span><b>${fmt(c.avgArticleWeight,3)}</b></div><div class="metric"><span>IQTF</span><b>${fmt(c.iqtf)}</b></div>
    <div class="metric"><span>Titulados</span><b>${c.titulados.length}</b></div><div class="metric"><span>Projetos</span><b>${c.projects.length}</b></div>
    <div class="metric"><span>Captação</span><b>${money(c.projectFunding)}</b></div><div class="metric"><span>Infraestrutura</span><b>${money(c.infrastructure.equipmentValue)}</b></div>
  </div>`).join('');
}

function renderDetails(){
  $('#detailsPanel').innerHTML=sortedCandidates().map(c=>{
    const criteria=c.reg.criteria.map(cr=>`<div class="criterion"><span>${esc(cr.name)}</span><span>${badge(cr.state,cr.detail)}</span></div>`).join('');
    const qboxes=Q_ORDER.map(q=>`<div class="qbox"><b>${c.qualisCounts[q]||0}</b><small>${q}</small></div>`).join('')+`<div class="qbox"><b>${c.articlesSemQualis.length}</b><small>SEM QUALIS</small></div>`;
    const pendencies=c.pendingItems.length?`<ul class="warn-list">${c.pendingItems.map(x=>`<li><b>Produto ${x.product.num}</b> · ${esc(x.reason)}${x.product.title?` · ${esc(x.product.title)}`:''}</li>`).join('')}</ul>`:'<span class="badge ok">✓ Nenhuma pendência de preenchimento</span>';
    const warnings=c.warnings.length?`<ul class="warn-list">${c.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:'<span class="badge ok">✓ Sem alertas automáticos</span>';
    const products=c.period.slice().sort((a,b)=>b.year-a.year).map(p=>`<tr><td>${p.year||'—'}</td><td>${esc(p.type||p.category)}</td><td>${productQualBadge(p)}</td><td class="num">${fmt(qValue(p.qualis),3)}</td><td>${esc(p.title||'—')}</td><td>${esc(p.vehicle||'—')}</td><td>${esc(p.line||'—')}</td><td>${p.ppg.length}</td></tr>`).join('');
    return `<details class="card details"><summary>${esc(c.name)} · IndProd ${fmt(c.indProd)} · ${esc(c.qualification)}</summary><div class="detail-body">
      <div class="detail-grid"><div><h3>Critérios verificáveis</h3>${criteria}</div><div><h3>Indicadores</h3>
        <div class="metric"><span>Área do doutorado</span><b>${esc(c.doctorateArea||'Não informado')}</b></div><div class="metric"><span>Linha predominante da produção</span><b>${c.dominantLine?('Linha '+c.dominantLine):'Não definida'}</b></div><div class="metric"><span>IndArt</span><b>${fmt(c.indArt)}</b></div><div class="metric"><span>IndProd com discentes</span><b>${fmt(c.studentIndProd)}</b></div><div class="metric"><span>Artigos sem Qualis</span><b>${c.articlesSemQualis.length}</b></div><div class="metric"><span>IndLiv</span><b>${fmt(c.indLiv)}</b></div><div class="metric"><span>IndCap</span><b>${fmt(c.indCap)}</b></div><div class="metric"><span>IndTec</span><b>${fmt(c.indTec)}</b></div><div class="metric"><span>IQTF</span><b>${fmt(c.iqtf)}</b></div><div class="metric"><span>Período equivalente</span><b>${fmt(c.yearsEq,2)} anos</b></div>
      </div></div>
      <h3>Qualis dos artigos</h3><div class="qualis-grid">${qboxes}</div>
      <div class="detail-grid"><div><h3>Pendências de preenchimento</h3>${pendencies}</div><div><h3>Alertas de conferência</h3>${warnings}</div></div>
      <div class="detail-grid"><div><h3>Projetos e estrutura</h3><div class="metric"><span>Projetos</span><b>${c.projects.length}</b></div><div class="metric"><span>Projetos aderentes</span><b>${c.projectAdherent}</b></div><div class="metric"><span>Recursos em projetos</span><b>${money(c.projectFunding)}</b></div><div class="metric"><span>Recursos/equip. aprovados</span><b>${money(c.infrastructure.approvedValue)}</b></div><div class="metric"><span>Equipamentos declarados</span><b>${money(c.infrastructure.equipmentValue)}</b></div></div><div><h3>Observação</h3><p class="sub">Artigos com ano informado e sem Qualis permanecem como produção do docente, aparecem como SEM QUALIS e recebem pontuação zero. Produtos sem ano e sem Qualis/estrato simultaneamente são descartados da análise e não geram pendência.</p></div></div>
      <h3>Produtos declarados no período</h3><div class="table-wrap"><table style="min-width:900px"><thead><tr><th>Ano</th><th>Tipo</th><th>Estrato</th><th>Peso</th><th>Título</th><th>Veículo</th><th>Linha</th><th>Discentes PPG</th></tr></thead><tbody>${products||'<tr><td colspan="8">Nenhum produto declarado no período.</td></tr>'}</tbody></table></div>
    </div></details>`;
  }).join('');
}

function renderFiles(){
  $('#fileList').innerHTML=state.fileStatus.map(f=>`<div class="file-row"><div class="meta"><strong>${esc(f.name)}</strong><small>${esc(f.msg||'')}</small></div>${badge(f.code,f.label)}</div>`).join('');
}

async function importFiles(files){
  const list=Array.from(files).filter(f=>/\.(xlsx|xlsm)$/i.test(f.name)); if(!list.length)return;
  for(const file of list){
    const stat={name:file.name,code:'info',label:'Lendo',msg:'Processando localmente…'}; state.fileStatus.push(stat);renderFiles();
    try{
      const raw=await parseCandidateFile(file); state.raw.push(raw); stat.code='ok';stat.label='Importada';stat.msg=`${raw.name} · ${raw.products.length} produtos identificados`;
    }catch(e){ stat.code='no';stat.label='Erro';stat.msg=e.message||String(e); }
    renderFiles();
  }
  evaluateAll();
}

function exportCSV(){
  const rows=[['Posição','Docente','Área do doutorado','Linha predominante','Situação','Pendências de dados','Detalhe das pendências','Escore comparativo','Qualificação','IndProd','IndProd com discentes','IndArt','IndLiv','IndCap','IndTec','A1-A4 (% do IndProd)','Qualis médio artigos','Artigos SEM QUALIS','IQTF','Titulados','Projetos','Captação (R$)','Arquivo']];
  sortedCandidates().forEach((c,i)=>rows.push([i+1,c.name,c.doctorateArea||'Não informado',c.dominantLine?('Linha '+c.dominantLine):'Não definida',c.reg.label,c.essentialPendingCount,c.pendingItems.map(x=>`Produto ${x.product.num}: ${x.reason}`).join(' | '),fmt(c.score,1),c.qualification,fmt(c.indProd),fmt(c.studentIndProd),fmt(c.indArt),fmt(c.indLiv),fmt(c.indCap),fmt(c.indTec),fmt(c.topIndArtPctIndProd,1),fmt(c.avgArticleWeight,3),c.articlesSemQualis.length,fmt(c.iqtf),c.titulados.length,c.projects.length,fmt(c.projectFunding,2),c.fileName]));
  const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\r\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='PPGCAS_comparacao_credenciamento.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

async function bind(){
  const dz=$('#dropzone'),fi=$('#files');
  if(!$('#refDate').value){ const d=new Date(); const pad=n=>String(n).padStart(2,'0'); $('#refDate').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  await loadFormationCsv({rerender:false});
  if(typeof DecompressionStream==='undefined'){ $('#fileList').innerHTML='<div class="file-row"><div class="meta"><strong>Navegador incompatível</strong><small>Use uma versão recente do Chrome, Edge, Firefox ou Safari para ler arquivos XLSX.</small></div><span class="badge no">× XLSX indisponível</span></div>'; }
  $('#choose').onclick=()=>fi.click(); dz.onclick=()=>fi.click(); fi.onchange=e=>importFiles(e.target.files);
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>importFiles(e.dataTransfer.files));
$('#clear').onclick=()=>{state.raw=[];state.candidates=[];state.selected.clear();state.lineAssignments.clear();state.formationAssignments.clear();state.fileStatus=[];renderFiles();$('#results').classList.add('hidden');fi.value='';};
  $('#sortBy').onchange=()=>{renderRanking();renderDetails();};
  $('#exportCsv').onclick=exportCSV; $('#print').onclick=()=>window.print(); $('#rosterBase')?.addEventListener('change',renderLineSimulator);
  $('#reloadFormationCsv')?.addEventListener('click',async()=>{const b=$('#reloadFormationCsv'); if(b){b.disabled=true;b.textContent='Recarregando…';} await loadFormationCsv({rerender:true}); if(b){b.disabled=false;b.textContent='Recarregar base agora';}});
  $('#openFormationCsvLocal')?.addEventListener('click',()=>$('#formationCsvLocalFile')?.click());
  $('#formationCsvLocalFile')?.addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; try{applyFormationCsvText(await f.text(),`arquivo local · ${f.name}`); updateFormationStorageStatus(); if(state.candidates.length) renderFormationSimulator();}catch(err){formationSource=`erro ao abrir CSV local (${err.message||err})`; updateFormationStorageStatus();}});
  $('#disciplinaryLimit')?.addEventListener('change',renderFormationSimulator); $('#greatAreaLimit')?.addEventListener('change',renderFormationSimulator);
  ['refDate','minIndProd','minIQTF','wInd','wQualis','wIQTF','wOrient','wProj'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if(state.raw.length)evaluateAll();}));
  window.addEventListener('focus',()=>{ if(Date.now()-formationLoadedAt>3000) loadFormationCsv({rerender:true}); });
  window.addEventListener('pageshow',()=>{ if(Date.now()-formationLoadedAt>3000) loadFormationCsv({rerender:true}); });
  window.addEventListener('resize',()=>{if(state.candidates.length)renderCharts();});
}

bind();
})();
