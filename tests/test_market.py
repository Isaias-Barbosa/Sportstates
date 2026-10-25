import asyncio
import unittest
from unittest.mock import patch
from server.market import market_route, handle_market, normalized_history, MarketError, _CACHE
from transfermarkt_api.exceptions import UpstreamBlocked

class Fake:
    def __init__(self, count=8, fail=None):
        self.count=count
        self.fail=fail or set()
        self.calls=[]
        self.active=0
        self.peak=0
    async def __aenter__(self): return self
    async def __aexit__(self,*args): pass
    async def search(self,name,page): return {'results':[{'id':'985','name':'Manchester United','country':'England'}], 'lastPageNumber':2,'updatedAt':'2026-10-25T12:00:00'}
    async def squad(self,club): return {'players':[{'id':str(i+1),'name':f'Player {i+1}'} for i in range(self.count)],'updatedAt':'2026-10-25T12:00:00'}
    async def history(self,player):
        self.calls.append(player);self.active+=1;self.peak=max(self.peak,self.active)
        await asyncio.sleep(0)
        self.active-=1
        if player in self.fail: raise UpstreamBlocked('blocked')
        return {'updatedAt':'2026-10-25T11:00:00','transfers':[{'id':player,'clubFrom':{'id':'1','name':'Former'},'clubTo':{'id':'985','name':'Manchester United'},'date':'2026-07-01','fee':0,'marketValue':1000,'transferType':'freeTransfer','upcoming':False}, {'id':'unrelated','clubFrom':{'id':'2','name':'Other'},'clubTo':{'id':'3','name':'Another'},'date':'2025-01-01'}]}

class MarketTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self): _CACHE.clear()
    async def test_contract_keeps_zero_and_filters_unrelated_history(self):
        data=await market_route({'tmid':'985'}, Fake(count=1))
        self.assertEqual(len(data['transfers']),1)
        self.assertEqual(data['transfers'][0]['fee'],0)
        self.assertEqual(data['transfers'][0]['type'],'Sem custo')
        self.assertEqual(data['transfers'][0]['from'],'Former')
        self.assertIn('Não inclui todas as saídas',data['coverage'])
        self.assertEqual(data['fetchedAt'],'2026-10-25T11:00:00+00:00')
    async def test_pagination_caps_work_and_concurrency(self):
        fake=Fake();data=await market_route({'tmid':'985'},fake)
        self.assertEqual(len(fake.calls),6);self.assertLessEqual(fake.peak,3)
        self.assertEqual(data['lastPage'],2)
        second=await market_route({'tmid':'985','page':'2'},fake)
        self.assertEqual(second['queriedPlayers'],2)
        self.assertEqual(fake.calls[-2:],['7','8'])
    async def test_successful_histories_are_cached(self):
        fake=Fake(count=1)
        await market_route({'tmid':'985'},fake)
        await market_route({'tmid':'985'},fake)
        self.assertEqual(fake.calls,['1'])
    async def test_partial_failure_has_warning(self):
        data=await market_route({'tmid':'985'},Fake(count=2,fail={'1'}))
        self.assertEqual(data['failedPlayers'],1);self.assertTrue(data['warnings'])
    async def test_all_blocked_does_not_become_empty_success(self):
        with patch('server.market.SDKAdapter',return_value=Fake(count=2,fail={'1','2'})):
            status,data=await handle_market({'tmid':'985'})
        self.assertEqual(status,503);self.assertIn('recusou',data['error'])
    async def test_invalid_inputs_before_network(self):
        for q in ({'tmid':'../x'},{'tmid':'985','page':'0'},{'operation':'search','q':'x'}):
            status,_=await handle_market(q);self.assertEqual(status,400)
    async def test_search_returns_candidates_not_first_guessed_club(self):
        data=await market_route({'operation':'search','q':'Manchester'},Fake())
        self.assertEqual(data['results'][0]['id'],'985');self.assertEqual(data['lastPage'],2)
    async def test_missing_fields_not_fabricated(self):
        rows=normalized_history({'id':'1','name':'Player'},{'transfers':[{'id':'2','clubTo':{'id':'985'},'clubFrom':{'id':'1'}}]},'985')
        self.assertIsNone(rows[0]['fee']);self.assertIsNone(rows[0]['date'])

if __name__=='__main__': unittest.main()
