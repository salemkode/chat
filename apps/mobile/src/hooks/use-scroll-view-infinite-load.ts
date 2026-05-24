import { useCallback, useRef } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

type UseScrollViewInfiniteLoadOptions = {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  threshold?: number;
  enabled?: boolean;
};

export function useScrollViewInfiniteLoad({
  hasMore,
  isLoadingMore,
  loadMore,
  threshold = 240,
  enabled = true,
}: UseScrollViewInfiniteLoadOptions) {
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const scrollViewHeightRef = useRef(0);
  const contentHeightRef = useRef(0);

  const maybeLoadMore = useCallback(() => {
    if (!enabled || !hasMore || isLoadingMore) {
      return;
    }
    loadMoreRef.current();
  }, [enabled, hasMore, isLoadingMore]);

  const checkContentFillsViewport = useCallback(() => {
    if (scrollViewHeightRef.current <= 0 || contentHeightRef.current <= 0) {
      return;
    }

    if (contentHeightRef.current <= scrollViewHeightRef.current + threshold) {
      maybeLoadMore();
    }
  }, [maybeLoadMore, threshold]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled || !hasMore || isLoadingMore) {
        return;
      }

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromBottom <= threshold) {
        maybeLoadMore();
      }
    },
    [enabled, hasMore, isLoadingMore, maybeLoadMore, threshold],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scrollViewHeightRef.current = event.nativeEvent.layout.height;
      checkContentFillsViewport();
    },
    [checkContentFillsViewport],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height;
      checkContentFillsViewport();
    },
    [checkContentFillsViewport],
  );

  return { onScroll, onLayout, onContentSizeChange };
}
