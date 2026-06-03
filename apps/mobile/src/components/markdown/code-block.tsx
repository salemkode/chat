import * as Clipboard from 'expo-clipboard'
import { Check, Copy } from 'lucide-react-native'
import transform, { type StyleTuple } from 'css-to-react-native'
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark, github } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Icon } from '@/components/icon'
import { useNativeThemeColors } from '@/hooks/use-native-theme-colors'

type HighlighterStyleSheet = { [key: string]: TextStyle }
type ReactStyle = { [key: string]: CSSProperties }

type SyntaxRendererProps = {
  rows: RendererNode[]
}

interface RendererNode {
  children?: RendererNode[]
  properties?: {
    className?: unknown[]
    [key: string]: unknown
  }
  tagName?: unknown
  value?: string | number
}

const ALLOWED_STYLE_PROPERTIES: Record<string, boolean> = {
  color: true,
  background: true,
  backgroundColor: true,
  fontWeight: true,
  fontStyle: true,
}

const cleanStyle = (style: CSSProperties) => {
  const styles = Object.entries(style)
    .filter(([key]) => ALLOWED_STYLE_PROPERTIES[key])
    .map<StyleTuple>(([key, value]) => [key, String(value)])
  return transform(styles)
}

const getRNStylesFromHljsStyle = (hljsStyle: ReactStyle): HighlighterStyleSheet => {
  return Object.fromEntries(
    Object.entries(hljsStyle).map(([className, style]) => [className, cleanStyle(style)]),
  )
}

function trimNewlines(string: string): string {
  let start = 0
  let end = string.length
  while (start < end && (string[start] === '\r' || string[start] === '\n')) {
    start++
  }
  while (end > start && (string[end - 1] === '\r' || string[end - 1] === '\n')) {
    end--
  }
  return start > 0 || end < string.length ? string.slice(start, end) : string
}

function normalizeLanguageLabel(language: string | undefined): string {
  return language || 'text'
}

const lightSyntaxTheme = github
const darkSyntaxTheme = atomOneDark
const lightStylesheet = getRNStylesFromHljsStyle(lightSyntaxTheme)
const darkStylesheet = getRNStylesFromHljsStyle(darkSyntaxTheme)

interface CodeBlockProps {
  code: string
  language?: string
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const { theme, foreground, mutedForeground, border, card, muted, secondary } =
    useNativeThemeColors()
  const isDark = theme === 'dark'
  const stylesheet = isDark ? darkStylesheet : lightStylesheet
  const syntaxTheme = isDark ? darkSyntaxTheme : lightSyntaxTheme
  const label = normalizeLanguageLabel(language)
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const baseStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.text,
        { color: stylesheet.hljs?.color || foreground || '#333' },
      ]),
    [foreground, stylesheet],
  )

  const containerStyle = useMemo<ViewStyle[]>(
    () => [
      styles.container,
      {
        backgroundColor: card || (isDark ? '#111827' : '#f6f8fa'),
        borderColor: border || (isDark ? '#263244' : '#d8dee4'),
      },
    ],
    [border, card, isDark],
  )

  const headerStyle = useMemo<ViewStyle[]>(
    () => [
      styles.header,
      {
        backgroundColor: secondary || (isDark ? '#1f2937' : '#f6f8fa'),
        borderBottomColor: border || (isDark ? '#263244' : '#d8dee4'),
      },
    ],
    [border, isDark, secondary],
  )

  const labelStyle = useMemo(
    () => [styles.languageLabel, { color: mutedForeground || foreground || '#57606a' }],
    [foreground, mutedForeground],
  )

  const copyButtonStyle = useMemo(
    () => [
      styles.copyButton,
      {
        backgroundColor: muted || (isDark ? '#273142' : '#eef2f6'),
        borderColor: border || (isDark ? '#334155' : '#d8dee4'),
      },
    ],
    [border, isDark, muted],
  )

  const getStylesForNode = useCallback(
    (node: RendererNode): TextStyle[] => {
      const classes = (node.properties?.className ?? []).filter(
        (className): className is string => typeof className === 'string',
      )
      return classes.reduce<TextStyle[]>((acc, className) => {
        const classStyle = stylesheet[className]
        if (classStyle) {
          acc.push(classStyle)
        }
        return acc
      }, [])
    },
    [stylesheet],
  )

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(code)
    if (copiedTimerRef.current != null) {
      clearTimeout(copiedTimerRef.current)
    }
    setCopied(true)
    copiedTimerRef.current = setTimeout(() => {
      setCopied(false)
      copiedTimerRef.current = null
    }, 1400)
  }, [code])

  useEffect(
    () => () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = null
      }
    },
    [],
  )

  const renderNodeChildren = useCallback(
    (nodes: RendererNode[], keyPrefix = 'row'): ReactNode[] => {
      return nodes.reduce<ReactNode[]>((acc, node, index) => {
        const keyPrefixWithIndex = `${keyPrefix}_${index}`
        if (node.children) {
          const nodeStyles = getStylesForNode(node)
          const textStyles = nodeStyles.length > 0 ? nodeStyles : undefined
          acc.push(
            <Text style={textStyles} key={keyPrefixWithIndex}>
              {renderNodeChildren(node.children, `${keyPrefixWithIndex}_child`)}
            </Text>,
          )
        }
        if (node.value) {
          acc.push(trimNewlines(String(node.value)))
        }
        return acc
      }, [])
    },
    [getStylesForNode],
  )

  const renderer = useCallback(
    (props: SyntaxRendererProps) => {
      const { rows } = props
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.codeContent}>
            {rows.map((row: RendererNode, index: number) => (
              <Text key={`row_${index}`} style={baseStyle}>
                {renderNodeChildren(row.children || [], `row_${index}`)}
              </Text>
            ))}
          </View>
        </ScrollView>
      )
    },
    [renderNodeChildren, baseStyle],
  )

  return (
    <View style={containerStyle}>
      <View style={headerStyle}>
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          onPress={handleCopy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied code' : 'Copy code'}
          style={copyButtonStyle}
        >
          <Icon icon={copied ? Check : Copy} className="size-3.5 text-muted-foreground" />
        </Pressable>
      </View>
      <SyntaxHighlighter
        renderer={renderer}
        CodeTag={View}
        PreTag={View}
        style={syntaxTheme}
        customStyle={{ backgroundColor: 'transparent' }}
        language={language || 'text'}
      >
        {code}
      </SyntaxHighlighter>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
    overflow: 'hidden',
  },
  header: {
    minHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 8,
  },
  languageLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  copyButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    minWidth: '100%',
  },
  codeContent: {
    padding: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'monospace-ui', default: 'monospace' }),
  },
})
