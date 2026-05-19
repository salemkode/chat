import Constants, { ExecutionEnvironment } from "expo-constants";

import { DrawerThreadRowFallback } from "@/components/drawer/drawer-thread-row-fallback";
import type { DrawerThreadRowProps } from "@/components/drawer/drawer-thread-row-types";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const SwiftUIDrawerThreadRow: typeof DrawerThreadRowFallback | undefined =
  isExpoGo
    ? undefined
    : require("./drawer-thread-row.swiftui").DrawerThreadRow;

export function DrawerThreadRow(props: DrawerThreadRowProps) {
  if (SwiftUIDrawerThreadRow) {
    return <SwiftUIDrawerThreadRow {...props} />;
  }
  return <DrawerThreadRowFallback {...props} />;
}
