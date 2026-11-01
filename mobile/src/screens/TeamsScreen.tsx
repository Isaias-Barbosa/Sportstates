import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchTeams } from "../api";
import { Header } from "../components/Header";
import { sportName } from "../sport-labels";
import { THEME } from "../theme";
import type { TeamProfile } from "../types";

type Props = {
  onSelectTeam: (team: TeamProfile) => void;
};

export function TeamsScreen({ onSelectTeam }: Props) {
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [selectedSport, setSelectedSport] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTeams = async () => {
    try {
      setTeams(await fetchTeams());
      setError("");
    } catch (reason) {
      console.warn("Erro ao carregar times:", reason);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os times.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const sports = useMemo(
    () => [
      { id: "all", name: "Todos", icon: "⚡" },
      ...Array.from(new Set(teams.map((team) => team.sport))).map((id) => ({
        id,
        name: sportName(id),
        icon: sportIcon(id),
      })),
    ],
    [teams],
  );
  const visibleTeams = teams.filter(
    (team) => selectedSport === "all" || team.sport === selectedSport,
  );

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.title}>
        <Text style={styles.eyebrow}>EQUIPES</Text>
        <Text style={styles.heading}>Times</Text>
        <Text style={styles.subtitle}>
          Explore perfis e informações dos times.
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {sports.map((sport) => (
          <TouchableOpacity
            key={sport.id}
            onPress={() => setSelectedSport(sport.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedSport === sport.id }}
            style={[
              styles.filter,
              selectedSport === sport.id && styles.filterSelected,
            ]}
          >
            <Text style={styles.filterIcon}>{sport.icon}</Text>
            <Text
              style={[
                styles.filterText,
                selectedSport === sport.id && styles.filterTextSelected,
              ]}
            >
              {sport.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.green} />
          <Text style={styles.subtitle}>Carregando times...</Text>
        </View>
      ) : error ? (
        <View style={styles.message}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={() => void loadTeams()}>
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleTeams}
          keyExtractor={(team) => team.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadTeams();
              }}
              tintColor={THEME.colors.green}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.teamCard}
              onPress={() => onSelectTeam(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir perfil de ${item.name}`}
            >
              {item.logo ? (
                <Image
                  source={{ uri: item.logo }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoInitial}>{item.name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.teamMeta} numberOfLines={1}>
                  {[item.city, item.league].filter(Boolean).join(" · ") ||
                    sportName(item.sport)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nenhum perfil de time disponível para este esporte.
            </Text>
          }
        />
      )}
    </View>
  );
}

function sportIcon(id: string): string {
  const icons: Record<string, string> = {
    soccer: "⚽",
    basketball: "🏀",
    football: "🏈",
    baseball: "⚾",
    hockey: "🏒",
    volleyball: "🏐",
    tennis: "🎾",
    "table-tennis": "🏓",
    judo: "🥋",
  };
  return icons[id] || "🏅";
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
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: { color: THEME.colors.textMuted, fontSize: 12, marginTop: 4 },
  filters: { paddingHorizontal: THEME.spacing.lg, paddingVertical: 14, gap: 8 },
  filter: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    minWidth: 88,
    minHeight: 64,
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.full,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
  },
  filterSelected: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  filterText: {
    width: 82,
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    flexWrap: "wrap",
  },
  filterIcon: { fontSize: 15 },
  filterTextSelected: { color: "#0a1a0f" },
  list: { paddingHorizontal: THEME.spacing.lg, paddingBottom: 32, gap: 8 },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 68,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surface,
  },
  logo: { width: 38, height: 38 },
  logoFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  logoInitial: { color: THEME.colors.text, fontWeight: "800" },
  teamInfo: { flex: 1, minWidth: 0 },
  teamName: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  teamMeta: { color: THEME.colors.textMuted, fontSize: 10, marginTop: 4 },
  chevron: { color: THEME.colors.green, fontSize: 25, paddingHorizontal: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  message: { padding: 24, gap: 12 },
  error: { color: THEME.colors.text, fontSize: 12 },
  retry: { color: THEME.colors.green, fontWeight: "700", fontSize: 12 },
  empty: {
    textAlign: "center",
    color: THEME.colors.textMuted,
    fontSize: 12,
    padding: 32,
  },
});
