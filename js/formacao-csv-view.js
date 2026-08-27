(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const taxonomy=window.PPGCAS_CNPQ_AREAS||{grandesAreas:[]};
let rows=[];
let fileHandle=null;
let sourceMode='publicado';

function parse(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const parsed=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
    else if(ch==='"')quoted=true;
    else if(ch===';'){row.push(field);field='';}
    else if(ch==='\n'){row.push(field.replace(/\r$/,''));parsed.push(row);row=[];field='';}
    else field+=ch;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));parsed.push(row);}
  const h=(parsed.shift()||[]).map(x=>x.trim());
  return parsed.filter(r=>r.some(x=>String(x).trim())).map(r=>Object.fromEntries(h.map((k,i)=>[k,String(r[i]??'').trim()])));
}
function csvQuote(v){const s=String(v??'');return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function serialize(){
  const fields=['nome','categoria','linha','area_disciplinar','grande_area','lattes','limite_area_disciplinar','limite_grande_area'];
  const data=rows.map((r,i)=>fields.map(f=>csvQuote(r[f]??'' )).join(';'));
  return '\uFEFF'+fields.join(';')+'\r\n'+data.join('\r\n')+'\r\n';
}
function greatByName(name){return taxonomy.grandesAreas.find(g=>g.nome===name)||null;}
function greatForArea(area){for(const g of taxonomy.grandesAreas){if(g.areas.some(a=>a[1]===area))return g.nome;}return '';}
function allAreaNames(){return taxonomy.grandesAreas.flatMap(g=>g.areas.map(a=>a[1]));}
function option(value,label,selected){return `<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;}
function greatSelect(row,i){
  let html=option('','Selecione…',!row.grande_area);
  taxonomy.grandesAreas.forEach(g=>html+=option(g.nome,`${g.codigo} · ${g.nome}`,row.grande_area===g.nome));
  if(row.grande_area && !taxonomy.grandesAreas.some(g=>g.nome===row.grande_area)) html+=option(row.grande_area,`${row.grande_area} · valor atual`,true);
  return `<select class="formation-select great-select" data-i="${i}">${html}</select>`;
}
function areaSelect(row,i){
  const g=greatByName(row.grande_area);
  const list=g?g.areas:taxonomy.grandesAreas.flatMap(x=>x.areas);
  let html=option('','Selecione…',!row.area_disciplinar);
  list.forEach(([code,name])=>html+=option(name,`${code} · ${name}`,row.area_disciplinar===name));
  if(row.area_disciplinar && !allAreaNames().includes(row.area_disciplinar)) html+=option(row.area_disciplinar,`${row.area_disciplinar} · valor atual`,true);
  return `<select class="formation-select area-select" data-i="${i}">${html}</select>`;
}
function render(){
  const current=rows.filter(r=>r.nome);
  $('#kCurrent').textContent=current.length;
  $('#kArea').textContent=current.filter(r=>r.area_disciplinar).length+'/'+current.length;
  $('#kGreat').textContent=current.filter(r=>r.grande_area).length+'/'+current.length;
  const lim=current.find(r=>r.limite_area_disciplinar||r.limite_grande_area)||{};
  $('#limitArea').value=lim.limite_area_disciplinar||60;
  $('#limitGreat').value=lim.limite_grande_area||80;
  $('#kLimits').textContent=($('#limitArea').value||60)+'% / '+($('#limitGreat').value||80)+'%';
  $('#formationCsvTable tbody').innerHTML=current.map((r,i)=>`<tr>
    <td><b>${esc(r.nome)}</b></td>
    <td>${esc(r.categoria||'—')}</td>
    <td>${r.linha?`Linha ${esc(r.linha)}`:'—'}</td>
    <td>${greatSelect(r,i)}</td>
    <td>${areaSelect(r,i)}</td>
    <td>${r.lattes?`<a href="${esc(r.lattes)}" target="_blank" rel="noopener">Lattes</a>`:'—'}</td>
  </tr>`).join('');
  document.querySelectorAll('.great-select').forEach(el=>el.addEventListener('change',e=>{
    const i=Number(e.target.dataset.i); rows[i].grande_area=e.target.value;
    const currentArea=rows[i].area_disciplinar;
    if(currentArea && greatForArea(currentArea)!==e.target.value) rows[i].area_disciplinar='';
    render(); markEdited();
  }));
  document.querySelectorAll('.area-select').forEach(el=>el.addEventListener('change',e=>{
    const i=Number(e.target.dataset.i); rows[i].area_disciplinar=e.target.value;
    const inferred=greatForArea(e.target.value); if(inferred) rows[i].grande_area=inferred;
    render(); markEdited();
  }));
}
function applyLimits(){
  if(!rows.length)return;
  rows.forEach((r,i)=>{r.limite_area_disciplinar=i===0?String($('#limitArea').value||60):'';r.limite_grande_area=i===0?String($('#limitGreat').value||80):'';});
  $('#kLimits').textContent=($('#limitArea').value||60)+'% / '+($('#limitGreat').value||80)+'%';
}
function markEdited(){
  $('#csvStatus').innerHTML='<span class="badge warn">! Alterações ainda não salvas.</span>';
}
async function loadPublished(){
  const status=$('#csvStatus');
  try{
    if(location.protocol==='file:'){
      if(!window.PPGCAS_FORMACAO_CSV) throw new Error('base incorporada não encontrada');
      rows=parse(window.PPGCAS_FORMACAO_CSV); sourceMode='incorporado'; fileHandle=null; render();
      status.innerHTML='<span class="badge ok">✓ Base incorporada carregada para uso local.</span> Para editar um CSV específico, use <b>Abrir CSV para edição</b>.';
      return;
    }
    const res=await fetch('data/formacao_docentes.csv?v='+Date.now(),{cache:'no-store'}); if(!res.ok)throw new Error('HTTP '+res.status);
    rows=parse(await res.text()); sourceMode='publicado'; fileHandle=null; render();
    status.innerHTML='<span class="badge ok">✓ CSV publicado carregado.</span> Para gravar no mesmo arquivo local, use <b>Abrir CSV para edição</b>.';
  }catch(e){
    if(window.PPGCAS_FORMACAO_CSV){ rows=parse(window.PPGCAS_FORMACAO_CSV); sourceMode='incorporado'; fileHandle=null; render(); status.innerHTML='<span class="badge warn">! CSV publicado indisponível; usando base incorporada.</span>'; }
    else status.innerHTML=`<span class="badge no">× Não foi possível carregar a base.</span> ${esc(e.message||e)}`;
  }
}
async function openLocal(){
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:'CSV',accept:{'text/csv':['.csv'],'text/plain':['.csv']}}]});
      const file=await handle.getFile(); rows=parse(await file.text()); fileHandle=handle; sourceMode='arquivo-local'; render();
      $('#csvStatus').innerHTML=`<span class="badge ok">✓ ${esc(file.name)} aberto para edição.</span> O botão Salvar gravará neste mesmo arquivo.`;
      $('#saveCsv').textContent='Salvar no mesmo arquivo';
    }catch(e){ if(e&&e.name!=='AbortError') $('#csvStatus').textContent='Erro ao abrir: '+(e.message||e); }
  }else{
    $('#fallbackFile').click();
  }
}
async function saveCsv(){
  applyLimits(); const content=serialize();
  if(fileHandle && fileHandle.createWritable){
    try{const writable=await fileHandle.createWritable();await writable.write(content);await writable.close();$('#csvStatus').innerHTML='<span class="badge ok">✓ CSV salvo no mesmo arquivo.</span>';return;}catch(e){$('#csvStatus').innerHTML=`<span class="badge no">× Erro ao salvar.</span> ${esc(e.message||e)}`;return;}
  }
  if(window.showSaveFilePicker){
    try{
      const handle=await window.showSaveFilePicker({suggestedName:'formacao_docentes.csv',types:[{description:'CSV',accept:{'text/csv':['.csv']}}]});
      const writable=await handle.createWritable();await writable.write(content);await writable.close();fileHandle=handle;sourceMode='arquivo-local';
      $('#csvStatus').innerHTML='<span class="badge ok">✓ CSV salvo.</span> Nas próximas alterações desta sessão, o mesmo arquivo será reutilizado.';$('#saveCsv').textContent='Salvar no mesmo arquivo';return;
    }catch(e){if(e&&e.name==='AbortError')return;}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download='formacao_docentes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  $('#csvStatus').innerHTML='<span class="badge info">CSV atualizado baixado.</span> Substitua o arquivo do repositório pelo arquivo salvo.';
}
function bind(){
  $('#openCsv').addEventListener('click',openLocal);$('#saveCsv').addEventListener('click',saveCsv);$('#reloadPublished').addEventListener('click',loadPublished);
  $('#limitArea').addEventListener('change',()=>{applyLimits();markEdited();});$('#limitGreat').addEventListener('change',()=>{applyLimits();markEdited();});
  $('#fallbackFile').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;rows=parse(await f.text());fileHandle=null;sourceMode='fallback';render();$('#csvStatus').innerHTML='<span class="badge info">CSV aberto.</span> Este navegador não permite sobrescrever diretamente; use Salvar CSV.';});
  if(location.hostname.endsWith('.github.io')){const owner=location.hostname.split('.')[0], parts=location.pathname.split('/').filter(Boolean), repo=parts[0];if(repo){const a=$('#githubFileLink');a.href=`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/main/data/formacao_docentes.csv`;a.classList.remove('hidden');}}
  $('#cnpqInfo').textContent=`Tabela CNPq incorporada · ${taxonomy.grandesAreas.length} Grandes Áreas · ${allAreaNames().length} Áreas`;
  loadPublished();
}
bind();
})();
