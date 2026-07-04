export function normalizeCapability(capability: string) {
  return capability.trim().toLowerCase()
}

export function modelSupportsTools(capabilities?: string[] | null) {
  if (!capabilities?.length) {
    return false
  }

  return capabilities.some((capability) => {
    const normalized = normalizeCapability(capability)
    return normalized === 'tools' || normalized === 'tool_calling'
  })
}

export function modelIsAuxiliaryEligible(capabilities?: string[] | null) {
  if (!capabilities?.length) {
    return false
  }

  return capabilities.some((capability) => normalizeCapability(capability) === 'auxiliary')
}

export function filterAuxiliaryCandidatePool<T extends { capabilities?: string[] | null }>(
  models: T[],
) {
  const hasAuxiliaryTaggedModel = models.some((model) =>
    modelIsAuxiliaryEligible(model.capabilities),
  )

  if (!hasAuxiliaryTaggedModel) {
    return models
  }

  return models.filter((model) => modelIsAuxiliaryEligible(model.capabilities))
}
