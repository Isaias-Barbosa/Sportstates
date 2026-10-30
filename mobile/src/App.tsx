import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { THEME } from "./theme";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LiveScreen } from "./screens/LiveScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { TransfersScreen } from "./screens/TransfersScreen";

type TabKey = "jogos" | "live" | "favoritos" | "transferencias";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>("jogos");

  const renderScreen = () => {
    switch (currentTab) {
      case "jogos":
        return <DashboardScreen />;
      case "live":
        return <LiveScreen />;
      case "favoritos":
        return <FavoritesScreen />;
      case "transferencias":
        return <TransfersScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={THEME.colors.background} />

      {/* Conteúdo da Tela */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Barra de Navegação Inferior (Bottom Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("jogos")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, currentTab === "jogos" && styles.tabIconActive]}>
            ⚡
          </Text>
          <Text style={[styles.tabLabel, currentTab === "jogos" && styles.tabLabelActive]}>
            Jogos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("live")}
          activeOpacity={0.7}
        >
          <View style={styles.liveTabIconWrapper}>
            <Text style={[styles.tabIcon, currentTab === "live" && styles.tabIconLive]}>
              🔴
            </Text>
            <View style={styles.livePulseDot} />
          </View>
          <Text style={[styles.tabLabel, currentTab === "live" && styles.tabLabelLive]}>
            Ao Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("favoritos")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, currentTab === "favoritos" && styles.tabIconActive]}>
            ⭐
          </Text>
          <Text style={[styles.tabLabel, currentTab === "favoritos" && styles.tabLabelActive]}>
            Favoritos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("transferencias")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, currentTab === "transferencias" && styles.tabIconActive]}>
            🔄
          </Text>
          <Text style={[styles.tabLabel, currentTab === "transferencias" && styles.tabLabelActive]}>
            Mercado
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: THEME.colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabIconLive: {
    opacity: 1,
  },
  liveTabIconWrapper: {
    position: "relative",
  },
  livePulseDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.live,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  tabLabelActive: {
    color: THEME.colors.green,
    fontWeight: "700",
  },
  tabLabelLive: {
    color: THEME.colors.live,
    fontWeight: "800",
  },
});

