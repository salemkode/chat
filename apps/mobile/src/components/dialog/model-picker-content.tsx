import { AndroidGrabber } from '@/components/grabber'
import { BrandIcon } from '@/components/brand-icon'
import { InfiniteScrollFooter } from '@/components/infinite-scroll-footer'
import { Icon } from '@/components/icon'
import type { Model } from '@/components/model-context'
import {
  AUTO_MODEL_ID,
  encodeAutoModelCollectionSelection,
  useModel,
} from '@/components/model-context'
import { useModels } from '@/hooks/use-models'
import type { Id } from '@convex/_generated/dataModel'
import { hasModelBrowserQueryFilters } from '@chat/core'
import { inferBrandIconName } from '@chat/core/brand-icons'
import { LegendList } from '@legendapp/list/react-native'
import { Image } from 'expo-image'
import { Search, Sparkles, Star } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStableSafeAreaInsets } from '@/utils/use-stable-safe-area-insets'

type ModelCategory = 'all' | 'favorites' | Id<'modelCollections'>

type ModelCategoryRow = {
  id: string
  label: string
  value: ModelCategory
}

type OrderedModel = {
  id: Id<'models'>
  modelId: string
  label: string
  description?: string | null
  icon?: string
  iconType?: Model['iconType']
  iconUrl?: string
  providerType?: string | null
  sortOrder: number
  isFavorite: boolean
}

type ModelPickerContentProps = {
  selectedModelKey: string | undefined
  onSelectModelKey: (modelKey: string) => void
}

const MODEL_PICKER_BOTTOM_SPACER = 44

