import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

/** Fixed row height so context-menu long-press does not reflow the drawer list. */
export const DRAWER_THREAD_ROW_HEIGHT = 44;

export function DrawerThreadRowSlot({
  children,
}: {
  children: (layout: { width: number }) => React.ReactNode;
}) {
  const [width, setWidth] = useState(0);

  return (
    <View
      className="mx-2"
      style={{
        alignSelf: "stretch",
        height: DRAWER_THREAD_ROW_HEIGHT,
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
}: {
  children: React.ReactNode;
}) {
  return (
    <View
      className="mx-2"
      style={{ alignSelf: "stretch", height: DRAWER_THREAD_ROW_HEIGHT }}
    >
      {children}
    </View>
  );
}
