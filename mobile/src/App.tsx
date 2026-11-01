import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { THEME } from "./theme";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LiveScreen } from "./screens/LiveScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { TeamsScreen } from "./screens/TeamsScreen";
import { StandingsScreen } from "./screens/StandingsScreen";
import { MatchDetailScreen } from "./screens/MatchDetailScreen";
import { TeamProfileScreen } from "./screens/TeamProfileScreen";
import type { Match, TeamProfile } from "./types";

type TabKey = "jogos" | "live" | "times" | "classificacao" | "favoritos";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>("jogos");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);

  const selectTab = (tab: TabKey) => {
    setCurrentTab(tab);
    setSelectedMatch(null);
    setSelectedTeam(null);
  };

  const renderScreen = () => {
    if (selectedMatch) {
      return (
        <MatchDetailScreen
          match={selectedMatch}
          onBack={() => setSelectedMatch(null)}
        />
      );
    }
    if (selectedTeam) {
      return (
        <TeamProfileScreen
          team={selectedTeam}
          onBack={() => setSelectedTeam(null)}
          onSelectMatch={setSelectedMatch}
        />
      );
    }
    switch (currentTab) {
      case "jogos":
        return <DashboardScreen onSelectMatch={setSelectedMatch} />;
      case "live":
        return <LiveScreen onSelectMatch={setSelectedMatch} />;
      case "times":
        return <TeamsScreen onSelectTeam={setSelectedTeam} />;
      case "classificacao":
        return <StandingsScreen />;
      case "favoritos":
        return <FavoritesScreen />;
      default:
        return <DashboardScreen onSelectMatch={setSelectedMatch} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Conteúdo da Tela */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Barra de Navegação Inferior (Bottom Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => selectTab("jogos")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "jogos" && styles.tabIconActive,
            ]}
          >
            ⚡
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "jogos" && styles.tabLabelActive,
            ]}
          >
            Jogos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => selectTab("live")}
          activeOpacity={0.7}
        >
          <View style={styles.liveTabIconWrapper}>
            <Text
              style={[
                styles.tabIcon,
                currentTab === "live" && styles.tabIconLive,
              ]}
            >
              🔴
            </Text>
            <View style={styles.livePulseDot} />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "live" && styles.tabLabelLive,
            ]}
          >
            Ao Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => selectTab("times")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "times" && styles.tabIconActive,
            ]}
          >
            🛡️
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "times" && styles.tabLabelActive,
            ]}
          >
            Times
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => selectTab("classificacao")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "classificacao" && styles.tabIconActive,
            ]}
          >
            🏆
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "classificacao" && styles.tabLabelActive,
            ]}
          >
            Tabela
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => selectTab("favoritos")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "favoritos" && styles.tabIconActive,
            ]}
          >
            ⭐
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "favoritos" && styles.tabLabelActive,
            ]}
          >
            Favoritos
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
