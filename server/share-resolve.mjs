import { metadata } from "./share.mjs";
import { createCache } from "./cache.mjs";
const cached = createCache();
export async function resolveShare(page) {
  const safe = async (job) => {
    let timer;
    try { return await Promise.race([job(), new Promise(resolve => {timer=setTimeout(()=>resolve(null),6500);})]); }
    catch { return null; }
    finally { clearTimeout(timer); }
  };
  return metadata(page, {
    team: id => safe(async () => {
      const { getTeam }=await import("./teams.mjs");
      return (await cached("share:team:v1:"+id,300000,()=>getTeam(id),0)).value;
    }),
    match: (sport,league,id) => safe(async () => {
      const result=await cached("share:match:v1:"+sport+":"+league+":"+id,15000,async()=>{
        if(sport==="table-tennis") return (await (await import("./table-tennis.mjs")).tableDetail(id,league)).match;
        if(sport==="tennis") return (await (await import("./tennis.mjs")).tennisDetail(id)).match;
        if(sport==="volleyball") return (await (await import("./volleyball.mjs")).volleyDetail(id)).match;
        const response=await fetch("https://site.api.espn.com/apis/site/v2/sports/"+sport+"/"+league+"/summary?event="+id+"&lang=pt&region=br",{cache:"no-store",signal:AbortSignal.timeout(4500),headers:{Accept:"application/json"}});
        if(!response.ok) return null;
        const { normalizeSummary }=await import("./data.mjs");
        const { leagueFor }=await import("./catalog.mjs");
        return normalizeSummary(await response.json(),sport,league,leagueFor(sport,league).name).match;
      },0);
      return result.value;
    })
  });
}
