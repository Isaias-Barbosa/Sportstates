import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../theme";

export function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>⚡</Text>
        </View>
        <Text style={styles.brandTitle}>
          sportstates<Text style={styles.brandDot}>.</Text>
        </Text>
      </View>
      <View style={styles.badge}>
        <View style={styles.liveDot} />
        <Text style={styles.badgeText}>BRT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  brandDot: {
    color: THEME.colors.green,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.green,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
});

