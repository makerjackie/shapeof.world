import { assertWorldRouteNames } from '../../src/lib/world-route-names.ts'
import { createHash } from 'node:crypto'

import { isWorldCompilePilot } from '../../src/data/world-compiler/pilots.ts'

export const worldAuthorPrivateFields = [
	'transferBudgetMb',
	'onboardingVersion',
	'hasEmbeddedGuide',
]

export function lifecycleFromState(state) {
	if (state === 'public') return { state: 'public' }
	if (state === 'making') return { state: 'making' }
	if (state === 'failed') return { state: 'failed', reasonCode: 'failed-world-museum' }
	if (state === 'archived') return { state: 'archived', reasonCode: 'archived' }
	return { state: 'rights-blocked', reasonCode: 'rights-blocked' }
}

export function inferRuntimeCapabilities(world) {
	const capabilities = new Set()
	if (world.runtime.includes('2d')) capabilities.add('canvas-2d')
	if (world.runtime.includes('3d') || world.runtime === 'scene-3d') {
		capabilities.add('webgl')
		capabilities.add('three')
	}
	if (world.runtime === 'globe-3d') {
		capabilities.add('webgl')
	}
	return [...capabilities]
}

function canonicalJson(value) {
	if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
		return JSON.stringify(value)
	}
	if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
	if (typeof value !== 'object') throw new Error('Unsupported compile value')
	const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
	return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}

export function contentRevisionOf(value) {
	return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

export function compileWorld(input) {
	const world = input.world
	assertWorldRouteNames([world.id])
	const draft = {
		id: world.id,
		adapter: isWorldCompilePilot(world.id) ? 'pilot' : 'legacy',
		lifecycle: lifecycleFromState(input.state),
		copy: {
			zh: {
				title: world.title,
				posterTitle: world.posterTitle,
				posterHook: world.posterHook,
				question: world.question,
				hook: world.hook,
				payoff: world.payoff,
				topicLabel: world.topicLabel,
			},
			en: {
				title: world.translations.en.title,
				posterTitle: world.translations.en.posterTitle,
				posterHook: world.translations.en.posterHook,
				question: world.translations.en.question,
				hook: world.translations.en.hook,
				payoff: world.translations.en.payoff,
				topicLabel: world.translations.en.topicLabel,
			},
		},
		taxonomy: {
			primaryCategoryId: world.primaryCategoryId,
			additionalCategoryIds: [...(world.additionalCategoryIds ?? [])],
		},
		runtime: {
			profile: world.runtime,
			renderer: world.renderer,
			capabilities: inferRuntimeCapabilities(world),
		},
		assets: {
			poster: world.poster,
			posterMobile: world.posterMobile,
			posterDesktop: world.posterDesktop,
			sources: world.sources,
			offline: [...(input.offlineAssets ?? [])],
		},
		related: [...world.related],
		fieldNotes: [...(world.fieldNotes ?? [])],
		evidence: world.evidence,
		accent: world.accent,
		duration: world.duration,
		experiencePolicy: world.experiencePolicy,
	}

	return {
		schemaVersion: 1,
		sourceCommit: input.sourceCommit,
		contentRevision: contentRevisionOf(draft),
		releaseId: input.releaseId,
		...draft,
	}
}

export function projectPublicWorldCard(ir) {
	return {
		schemaVersion: 1,
		sourceCommit: ir.sourceCommit,
		contentRevision: ir.contentRevision,
		releaseId: ir.releaseId,
		id: ir.id,
		state: ir.lifecycle.state,
		title: ir.copy.zh.title,
		titleEn: ir.copy.en.title,
		poster: ir.assets.poster,
		posterMobile: ir.assets.posterMobile,
		posterDesktop: ir.assets.posterDesktop,
		posterHook: ir.copy.zh.posterHook,
		posterHookEn: ir.copy.en.posterHook,
		question: ir.copy.zh.question,
		questionEn: ir.copy.en.question,
		topicLabel: ir.copy.zh.topicLabel,
		topicLabelEn: ir.copy.en.topicLabel,
		primaryCategoryId: ir.taxonomy.primaryCategoryId,
		runtime: ir.runtime.profile,
		evidence: ir.evidence,
		accent: ir.accent,
	}
}

export function projectPublicWorldDetail(ir) {
	return {
		...projectPublicWorldCard(ir),
		hook: ir.copy.zh.hook,
		hookEn: ir.copy.en.hook,
		payoff: ir.copy.zh.payoff,
		payoffEn: ir.copy.en.payoff,
		related: ir.related,
		sources: ir.assets.sources,
		fieldNotes: ir.fieldNotes ?? [],
		renderer: ir.runtime.renderer,
		duration: ir.duration,
		additionalCategoryIds: ir.taxonomy.additionalCategoryIds,
	}
}

export function projectWorldSearchDocument(ir) {
	const card = projectPublicWorldCard(ir)
	return {
		schemaVersion: 1,
		sourceCommit: ir.sourceCommit,
		contentRevision: ir.contentRevision,
		releaseId: ir.releaseId,
		text: [
			ir.copy.zh.title,
			ir.copy.en.title,
			ir.copy.zh.question,
			ir.copy.en.question,
			ir.copy.zh.posterHook,
			ir.copy.en.posterHook,
			ir.copy.zh.topicLabel,
			ir.copy.en.topicLabel,
		].join(' '),
		world: card,
	}
}

export function projectOfflineWorldRecord(ir, packId) {
	return {
		schemaVersion: 1,
		sourceCommit: ir.sourceCommit,
		contentRevision: ir.contentRevision,
		releaseId: ir.releaseId,
		id: ir.id,
		packId,
		renderer: ir.runtime.renderer,
		runtime: ir.runtime.profile,
		capabilities: ir.runtime.capabilities,
		offlineAssets: ir.assets.offline,
		title: { zh: ir.copy.zh.title, en: ir.copy.en.title },
		summary: { zh: ir.copy.zh.posterHook, en: ir.copy.en.posterHook },
	}
}

export function omitsAuthorPrivateFields(value) {
	return worldAuthorPrivateFields.every((field) => !(field in value))
}
