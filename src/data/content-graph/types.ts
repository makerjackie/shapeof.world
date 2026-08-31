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

export type Path = LocalizedNodeCopy & {
  id: PathId
  /** Omitted publication status keeps a discovered node in authoring-only draft state. */
  publication?: ContentGraphPublication
  worldIds: ReadonlyArray<string>
  order: number
}

export type PathContext = {
  path: Path
  order: number
  total: number
  nextWorldId?: string
  prevWorldId?: string
}
