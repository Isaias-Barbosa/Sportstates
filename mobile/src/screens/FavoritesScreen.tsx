import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { THEME } from "../theme";
import { Header } from "../components/Header";
import { MatchCard } from "../components/MatchCard";
import { fetchScores } from "../api";
import type { Match } from "../types";

export function FavoritesScreen() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  // Exemplo de lista mockada/local de favoritos
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchScores();
      setMatches(data.matches || []);
    } catch (e) {
      console.warn("Erro ao carregar favoritos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const favoriteMatches = matches.filter((m) => favoriteIds.includes(m.id));

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.titleArea}>
        <Text style={styles.title}>Seus Favoritos ⭐</Text>
        <Text style={styles.subtitle}>
          Marque a estrela ao lado de uma partida para acompanhá-la rapidamente aqui.
        </Text>
      </View>

      <FlatList
        data={favoriteMatches}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={THEME.colors.green}
          />
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            isFavorite={true}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>Nenhuma partida favoritada</Text>
            <Text style={styles.emptySubtitle}>
              Volte para a aba Jogos e toque no ícone de estrela nas partidas que deseja acompanhar.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  titleArea: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
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

