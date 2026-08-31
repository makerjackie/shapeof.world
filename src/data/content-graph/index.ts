import type {
  Category,
  CategoryId,
  ContentGraphPublication,
  Path,
  PathContext,
  PathId,
} from './types'

type CategoryModule = { default: Category }
type PathModule = { default: Path }

const categoryModules = import.meta.glob('./categories/*.ts', { eager: true }) as Record<string, CategoryModule>
const pathModules = import.meta.glob('./paths/*.ts', { eager: true }) as Record<string, PathModule>

function uniqueById<T extends { id: string }>(items: ReadonlyArray<T>, kind: string): Map<string, T> {
  const result = new Map<string, T>()
  for (const item of items) {
    if (result.has(item.id)) throw new Error(`Duplicate ${kind} id: ${item.id}`)
    result.set(item.id, item)
  }
  return result
}

function sortByOrder<T extends { id: string; order: number }>(items: ReadonlyArray<T>): Array<T> {
  return [...items].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
}

export function getContentGraphPublication(
  node: Pick<Category | Path, 'publication'>,
): ContentGraphPublication {
  return node.publication ?? 'draft'
}

export function isPublicContentGraphNode(
  node: Pick<Category | Path, 'publication'>,
): boolean {
  return getContentGraphPublication(node) === 'public'
}

export const allCategories = sortByOrder(Object.values(categoryModules).map((module) => module.default))
export const allPaths = sortByOrder(Object.values(pathModules).map((module) => module.default))

export const categories = allCategories.filter(isPublicContentGraphNode)
export const paths = allPaths.filter(isPublicContentGraphNode)

const allCategoryById = uniqueById(allCategories, 'category')
uniqueById(allPaths, 'path')
const categoryById = uniqueById(categories, 'public category')
const pathById = uniqueById(paths, 'public path')

function parentIds(category: Category): ReadonlyArray<CategoryId> {
  return [category.primaryParentId, ...(category.additionalParentIds ?? [])]
    .filter((id): id is CategoryId => Boolean(id))
}

function assertCategoryGraph(): void {
  for (const category of allCategories) {
    const parents = parentIds(category)
    if (new Set(parents).size !== parents.length) {
      throw new Error(`Category ${category.id} repeats a parent`)
    }
    for (const parentId of parents) {
      if (!allCategoryById.has(parentId)) throw new Error(`Category ${category.id} has unknown parent ${parentId}`)
      if (parentId === category.id) throw new Error(`Category ${category.id} cannot be its own parent`)
      if (isPublicContentGraphNode(category) && !categoryById.has(parentId)) {
        throw new Error(`Public category ${category.id} has non-public parent ${parentId}`)
      }
    }
  }

  const visiting = new Set<CategoryId>()
  const visited = new Set<CategoryId>()
  const visit = (categoryId: CategoryId) => {
    if (visiting.has(categoryId)) throw new Error(`Category graph contains a cycle at ${categoryId}`)
    if (visited.has(categoryId)) return
    visiting.add(categoryId)
    const category = allCategoryById.get(categoryId)
    if (!category) throw new Error(`Unknown category: ${categoryId}`)
    for (const parentId of parentIds(category)) visit(parentId)
    visiting.delete(categoryId)
    visited.add(categoryId)
  }
  for (const category of allCategories) visit(category.id)
}

function assertPaths(): void {
  for (const path of allPaths) {
    if (path.worldIds.length === 0) throw new Error(`Path ${path.id} is empty`)
    if (new Set(path.worldIds).size !== path.worldIds.length) {
      throw new Error(`Path ${path.id} repeats a World`)
    }
  }
}

assertCategoryGraph()
assertPaths()

export const rootCategories = categories.filter((category) => !category.primaryParentId)

export type PublicPathWorldRecord = {
  publication?: string
  discoverable?: boolean
}

export type PublicPathWorldResolver = (worldId: string) => PublicPathWorldRecord | undefined

export function validatePublicPathWorlds(
  resolveWorld: PublicPathWorldResolver,
  pathsToValidate: ReadonlyArray<Path> = paths,
): Array<string> {
  const errors: Array<string> = []
  for (const path of pathsToValidate.filter(isPublicContentGraphNode)) {
    for (const worldId of path.worldIds) {
      const world = resolveWorld(worldId)
      if (!world) {
        errors.push(`Public path ${path.id} references an unknown or undiscoverable World ${worldId}`)
        continue
      }
      if (world.publication !== 'public') {
        errors.push(`Public path ${path.id} references non-public World ${worldId}`)
      }
      if (world.discoverable === false) {
        errors.push(`Public path ${path.id} references undiscoverable World ${worldId}`)
      }
    }
  }
  return errors
}

export function assertPublicPathWorlds(resolveWorld: PublicPathWorldResolver): void {
  const errors = validatePublicPathWorlds(resolveWorld)
  if (errors.length > 0) throw new Error(errors.join('\n'))
}

export function getCategory(id: CategoryId): Category {
  const category = categoryById.get(id)
  if (!category) throw new Error(`Unknown category: ${id}`)
  return category
}

export function getCategoryParents(id: CategoryId): ReadonlyArray<Category> {
  return parentIds(getCategory(id)).map(getCategory)
}

export function getPrimaryCategoryTrail(id: CategoryId): ReadonlyArray<Category> {
  const trail: Array<Category> = []
  let current: Category | undefined = getCategory(id)
  while (current) {
    trail.unshift(current)
    current = current.primaryParentId ? getCategory(current.primaryParentId) : undefined
  }
  return trail
}

export function getRootCategory(id: CategoryId): Category {
  return getPrimaryCategoryTrail(id)[0]
}

export function getPath(id: PathId): Path | undefined {
  return pathById.get(id)
}

export function getPathContext(pathId: PathId, worldId: string): PathContext | undefined {
  const path = getPath(pathId)
  if (!path) return undefined
  const index = path.worldIds.indexOf(worldId)
  if (index < 0) return undefined
  return {
    path,
    order: index + 1,
    total: path.worldIds.length,
    prevWorldId: index > 0 ? path.worldIds[index - 1] : undefined,
    nextWorldId: path.worldIds[index + 1],
  }
}

export type {
  Category,
  CategoryId,
  ContentGraphPublication,
  Path,
  PathContext,
  PathId,
} from './types'
