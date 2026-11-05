import importlib.util
from pathlib import Path
import json
import unittest

spec = importlib.util.spec_from_file_location('stats',Path(__file__).resolve().parent.parent/'scripts/collect-cbf-lower-statistics.py')
stats=importlib.util.module_from_spec(spec)
spec.loader.exec_module(stats)


class CbfStatistics(unittest.TestCase):
    def snapshot(self,name):
        return json.loads((Path(__file__).resolve().parent.parent/'data'/name).read_text(encoding='utf-8'))

    def test_primary_failure_uses_wikipedia_without_merging_rankings(self):
        previous=self.snapshot('cbf-serie-c-statistics-2026.json')
        wiki=self.snapshot('wikipedia-serie-c-statistics-2026.json')
        def offline(series):raise OSError('CBF offline')
        result=stats.collect('c',primary=offline,secondary=lambda series:wiki,previous=previous)
        self.assertEqual(result['provider'],'Wikipédia')
        self.assertEqual(result['scorers'],wiki['scorers'])
        self.assertEqual(result['rounds'],previous['rounds'])
        self.assertEqual(result['roundsCollectedAt'],previous['collectedAt'])

    def test_both_sources_failing_preserves_original_date_and_marks_snapshot_stale(self):
        previous=self.snapshot('cbf-serie-d-statistics-2026.json')
        def offline(series):raise OSError('offline')
        result=stats.collect('d',primary=offline,secondary=offline,previous=previous)
        self.assertTrue(result['stale'])
        self.assertEqual(result['collectedAt'],previous['collectedAt'])
        self.assertEqual(result['scorers'],previous['scorers'])
        with self.assertRaises(ValueError):stats.collect('d',primary=offline,secondary=offline,previous={'season':2025})

    def test_primary_success_never_queries_secondary(self):
        previous=self.snapshot('cbf-serie-c-statistics-2026.json')
        def unexpected(series):raise AssertionError('Secondary must not be queried')
        result=stats.collect('c',primary=lambda series:previous,secondary=unexpected,previous=previous)
        self.assertEqual(result['provider'],'CBF')

    def test_wikipedia_rowspan_keeps_tied_goals_and_footnotes_do_not_change_values(self):
        wiki=stats.wikipedia_module()
        from lxml import html
        table=html.fromstring('<table><tr><td rowspan="2">11</td><td>Primeiro</td><td>Clube A</td></tr><tr><td>Segundo</td><td>Clube B</td></tr></table>')
        rows=wiki.grid(table)
        self.assertEqual([[wiki.text(cell) for cell in row] for row in rows],[['11','Primeiro','Clube A'],['11','Segundo','Clube B']])
        self.assertEqual(wiki.text(html.fromstring('<td>30<sup>[a]</sup></td>')),'30')
    def feed(self,total=23,duplicate=False,missing=False):
        calls=[]
        def fetch(url):
            page=int(url.rsplit('/',1)[-1]);calls.append(page)
            athletes=[{'id':str(i if not duplicate else 1),'nome':'Atleta '+str(i),'apelido':'A '+str(i),
                       'gols':'1','clube':{'id':'200'}} for i in range((page-1)*10+1,min(page*10,total)+1)]
            if missing and page==3: athletes=[]
            return json.dumps({'meta':[{'pagina':str(page),'total':'2','total_atletas':str(total)}],
                               'atletas':athletes}).encode()
        return fetch,calls

    def test_reported_page_count_does_not_truncate_final_athletes(self):
        fetch,calls=self.feed()
        players,sources=stats.scorers(fetch,'3',{'200':{'id':'cbf-200','name':'Clube'}})
        self.assertEqual(len(players),23)
        self.assertEqual(calls,[1,2,3])
        self.assertEqual(len(sources),3)

    def test_incomplete_and_duplicate_rankings_are_rejected(self):
        for kwargs in ({'duplicate':True},{'missing':True}):
            fetch,calls=self.feed(**kwargs)
            with self.assertRaises(ValueError):stats.scorers(fetch,'3',{'200':{'id':'cbf-200','name':'Clube'}})
            self.assertLessEqual(len(calls),4)

    def table(self,rank='1',head='PTS'):
        headers=['Classificação',head,'J','V','E','D','GP','GC','SG','CA','CV','%','Recentes','Próx']
        cells=[f'<strong>{rank}</strong><a href="/futebol-brasileiro/times/campeonato-brasileiro/serie-c/2026/200">Clube</a>',
               '3','1','1','0','0','2','1','1','2','0','100','','']
        return ('<div>GRUPO A<div><table><thead><tr>'+''.join('<th>'+value+'</th>' for value in headers)
                +'</tr></thead><tbody><tr>'+''.join('<td>'+value+'</td>' for value in cells)
                +'</tr></tbody></table></div></div>').encode()

    def test_official_order_and_column_schema_are_required(self):
        clubs={'200':{'id':'cbf-200','name':'Clube','logo':''}}
        groups=stats.point_tables(self.table(),clubs,'2013','1ª Fase',1,1)
        self.assertEqual(groups[0]['rows'][0]['stats']['yellowCards'],'2')
        for raw in (self.table(rank='2'),self.table(head='OUTRO')):
            with self.assertRaises(ValueError):stats.point_tables(raw,clubs,'2013','1ª Fase',1,1)


if __name__=='__main__':unittest.main()
