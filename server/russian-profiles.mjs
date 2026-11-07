import manifest from '../data/russian-profiles-2026.json' with {type:'json'};
export function validateRussianProfiles(data = manifest) {
 if (data.clubs?.length !== 16 || new Set(data.clubs.map(c=>c.id)).size !== 16) throw new Error('O catálogo russo deve conter 16 clubes distintos.');
 for (const club of data.clubs) {
  if (!/^\d+$/.test(club.id) || club.league !== 'rus.1' || club.sport !== 'soccer' || !club.name || !club.logo.startsWith('https://a.espncdn.com/')) throw new Error('Perfil russo inválido.');
 }
 return data;
}
export const russianProfiles = validateRussianProfiles();
export const russianClub = id => russianProfiles.clubs.find(c=>c.id===String(id)) || null;
export function russianImportCandidates(existing = []) {
 const ids = new Set(existing.map(c=>String(c.id)));
 return russianProfiles.clubs.filter(c=>!ids.has(c.id));
}
