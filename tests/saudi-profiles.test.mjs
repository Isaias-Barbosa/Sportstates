import test from "node:test";
import assert from "node:assert/strict";
import {
  saudiProfiles,
  SAUDI_IDS,
  validateSaudiProfiles,
  saudiProfileReferences,
  saudiImportCandidates,
} from "../server/saudi-profiles.mjs";
import { validProfileId } from "../server/team-identity.mjs";
import { validateHonours } from "../server/teams.mjs";
import { validKey } from "../server/featured.mjs";
const club = (id) => saudiProfiles.clubs.find((c) => c.id === id);
test("Saudi seed contains all 18 current ESPN IDs including the three promoted teams", () => {
  assert.equal(saudiProfiles.clubs.length, 18);
  assert.deepEqual(new Set(saudiProfiles.expectedIds), new Set(SAUDI_IDS));
  assert.equal(club("21833").name, "Abha");
  assert.equal(club("21446").name, "Al Faisaly");
  assert.equal(club("131746").name, "Diriyah Club");
  for (const c of saudiProfiles.clubs) {
    assert.ok(validProfileId(c.id));
    assert.ok(validKey(`soccer/ksa.1/${c.id}`));
    assert.equal(c.league, "ksa.1");
    assert.ok(c.sources.some((s) => s.url.endsWith(`/teams/${c.id}`)));
  }
});
test("current official stadiums retain club home cities and league branding", () => {
  assert.equal(club("8346").stadium, "Alinma Stadium");
  assert.equal(club("2276").stadium, "Alinma Stadium");
  assert.equal(club("793").stadium, "SHG Arena");
  assert.equal(club("13033").stadium, "Maydan Tamweel Aloula");
  assert.equal(club("18459").stadium, "Wolves Park");
  assert.equal(club("929").stadium, "Kingdom Arena");
  assert.equal(club("817").stadium, "Al Awwal Park");
  assert.equal(club("131746").city, "Diriyah");
  assert.equal(club("21446").city, "Harmah");
  assert.equal(club("21829").city, "Saihat");
  assert.equal(club("22022").city, "Al Khobar");
  assert.equal(club("130899").city, "Tabuk");
  assert.equal(club("131746").colors[0], "#194646");
  assert.equal(club("817").colors[0], "#ffdb00");
});
test("Portuguese profiles retain verified sources, crests and editable colours without fabricated stadium photographs", () => {
  for (const c of saudiProfiles.clubs) {
    assert.match(c.description, /Arábia Saudita/);
    assert.match(c.description, /fundado em \d{4}/);
    assert.ok(c.description.length < 749);
    assert.ok(c.sources.some((s) => s.url === c.website));
    assert.equal(new URL(c.logo).hostname, "media-sdp.spl.com.sa");
    assert.equal(c.stadium_image, "");
    assert.deepEqual(validateHonours(c.honours), c.honours);
  }
  assert.match(club("130899").description, /Al Suqor/);
  assert.match(club("21833").description, /1966/);
  assert.match(club("131746").description, /1976/);
});
test("verified 2026 trophies distinguish the league, Kings Cup and Asian competition", () => {
  assert.ok(
    club("817").honours.some(
      (h) => h.startsWith("Campeonato Saudita - ") && h.endsWith("2026"),
    ),
  );
  assert.ok(
    club("929").honours.some(
      (h) => h.startsWith("Copa do Rei Saudita - ") && h.endsWith("2026"),
    ),
  );
  assert.ok(
    club("8346").honours.includes("Liga dos Campeões da Ásia - 2025, 2026"),
  );
  assert.deepEqual(club("21446").honours, ["Copa do Rei Saudita - 2021"]);
  assert.deepEqual(club("21827").honours, ["Copa do Rei Saudita - 2022"]);
  assert.deepEqual(club("21965").honours, ["Copa do Príncipe Herdeiro - 1994"]);
});
test("existing manually edited profiles are excluded from insert candidates and remain unchanged", () => {
  const manual = {
    ...club("817"),
    description: "Texto editado pelo administrador",
    colors: ["#123456"],
    stadium: "Estádio editado",
  };
  const before = structuredClone(manual);
  const rows = [manual];
  const candidates = saudiImportCandidates(rows);
  assert.equal(candidates.length, 17);
  assert.ok(!candidates.some((c) => c.id === "817"));
  assert.deepEqual(rows, [before]);
  assert.equal(saudiImportCandidates(saudiProfiles.clubs).length, 0);
  assert.throws(
    () =>
      saudiImportCandidates([{ id: "817", sport: "soccer", league: "bra.1" }]),
    /Conflito/,
  );
  assert.throws(
    () =>
      saudiImportCandidates([
        { id: "817", sport: "basketball", league: "nba" },
      ]),
    /Conflito/,
  );
});
test("validator rejects wrong seasons, duplicate IDs, wrong leagues, oversized text and unsafe URLs", () => {
  for (const mutate of [
    (d) => d.clubs.pop(),
    (d) => (d.clubs[0].id = d.clubs[1].id),
    (d) => (d.season = "2025/26"),
    (d) => (d.expectedIds[0] = "123"),
    (d) => (d.clubs[0].league = "bra.1"),
    (d) => (d.clubs[0].colors = ["red"]),
    (d) => (d.clubs[0].website = "javascript:alert(1)"),
    (d) => (d.clubs[0].logo = "https://user:pass@example.com/logo.png"),
    (d) => (d.clubs[0].description = "x".repeat(2001)),
    (d) => (d.clubs[0].honours = ["Campeão sem ano"]),
  ]) {
    const data = structuredClone(saudiProfiles);
    mutate(data);
    assert.throws(() => validateSaudiProfiles(data));
  }
});
test("profile references are restricted to the correct team and competition", () => {
  assert.deepEqual(saudiProfileReferences("817", "eng.1"), []);
  assert.deepEqual(saudiProfileReferences("unknown", "ksa.1"), []);
  assert.ok(
    saudiProfileReferences("817", "ksa.1").some((s) =>
      s.url.includes("/al-nassr/"),
    ),
  );
  assert.ok(
    saudiProfileReferences("131746", "ksa.1").some((s) =>
      s.url.includes("/diriyah/"),
    ),
  );
});
