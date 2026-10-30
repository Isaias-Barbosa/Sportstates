import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { THEME } from "../theme";
import { Header } from "../components/Header";
import { LiveHeroCard } from "../components/LiveHeroCard";
import { fetchScores } from "../api";
import type { Match } from "../types";

export function LiveScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchScores();
      const live = (data.matches || []).filter((m) => m.state === "live");
      setLiveMatches(live);
    } catch (e) {
      console.warn("Erro ao carregar jogos ao vivo:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Atualização rápida de 30s para a aba ao vivo
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.screen}>
      <Header />

      <View style={styles.headerInfo}>
        <View style={styles.badge}>
          <View style={styles.liveDot} />
          <Text style={styles.badgeText}>RADAR EM TEMPO REAL</Text>
        </View>
        <Text style={styles.counterText}>
          {liveMatches.length} {liveMatches.length === 1 ? "jogo acontecendo" : "jogos acontecendo"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.live} />
          <Text style={styles.loadingText}>Buscando partidas ao vivo...</Text>
        </View>
      ) : (
        <FlatList
          data={liveMatches}
          keyExtractor={(item) => `${item.sport}-${item.league}-${item.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.live}
            />
          }
          renderItem={({ item }) => <LiveHeroCard match={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⏱️</Text>
              <Text style={styles.emptyTitle}>Nenhum jogo ao vivo agora</Text>
              <Text style={styles.emptySubtitle}>
                As próximas partidas começarão em breve. Confira a agenda na aba Jogos!
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
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: THEME.colors.live,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.live,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.colors.live,
    letterSpacing: 0.5,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textMuted,
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
    color: THEME.colors.live,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
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
    lineHeight: 18,
  },
});

