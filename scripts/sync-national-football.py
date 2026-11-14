"""Refresh the checked-in national football snapshots from ESPN."""
import concurrent.futures
import gzip
import hashlib
import json
from pathlib import Path
import re
import time
from datetime import datetime, timezone
from urllib.request import urlopen

SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer/"
CORE = "https://sports.core.api.espn.com/v2/sports/soccer/"
LEAGUES = ["fifa.world", "uefa.nations", "concacaf.nations.league", "fifa.friendly"]
YEAR = 2026
CACHE = Path("/tmp/sportstates-national-2026")
CACHE.mkdir(exist_ok=True)
POOL = concurrent.futures.ThreadPoolExecutor(max_workers=18)

def fetch(url):
    path = CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".json")
    if path.exists() and time.time() - path.stat().st_mtime < 3600:
        return json.loads(path.read_text())
    for attempt in range(2):
        try:
            with urlopen(url, timeout=14) as response:
                data = json.load(response)
            path.write_text(json.dumps(data))
            return data
        except Exception:
            if attempt == 0:
                time.sleep(0.3)
    return {}

def fields(data, keys):
    return {key: data[key] for key in keys.split() if key in data}

def compact(event):
    match = fields(event, "id date name shortName season week status")
    match["competitions"] = []
    for competition in event["competitions"]:
        c = fields(competition, "id date status venue notes broadcasts geoBroadcasts timeValid neutralSite series leg")
        c["competitors"] = [
            {**fields(t, "id homeAway score winner shootoutScore"), "team": fields(t["team"], "id name displayName shortDisplayName abbreviation logo")}
            for t in competition["competitors"]
        ]
        match["competitions"].append(c)
    return match

def main():
    feeds = dict(zip(LEAGUES, POOL.map(fetch, (SITE+league+f"/scoreboard?dates={YEAR}&limit=500" for league in LEAGUES))))
    matches = {}
    nations = {}
    jobs = []
    for league, data in feeds.items():
        events = [event for event in data.get("events", []) if event.get("season", {}).get("year") == YEAR]
        if not events:
            raise RuntimeError(f"Feed ausente: {league}")
        matches[league] = [compact(e) for e in events]
        teams = {t["team"]["id"]: t["team"] for e in events for t in e["competitions"][0]["competitors"]}
        for id, team in teams.items():
            nation = nations.setdefault(id, {**fields(team, "id displayName shortDisplayName abbreviation logo"), "competitions": []})
            nation["competitions"].append(league)
            jobs.append((league, id))
        print(league,len(events),len(teams),flush=True)
    if len(matches["fifa.world"]) != 104 or sum("fifa.world" in t["competitions"] for t in nations.values()) != 48:
        raise RuntimeError("Copa 2026 incompleta")
    def roster(job):
        league,id = job
        data=fetch(f"{SITE}{league}/teams/{id}/roster?season={YEAR}")
        if data.get("season", {}).get("year") != YEAR or str(data.get("team", {}).get("id")) != id:
            return league, id, []
        return league, id, [a for a in data.get("athletes", []) if a.get("id") and a.get("displayName")]
    metrics = {
        "appearances": "games", "totalGoals": "goals", "goalAssists": "assists",
        "yellowCards": "yellows", "redCards": "reds", "saves": "saves"
    }
    players, rosters, club_ids = {}, {}, set()
    for league,id,athletes in POOL.map(roster,jobs):
        rosters.setdefault(id,{})[league]=[]
        for a in athletes:
            pid=a["id"]
            ref=re.search(r"/teams/(\d+)(?:\?|$)",a.get("defaultTeam",{}).get("$ref",""))
            club=ref[1] if ref and ref[1] not in nations else None
            if club: club_ids.add(club)
            player=players.setdefault(pid,{"id":pid,"name":a["displayName"],"selections":[]})
            player.update({"nationality":a.get("citizenship") or player.get("nationality"),"flag":a.get("flag",{}).get("href") or player.get("flag"),"clubId":club or player.get("clubId"),"position":a.get("position",{}).get("abbreviation") or player.get("position")})
            stats = {
                metrics[item["name"]]: int(item["value"])
                for category in a.get("statistics", {}).get("splits", {}).get("categories", [])
                for item in category.get("stats", [])
                if item.get("name") in metrics and isinstance(item.get("value"), (int, float))
                and item["value"] >= 0 and item["value"] % 1 == 0
            }
            player["selections"].append([id, league, stats] if stats else [id, league])
            rosters[id][league].append([pid,a.get("jersey")])
    print("players",len(players),"clubs",len(club_ids),"empty rosters",[(i,k) for i,v in rosters.items() for k,a in v.items() if not a],flush=True)
    def club(id):
        d=fetch(CORE+"teams/"+id)
        if d.get("isNational") or not d.get("displayName"):
            return id, None
        logo = next((entry["href"] for entry in d.get("logos", [])
                     if entry.get("href", "").startswith("https://a.espncdn.com/")), None)
        return id, {"name": d["displayName"], "logo": logo}
    clubs = {id: record for id, record in POOL.map(club, sorted(club_ids)) if record}
    tables = {}
    for league in LEAGUES[:-1]:
        raw = fetch("https://site.api.espn.com/apis/v2/sports/soccer/" + league + f"/standings?season={YEAR}&lang=pt&region=br")
        def compact_table(node):
            result = fields(node, "name")
            result["children"] = [compact_table(child) for child in node.get("children", [])]
            result["entries"] = [{"team": fields(entry.get("team", {}), "id displayName name logo logos"),
                "stats": [fields(stat, "name displayValue value") for stat in entry.get("stats", [])]}
                for entry in node.get("standings", {}).get("entries", [])]
            return result
        if raw.get("season", {}).get("year") != YEAR:
            raise RuntimeError(f"Classificação indisponível: {league}")
        tables[league] = compact_table(raw)
    if any(not entries for roster in rosters.values() for league, entries in roster.items() if league != "fifa.friendly"):
        raise RuntimeError("Elenco indisponível; cadastro anterior preservado.")
    data={"tables":tables,"asOf":datetime.now(timezone.utc).date().isoformat(),"nations":nations,"rosters":rosters,"players":players,"clubs":clubs,"matches":matches}
    target=Path(__file__).resolve().parents[1]/"data/national-football-2026.json.gz"
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(gzip.compress(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode(), mtime=0))
    temporary.replace(target)
    print("saved",target,len(clubs),flush=True)

if __name__ == "__main__":
    main()
