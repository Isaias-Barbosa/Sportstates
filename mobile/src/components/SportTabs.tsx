import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { THEME } from "../theme";

export const SPORTS = [
  { id: "all", name: "Todos", icon: "⚡" },
  { id: "soccer", name: "Futebol", icon: "⚽" },
  { id: "basketball", name: "Basquete", icon: "🏀" },
  { id: "football", name: "F. Americano", icon: "🏈" },
  { id: "baseball", name: "Beisebol", icon: "⚾" },
  { id: "hockey", name: "Hóquei", icon: "🏒" },
  { id: "judo", name: "Judô", icon: "🥋" },
];

type Props = {
  selectedSport: string;
  onSelectSport: (id: string) => void;
};

export function SportTabs({ selectedSport, onSelectSport }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {SPORTS.map((s) => {
        const isSelected = selectedSport === s.id;
        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => onSelectSport(s.id)}
            style={[styles.tab, isSelected && styles.tabActive]}
          >
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={[styles.text, isSelected && styles.textActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    gap: 8,
  },
  tab: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
    minWidth: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabActive: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    textAlign: "center",
  },
  textActive: {
    color: "#0a1a0f",
  },
});
