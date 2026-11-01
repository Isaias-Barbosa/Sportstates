export function sportName(id: string): string {
  const names: Record<string, string> = {
    soccer: "Futebol",
    basketball: "Basquete",
    football: "Futebol americano",
    baseball: "Beisebol",
    hockey: "Hóquei",
    volleyball: "Vôlei",
    tennis: "Tênis",
    "table-tennis": "Tênis de mesa",
    judo: "Judô",
  };
  return names[id] || id;
}
