import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { TabView, type SceneRendererProps } from 'react-native-tab-view'

type SidebarRoute = { key: 'sidebar' | 'content' }

const routes: SidebarRoute[] = [{ key: 'sidebar' }, { key: 'content' }]

export function SidebarShell({
  renderSidebar,
  renderContent,
}: {
  renderSidebar: (controls: {
    openSidebar: () => void
    closeSidebar: () => void
    isSidebarOpen: boolean
  }) => React.ReactNode
  renderContent: (controls: {
    openSidebar: () => void
    closeSidebar: () => void
    isSidebarOpen: boolean
  }) => React.ReactNode
}) {
  const layout = useWindowDimensions()
  const [index, setIndex] = useState(1)

  const openSidebar = useCallback(() => {
    setIndex(0)
  }, [])

  const closeSidebar = useCallback(() => {
    setIndex(1)
  }, [])

  const controls = useMemo(
    () => ({
      openSidebar,
      closeSidebar,
      isSidebarOpen: index === 0,
    }),
    [closeSidebar, index, openSidebar],
  )

  const navigationState = useMemo(() => ({ index, routes }), [index])
  const sidebarWidth = Math.min(layout.width * 0.86, 360)

  const renderScene = useCallback(
    ({ route }: SceneRendererProps & { route: SidebarRoute }) => {
      if (route.key === 'sidebar') {
        return (
          <View style={styles.sidebarScene}>
            <View style={[styles.sidebarPanel, { width: sidebarWidth }]}>
              {renderSidebar(controls)}
            </View>
            <Pressable
              style={styles.sidebarBackdrop}
              accessibilityLabel="Close sidebar"
              onPress={closeSidebar}
            />
          </View>
        )
      }

      return <View style={styles.contentScene}>{renderContent(controls)}</View>
    },
    [closeSidebar, controls, renderContent, renderSidebar, sidebarWidth],
  )

  return (
    <TabView
      navigationState={navigationState}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
      lazy
      swipeEnabled
      animationEnabled
      renderTabBar={() => null}
    />
  )
}

const styles = StyleSheet.create({
  contentScene: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  sidebarBackdrop: {
    flex: 1,
  },
  sidebarPanel: {
    maxWidth: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#2f3138',
  },
  sidebarScene: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
  },
})
