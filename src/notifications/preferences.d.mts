import type { Detail } from "../types";
import type { NotificationPreferences } from "../account/AccountProvider";
import type { GameAlert } from "./events.mjs";
export type ConfigurableAlert = GameAlert & {
  kind: "score" | "red" | "phase" | "start" | "finish" | "period";
};
export function configuredAlerts(
  previous: Detail,
  current: Detail,
): ConfigurableAlert[];
export function allowAlert(
  alert: ConfigurableAlert,
  sport: string,
  preferences: NotificationPreferences,
): boolean;
