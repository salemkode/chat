import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from 'react'
import { TextInput } from 'react-native'

/** Default minimum content height (px) for a chat-like composer. */
export const AUTO_GROW_DEFAULT_MIN_HEIGHT = 44

/** Default maximum content height (px) gives the composer room for four lines. */
export const AUTO_GROW_DEFAULT_MAX_HEIGHT = 120

/**
 * Imperative handle exposed by {@link AutoGrowingTextInput}.
 *
 * Mirrors the useful methods on `TextInput` plus an auto-grow helper so callers
 * rarely need direct access to the underlying ref.
 */
export type AutoGrowingTextInputHandle = {
  focus(): void
  blur(): void
  clear(): void
  isFocused(): boolean
  /** Reset the tracked content size back to the configured minimum height. */
  resetHeightToMin(): void
  /** Forward low-level native props to the underlying `TextInput`. */
  setNativeProps(nativeProps: ComponentProps<typeof TextInput>): void
}

type AutoGrowingTextInputProps = Omit<ComponentProps<typeof TextInput>, 'ref'> & {
  /** Minimum height (px) the input occupies even when empty. */
  minHeight?: number
  /** Maximum height (px) before internal scrolling kicks in. */
  maxHeight?: number
  /**
   * When `true` (default), the tracked height resets to `minHeight` whenever
   * `value` becomes empty. Disable to manage reset behavior externally.
   */
  resetHeightOnEmpty?: boolean
  ref?: Ref<AutoGrowingTextInputHandle | null>
}

/**
 * Reusable auto-growing multiline `TextInput`.
 *
 * Tracks `onContentSizeChange` to grow the input up to `maxHeight`, then enables
 * internal scrolling. The tracked height resets to `minHeight` once the value is
 * cleared, so the composer collapses back to its rest state.
 *
 * Exposes a stable imperative handle ({@link AutoGrowingTextInputHandle}) with
 * `focus`, `blur`, `clear`, `isFocused`, `resetHeightToMin`, and `setNativeProps`
 * — mirroring the classic `AutoGrowingTextInput` ergonomic surface without
 * requiring a custom native module.
 */
export function AutoGrowingTextInput({
  minHeight = AUTO_GROW_DEFAULT_MIN_HEIGHT,
  maxHeight = AUTO_GROW_DEFAULT_MAX_HEIGHT,
  value,
  resetHeightOnEmpty = true,
  onContentSizeChange,
  scrollEnabled,
  style,
  ref,
  ...rest
}: AutoGrowingTextInputProps) {
  const inputRef = useRef<TextInput>(null)
  const [contentHeight, setContentHeight] = useState(minHeight)

  const effectiveContentHeight =
    resetHeightOnEmpty && (value === '' || value == null) ? minHeight : contentHeight
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, effectiveContentHeight))
  const shouldScrollInternally = effectiveContentHeight > maxHeight

  const resetHeightToMin = useCallback(() => {
    setContentHeight(minHeight)
  }, [minHeight])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => inputRef.current?.clear(),
      isFocused: () => inputRef.current?.isFocused() ?? false,
      resetHeightToMin,
      setNativeProps: (nativeProps) => {
        inputRef.current?.setNativeProps(nativeProps)
      },
    }),
    [resetHeightToMin],
  )

  return (
    <TextInput
      ref={inputRef}
      {...rest}
      value={value}
      scrollEnabled={scrollEnabled ?? shouldScrollInternally}
      onContentSizeChange={(event) => {
        setContentHeight(event.nativeEvent.contentSize.height)
        onContentSizeChange?.(event)
      }}
      style={[
        style,
        {
          minHeight,
          height: clampedHeight,
          maxHeight,
        },
      ]}
    />
  )
}
