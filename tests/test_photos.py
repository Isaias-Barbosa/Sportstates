import unittest
import httpx
from server.photos import licensed_photo, plain, fetch_photos, photos_route, PHOTO_CACHE

def page(license='CC BY-SA 4.0', artist='<a href="https://example.org">Jane Doe</a>'):
 return {'title':'File:Player.jpg','imageinfo':[{'thumburl':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Player.jpg/160px-Player.jpg','descriptionurl':'https://commons.wikimedia.org/wiki/File:Player.jpg','extmetadata':{'LicenseShortName':{'value':license},'LicenseUrl':{'value':'https://creativecommons.org/licenses/by-sa/4.0/'},'Artist':{'value':artist}}}]}
class PhotoTests(unittest.IsolatedAsyncioTestCase):
 def test_free_license_with_author_and_source(self):
  photo=licensed_photo(page())
  self.assertEqual(photo['author'],'Jane Doe');self.assertEqual(photo['license'],'CC BY-SA 4.0');self.assertIn('commons.wikimedia.org',photo['sourceUrl'])
 def test_nonfree_unknown_and_missing_attribution_rejected(self):
  for name in ['Fair use','CC BY-NC 4.0','CC BY-ND 4.0','All rights reserved','']:
   self.assertIsNone(licensed_photo(page(name)))
  self.assertIsNone(licensed_photo(page(artist='')))
 def test_untrusted_thumbnail_url_rejected(self):
  p=page();p['imageinfo'][0]['thumburl']='https://evil.example/player.jpg';self.assertIsNone(licensed_photo(p))
 def test_public_domain_allowed_and_html_is_plain_text(self):
  self.assertIsNotNone(licensed_photo(page('Public domain','')))
  self.assertEqual(plain('<b>A &amp; B</b>'),'A & B')
 async def test_wikidata_identity_and_commons_metadata_both_required(self):
  def respond(req):
   if req.url.host=='query.wikidata.org':
    self.assertIn('P2446',req.url.params['query']);self.assertIn('"99397"',req.url.params['query'])
    return httpx.Response(200,json={'results':{'bindings':[{'id':{'value':'99397'},'image':{'value':'http://commons.wikimedia.org/wiki/Special:FilePath/Player.jpg'}},{'id':{'value':'999'},'image':{'value':'http://commons.wikimedia.org/wiki/Special:FilePath/Wrong.jpg'}}]}})
   self.assertEqual(req.url.params['titles'],'File:Player.jpg')
   return httpx.Response(200,json={'query':{'pages':[page()]}})
  async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
   photos=await fetch_photos(['99397','123'],client)
  self.assertIsNotNone(photos['99397']);self.assertIsNone(photos['123']);self.assertNotIn('999',photos)
 async def test_photo_query_validated_before_network(self):
  for ids in ['','../x','1,2,3,4,5,6,7','1,evil']:
   status,_=await photos_route({'ids':ids});self.assertEqual(status,400)
