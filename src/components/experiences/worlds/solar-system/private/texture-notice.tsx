import {
	useTextureStatus,
	retryFailedTextures,
	planetTextureUrl,
	MOON_TEXTURE_URL,
	EARTH_NIGHT_TEXTURE_URL,
} from '~/components/experiences/solar-system-textures'
import { useExperienceI18n } from '~/i18n/experience'
import { PLANETS } from '../solar-data'

export function TextureNotice({ id, onRetry }: { id: string; onRetry: () => void }) {
	const tx = useExperienceI18n()
	const planet = PLANETS.find((p) => p.id === id)
	const urls =
		id === 'earth'
			? ['/assets/solar-system/earth-bmng-4k.jpg', '/assets/earth-spin-orbit/clouds-nasa-2k.jpg', EARTH_NIGHT_TEXTURE_URL]
			: id === 'moon'
				? [MOON_TEXTURE_URL]
				: planet
					? [planetTextureUrl(planet.texture)]
					: []
	const status = useTextureStatus(urls)
	if (status === 'ready') return null
	return (
		<div className="ss-texture-notice" role="status">
			{tx(status === 'error' ? '部分影像未加载' : '正在加载表面影像')}
			{status === 'error' && (
				<button
					type="button"
					onClick={() => {
						retryFailedTextures()
						onRetry()
					}}
				>
					{tx('重试')}
				</button>
			)}
		</div>
	)
}
