export type CategoryId = string
export type PathId = string
export type ContentGraphPublication = 'draft' | 'public'

export type LocalizedNodeCopy = {
  title: string
  titleEn: string
  description: string
  descriptionEn: string
}

export type Category = LocalizedNodeCopy & {
  id: CategoryId
  /** Omitted publication status keeps a discovered node in authoring-only draft state. */
  publication?: ContentGraphPublication
  /** Stable breadcrumb and root-category ancestry. */
  primaryParentId?: CategoryId
  /** Additional browse locations for cross-disciplinary knowledge. */
  additionalParentIds?: ReadonlyArray<CategoryId>
  accent?: string
  order: number
}

export type PathStopLabel = {
  zh: string
  en: string
}

export type Path = LocalizedNodeCopy & {
  id: PathId
  /** Public URL segment for `/routes/<slug>`. Stable independently of the internal Path id. */
  slug: string
  /** Omitted publication status keeps a discovered node in authoring-only draft state. */
  publication?: ContentGraphPublication
  /** Explicit experimental direct link; remains outside public discovery when draft. */
  experimental?: boolean
  /** Actual publication date of a substantial series curation update (YYYY-MM-DD). */
  updatedAt?: string
  worldIds: ReadonlyArray<string>
  /** Optional short stop names for the homepage chain. Must match `worldIds` length when present. */
  stopLabels?: ReadonlyArray<PathStopLabel>
  order: number
}

export type PathContext = {
  path: Path
  order: number
  total: number
  nextWorldId?: string
  prevWorldId?: string
}
