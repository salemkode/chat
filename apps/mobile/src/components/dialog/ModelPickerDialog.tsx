import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list/react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  InteractionManager,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type {
  ModelDialogItem,
  ModelSidebarFilter,
  ModelSidebarItem,
  ModelPickerDialogProps,
} from './model-dialog.types'
import {
  buildModelSidebarItems,
  filterModelDialogItems,
  filtersMatch,
  getDefaultModelSidebarFilter,
  getModelDialogEmptyText,
  sortModelDialogItems,
} from './model-dialog.utils'

const SHEET_NAME = 'model-picker'

/** TrueSheet can call present() before iOS registers the view (mount vs didMoveToWindow race). */
async function presentSheetSafely(sheet: TrueSheet | null): Promise<void> {
  if (!sheet) return
  const delays = [0, 16, 48] as const
  let lastError: unknown
  for (const ms of delays) {
    if (ms > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, ms))
    }
    try {
      await sheet.present()
      return
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

function RailGlyph({ item, active }: { item: ModelSidebarItem; active: boolean }) {
  if (item.iconKind === 'provider' && item.provider?.iconUrl) {
    return (
      <Image
        source={{ uri: item.provider.iconUrl }}
        className="size-5 rounded-full"
        resizeMode="cover"
      />
    )
  }

  if (item.iconKind === 'provider' && item.provider?.iconType === 'emoji' && item.provider.icon) {
    return (
      <Text className="text-[16px]" style={{ lineHeight: 18 }}>
        {item.provider.icon}
      </Text>
    )
  }

  if (item.iconKind === 'provider') {
    const providerLabel = item.label.trim()
    return (
      <Text
        className={`text-[11px] uppercase ${active ? 'text-white' : 'text-zinc-400'}`}
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {providerLabel.slice(0, 2)}
      </Text>
    )
  }

  if (item.iconKind === 'collection') {
    return (
      <Ionicons
        name={active ? 'albums' : 'albums-outline'}
        size={18}
        color={active ? '#f5f3ff' : '#a1a1aa'}
      />
    )
  }

  return (
    <Ionicons
      name={active ? 'star' : 'star-outline'}
      size={18}
      color={active ? '#facc15' : '#a1a1aa'}
    />
  )
}

function ModelPickerSidebar({
  items,
  activeFilter,
  onSelect,
  width,
}: {
  items: ModelSidebarItem[]
  activeFilter: ModelSidebarFilter
  onSelect: (filter: ModelSidebarFilter) => void
  width: number
}) {
  return (
    <View
      className="overflow-hidden rounded-[26px] border border-white/10 bg-[#161018]"
      style={{ width }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8 }}
      >
        {items.map((item, index) => {
          const active = filtersMatch(item.filter, activeFilter)
          const showDivider =
            index > 0 &&
            item.filter.kind === 'provider' &&
            items[index - 1]?.filter.kind !== 'provider'

          return (
            <View key={item.key}>
              {showDivider ? (
                <View className="mx-3 my-3 h-px bg-white/10" />
              ) : null}
              <Pressable
                onPress={() => onSelect(item.filter)}
                className={`mb-2 min-h-16 items-center justify-center rounded-[20px] px-2 py-3 ${
                  active
                    ? 'border border-violet-300/35 bg-violet-500/18'
                    : 'border border-transparent bg-white/[0.03]'
                }`}
              >
                <View
                  className={`size-10 items-center justify-center rounded-2xl ${
                    active ? 'bg-white/10' : 'bg-transparent'
                  }`}
                >
                  <RailGlyph item={item} active={active} />
                </View>
                <Text
                  numberOfLines={2}
                  className={`mt-2 text-center text-[11px] ${
                    active ? 'text-zinc-50' : 'text-zinc-400'
                  }`}
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {item.label}
                </Text>
                <Text
                  className={`mt-1 text-[10px] ${active ? 'text-violet-200' : 'text-zinc-500'}`}
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {item.count}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function ModelPickerRow({
  model,
  selected,
  offline,
  onSelect,
  onToggleFavorite,
}: {
  model: ModelDialogItem
  selected: boolean
  offline: boolean
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
}) {
  return (
    <View
      className={`mb-3 overflow-hidden rounded-[24px] border px-4 py-4 ${
        selected
          ? 'border-violet-300/45 bg-violet-500/10'
          : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <Pressable onPress={() => onSelect(model.modelId)} className="active:opacity-90">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text
                className="text-[17px] text-white"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {model.displayName}
              </Text>
              {model.isFree ? (
                <View className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-emerald-200">Free</Text>
                </View>
              ) : null}
            </View>
            <Text
              className="mt-1 text-[12px] text-zinc-500"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {model.provider?.name || 'Other provider'}
            </Text>
            {model.description ? (
              <Text
                className="mt-2 text-[14px] leading-5 text-zinc-300"
                numberOfLines={2}
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {model.description}
              </Text>
            ) : (
              <Text
                className="mt-2 text-[12px] text-zinc-500"
                numberOfLines={1}
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {model.modelId}
              </Text>
            )}
            {model.capabilities?.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {model.capabilities.slice(0, 3).map((capability) => (
                  <View
                    key={capability}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1"
                  >
                    <Text className="text-[10px] text-zinc-300">{capability}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View className="items-end gap-3">
            {selected ? (
              <Ionicons name="checkmark-circle" size={24} color="#d8b4fe" />
            ) : (
              <View className="size-6" />
            )}
            <Pressable
              disabled={offline}
              onPress={() => onToggleFavorite(model.id, !model.isFavorite)}
              className={`rounded-full border px-3 py-2 ${
                offline
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-white/10 bg-white/[0.05]'
              }`}
            >
              <Ionicons
                name={model.isFavorite ? 'star' : 'star-outline'}
                size={16}
                color={offline ? '#52525b' : model.isFavorite ? '#facc15' : '#c4b5fd'}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

function ModelPickerList({
  models,
  selectedModelId,
  offline,
  onSelect,
  onToggleFavorite,
  bottomPadding,
}: {
  models: ModelDialogItem[]
  selectedModelId: string | null
  offline: boolean
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
  bottomPadding: number
}) {
  return (
    <LegendList
      data={models}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      estimatedItemSize={126}
      contentContainerStyle={{
        paddingHorizontal: 14,
        paddingTop: 4,
        paddingBottom: bottomPadding,
      }}
      ListFooterComponent={() => (
        <Text className="mt-2 pb-2 text-center text-[11px] leading-5 text-zinc-500">
          Favorites sync when you are online.
        </Text>
      )}
      renderItem={({ item }) => (
        <ModelPickerRow
          model={item}
          selected={item.modelId === selectedModelId}
          offline={offline}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    />
  )
}

export function ModelPickerDialog({
  visible,
  models,
  collections,
  selectedModelId,
  onClose,
  onSelect,
  onToggleFavorite,
  offline,
}: ModelPickerDialogProps) {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<TrueSheet | null>(null)
  const isPresentedRef = useRef(false)
  const { height, width } = Dimensions.get('window')
  const maxSheetHeight = height * 0.92
  const railWidth = Math.min(Math.max(width * 0.22, 88), 104)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ModelSidebarFilter>({
    kind: 'favorites',
  })

  const sidebarItems = useMemo(
    () => buildModelSidebarItems(models, collections),
    [collections, models],
  )

  useEffect(() => {
    const nextDefault = getDefaultModelSidebarFilter(sidebarItems)
    if (!visible) {
      setQuery('')
      setActiveFilter(nextDefault)
      return
    }
    if (!sidebarItems.some((item) => filtersMatch(item.filter, activeFilter))) {
      setActiveFilter(nextDefault)
    }
  }, [activeFilter, sidebarItems, visible])

  const visibleModels = useMemo(() => {
    const filtered = filterModelDialogItems(
      models,
      collections,
      query,
      activeFilter,
    )
    return sortModelDialogItems(filtered, selectedModelId)
  }, [activeFilter, collections, models, query, selectedModelId])

  useEffect(() => {
    if (!visible) {
      if (isPresentedRef.current) {
        isPresentedRef.current = false
        void sheetRef.current?.dismiss().catch(() => {})
      }
      return
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void presentSheetSafely(sheetRef.current)
        .then(() => {
          isPresentedRef.current = true
        })
        .catch(() => {})
    })
    return () => task.cancel?.()
  }, [visible])

  const header = (
    <View className="border-b border-white/10 px-4 pb-4 pt-2">
      <View className="mb-4 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            className="text-[10px] font-semibold tracking-[0.26em] text-violet-300/95 uppercase"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Altar
          </Text>
          <Text
            className="mt-2 text-[22px] text-white"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Model studio
          </Text>
          <Text className="mt-1.5 text-[13px] leading-5 text-zinc-400">
            Search curated collections, favorites, and providers for this chat.
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text
            className="text-[15px] text-violet-300"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            Done
          </Text>
        </Pressable>
      </View>

      <View className="relative">
        <Ionicons
          name="search"
          size={18}
          color="#a1a1aa"
          style={{ position: 'absolute', left: 14, top: 14, zIndex: 1 }}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, provider, capability, id…"
          placeholderTextColor="#71717a"
          className="rounded-[22px] border border-white/10 bg-black/40 py-3.5 pr-4 pl-11 text-[16px] text-zinc-100"
          style={{ fontFamily: 'Inter_500Medium' }}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    </View>
  )

  const bodyHeight = Math.min(520, Math.max(360, maxSheetHeight - 192))
  const empty = visibleModels.length === 0

  return (
    <TrueSheet
      ref={sheetRef}
      name={SHEET_NAME}
      detents={['auto', 1]}
      maxContentHeight={maxSheetHeight}
      backgroundColor="#17181c"
      cornerRadius={22}
      grabber
      grabberOptions={{
        color: '#52525b',
        width: 40,
        height: 4,
        topMargin: 8,
      }}
      dimmed
      dismissible
      draggable
      scrollable
      insetAdjustment="automatic"
      header={header}
      onDidDismiss={() => {
        isPresentedRef.current = false
        onClose()
      }}
    >
      <View
        className="flex-row gap-3 px-4 pt-4"
        style={{ height: bodyHeight, paddingBottom: Math.max(insets.bottom, 18) }}
      >
        <ModelPickerSidebar
          items={sidebarItems}
          activeFilter={activeFilter}
          onSelect={setActiveFilter}
          width={railWidth}
        />

        <View className="min-w-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[#120d14]">
          <View className="border-b border-white/10 px-4 py-3">
            <Text
              className="text-[11px] tracking-[0.22em] text-violet-200/90 uppercase"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {activeFilter.kind === 'favorites'
                ? 'Favorites'
                : activeFilter.kind === 'collection'
                  ? 'Collection'
                  : 'Provider'}
            </Text>
          </View>

          {empty ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="mb-4 size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Ionicons name="search" size={28} color="#71717a" />
              </View>
              <Text
                className="text-center text-[16px] text-zinc-200"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                No models here
              </Text>
              <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                {getModelDialogEmptyText(activeFilter)}
              </Text>
            </View>
          ) : (
            <ModelPickerList
              models={visibleModels}
              selectedModelId={selectedModelId}
              offline={offline}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
              bottomPadding={Math.max(insets.bottom, 20) + 12}
            />
          )}
        </View>
      </View>
    </TrueSheet>
  )
}
