// Preserve the order and groups supplied by ESPN; tie-breakers vary by league.
export function normalizeStandings(raw) {
  const groups = [];
  function visit(node, inheritedName = '') {
    if (!node || typeof node !== 'object') return;
    const entries = node.standings?.entries || node.entries;
    if (Array.isArray(entries) && entries.length) {
      const rows = entries.filter(e => e.team?.id).map((entry, index) => ({
        id: String(entry.team.id),
        name: entry.team.displayName || entry.team.name || 'Equipe',
        logo: entry.team.logo || entry.team.logos?.[0]?.href || null,
        rank: entry.stats?.find(s => s.name === 'rank')?.displayValue || String(index + 1),
        stats: Object.fromEntries((entry.stats || []).filter(s => s.name).map(s => [s.name, s.displayValue ?? String(s.value ?? '—')])),
      }));
      if (rows.length) groups.push({ name: node.name || inheritedName || 'Classificação', rows });
    }
    for (const child of node.children || []) visit(child, node.name || inheritedName);
  }
  visit(raw);
  return groups;
}
