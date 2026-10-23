import {ShaderChunk, type MeshPhysicalMaterial} from 'three'

/** Three r183's anisotropic visibility term lacks the zero-denominator guard
 * used by its isotropic counterpart. At grazing/backlit angles that produces
 * non-finite HDR pixels, which bloom spreads into black tiles or whole frames.
 * Patch only this material's shader; never mutate the shared Three ShaderChunk.
 */
export function guardDiscAnisotropy(shader: Parameters<MeshPhysicalMaterial['onBeforeCompile']>[0]) {
	const physicalLighting = ShaderChunk.lights_physical_pars_fragment.replace(
		'float v = 0.5 / ( gv + gl );',
		'float v = 0.5 / max( gv + gl, EPSILON );',
	)
	shader.fragmentShader = shader.fragmentShader.replace(
		'#include <lights_physical_pars_fragment>',
		physicalLighting,
	)
}
