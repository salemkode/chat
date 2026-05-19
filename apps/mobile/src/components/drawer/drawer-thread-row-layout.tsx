import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

/** Fixed row height so context-menu long-press does not reflow the drawer list. */
export const DRAWER_THREAD_ROW_HEIGHT = 44;
export const DRAWER_THREAD_ROW_HEIGHT_NESTED = 36;

export function drawerThreadRowHeight(nested?: boolean) {
  return nested ? DRAWER_THREAD_ROW_HEIGHT_NESTED : DRAWER_THREAD_ROW_HEIGHT;
}

export function DrawerThreadRowSlot({
  children,
  nested,
}: {
  children: (layout: { width: number }) => React.ReactNode;
  nested?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const rowHeight = drawerThreadRowHeight(nested);

  return (
    <View
      className={nested ? "mx-2 ml-6" : "mx-2"}
      style={{
        alignSelf: "stretch",
        height: rowHeight,
        overflow: "hidden",
      }}
      onLayout={(event: LayoutChangeEvent) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== width) {
          setWidth(nextWidth);
        }
      }}
    >
      {width > 0 ? children({ width }) : null}
    </View>
  );
}

export function DrawerThreadRowSimpleLayout({
  children,
  nested,
}: {
  children: React.ReactNode;
  nested?: boolean;
}) {
  return (
    <View
      className={nested ? "mx-2 ml-6" : "mx-2"}
      style={{ alignSelf: "stretch", height: drawerThreadRowHeight(nested) }}
    >
      {children}
    </View>
  );
}
