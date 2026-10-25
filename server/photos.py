"""Optional, licensed portraits. Identity is matched by Wikidata P2446, never name.

Do not use Transfermarkt portrait URLs: public accessibility is not a reuse grant.
Only Commons files with an explicitly supported free license are returned.
"""
from datetime import UTC, datetime
from html import unescape
from html.parser import HTMLParser
import re
import threading
from urllib.parse import unquote, urlsplit

import httpx
from cachetools import TTLCache

USER_AGENT = 'Sportstates/1.0 (https://github.com/Isaias-Barbosa/Sportstates; licensed player portraits)'
PHOTO_CACHE = TTLCache(maxsize=512, ttl=86400)
LOCK = threading.Lock()


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]
    def handle_data(self, data):
        self.parts.append(data)


def plain(value):
    parser=PlainText(); parser.feed(str(value or ''))
    return unescape(' '.join(parser.parts)).strip()


def safe_url(value, hosts):
    url=urlsplit(value or '')
    if url.scheme != 'https' or url.hostname not in hosts or url.username or url.password:
        return None
    return value


def licensed_photo(page):
    info=(page.get('imageinfo') or [{}])[0]
    meta=info.get('extmetadata') or {}
    field=lambda name: plain(meta.get(name, {}).get('value'))
    license_name=field('LicenseShortName')
    attribution_license=bool(re.fullmatch(r'CC BY(?:-SA)? (?:1\.0|2\.0|2\.5|3\.0|4\.0)',license_name))
    if not attribution_license and license_name not in ('CC0','Public domain','CC0 1.0'):
        return None
    author=field('Artist')
    if attribution_license and not author:
        return None
    image=safe_url(info.get('thumburl'), {'upload.wikimedia.org'})
    source=safe_url(info.get('descriptionurl'), {'commons.wikimedia.org'})
    license_url=safe_url(meta.get('LicenseUrl',{}).get('value'), {'creativecommons.org','commons.wikimedia.org'})
    if not image or not source or (attribution_license and not license_url):
        return None
    return {'url':image,'sourceUrl':source,'license':license_name,'licenseUrl':license_url or source,
            'author':author or 'Autor não informado','title':page.get('title',''),
            'source':'Wikimedia Commons','modified':False}


def title_key(title):
    return title.replace('_',' ').strip()


async def fetch_photos(ids, client):
    values=' '.join('"'+pid+'"' for pid in ids)
    query='SELECT ?id ?image WHERE { VALUES ?id { '+values+' } ?player <http://www.wikidata.org/prop/direct/P2446> ?id; <http://www.wikidata.org/prop/direct/P18> ?image. }'
    response=await client.get('https://query.wikidata.org/sparql',params={'query':query,'format':'json'})
    response.raise_for_status()
    bindings=response.json()['results']['bindings']
    titles={}
    for row in bindings:
        pid=row.get('id',{}).get('value')
        uri=urlsplit(row.get('image',{}).get('value',''))
        if pid not in ids or uri.hostname != 'commons.wikimedia.org' or not uri.path.startswith('/wiki/Special:FilePath/'):
            continue
        title='File:'+unquote(uri.path.removeprefix('/wiki/Special:FilePath/'))
        titles.setdefault(title_key(title),[]).append(pid)
    photos={pid:None for pid in ids}
    if not titles:
        return photos
    response=await client.get('https://commons.wikimedia.org/w/api.php',params={
        'action':'query','format':'json','formatversion':2,'prop':'imageinfo',
        'titles':'|'.join(titles),'iiprop':'url|extmetadata','iiurlwidth':160,
        'iiextmetadatafilter':'Artist|LicenseShortName|LicenseUrl|AttributionRequired'})
    response.raise_for_status()
    for page in response.json()['query']['pages']:
        photo=licensed_photo(page)
        if photo:
            for pid in titles.get(title_key(page.get('title','')),[]):
                # Stable choice if Wikidata lists several files for one player.
                if photos[pid] is None: photos[pid]=photo
    return photos


async def photos_route(query):
    raw=query.get('ids','')
    ids=sorted(set(raw.split(',')))
    if not 1<=len(ids)<=6 or any(not re.fullmatch(r'[1-9]\d{0,9}',pid) for pid in ids):
        return 400,{'error':'Informe de 1 a 6 IDs válidos do Transfermarkt.'}
    with LOCK:
        result={pid:PHOTO_CACHE[pid] for pid in ids if pid in PHOTO_CACHE}
    missing=[pid for pid in ids if pid not in result]
    warnings=[]
    if missing:
        try:
            async with httpx.AsyncClient(timeout=10,headers={'User-Agent':USER_AGENT,'Accept':'application/json'}) as client:
                found=await fetch_photos(missing,client)
            with LOCK:
                for pid,photo in found.items(): PHOTO_CACHE[pid]=photo
            result.update(found)
        except (httpx.HTTPError,KeyError,TypeError,ValueError):
            # Photo failure never hides transfer records. Do not cache failures.
            warnings=['As fotos estão temporariamente indisponíveis.']
            result.update({pid:None for pid in missing})
    return 200,{'photos':result,'source':'Wikimedia Commons','warnings':warnings,
               'fetchedAt':datetime.now(UTC).isoformat()}
