// Runtime validation coverage for mobile API navigation and match details.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMatchDetail, fetchStandings, fetchTeams } from "./api";
import type { Match } from "./types";

const match: Match = {
  id: "12345",
  sport: "hockey",
  league: "nhl",
  leagueName: "NHL",
  date: "2026-10-31T17:00:00Z",
  name: "Chicago Blackhawks at Boston Bruins",
  home: {
    id: "1",
    name: "Boston Bruins",
    short: "BOS",
    logo: null,
    score: "2",
    winner: true,
  },
  away: {
    id: "4",
    name: "Chicago Blackhawks",
    short: "CHI",
    logo: null,
    score: "1",
    winner: false,
  },
  state: "finished",
  statusName: "STATUS_FINAL",
  status: "Final",
  clock: "0:00",
  period: 3,
  venue: "",
  broadcast: "",
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mobile API navigation", () => {
  it("requests and returns match detail using the selected game's identity", async () => {
    const data = { match, events: [], statistics: [], source: "ESPN" };
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response(data));

    await expect(fetchMatchDetail(match)).resolves.toEqual(data);

    const requestedUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe("/api/match");
    expect(requestedUrl.searchParams.get("sport")).toBe("hockey");
    expect(requestedUrl.searchParams.get("league")).toBe("nhl");
    expect(requestedUrl.searchParams.get("id")).toBe("12345");
  });

  it("loads team profiles and unwraps the teams page response", async () => {
    const teams = [{ id: "hockey-nhl-1", name: "Boston Bruins" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ teams }));

    await expect(fetchTeams()).resolves.toEqual(teams);
  });

  it("requests classification for the selected sport and league", async () => {
    const standings = { sport: "hockey", league: "nhl", groups: [] };
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response(standings));

    await expect(fetchStandings("hockey", "nhl")).resolves.toEqual(standings);

    const requestedUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe("/api/standings");
    expect(requestedUrl.searchParams.get("sport")).toBe("hockey");
    expect(requestedUrl.searchParams.get("league")).toBe("nhl");
  });

  it("surfaces API errors instead of showing an empty success state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ error: "Indisponível" }, 503),
    );

    await expect(fetchStandings("hockey", "nhl")).rejects.toThrow("HTTP 503");
  });
});
