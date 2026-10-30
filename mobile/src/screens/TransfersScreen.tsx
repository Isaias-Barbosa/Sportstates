import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { THEME } from "../theme";
import { Header } from "../components/Header";
import { fetchTransfers } from "../api";
import type { TransferItem } from "../types";

const POPULAR_CLUBS = [
  { label: "Flamengo", query: "flamengo" },
  { label: "Palmeiras", query: "palmeiras" },
  { label: "Real Madrid", query: "real-madrid" },
  { label: "Barcelona", query: "fc-barcelona" },
  { label: "Man. United", query: "manchester-united" },
  { label: "Man. City", query: "manchester-city" },
  { label: "Liverpool", query: "liverpool-fc" },
  { label: "PSG", query: "paris-saint-germain" },
];

export function TransfersScreen() {
  const [selectedClub, setSelectedClub] = useState(POPULAR_CLUBS[0]);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [source, setSource] = useState("");

  const loadTransfers = async (query: string) => {
    setLoading(true);
    try {
      const data = await fetchTransfers(query, true);
      setTransfers(data.transfers || []);
      setSource(data.source || "Transfermarkt");
    } catch (e) {
      console.warn("Erro ao buscar transferências:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers(selectedClub.query);
  }, [selectedClub]);

  return (
    <View style={styles.screen}>
      <Header />

      <View style={styles.titleArea}>
        <Text style={styles.eyebrow}>MERCADO DA BOLA</Text>
        <Text style={styles.title}>Transferências 🔄</Text>
        <Text style={styles.subtitle}>
          Movimentações do mercado com dados do {source || "Transfermarkt"}.
        </Text>
      </View>

      {/* Seletor de Clubes */}
      <View style={styles.clubsSelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubsList}>
          {POPULAR_CLUBS.map((c) => {
            const isSelected = selectedClub.query === c.query;
            return (
              <TouchableOpacity
                key={c.query}
                onPress={() => setSelectedClub(c)}
                style={[styles.clubTab, isSelected && styles.clubTabActive]}
              >
                <Text style={[styles.clubText, isSelected && styles.clubTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.green} />
          <Text style={styles.loadingText}>Carregando transferências...</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item, index) => `${item.playerId}-${item.date}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.player
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.playerName}>{item.player}</Text>
                <Text style={styles.dateText}>
                  📅 {item.date} {item.type ? `· ${item.type}` : ""}
                </Text>

                <View style={styles.teamsRow}>
                  <Text style={styles.clubName} numberOfLines={1}>
                    {item.from}
                  </Text>
                  <Text style={styles.arrowText}>➔</Text>
                  <Text style={[styles.clubName, styles.clubDestino]} numberOfLines={1}>
                    {item.to}
                  </Text>
                </View>

                {item.marketValue && (
                  <Text style={styles.valueText}>
                    Valor est.: <Text style={styles.valueHighlight}>{item.marketValue}</Text>
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Sem transferências recentes</Text>
              <Text style={styles.emptySubtitle}>
                Selecione outro clube acima para ver as movimentações de mercado.
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
  titleArea: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.colors.green,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  clubsSelectorWrapper: {
    paddingVertical: THEME.spacing.md,
  },
  clubsList: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
  },
  clubTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  clubTabActive: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  clubText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  clubTextActive: {
    color: "#0a1a0f",
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: THEME.spacing.lg,
  },
  card: {
    flexDirection: "row",
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: THEME.radius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.colors.green,
  },
  infoCol: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.text,
  },
  dateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  clubName: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    maxWidth: "42%",
  },
  arrowText: {
    fontSize: 12,
    color: THEME.colors.green,
  },
  clubDestino: {
    fontWeight: "700",
    color: THEME.colors.text,
  },
  valueText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  valueHighlight: {
    color: THEME.colors.green,
    fontWeight: "700",
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

