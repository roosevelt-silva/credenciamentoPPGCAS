#!/usr/bin/env python3
"""Sincroniza a lista de docentes do PPGCAS com a página oficial.
Preserva a categoria conhecida (permanent/collaborator) quando possível e
classifica novos nomes pela posição relativa aos docentes já conhecidos.
Não altera a base de formação; docentes novos ficam sem Área/Grande Área até revisão.
"""
from __future__ import annotations
import csv, json, re, unicodedata, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

URL = "https://ppgcas.ufj.edu.br/docentes-e-pesquisadores/"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "js" / "docentes_atuais.js"
FORMATION_CSV = ROOT / "data" / "formacao_docentes.csv"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().upper()


def load_previous():
    if not OUT.exists(): return []
    txt = OUT.read_text(encoding="utf-8")
    m = re.search(r"window\.PPGCAS_DOCENTES_ATUAIS\s*=\s*(\{.*\})\s*;", txt, re.S)
    if m:
        try:
            return json.loads(m.group(1)).get("docentes", [])
        except Exception:
            pass
    # Compatibilidade com versões antigas do arquivo JS, em que as chaves
    # do objeto não estavam entre aspas.
    pat = re.compile(r'\{\s*nome:\s*"([^"]+)"\s*,\s*linha:\s*(\d+)\s*,\s*categoria:\s*"([^"]+)"\s*,\s*lattes:\s*"([^"]*)"\s*\}')
    return [
        {"nome": g[0], "linha": int(g[1]), "categoria": g[2], "lattes": g[3]}
        for g in pat.findall(txt)
    ]



def load_formation_csv():
    rows=[]
    limits={"area":"60","great":"80"}
    if not FORMATION_CSV.exists():
        return rows, limits
    with FORMATION_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader=csv.DictReader(f, delimiter=";")
        for row in reader:
            rows.append(dict(row))
            if row.get("limite_area_disciplinar"):
                limits["area"]=row["limite_area_disciplinar"]
            if row.get("limite_grande_area"):
                limits["great"]=row["limite_grande_area"]
    return rows, limits


def sync_formation_csv(docentes):
    existing, limits = load_formation_csv()
    by_name={norm(r.get("nome", "")): r for r in existing if r.get("nome")}
    fields=["nome","categoria","linha","area_disciplinar","grande_area","lattes","limite_area_disciplinar","limite_grande_area"]
    out=[]
    for i,d in enumerate(docentes):
        old=by_name.get(norm(d.get("nome", "")), {})
        out.append({
            "nome": d.get("nome", ""),
            "categoria": d.get("categoria", ""),
            "linha": d.get("linha", ""),
            "area_disciplinar": old.get("area_disciplinar", ""),
            "grande_area": old.get("grande_area", ""),
            "lattes": d.get("lattes", "") or old.get("lattes", ""),
            "limite_area_disciplinar": limits["area"] if i == 0 else "",
            "limite_grande_area": limits["great"] if i == 0 else "",
        })
    FORMATION_CSV.parent.mkdir(parents=True, exist_ok=True)
    with FORMATION_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer=csv.DictWriter(f, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerows(out)


def clean_name(text: str) -> str:
    text = re.sub(r"^(Profa?\.?|Prof\.?|Dra?\.?|Dr\.?)\s*", "", text.strip(), flags=re.I)
    text = re.sub(r"^(Dra?\.?|Dr\.?)\s*", "", text.strip(), flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def fetch_entries():
    req = urllib.request.Request(URL, headers={"User-Agent":"PPGCAS-sync/1.0 (+GitHub Pages)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")
    soup = BeautifulSoup(html, "html.parser")
    entries=[]
    for h in soup.find_all(["h2","h3","h4"]):
        name=clean_name(h.get_text(" ", strip=True))
        if len(name)<6 or name.lower().startswith(("corpo docente","coordena")): continue
        # Procura Linha de Pesquisa nos elementos seguintes até o próximo heading.
        line=0; lattes=""; node=h
        for _ in range(8):
            node=node.find_next()
            if not node: break
            if node.name in {"h2","h3","h4"} and node is not h: break
            t=node.get_text(" ", strip=True)
            m=re.search(r"Linha\s+de\s+Pesquisa\s*([12])", t, re.I)
            if m: line=int(m.group(1))
            if node.name=="a" and "lattes" in (node.get_text(" ",strip=True)+" "+str(node.get("href", ""))).lower():
                lattes=node.get("href", "")
        if line in (1,2): entries.append({"nome":name,"linha":line,"lattes":lattes})
    # dedup mantendo ordem
    seen=set(); out=[]
    for e in entries:
        k=norm(e["nome"])
        if k and k not in seen:
            seen.add(k); out.append(e)
    if len(out)<8:
        raise RuntimeError(f"Sincronização encontrou apenas {len(out)} docentes; arquivo atual não foi substituído.")
    return out


def classify(entries, previous):
    prev={norm(d.get("nome","")):d for d in previous}
    known_collab_indices=[]
    for i,e in enumerate(entries):
        d=prev.get(norm(e["nome"]))
        if d and d.get("categoria")=="collaborator": known_collab_indices.append(i)
    first_collab=min(known_collab_indices) if known_collab_indices else len(entries)
    result=[]
    for i,e in enumerate(entries):
        old=prev.get(norm(e["nome"]),{})
        category=old.get("categoria") or ("permanent" if i<first_collab else "collaborator")
        result.append({"nome":e["nome"],"linha":e["linha"],"categoria":category,"lattes":e.get("lattes") or old.get("lattes","")})
    return result


def write(docentes):
    payload={"versao":1,"atualizadoEm":datetime.now(timezone.utc).isoformat(),"fonte":URL,"docentes":docentes}
    text="/* Lista atual do PPGCAS — sincronizada automaticamente da página oficial. */\nwindow.PPGCAS_DOCENTES_ATUAIS = "+json.dumps(payload,ensure_ascii=False,indent=2)+";\n"
    OUT.write_text(text,encoding="utf-8")

if __name__=="__main__":
    previous=load_previous()
    entries=fetch_entries()
    docentes=classify(entries,previous)
    write(docentes)
    sync_formation_csv(docentes)
    print(f"Sincronizados {len(entries)} docentes em {OUT} e {FORMATION_CSV}")