function ModelRow({
  label,
  icon,
  iconType,
  iconUrl,
  providerType,
  modelId,
  selected,
  onPress,
  trailing,
}: {
  label: string
  icon?: string
  iconType?: Model['iconType']
  iconUrl?: string
  providerType?: string | null
  modelId?: string
  selected: boolean
  onPress: () => void
  trailing?: React.ReactNode
}) {
  const brandIconName = inferBrandIconName({
    icon,
    iconType,
    providerType,
    modelId,
    displayName: label,
  })

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-5 py-3 active:bg-muted ${
        selected ? 'bg-muted' : ''
      }`}
    >
      <View className="size-8 items-center justify-center rounded-full border border-border bg-card">
        {iconType === 'upload' && iconUrl ? (
          <Image source={{ uri: iconUrl }} className="size-8 rounded-full" />
        ) : iconType === 'emoji' && icon ? (
          <Text className="text-[17px]">{icon}</Text>
        ) : brandIconName ? (
          <BrandIcon name={brandIconName} size={18} />
        ) : (
          <Icon icon={Sparkles} className="size-4 text-muted-foreground" />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] text-foreground" numberOfLines={1}>
          {label}
        </Text>
      </View>
      {trailing}
    </Pressable>
  )
}

function ModelListItem({
  item,
  selectedModelKey,
  onSelectModelKey,
  setFavorite,
}: {
  item: OrderedModel
  selectedModelKey: string | undefined
  onSelectModelKey: (modelKey: string) => void
  setFavorite: (modelId: Id<'models'>, isFavorite: boolean) => Promise<void>
}) {
  function selectModel() {
    onSelectModelKey(item.modelId)
  }

  function toggleFavorite() {
    void setFavorite(item.id, !item.isFavorite)
  }

  return (
    <ModelRow
      label={item.label}
      icon={item.icon}
      iconType={item.iconType}
      iconUrl={item.iconUrl}
      providerType={item.providerType}
      modelId={item.modelId}
      selected={item.modelId === selectedModelKey}
      onPress={selectModel}
      trailing={
        <Pressable
          onPress={toggleFavorite}
          hitSlop={8}
          accessibilityLabel={item.isFavorite ? 'Remove favorite' : 'Favorite model'}
        >
          <Star
            size={16}
            color={item.isFavorite ? '#fbbf24' : '#888'}
            fill={item.isFavorite ? '#fbbf24' : 'transparent'}
          />
        </Pressable>
      }
    />
  )
}

export function ModelPickerContent({
  selectedModelKey,
  onSelectModelKey,
}: ModelPickerContentProps) {
  const insets = useStableSafeAreaInsets()
  const [activeCategory, setActiveCategory] = useState<ModelCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const collectionId =
    activeCategory !== 'all' && activeCategory !== 'favorites' ? activeCategory : undefined
  const favoritesOnly = activeCategory === 'favorites'
  const hasFilters = hasModelBrowserQueryFilters({
    collectionId,
    favoritesOnly,
    searchQuery,
  })

  const {
    catalogModels,
    collections,
    setFavorite,
    autoModelAvailable,
    catalogHasMore,
    catalogIsLoadingMore,
    catalogLoadMore,
  } = useModel()

  const filteredCatalog = useModels({
    collectionId,
    favoritesOnly,
    searchQuery,
    prefetchAll: true,
  })

  const models = hasFilters ? filteredCatalog.models : catalogModels
  const hasMore = hasFilters ? filteredCatalog.hasMore : catalogHasMore
  const isLoadingMore = hasFilters ? filteredCatalog.isLoadingMore : catalogIsLoadingMore
  const loadMore = hasFilters ? filteredCatalog.loadMore : catalogLoadMore

  const sortedCollections = [...collections].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  )

  const activeCollection =
    typeof activeCategory === 'string' && activeCategory !== 'all' && activeCategory !== 'favorites'
      ? sortedCollections.find((collection) => collection.id === activeCategory)
      : undefined

  const collectionOrder = activeCollection
    ? new Map(activeCollection.modelIds.map((modelId, index) => [modelId, index]))
    : null

  const orderedModels: OrderedModel[] = [...models]
    .map((model) => ({
      id: model._id,
      modelId: model.modelId,
      label: model.displayName,
      description: model.description,
      icon: model.icon || model.provider?.icon,
      iconType: model.iconType || model.provider?.iconType,
      iconUrl: model.iconUrl || model.provider?.iconUrl,
      providerType: model.provider?.providerType ?? null,
      sortOrder: model.sortOrder,
      isFavorite: model.isFavorite,
    }))
    .sort((left, right) => {
      const leftCollectionOrder = collectionOrder?.get(left.id)
      const rightCollectionOrder = collectionOrder?.get(right.id)
      if (leftCollectionOrder !== undefined && rightCollectionOrder !== undefined) {
        return leftCollectionOrder - rightCollectionOrder
      }
      if (left.isFavorite !== right.isFavorite) {
        return left.isFavorite ? -1 : 1
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.label.localeCompare(right.label)
    })

  const autoAllSelected = selectedModelKey === AUTO_MODEL_ID
  const autoCollectionSelected = activeCollection
    ? selectedModelKey === encodeAutoModelCollectionSelection(activeCollection.id)
    : false

  const categoryLabel =
    activeCategory === 'favorites' ? 'Favorites' : (activeCollection?.name ?? 'All models')

  const categoryRows: ModelCategoryRow[] = [
    { id: 'all', label: 'All', value: 'all' },
    { id: 'favorites', label: 'Favorites', value: 'favorites' },
    ...sortedCollections.map((collection) => ({
      id: collection.id,
      label: collection.name,
      value: collection.id,
    })),
  ]

  function renderModelItem({ item }: { item: OrderedModel }) {
    return (
      <ModelListItem
        item={item}
        selectedModelKey={selectedModelKey}
        onSelectModelKey={onSelectModelKey}
        setFavorite={setFavorite}
      />
    )
  }

  function renderCategoryItem({ item }: { item: ModelCategoryRow }) {
    return (
      <CategoryPill
        label={item.label}
        active={activeCategory === item.value}
        onPress={() => setActiveCategory(item.value)}
      />
    )
  }

  return (
    <LegendList
      className="flex-1"
      data={orderedModels}
      keyExtractor={(item) => item.id}
      estimatedItemSize={58}
      contentContainerStyle={{
        paddingBottom: process.env.EXPO_OS === 'android' ? insets.bottom : undefined,
      }}
      onEndReached={hasMore && !isLoadingMore ? () => loadMore(60) : undefined}
      onEndReachedThreshold={0.35}
      renderItem={renderModelItem}
      ListHeaderComponent={
        <>
          <AndroidGrabber />

          <View className="px-4 pt-2">
            <View className="flex-row items-center rounded-full border border-border bg-card px-3">
              <Icon icon={Search} className="size-4 text-muted-foreground" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search models..."
                placeholderTextColor="#888"
                className="ml-2 flex-1 py-2.5 text-[15px] text-foreground"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
            <Text className="mt-3 text-[13px] font-medium text-foreground">{categoryLabel}</Text>
            <Text className="mt-0.5 text-[12px] text-muted-foreground">
              {activeCategory === 'favorites'
                ? 'Your starred models across the catalog.'
                : activeCollection?.description || 'Browse the same model catalog as the web app.'}
            </Text>
          </View>

          <LegendList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categoryRows}
            keyExtractor={(item) => item.id}
            estimatedItemSize={96}
            renderItem={renderCategoryItem}
            style={{ height: 44 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 4,
              gap: 8,
            }}
          />

          {autoModelAvailable ? (
            <View className="px-1 pt-2">
              <Text className="px-4 pb-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                Routing
              </Text>
              <ModelRow
                label="Auto"
                selected={autoAllSelected}
                onPress={() => onSelectModelKey(AUTO_MODEL_ID)}
              />
              {activeCollection ? (
                <ModelRow
                  label={`Auto (${activeCollection.name})`}
                  icon={activeCollection.icon}
                  iconType={activeCollection.iconType}
                  iconUrl={activeCollection.iconUrl}
                  selected={autoCollectionSelected}
                  onPress={() =>
                    onSelectModelKey(encodeAutoModelCollectionSelection(activeCollection.id))
                  }
                />
              ) : null}
            </View>
          ) : null}

          <View className="pt-2" />
        </>
      }
      ListEmptyComponent={
        <Text className="px-5 py-6 text-[13px] text-muted-foreground">No models match.</Text>
      }
      ListFooterComponent={
        <>
          <InfiniteScrollFooter isLoadingMore={isLoadingMore} label="Loading more models..." />
          <View
            pointerEvents="none"
            style={{
              height: Math.max(insets.bottom, MODEL_PICKER_BOTTOM_SPACER),
            }}
          />
        </>
      }
    />
  )
}

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        active ? 'border-foreground bg-foreground' : 'border-border bg-card'
      }`}
    >
      <Text className={`text-[13px] ${active ? 'text-background' : 'text-foreground'}`}>
        {label}
      </Text>
    </Pressable>
  )
}
