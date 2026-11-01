import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchMatchDetail } from "../api";
import { THEME } from "../theme";
import type { Match, MatchDetail } from "../types";

type Props = {
  match: Match;
  onBack: () => void;
};

export function MatchDetailScreen({ match, onBack }: Props) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      const result = await fetchMatchDetail(match);
      setDetail(result);
      setError("");
    } catch (reason) {
      console.warn("Erro ao carregar detalhes da partida:", reason);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar esta partida.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [match]);

  useEffect(() => {
    void loadDetail();
    const timer = setInterval(
      loadDetail,
      match.state === "live" ? 30000 : 60000,
    );
    return () => clearInterval(timer);
  }, [loadDetail, match.state]);

  const currentMatch = detail?.match || match;
  const homeStats = detail?.statistics.find(
    (team) => team.team === currentMatch.home.name,
  );
  const awayStats = detail?.statistics.find(
    (team) => team.team === currentMatch.away.name,
  );
  const commonStats = (homeStats?.stats || []).filter((stat) =>
    awayStats?.stats.some((other) => other.name === stat.name),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar para os jogos"
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.league} numberOfLines={1}>
          {currentMatch.leagueName}
        </Text>
      </View>

      {loading && !detail ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.green} />
          <Text style={styles.muted}>Carregando partida...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadDetail();
              }}
              tintColor={THEME.colors.green}
            />
          }
        >
          {error ? (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void loadDetail()}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.scoreCard}>
            <Text style={styles.status}>
              {currentMatch.state === "live" ? "AO VIVO · " : ""}
              {currentMatch.status || currentMatch.statusName || "Partida"}
            </Text>
            <View style={styles.teams}>
              <View style={styles.team}>
                {currentMatch.home.logo ? (
                  <Image
                    source={{ uri: currentMatch.home.logo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={styles.teamName} numberOfLines={2}>
                  {currentMatch.home.name}
                </Text>
              </View>
              <Text style={styles.score}>
                {currentMatch.home.score ?? "-"} :{" "}
                {currentMatch.away.score ?? "-"}
              </Text>
              <View style={styles.team}>
                {currentMatch.away.logo ? (
                  <Image
                    source={{ uri: currentMatch.away.logo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={styles.teamName} numberOfLines={2}>
                  {currentMatch.away.name}
                </Text>
              </View>
            </View>
            <Text style={styles.source}>
              {detail?.source || "Sportstates"}
              {detail?.stale ? " · dados em cache" : ""}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas</Text>
            {commonStats.length ? (
              <>
                <View style={styles.statsHeader}>
                  <Text style={[styles.teamHeading, styles.homeHeading]}>
                    {currentMatch.home.short || "Casa"}
                  </Text>
                  <Text style={styles.statHeading}> </Text>
                  <Text style={[styles.teamHeading, styles.awayHeading]}>
                    {currentMatch.away.short || "Fora"}
                  </Text>
                </View>
                {commonStats.map((stat) => {
                  const awayValue = awayStats?.stats.find(
                    (other) => other.name === stat.name,
                  )?.value;
                  return (
                    <View key={stat.name} style={styles.statRow}>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statName}>{stat.name}</Text>
                      <Text style={styles.statValue}>{awayValue || "—"}</Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={styles.muted}>
                Estatísticas ainda não disponíveis para esta partida.
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {currentMatch.sport === "hockey"
                ? "Lance a lance"
                : "Minuto a minuto"}
            </Text>
            {detail?.events.length ? (
              detail.events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventMarker,
                      event.scoring && styles.scoringMarker,
                    ]}
                  />
                  <View style={styles.eventContent}>
                    <View style={styles.eventMeta}>
                      <Text style={styles.eventClock}>
                        {event.minute || "—"}
                      </Text>
                      {event.period ? (
                        <Text style={styles.eventPeriod}>
                          {currentMatch.sport === "hockey"
                            ? `Período ${event.period}`
                            : `Etapa ${event.period}`}
                        </Text>
                      ) : null}
                      {event.type ? (
                        <Text style={styles.eventType}>{event.type}</Text>
                      ) : null}
                    </View>
                    {event.scorer ? (
                      <Text style={styles.eventScorer}>{event.scorer}</Text>
                    ) : null}
                    <Text style={styles.eventText}>{event.text}</Text>
                    {event.score ? (
                      <Text style={styles.eventScore}>{event.score}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>
                Os lances ainda não foram publicados pela fonte da partida.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  topBar: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backText: { color: THEME.colors.green, fontWeight: "700", fontSize: 14 },
  league: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: 36,
    gap: THEME.spacing.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  scoreCard: {
    padding: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  status: {
    textAlign: "center",
    color: THEME.colors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: THEME.spacing.lg,
  },
  team: { flex: 1, alignItems: "center", gap: 8 },
  logo: { width: 42, height: 42 },
  teamName: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  score: { color: THEME.colors.text, fontSize: 22, fontWeight: "900" },
  source: { color: THEME.colors.textDim, fontSize: 10, textAlign: "center" },
  section: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionTitle: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: THEME.spacing.md,
  },
  statsHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  teamHeading: { flex: 1, color: THEME.colors.textMuted, fontSize: 10 },
  homeHeading: { textAlign: "left" },
  awayHeading: { textAlign: "right" },
  statHeading: { flex: 1.5 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statValue: {
    flex: 1,
    color: THEME.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  statName: {
    flex: 1.5,
    color: THEME.colors.textMuted,
    fontSize: 10,
    textAlign: "center",
  },
  eventRow: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  eventMarker: {
    marginTop: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.textDim,
  },
  scoringMarker: { backgroundColor: THEME.colors.green },
  eventContent: { flex: 1 },
  eventMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 4,
  },
  eventClock: { color: THEME.colors.green, fontSize: 11, fontWeight: "800" },
  eventPeriod: { color: THEME.colors.textMuted, fontSize: 10 },
  eventType: { color: THEME.colors.textMuted, fontSize: 10 },
  eventScorer: { color: THEME.colors.green, fontSize: 11, fontWeight: "700" },
  eventText: { color: THEME.colors.text, fontSize: 12, lineHeight: 18 },
  eventScore: { color: THEME.colors.textMuted, fontSize: 10, marginTop: 4 },
  muted: { color: THEME.colors.textMuted, fontSize: 12, lineHeight: 18 },
  notice: {
    padding: 12,
    backgroundColor: THEME.colors.liveBackground,
    borderRadius: THEME.radius.md,
    gap: 8,
  },
  errorText: { color: THEME.colors.text, fontSize: 12 },
  retry: { color: THEME.colors.green, fontWeight: "700", fontSize: 12 },
});
