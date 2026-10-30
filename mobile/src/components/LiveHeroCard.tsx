import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { THEME } from "../theme";
import type { Match } from "../types";

type Props = {
  match: Match;
  onPress?: () => void;
};

export function LiveHeroCard({ match, onPress }: Props) {
  const isLive = match.state === "live";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.container, isLive && styles.liveContainer]}
    >
      {/* Topo do Card */}
      <View style={styles.topRow}>
        <View style={[styles.badge, isLive && styles.liveBadge]}>
          <View style={[styles.dot, isLive && styles.liveDot]} />
          <Text style={[styles.badgeText, isLive && styles.liveBadgeText]}>
            {isLive ? "AO VIVO AGORA" : "DESTAQUE"}
          </Text>
        </View>
        <Text style={styles.leagueName} numberOfLines={1}>
          {match.leagueName}
        </Text>
      </View>

      {/* Confronto Central (Times e Placar Ampliado) */}
      <View style={styles.matchArea}>
        {/* Time Casa */}
        <View style={styles.teamCol}>
          {match.home.logo ? (
            <Image source={{ uri: match.home.logo }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamInitial}>{match.home.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={2}>
            {match.home.name}
          </Text>
        </View>

        {/* Placar Gigante */}
        <View style={styles.scoreCol}>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, isLive && styles.liveScoreNumber]}>
              {match.home.score ?? (isLive ? "0" : "-")}
            </Text>
            <Text style={styles.scoreSeparator}>:</Text>
            <Text style={[styles.scoreNumber, isLive && styles.liveScoreNumber]}>
              {match.away.score ?? (isLive ? "0" : "-")}
            </Text>
          </View>
          <Text style={[styles.timeText, isLive && styles.liveTimeText]}>
            {match.status || (isLive ? "Em andamento" : "Próximo")}
          </Text>
        </View>

        {/* Time Visitante */}
        <View style={styles.teamCol}>
          {match.away.logo ? (
            <Image source={{ uri: match.away.logo }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamInitial}>{match.away.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={2}>
            {match.away.name}
          </Text>
        </View>
      </View>

      {/* Rodapé do Card */}
      <View style={styles.footerRow}>
        <Text style={styles.venueText} numberOfLines={1}>
          📍 {match.venue || "Estádio Principal"}
        </Text>
        <Text style={[styles.actionText, isLive && styles.liveActionText]}>
          Acompanhar lances →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    padding: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  liveContainer: {
    backgroundColor: "#1c0d0d",
    borderColor: THEME.colors.live,
    borderWidth: 1.5,
    shadowColor: THEME.colors.live,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  liveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: THEME.colors.live,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.green,
  },
  liveDot: {
    backgroundColor: THEME.colors.live,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.colors.green,
    letterSpacing: 0.5,
  },
  liveBadgeText: {
    color: THEME.colors.live,
  },
  leagueName: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    maxWidth: "50%",
    textAlign: "right",
  },
  matchArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.sm,
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamLogo: {
    width: 48,
    height: 48,
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.text,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.text,
    textAlign: "center",
  },
  scoreCol: {
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.colors.text,
  },
  liveScoreNumber: {
    color: THEME.colors.live,
  },
  scoreSeparator: {
    fontSize: 22,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  liveTimeText: {
    color: THEME.colors.live,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  venueText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    maxWidth: "55%",
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.green,
  },
  liveActionText: {
    color: THEME.colors.live,
  },
});

