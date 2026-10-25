import type { Group } from 'three'

const guarded = new WeakSet<Group>()

/** Three deliberately updates and raycasts hidden objects by default. These
 * groups are complete alternative views, so their descendants can sleep. */
export function guardHiddenGroup(group: Group) {
	if (guarded.has(group)) return
	guarded.add(group)
	const update = group.updateMatrixWorld
	group.updateMatrixWorld = function (force) {
		if (this.visible) update.call(this, force)
	}
	group.raycast = function () {
		if (!this.visible) return false
	}
}
