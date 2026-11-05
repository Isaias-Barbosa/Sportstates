"""Secondary 2026 standings/scorer snapshots, with independent Wikipedia provenance."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlparse
from lxml import html

spec = importlib.util.spec_from_file_location('lower',Path(__file__).with_name('collect-cbf-lower-divisions.py'))
lower=importlib.util.module_from_spec(spec)
spec.loader.exec_module(lower)
KEYS=['points','gamesPlayed','wins','ties','losses','goalsFor','goalsAgainst','goalDifference']


def text(cell):
    copy=html.fromstring(html.tostring(cell))
    for element in copy.xpath('.//sup|.//style|.//script|.//*[contains(@class,"noprint")]'):
        element.drop_tree()
    return ' '.join(' '.join(copy.itertext()).split())


def grid(table):
    result,spans=[],{}
    for tr in table.xpath('./tbody/tr|./tr|./thead/tr'):
        row=[]
        for cell in tr.xpath('./th|./td'):
            while len(row) in spans:
                value,remaining=spans[len(row)];row.append(value)
                if remaining==1:del spans[len(row)-1]
                else:spans[len(row)-1]=(value,remaining-1)
            count=int(cell.get('colspan','1'));duration=int(cell.get('rowspan','1'))
            if not 1<=count<=30 or not 1<=duration<=100:raise ValueError('Span inválido')
            for _ in range(count):
                if duration>1:spans[len(row)]=(cell,duration-1)
                row.append(cell)
        while len(row) in spans:
            value,remaining=spans[len(row)];row.append(value)
            if remaining==1:del spans[len(row)-1]
            else:spans[len(row)-1]=(value,remaining-1)
        result.append(row)
    return result


def canonical(url):
    parsed=urlparse(urljoin('https://pt.wikipedia.org/',url))
    if parsed.netloc!='pt.wikipedia.org':return ''
    return unquote(parsed.path).replace(' ','_')


def parse(raw,season,series):
    doc=html.fromstring(raw,parser=html.HTMLParser(encoding='utf-8'))
    title=' '.join(doc.xpath('//h1//text()'))
    if '2026' not in title or not re.search(r'Série[ _]'+series.upper()+r'\b',title):raise ValueError('Edição da Wikipédia divergente')
    for element in doc.xpath('//style|//script'):element.drop_tree()
    clubs={canonical(club['wikiUrl']):club for club in season['clubs']}
    def identify(cell):
        found={clubs[key]['id']:clubs[key] for link in cell.xpath('.//a/@href') if (key:=canonical(link)) in clubs}
        if len(found)!=1:raise ValueError('Clube sem vínculo inequívoco com o catálogo')
        return next(iter(found.values()))
    groups,scorers=[],[]
    for table in doc.xpath('//table'):
        heading=table.xpath('string(preceding::*[self::h2 or self::h3][1])').strip()
        group=re.fullmatch(r'Grupo\s+(A\d*|B|C)',heading)
        headers=[text(cell) for cell in table.xpath('(./tbody/tr|./tr|./thead/tr)[1]/*')]
        if not ((group and headers and headers[0].startswith('Pos')) or
                (len(headers)==3 and headers[0].startswith('Gols') and headers[1:]==['Jogador','Equipe'])):continue
        rows=grid(table)
        if not rows:continue
        if group and len(headers)>=10 and headers[0].startswith('Pos') and headers[2:10]==['Pts','J','V','E','D','GP','GC','SG']:
            phase='2013' if series=='c' and group[1]=='A' else '2098' if series=='c' else '2040'
            values=[]
            for row in rows[1:]:
                if len(row)<10:raise ValueError('Tabela da Wikipédia incompleta')
                club=identify(row[1]);rank=text(row[0])
                if not rank.isdigit() or int(rank)!=len(values)+1:raise ValueError('Ordem da Wikipédia inválida')
                numbers=[re.sub(r'^([+-])\s+',r'\1',text(cell).replace('−','-')).removeprefix('+') for cell in row[2:10]]
                if any(not re.fullmatch(r'-?\d+',value) for value in numbers):raise ValueError(f'Estatística da Wikipédia inválida: {numbers}')
                stats=dict(zip(KEYS,numbers))
                if int(stats['gamesPlayed'])!=sum(int(stats[k]) for k in ('wins','ties','losses')) or int(stats['goalDifference'])!=int(stats['goalsFor'])-int(stats['goalsAgainst']):raise ValueError('Totais inconsistentes')
                values.append({'id':club['id'],'name':club.get('displayName',club['name']),'logo':club['logo'],'rank':rank,'stats':stats})
            groups.append({'name':('2ª Fase' if phase=='2098' else '1ª Fase')+' · '+heading,'phaseId':phase,'rows':values})
        if len(headers)==3 and headers[0].startswith('Gols') and headers[1:]==['Jogador','Equipe']:
            if scorers:raise ValueError('Artilharia ambígua')
            for row in rows[1:]:
                if len(row)!=3:raise ValueError('Artilharia incompleta')
                goals=text(row[0]);name=text(row[1]);club=identify(row[2])
                if not goals.isdigit() or not name:raise ValueError('Artilheiro inválido')
                # Independent source ID; never pretend a name match proves a CBF identity.
                identity=sha256((club['id']+':'+name).encode()).hexdigest()[:16]
                scorers.append({'id':'wikipedia-'+identity,'name':name,'value':int(goals),'teamId':club['id'],'teamName':club.get('displayName',club['name'])})
    expected={'c':[20,4,4],'d':[6]*16}[series]
    if [len(group['rows']) for group in groups]!=expected:raise ValueError('Grupos incompletos na Wikipédia')
    names=['1ª Fase · Grupo A','2ª Fase · Grupo B','2ª Fase · Grupo C'] if series=='c' else [f'1ª Fase · Grupo A{i}' for i in range(1,17)]
    if [group['name'] for group in groups]!=names:raise ValueError('Identificações dos grupos divergentes')
    for phase in {group['phaseId'] for group in groups}:
        ids=[row['id'] for group in groups if group['phaseId']==phase for row in group['rows']]
        if len(set(ids))!=len(ids):raise ValueError('Clube duplicado na fase')
    if not scorers or len(set(p['id'] for p in scorers))!=len(scorers) or any(a['value']<b['value'] for a,b in zip(scorers,scorers[1:])):raise ValueError('Artilharia inválida')
    source=season['wikipedia']['url']
    return {'league':season['league'],'season':2026,'provider':'Wikipédia','sourceUrl':source,
            'collectedAt':datetime.now(timezone.utc).isoformat(),'sha256':sha256(raw).hexdigest(),
            'groups':groups,'scorers':scorers,'partial':True,
            'attribution':'Wikipédia · colaboradores · CC BY-SA 4.0',
            'licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/',
            'warnings':['Fonte alternativa: Wikipédia. A ordem é a publicada nessa fonte; cartões individuais, assistências e escalações não são cobertos.',
                        'A artilharia da Wikipédia é um recorte dos principais goleadores, não a lista completa de atletas.']}


def collect(series,fetch=lower.fetch):
    root=Path(__file__).resolve().parent.parent
    season=json.loads((root/f'data/cbf-serie-{series}-2026.json').read_text(encoding='utf-8'))
    return parse(fetch(season['wikipedia']['url']),season,series)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('series',choices=('c','d'));args=parser.parse_args()
    try:result=collect(args.series)
    except (OSError,ValueError,KeyError,TypeError,IndexError) as error:parser.exit(1,f'Coleta alternativa interrompida: {error}\n')
    sys.stdout.reconfigure(encoding='utf-8');print(json.dumps(result,ensure_ascii=False,indent=2))
