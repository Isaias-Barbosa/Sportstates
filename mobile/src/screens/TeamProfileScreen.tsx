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
import { fetchTeamDetails } from "../api";
import { MatchCard } from "../components/MatchCard";
import { sportName } from "../sport-labels";
import { THEME } from "../theme";
import type { Match, TeamDetails, TeamProfile } from "../types";

type Props = {
  team: TeamProfile;
  onBack: () => void;
  onSelectMatch: (match: Match) => void;
};

export function TeamProfileScreen({ team, onBack, onSelectMatch }: Props) {
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchTeamDetails(team.id)
      .then((result) => {
        if (active) {
          setDetails(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        console.warn("Erro ao carregar perfil do time:", reason);
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o perfil.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [team.id]);

  const profile = details?.team || team;
  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <Text style={styles.back}>‹ Times</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          {profile.logo ? (
            <Image
              source={{ uri: profile.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.meta}>
            {[sportName(profile.sport), profile.league]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {profile.description ? (
            <Text style={styles.description}>{profile.description}</Text>
          ) : null}
          {profile.city ? (
            <InfoRow label="Cidade" value={profile.city} />
          ) : null}
          {profile.stadium ? (
            <InfoRow label="Arena" value={profile.stadium} />
          ) : null}
          {profile.website ? (
            <InfoRow label="Site oficial" value={profile.website} />
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={THEME.colors.green} />
            <Text style={styles.muted}>Carregando informações...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {!!details?.athletes.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Elenco</Text>
            {details.athletes.map((athlete) => (
              <View style={styles.athlete} key={athlete.id}>
                <View style={styles.athleteInfo}>
                  <Text style={styles.athleteName}>{athlete.name}</Text>
                  <Text style={styles.muted}>
                    {[athlete.position, athlete.number && `#${athlete.number}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!!details?.upcoming.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximos jogos</Text>
            {details.upcoming.map((match) => (
              <MatchCard
                key={`${match.sport}/${match.league}/${match.id}`}
                match={match}
                onPress={() => onSelectMatch(match)}
              />
            ))}
          </View>
        )}
        {!!details?.recent.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados recentes</Text>
            {details.recent.map((match) => (
              <MatchCard
                key={`${match.sport}/${match.league}/${match.id}`}
                match={match}
                onPress={() => onSelectMatch(match)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  topBar: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  back: { color: THEME.colors.green, fontWeight: "800", fontSize: 14 },
  content: { padding: THEME.spacing.lg, paddingBottom: 32, gap: 14 },
  profile: {
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
  },
  logo: { width: 64, height: 64, marginBottom: 12 },
  name: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  meta: { color: THEME.colors.green, fontSize: 11, marginTop: 6 },
  description: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  infoLabel: { color: THEME.colors.textMuted, fontSize: 11 },
  infoValue: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  section: {
    paddingVertical: 12,
    gap: 10,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
  },
  sectionTitle: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 14,
  },
  athlete: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  athleteInfo: { gap: 4 },
  athleteName: { color: THEME.colors.text, fontSize: 12, fontWeight: "700" },
  muted: { color: THEME.colors.textMuted, fontSize: 11, lineHeight: 16 },
  loading: { alignItems: "center", gap: 8, padding: 16 },
  error: { color: THEME.colors.live, fontSize: 12 },
});
