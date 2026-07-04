import {
  inferMediaTypeFromName,
  normalizeAttachmentFilename,
  resolveAttachmentMediaType,
  type LocalAttachment,
} from '@/components/chat/attachment-types'
import { useChatAttachments } from '@/components/chat/attachment-context'
import { selectThread } from '@/state/thread-selection'
import { useChatCoreContext } from '@chat/core'
import { useRouter } from 'expo-router'
import { useIncomingShare } from 'expo-sharing'
import { useEffect, useMemo, useRef } from 'react'

function stringProperty(payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  switch (key) {
    case 'contentMimeType':
      return 'contentMimeType' in payload && typeof payload.contentMimeType === 'string'
        ? payload.contentMimeType
        : undefined
    case 'contentType':
      return 'contentType' in payload && typeof payload.contentType === 'string'
        ? payload.contentType
        : undefined
    case 'contentUri':
      return 'contentUri' in payload && typeof payload.contentUri === 'string'
        ? payload.contentUri
        : undefined
    case 'originalName':
      return 'originalName' in payload && typeof payload.originalName === 'string'
        ? payload.originalName
        : undefined
    case 'value':
      return 'value' in payload && typeof payload.value === 'string' ? payload.value : undefined
    default:
      return undefined
  }
}

function numberProperty(payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  if (key === 'contentSize' && 'contentSize' in payload && typeof payload.contentSize === 'number') {
    return payload.contentSize
  }

  return undefined
}

function payloadValue(payload: unknown) {
  const value = stringProperty(payload, 'value')?.trim()
  return value && value.length > 0 ? value : null
}

function payloadFileName(payload: unknown) {
  const originalName = stringProperty(payload, 'originalName')?.trim()
  if (originalName) {
    return normalizeAttachmentFilename(originalName, 'Shared attachment')
  }

  const contentUri = stringProperty(payload, 'contentUri')
  if (contentUri) {
    const lastSegment = contentUri.split('/').filter(Boolean).pop()
    if (lastSegment) {
      return normalizeAttachmentFilename(decodeURIComponent(lastSegment), 'Shared attachment')
    }
  }

  return 'Shared attachment'
}

function payloadSignature(payloads: readonly unknown[]) {
  return payloads
    .map((payload) =>
      [stringProperty(payload, 'value') ?? '', stringProperty(payload, 'contentUri') ?? ''].join(
        '|',
      ),
    )
    .join('\n')
}

function buildSharedAttachment(payload: unknown, index: number): LocalAttachment | null {
  const contentUri = stringProperty(payload, 'contentUri')
  const contentType = stringProperty(payload, 'contentType')
  if (!contentUri || contentType === 'text' || contentType === 'website') {
    return null
  }

  const filename = payloadFileName(payload)
  const mediaType = resolveAttachmentMediaType({
    filename,
    mimeType: stringProperty(payload, 'contentMimeType'),
    defaultMediaType:
      contentType === 'image'
        ? (inferMediaTypeFromName(filename) ?? 'image/jpeg')
        : 'application/octet-stream',
  })

  return {
    id: `shared-${Date.now()}-${index}-${filename}`,
    uri: contentUri,
    filename,
    mediaType,
    size: numberProperty(payload, 'contentSize'),
    source: contentType === 'image' ? 'photos' : 'files',
  }
}

function buildSharedText(payloads: readonly unknown[]) {
  const values = payloads
    .map(payloadValue)
    .filter((value): value is string => Boolean(value))

  return values.length > 0 ? values.join('\n\n') : null
}

export function ShareIntentBridge() {
  const router = useRouter()
  const { addAttachments } = useChatAttachments()
  const { setPendingProjectId } = useChatCoreContext()
  const { clearSharedPayloads, isResolving, resolvedSharedPayloads, sharedPayloads } =
    useIncomingShare()
  const lastSignatureRef = useRef<string | null>(null)
  const payloads = useMemo(
    () => (resolvedSharedPayloads.length > 0 ? resolvedSharedPayloads : sharedPayloads),
    [resolvedSharedPayloads, sharedPayloads],
  )

  useEffect(() => {
    if (isResolving || payloads.length === 0) {
      return
    }

    const signature = payloadSignature(payloads)
    if (!signature || signature === lastSignatureRef.current) {
      return
    }
    lastSignatureRef.current = signature

    const sharedText = buildSharedText(payloads)
    const attachments = resolvedSharedPayloads
      .map(buildSharedAttachment)
      .filter((attachment): attachment is LocalAttachment => Boolean(attachment))

    selectThread(undefined)
    setPendingProjectId(null)
    if (attachments.length > 0) {
      addAttachments(attachments)
    }

    router.replace({
      pathname: '/',
      params: sharedText ? { sharedText } : undefined,
    })
    clearSharedPayloads()
  }, [
    addAttachments,
    clearSharedPayloads,
    isResolving,
    payloads,
    resolvedSharedPayloads,
    router,
    setPendingProjectId,
  ])

  return null
}
