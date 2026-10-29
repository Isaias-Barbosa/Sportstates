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
      const { route }=await import("./api.mjs");
      const [status,data]=await route(new URL("https://sportstates.vercel.app/api/match?"+new URLSearchParams({sport,league,id})));
      return status===200 ? data.match : null;
    })
  });
}
