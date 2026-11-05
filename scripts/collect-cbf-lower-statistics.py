"""Collect reviewed CBF point tables and published scorer rankings, outside request handling."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import re
import sys
from time import sleep
from tempfile import gettempdir
from time import time
from urllib.error import HTTPError
from lxml import html

spec = importlib.util.spec_from_file_location('lower', Path(__file__).with_name('collect-cbf-lower-divisions.py'))
lower = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lower)
CONFIG = {'c': ('3', [('2013', '1ª Fase', 1, 20), ('2098', '2ª Fase', 2, 8)]),
          'd': ('5', [('2040', '1ª Fase', 16, 96)])}
KNOCKOUT = {'c': [('2117','Final',2)], 'd': [('2066','2ª Fase',64),('2068','3ª Fase',32),
    ('2075','4ª Fase',16),('2080','Quartas de final',8),('2089','Semifinais',4),
    ('2090','Playoff de acesso',4),('2099','Final',2)]}
STAT_KEYS = ['points', 'gamesPlayed', 'wins', 'ties', 'losses', 'goalsFor', 'goalsAgainst',
             'goalDifference', 'yellowCards', 'redCards', 'winPercent']


def cached_fetch(url):
    cache = Path(gettempdir()) / 'sportstates-cbf-statistics'
    cache.mkdir(exist_ok=True)
    path = cache / (sha256(url.encode()).hexdigest() + '.bin')
    if path.exists() and time() - path.stat().st_mtime < 86400:
        return path.read_bytes()
    for attempt in range(2):
        try:
            raw = lower.fetch(url)
            path.write_bytes(raw)
            return raw
        except HTTPError as error:
            if attempt or error.code not in (502,503,504):
                raise
            sleep(2)


def point_tables(raw, clubs, phase, phase_name, group_count, row_count):
    doc = html.fromstring(raw, parser=html.HTMLParser(encoding='utf-8'))
    tables = doc.xpath('//table[thead/tr/th[1][contains(.,"Classificação")]]')
    groups, seen = [], set()
    if len(tables) != group_count:
        raise ValueError('Quantidade de grupos divergente')
    for table in tables:
        headers = [''.join(cell.xpath('./text()')).strip() for cell in table.xpath('./thead/tr/th')]
        if headers[:12] != ['Classificação','PTS','J','V','E','D','GP','GC','SG','CA','CV','%']:
            raise ValueError('Colunas da classificação divergentes')
        heading = ' '.join(table.getparent().getparent().itertext()).split('Classificação')[0]
        name = re.search(r'GRUPO\s+([A-Z0-9]+)', heading)
        if not name:
            raise ValueError('Grupo sem identificação')
        rows = []
        for tr in table.xpath('./tbody/tr'):
            cells = tr.xpath('./td')
            links = cells[0].xpath('.//a/@href') if cells else []
            ids = [link.rsplit('/', 1)[-1] for link in links if '/times/campeonato-brasileiro/' in link]
            ranks = cells[0].xpath('(.//strong)[1]/text()') if cells else []
            if len(cells) != 14 or len(set(ids)) != 1 or len(ranks) != 1:
                raise ValueError('Linha de classificação não reconhecida')
            club = clubs.get(ids[0])
            if not club or club['id'] in seen or int(ranks[0]) != len(rows) + 1:
                raise ValueError('Identidade ou ordem da classificação inválida')
            values = [''.join(cell.itertext()).strip() for cell in cells[1:12]]
            if any(not re.fullmatch(r'-?\d+(?:[,.]\d+)?', value) for value in values):
                raise ValueError('Estatística inválida')
            stats = dict(zip(STAT_KEYS, values))
            if (int(stats['gamesPlayed']) != sum(int(stats[k]) for k in ('wins','ties','losses'))
                or int(stats['goalDifference']) != int(stats['goalsFor']) - int(stats['goalsAgainst'])):
                raise ValueError('Totais da classificação inconsistentes')
            rows.append({'id': club['id'], 'name': club.get('displayName', club['name']),
                         'logo': club['logo'], 'rank': ranks[0], 'stats': stats})
            seen.add(club['id'])
        if len(rows) != row_count // group_count:
            raise ValueError('Grupo incompleto')
        groups.append({'name': f'{phase_name} · Grupo {name[1]}', 'phaseId': phase, 'rows': rows})
    if len(seen) != row_count:
        raise ValueError('Classificação incompleta')
    return groups


def scorers(fetch, category, clubs):
    result, seen, sources, pages, total = [], set(), [], None, None
    for page in range(1, 21):
        url = f'https://www.cbf.com.br/api/cbf/artilheiros/42/{category}/2026/{page}'
        raw = fetch(url)
        payload = json.loads(raw)
        meta = payload['meta'][0] if isinstance(payload['meta'], list) else payload['meta']
        current_pages, current_total = int(meta['total']), int(meta['total_atletas'])
        if pages is None:
            pages, total = current_pages, current_total
        if not 1 <= pages <= 20 or page > pages + 1 or (current_pages, current_total, int(meta['pagina'])) != (pages, total, page):
            raise ValueError('Paginação da artilharia divergente')
        sources.append({'url': url, 'sha256': sha256(raw).hexdigest()})
        for player in payload['atletas']:
            club = clubs.get(player['clube']['id'])
            if (not re.fullmatch(r'\d{1,12}', player['id']) or player['id'] in seen or not club
                or not re.fullmatch(r'[1-9]\d?', player['gols']) or not player['nome'].strip()):
                raise ValueError('Artilheiro sem identidade única ou clube conhecido')
            seen.add(player['id'])
            result.append({'id': 'cbf-' + player['id'], 'name': player['apelido'].strip() or player['nome'].strip(),
                           'fullName': player['nome'].strip(), 'value': int(player['gols']),
                           'teamId': club['id'], 'teamName': club.get('displayName', club['name'])})
        # The verified feed rounds its page count down (79 athletes => 7 pages
        # of ten, but page 8 contains nine). Honor the athlete total, allowing
        # at most one additional page; never publish a truncated ranking.
        if len(result) == total:
            break
        sleep(.25)
    if len(result) != total or any(a['value'] < b['value'] for a,b in zip(result,result[1:])):
        raise ValueError('Artilharia incompleta ou fora de ordem')
    return result, sources


def collect_cbf(series):
    root = Path(__file__).resolve().parent.parent
    fixtures = json.loads((root / f'data/cbf-serie-{series}-2026.json').read_text(encoding='utf-8'))
    clubs = {club['cbfId']: club for club in fixtures['clubs']}
    category, phases = CONFIG[series]
    groups, sources = [], []
    for phase, name, group_count, row_count in phases:
        url = fixtures['sourceUrl'] + '/' + phase
        raw = cached_fetch(url)
        groups.extend(point_tables(raw, clubs, phase, name, group_count, row_count))
        sources.append({'url': url, 'sha256': sha256(raw).hexdigest()})
        sleep(.25)
    leaders, ranking_sources = scorers(cached_fetch, category, clubs)
    rounds, seen = [], set()
    known = {match['id']: match for match in fixtures['matches']}
    for phase, name, expected in KNOCKOUT[series]:
        games = []
        for leg in (1,2):
            competition = lower.CONFIG[series][1]
            url = f'https://www.cbf.com.br/api/cbf/jogos/campeonato/{competition}/rodada/{leg}/fase/{phase}'
            raw = cached_fetch(url)
            for group in json.loads(raw)['jogos']:
                for game in group['jogo']:
                    event = game['id_jogo']
                    if event not in known or event in seen or int(game['rodada']) != leg:
                        raise ValueError('Fase eliminatória divergente do calendário revisado')
                    seen.add(event)
                    games.append({'id': event, 'leg': 'Ida' if leg == 1 else 'Volta'})
            sources.append({'url':url, 'sha256':sha256(raw).hexdigest()})
            sleep(.25)
        if len(games) != expected:
            raise ValueError('Fase eliminatória incompleta')
        rounds.append({'id':'cbf-'+phase,'name':name,'matches':games})
    match_goals = sum(int(m[side]['score']) for m in fixtures['matches'] if m['finished'] for side in ('home', 'away'))
    ranking_goals = sum(player['value'] for player in leaders)
    return {'league': fixtures['league'], 'season': 2026, 'collectedAt': datetime.now(timezone.utc).isoformat(),
            'sourceUrl': fixtures['sourceUrl'], 'sources': sources + ranking_sources,
            'groups': groups, 'rounds': rounds, 'scorers': leaders,
            'coverage': {'publishedScorers': len(leaders), 'publishedGoals': ranking_goals,
                         'fixtureGoals': match_goals, 'scorersCompleteForFixtures': ranking_goals == match_goals}}


def wikipedia_module():
    spec=importlib.util.spec_from_file_location('wiki_stats',Path(__file__).with_name('collect-wikipedia-lower-statistics.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def valid_snapshot(data,series):
    if not isinstance(data,dict) or data.get('league')!=lower.CONFIG[series][0] or data.get('season')!=2026:
        return False
    try:
        datetime.fromisoformat(data['collectedAt'])
        season=json.loads((Path(__file__).resolve().parent.parent/f'data/cbf-serie-{series}-2026.json').read_text(encoding='utf-8'))
        ids={club['id'] for club in season['clubs']};matches={game['id'] for game in season['matches']}
        if [len(group['rows']) for group in data['groups']]!=([20,4,4] if series=='c' else [6]*16):return False
        if [group['phaseId'] for group in data['groups']]!=(['2013','2098','2098'] if series=='c' else ['2040']*16):return False
        phases={}
        for group in data['groups']:
            seen=phases.setdefault(group['phaseId'],set())
            for rank,row in enumerate(group['rows'],1):
                if row['id'] not in ids or row['id'] in seen or int(row['rank'])!=rank:return False
                seen.add(row['id'])
                values={key:int(row['stats'][key]) for key in STAT_KEYS[:8]}
                if values['gamesPlayed']!=sum(values[key] for key in ('wins','ties','losses')) or values['goalDifference']!=values['goalsFor']-values['goalsAgainst']:return False
        players=data['scorers']
        if not players or len({p['id'] for p in players})!=len(players):return False
        if any(p['teamId'] not in ids or not p['name'].strip() or not isinstance(p['value'],int) or p['value']<1 for p in players):return False
        if any(a['value']<b['value'] for a,b in zip(players,players[1:])):return False
        games=[game for r in data.get('rounds',[]) for game in r['matches']]
        return len({g['id'] for g in games})==len(games) and all(g['id'] in matches and g['leg'] in ('Ida','Volta') for g in games)
    except (OSError,ValueError,TypeError,KeyError,IndexError):return False


def collect(series, primary=None, secondary=None, previous=None):
    """Refresh atomically: CBF -> independent Wikipedia -> last valid snapshot.

    Source IDs and entire tables remain separate; never merge scorer identities
    or use a partial collection to replace a validated table.
    """
    if previous is None:
        path=Path(__file__).resolve().parent.parent/f'data/cbf-serie-{series}-statistics-2026.json'
        if path.exists():
            try:previous=json.loads(path.read_text(encoding='utf-8'))
            except (OSError,ValueError):previous=None
    if not valid_snapshot(previous,series):previous=None
    try:
        result=(primary or collect_cbf)(series)
        if not valid_snapshot(result,series):raise ValueError('Coleta primária inválida')
        return {**result,'provider':'CBF','stale':False}
    except (OSError,ValueError,KeyError,TypeError,IndexError):
        pass
    try:
        wiki=(secondary or wikipedia_module().collect)(series)
        if not valid_snapshot(wiki,series):raise ValueError('Coleta alternativa inválida')
        rounds=(previous or {}).get('rounds',[])
        return {**wiki,'sources':[{'url':wiki['sourceUrl'],'sha256':wiki['sha256']}],
            'rounds':rounds,'roundsProvider':(previous or {}).get('roundsProvider','CBF · arquivo'),
            'roundsCollectedAt':(previous or {}).get('roundsCollectedAt',(previous or {}).get('collectedAt')),
            'coverage':{'publishedScorers':len(wiki['scorers']),
                        'publishedGoals':sum(player['value'] for player in wiki['scorers']),
                        'scorersCompleteForFixtures':False},'stale':False,
            'warnings':wiki['warnings']+['A coleta da CBF falhou; classificação e artilharia foram recuperadas da Wikipédia.',
                'As fases eliminatórias preservam a coleta anterior.' if rounds else 'Fases eliminatórias indisponíveis nesta recuperação.']}
    except (OSError,ValueError,KeyError,TypeError,IndexError):
        if not previous or previous.get('league')!=lower.CONFIG[series][0] or previous.get('season')!=2026:
            raise ValueError('CBF e Wikipédia indisponíveis; nenhum snapshot válido para preservar')
        return {**previous,'stale':True,'warnings':previous.get('warnings',[])+
            ['CBF e Wikipédia indisponíveis. Exibindo a última coleta, com data e origem preservadas.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('series', choices=CONFIG)
    args = parser.parse_args()
    try:
        result = collect(args.series)
    except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
        parser.exit(1, f'Coleta interrompida: {error}\n')
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
