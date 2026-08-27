/*
  XLSX Lite Reader for PPGCAS
  Minimal XLSX/XLSM reader built for modern browsers.
  No uploads, no external dependencies. It parses the ZIP container and the
  XML parts required by this project. Intended for Chrome/Edge/Safari/Firefox
  versions supporting DecompressionStream('deflate-raw').
*/
(function(global){
  'use strict';

  const td = new TextDecoder('utf-8');

  function u16(dv, off){ return dv.getUint16(off, true); }
  function u32(dv, off){ return dv.getUint32(off, true); }

  function findEOCD(u8, dv){
    const min = Math.max(0, u8.length - 0xFFFF - 22);
    for(let i = u8.length - 22; i >= min; i--){
      if(u32(dv, i) === 0x06054b50) return i;
    }
    throw new Error('Arquivo ZIP/XLSX inválido: diretório central não encontrado.');
  }

  async function inflateRaw(bytes){
    if(typeof DecompressionStream === 'undefined'){
      throw new Error('Seu navegador não oferece DecompressionStream. Use uma versão recente do Chrome, Edge, Firefox ou Safari.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  class ZipReader{
    constructor(buffer){
      this.u8 = new Uint8Array(buffer);
      this.dv = new DataView(buffer);
      this.entries = new Map();
      this._parseCentralDirectory();
    }

    _parseCentralDirectory(){
      const eocd = findEOCD(this.u8, this.dv);
      const total = u16(this.dv, eocd + 10);
      let p = u32(this.dv, eocd + 16);
      for(let i=0; i<total; i++){
        if(u32(this.dv,p) !== 0x02014b50) throw new Error('ZIP inválido: cabeçalho do diretório central corrompido.');
        const method = u16(this.dv,p+10);
        const compSize = u32(this.dv,p+20);
        const uncompSize = u32(this.dv,p+24);
        const fnLen = u16(this.dv,p+28);
        const extraLen = u16(this.dv,p+30);
        const commentLen = u16(this.dv,p+32);
        const localOffset = u32(this.dv,p+42);
        const name = td.decode(this.u8.slice(p+46,p+46+fnLen));
        this.entries.set(name,{name,method,compSize,uncompSize,localOffset});
        p += 46 + fnLen + extraLen + commentLen;
      }
    }

    has(name){ return this.entries.has(name); }

    async bytes(name){
      const e = this.entries.get(name);
      if(!e) return null;
      const o = e.localOffset;
      if(u32(this.dv,o) !== 0x04034b50) throw new Error('ZIP inválido: cabeçalho local ausente em '+name);
      const fnLen = u16(this.dv,o+26);
      const extraLen = u16(this.dv,o+28);
      const start = o + 30 + fnLen + extraLen;
      const comp = this.u8.slice(start,start+e.compSize);
      if(e.method === 0) return comp;
      if(e.method === 8) return await inflateRaw(comp);
      throw new Error('Método de compressão ZIP não suportado ('+e.method+') em '+name);
    }

    async text(name){
      const b = await this.bytes(name);
      return b ? td.decode(b) : null;
    }
  }

  function xml(text, label){
    const doc = new DOMParser().parseFromString(text || '', 'application/xml');
    if(doc.getElementsByTagName('parsererror').length){
      throw new Error('Erro ao interpretar XML do XLSX'+(label ? ': '+label : '.'));
    }
    return doc;
  }

  function allText(el){
    if(!el) return '';
    return Array.from(el.getElementsByTagName('t')).map(t=>t.textContent || '').join('');
  }

  function normalizeTarget(base, target){
    target = (target || '').replace(/\\/g,'/');
    if(target.startsWith('/')) return target.slice(1);
    const parts = base.split('/'); parts.pop();
    target.split('/').forEach(part=>{
      if(part==='..') parts.pop();
      else if(part!=='.' && part!=='') parts.push(part);
    });
    return parts.join('/');
  }

  function cellValue(c, shared){
    const t = c.getAttribute('t') || '';
    const vEl = c.getElementsByTagName('v')[0];
    if(t === 'inlineStr'){
      const is = c.getElementsByTagName('is')[0];
      return allText(is);
    }
    if(!vEl){
      const f = c.getElementsByTagName('f')[0];
      return f ? '' : null;
    }
    const raw = vEl.textContent || '';
    if(t === 's') return shared[Number(raw)] ?? '';
    if(t === 'b') return raw === '1';
    if(t === 'str') return raw;
    if(t === 'e') return '#'+raw;
    const n = Number(raw);
    return Number.isFinite(n) && raw.trim()!=='' ? n : raw;
  }

  function rowColFromRef(ref){
    const m = /^([A-Z]+)(\d+)$/.exec(ref || '');
    if(!m) return null;
    let col=0;
    for(const ch of m[1]) col = col*26 + (ch.charCodeAt(0)-64);
    return {col,row:Number(m[2])};
  }

  function colName(n){
    let s='';
    while(n>0){ n--; s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26); }
    return s;
  }

  class SheetData{
    constructor(name,cells,maxRow,maxCol){ this.name=name; this.cells=cells; this.maxRow=maxRow; this.maxCol=maxCol; }
    get(ref){ const v=this.cells.get(ref); return v===undefined?null:v; }
    at(row,col){ return this.get(colName(col)+row); }
    text(ref){ const v=this.get(ref); return v===null||v===undefined?'':String(v); }
  }

  async function readWorkbook(arrayBuffer){
    const zip = new ZipReader(arrayBuffer);
    const workbookPath = 'xl/workbook.xml';
    const relsPath = 'xl/_rels/workbook.xml.rels';
    if(!zip.has(workbookPath)) throw new Error('Não foi possível localizar xl/workbook.xml. O arquivo parece não ser um XLSX válido.');

    const wbDoc = xml(await zip.text(workbookPath),'workbook.xml');
    const relDoc = xml(await zip.text(relsPath),'workbook.xml.rels');

    let shared=[];
    if(zip.has('xl/sharedStrings.xml')){
      const ssDoc = xml(await zip.text('xl/sharedStrings.xml'),'sharedStrings.xml');
      shared = Array.from(ssDoc.getElementsByTagName('si')).map(allText);
    }

    const relMap = new Map();
    Array.from(relDoc.getElementsByTagName('Relationship')).forEach(r=>{
      relMap.set(r.getAttribute('Id'), normalizeTarget(workbookPath, r.getAttribute('Target')));
    });

    const sheets = new Map();
    const sheetEls = Array.from(wbDoc.getElementsByTagName('sheet'));
    for(const s of sheetEls){
      const name = s.getAttribute('name') || 'Planilha';
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      const path = relMap.get(rid);
      if(!path || !zip.has(path)) continue;
      const shDoc = xml(await zip.text(path),name);
      const cells = new Map();
      let maxRow=0,maxCol=0;
      Array.from(shDoc.getElementsByTagName('c')).forEach(c=>{
        const ref=c.getAttribute('r');
        if(!ref) return;
        const val=cellValue(c,shared);
        if(val!==null) cells.set(ref,val);
        const rc=rowColFromRef(ref);
        if(rc){ maxRow=Math.max(maxRow,rc.row); maxCol=Math.max(maxCol,rc.col); }
      });
      sheets.set(name,new SheetData(name,cells,maxRow,maxCol));
    }

    return {
      sheets,
      sheetNames:Array.from(sheets.keys()),
      getSheet(name){ return sheets.get(name)||null; },
      findSheet(predicate){ for(const [n,s] of sheets){ if(predicate(n,s)) return s; } return null; }
    };
  }

  global.PPGCAS_XLSX = { readWorkbook, colName };
})(window);
