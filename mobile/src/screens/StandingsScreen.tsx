import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchCompetitions, fetchStandings } from "../api";
import { Header } from "../components/Header";
import { sportName } from "../sport-labels";
import { THEME } from "../theme";
import type { CompetitionCatalog, Standings } from "../types";

export function StandingsScreen() {
  const [catalog, setCatalog] = useState<CompetitionCatalog | null>(null);
  const [sport, setSport] = useState("soccer");
  const [league, setLeague] = useState("");
  const [standings, setStandings] = useState<Standings | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCompetitions()
      .then((result) => {
        setCatalog(result);
        const selected = result.sports.find((item) => item.id === sport);
        const preferredLeague =
          selected?.leagues.find((item) => item.id === "bra.1")?.id ||
          selected?.leagues[0]?.id ||
          "";
        setLeague(preferredLeague);
      })
      .catch((reason: unknown) => {
        console.warn("Erro ao carregar competições:", reason);
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as competições.",
        );
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  useEffect(() => {
    if (!league) return;
    let active = true;
    setLoadingStandings(true);
    fetchStandings(sport, league)
      .then((result) => {
        if (active) {
          setStandings(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        console.warn("Erro ao carregar classificação:", reason);
        if (active) {
          setStandings(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a classificação.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingStandings(false);
      });
    return () => {
      active = false;
    };
  }, [sport, league]);

  const selectedSport = catalog?.sports.find((item) => item.id === sport);
  const changeSport = (id: string) => {
    const next = catalog?.sports.find((item) => item.id === id);
    setSport(id);
    setLeague(next?.leagues[0]?.id || "");
  };

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.title}>
        <Text style={styles.eyebrow}>TABELAS E COMPETIÇÕES</Text>
        <Text style={styles.heading}>Classificação</Text>
      </View>
      {loadingCatalog ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.green} />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {(catalog?.sports || []).map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => changeSport(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: sport === item.id }}
                style={[
                  styles.filter,
                  sport === item.id && styles.filterSelected,
                ]}
              >
                <Text style={styles.filterIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.filterText,
                    sport === item.id && styles.filterTextSelected,
                  ]}
                >
                  {sportName(item.id)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!!selectedSport?.leagues.length && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {selectedSport.leagues.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setLeague(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: league === item.id }}
                  style={[
                    styles.leagueFilter,
                    league === item.id && styles.leagueFilterSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.leagueText,
                      league === item.id && styles.filterTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loadingStandings ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={THEME.colors.green} />
              <Text style={styles.muted}>Carregando tabela...</Text>
            </View>
          ) : error ? (
            <View style={styles.message}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : standings ? (
            <ScrollView contentContainerStyle={styles.tables}>
              {standings.groups.map((group) => (
                <View style={styles.group} key={group.name}>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  {group.rows.map((row) => {
                    const stats = Object.entries(row.stats).slice(0, 3);
                    return (
                      <View style={styles.row} key={row.id}>
                        <View style={styles.teamCell}>
                          <Text style={styles.rank}>{row.rank}</Text>
                          {row.logo ? (
                            <Image
                              source={{ uri: row.logo }}
                              style={styles.logo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.logoPlaceholder} />
                          )}
                          <Text style={styles.teamName}>{row.name}</Text>
                        </View>
                        <View style={styles.statsCell}>
                          {stats.map(([key, value]) => (
                            <View style={styles.stat} key={key}>
                              <Text style={styles.statValue}>{value}</Text>
                              <Text style={styles.statLabel}>
                                {statLabel(key)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
              <Text style={styles.source}>
                Fonte: {standings.source}
                {standings.stale ? " · dados em cache" : ""}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.message}>
              <Text style={styles.muted}>
                Ainda não há classificação disponível para esta competição.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function statLabel(key: string) {
  const labels: Record<string, string> = {
    points: "PTS",
    wins: "V",
    losses: "D",
    gamesPlayed: "J",
    games: "J",
    goalsFor: "GP",
    goalsAgainst: "GC",
  };
  return (
    labels[key] ||
    key
      .replace(/([A-Z])/g, " $1")
      .slice(0, 8)
      .toUpperCase()
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  title: { paddingHorizontal: THEME.spacing.lg, paddingTop: THEME.spacing.lg },
  eyebrow: {
    color: THEME.colors.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heading: {
    color: THEME.colors.text,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 4,
  },
  filters: { paddingHorizontal: THEME.spacing.lg, paddingVertical: 10, gap: 8 },
  filter: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
    width: 96,
    minHeight: 66,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  filterSelected: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  filterIcon: { fontSize: 16 },
  filterText: {
    width: 80,
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    flexWrap: "wrap",
  },
  filterTextSelected: { color: "#0a1a0f" },
  leagueFilter: {
    width: 142,
    minHeight: 48,
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  leagueFilterSelected: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  leagueText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  tables: { padding: THEME.spacing.lg, gap: 16, paddingBottom: 36 },
  group: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    overflow: "hidden",
  },
  groupTitle: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: "800",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  teamCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  statsCell: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  rank: {
    width: 20,
    color: THEME.colors.textMuted,
    fontSize: 10,
    textAlign: "center",
  },
  logo: { width: 20, height: 20 },
  logoPlaceholder: { width: 20, height: 20 },
  teamName: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  stat: { width: 31, alignItems: "center" },
  statValue: { color: THEME.colors.text, fontSize: 10, fontWeight: "800" },
  statLabel: { color: THEME.colors.textMuted, fontSize: 7, marginTop: 2 },
  source: { color: THEME.colors.textDim, fontSize: 10, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: THEME.colors.textMuted, fontSize: 12, lineHeight: 18 },
  message: { padding: 24 },
  error: { color: THEME.colors.live, fontSize: 12 },
});
