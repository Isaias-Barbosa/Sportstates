import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { THEME } from "../theme";
import { Header } from "../components/Header";
import { LiveHeroCard } from "../components/LiveHeroCard";
import { MatchCard } from "../components/MatchCard";
import { SportTabs } from "../components/SportTabs";
import { fetchScores, getTodayDateString } from "../api";
import type { Match } from "../types";

export function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedSport, setSelectedSport] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchScores(getTodayDateString());
      setMatches(data.matches || []);
    } catch (e) {
      console.warn("Erro ao carregar placares:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Atualização em background a cada 60s
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Filtragem
  const filteredMatches = matches.filter((m) => {
    const matchesSport = selectedSport === "all" || m.sport === selectedSport;
    const matchesSearch =
      search.trim() === "" ||
      `${m.home.name} ${m.away.name} ${m.leagueName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  // O jogo em destaque: o primeiro ao vivo ou o primeiro agendado
  const liveMatch = matches.find((m) => m.state === "live");
  const heroMatch = liveMatch || matches[0];

  return (
    <View style={styles.screen}>
      <Header />

      {/* Campo de Busca Rápida */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Buscar time, partida ou liga..."
          placeholderTextColor={THEME.colors.textDim}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Seletor de Esportes */}
      <SportTabs selectedSport={selectedSport} onSelectSport={setSelectedSport} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.green} />
          <Text style={styles.loadingText}>Atualizando placares...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => `${item.sport}-${item.league}-${item.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.green}
            />
          }
          ListHeaderComponent={
            heroMatch ? (
              <View>
                <Text style={styles.sectionTitle}>
                  {liveMatch ? "🔥 AO VIVO AGORA" : "⭐ DESTAQUE DO DIA"}
                </Text>
                <LiveHeroCard match={heroMatch} />
                <Text style={styles.sectionTitle}>TODOS OS JOGOS</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nenhuma partida encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Tente selecionar outro esporte ou verifique a conexão.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  searchContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  searchInput: {
    backgroundColor: THEME.colors.surface,
    color: THEME.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
  },
  listContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: "center",
  },
});

