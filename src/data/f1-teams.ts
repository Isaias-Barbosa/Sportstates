export const f1ProfileSeason = 2026;

type Driver = [id: string, name: string, number: number];
type Team = {
  id: string;
  name: string;
  officialSlug: string;
  imageSlug: string;
  chassis: string;
  engine: string;
  drivers: [Driver, Driver];
};

// The F1 team directory supplies the 2026 race lineups, chassis and car photos.
// Jolpica IDs identify those drivers and constructors in the championship tables.
export const f1Teams: Team[] = [
  {
    id: "alpine",
    name: "Alpine",
    officialSlug: "alpine",
    imageSlug: "alpine",
    chassis: "A526",
    engine: "Mercedes",
    drivers: [
      ["gasly", "Pierre Gasly", 10],
      ["colapinto", "Franco Colapinto", 43],
    ],
  },
  {
    id: "aston_martin",
    name: "Aston Martin",
    officialSlug: "aston-martin",
    imageSlug: "astonmartin",
    chassis: "AMR26",
    engine: "Honda",
    drivers: [
      ["alonso", "Fernando Alonso", 14],
      ["stroll", "Lance Stroll", 18],
    ],
  },
  {
    id: "audi",
    name: "Audi",
    officialSlug: "audi",
    imageSlug: "audi",
    chassis: "R26",
    engine: "Audi",
    drivers: [
      ["hulkenberg", "Nico Hülkenberg", 27],
      ["bortoleto", "Gabriel Bortoleto", 5],
    ],
  },
  {
    id: "cadillac",
    name: "Cadillac",
    officialSlug: "cadillac",
    imageSlug: "cadillac",
    chassis: "MAC-26",
    engine: "Ferrari",
    drivers: [
      ["perez", "Sergio Pérez", 11],
      ["bottas", "Valtteri Bottas", 77],
    ],
  },
  {
    id: "ferrari",
    name: "Ferrari",
    officialSlug: "ferrari",
    imageSlug: "ferrari",
    chassis: "SF-26",
    engine: "Ferrari",
    drivers: [
      ["leclerc", "Charles Leclerc", 16],
      ["hamilton", "Lewis Hamilton", 44],
    ],
  },
  {
    id: "haas",
    name: "Haas",
    officialSlug: "haas",
    imageSlug: "haasf1team",
    chassis: "VF-26",
    engine: "Ferrari",
    drivers: [
      ["bearman", "Oliver Bearman", 87],
      ["ocon", "Esteban Ocon", 31],
    ],
  },
  {
    id: "mclaren",
    name: "McLaren",
    officialSlug: "mclaren",
    imageSlug: "mclaren",
    chassis: "MCL40",
    engine: "Mercedes",
    drivers: [
      ["norris", "Lando Norris", 1],
      ["piastri", "Oscar Piastri", 81],
    ],
  },
  {
    id: "mercedes",
    name: "Mercedes",
    officialSlug: "mercedes",
    imageSlug: "mercedes",
    chassis: "W17",
    engine: "Mercedes",
    drivers: [
      ["russell", "George Russell", 63],
      ["antonelli", "Kimi Antonelli", 12],
    ],
  },
  {
    id: "rb",
    name: "Racing Bulls",
    officialSlug: "racing-bulls",
    imageSlug: "racingbulls",
    chassis: "VCARB 03",
    engine: "Red Bull Ford",
    drivers: [
      ["lawson", "Liam Lawson", 30],
      ["arvid_lindblad", "Arvid Lindblad", 41],
    ],
  },
  {
    id: "red_bull",
    name: "Red Bull Racing",
    officialSlug: "red-bull-racing",
    imageSlug: "redbullracing",
    chassis: "RB22",
    engine: "Red Bull Ford",
    drivers: [
      ["max_verstappen", "Max Verstappen", 3],
      ["hadjar", "Isack Hadjar", 6],
    ],
  },
  {
    id: "williams",
    name: "Williams",
    officialSlug: "williams",
    imageSlug: "williams",
    chassis: "FW48",
    engine: "Mercedes",
    drivers: [
      ["sainz", "Carlos Sainz", 55],
      ["albon", "Alexander Albon", 23],
    ],
  },
];

export function f1CarImage(imageSlug: string) {
  const root = "https://media.formula1.com/image/upload/c_lfill,h_224/q_auto";
  return `${root}/d_common:f1:2026:fallback:car:2026fallbackcarright.webp/v1740000001/common/f1/2026/${imageSlug}/2026${imageSlug}carright.webp`;
}
