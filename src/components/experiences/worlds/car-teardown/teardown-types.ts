import type { SystemId } from './parts'

export type TeardownPoint = [number, number, number]
export type TeardownText = { zh: string; en: string }
export interface TeardownDefinition {
	id: string
	name: TeardownText
	description: TeardownText
	material: TeardownText
	count: number
	data: { label: TeardownText; value: string | TeardownText }[]
	offset: readonly [number, number, number]
	anchor: TeardownPoint
	partIds: string[]
}
export type SystemTeardown = { system: SystemId; parts: readonly TeardownDefinition[] }
export const bilingual = (zh: string, en: string): TeardownText => ({ zh, en })
