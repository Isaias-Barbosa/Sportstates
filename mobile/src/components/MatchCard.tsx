import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { THEME } from "../theme";
import type { Match } from "../types";

type Props = {
  match: Match;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function MatchCard({ match, isFavorite, onToggleFavorite, onPress }: Props) {
  const isLive = match.state === "live";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, isLive && styles.liveCard]}
    >
      {/* Horário / Status */}
      <View style={styles.statusCol}>
        {isLive && <View style={styles.liveDot} />}
        <Text style={[styles.statusText, isLive && styles.liveStatusText]}>
          {match.status || (isLive ? "AO VIVO" : "EM BREVE")}
        </Text>
      </View>

      {/* Times e Placar */}
      <View style={styles.contentCol}>
        {/* Time Casa */}
        <View style={styles.teamRow}>
          {match.home.logo ? (
            <Image source={{ uri: match.home.logo }} style={styles.crest} resizeMode="contain" />
          ) : (
            <View style={styles.crestFallback}>
              <Text style={styles.crestInitial}>{match.home.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {match.home.name}
          </Text>
          <Text style={[styles.score, isLive && styles.liveScore]}>
            {match.home.score ?? "-"}
          </Text>
        </View>

        {/* Time Fora */}
        <View style={styles.teamRow}>
          {match.away.logo ? (
            <Image source={{ uri: match.away.logo }} style={styles.crest} resizeMode="contain" />
          ) : (
            <View style={styles.crestFallback}>
              <Text style={styles.crestInitial}>{match.away.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {match.away.name}
          </Text>
          <Text style={[styles.score, isLive && styles.liveScore]}>
            {match.away.score ?? "-"}
          </Text>
        </View>
      </View>

      {/* Botão de Favoritar */}
      {onToggleFavorite && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteActive]}>
            {isFavorite ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  liveCard: {
    backgroundColor: "#160b0b",
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderLeftWidth: 3.5,
    borderLeftColor: THEME.colors.live,
  },
  statusCol: {
    width: 65,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.border,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.live,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.colors.textMuted,
    textAlign: "center",
  },
  liveStatusText: {
    color: THEME.colors.live,
  },
  contentCol: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  crest: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  crestFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  crestInitial: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.colors.textMuted,
  },
  teamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: THEME.colors.text,
  },
  score: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.text,
    marginLeft: 8,
    minWidth: 18,
    textAlign: "right",
  },
  liveScore: {
    color: THEME.colors.live,
    fontWeight: "800",
  },
  favoriteButton: {
    paddingLeft: 6,
  },
  favoriteIcon: {
    fontSize: 18,
    color: THEME.colors.textMuted,
  },
  favoriteActive: {
    color: THEME.colors.green,
  },
});

