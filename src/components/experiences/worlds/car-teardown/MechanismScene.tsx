import {EngineBayHardware} from './AssemblyHardware'
import {useFrame} from '@react-three/fiber'
import {useRef} from 'react'
import * as T from 'three'
import {SuspensionMechanism} from './SuspensionMechanism'
import {SteeringMechanism} from './SteeringMechanism'
import {BrakeMechanism} from './BrakeMechanism'
import {Transmission} from './Transmission'
import {Chassis, Brakes, Steering, Electrical as ElectricalOverview} from './Systems'
import {layerProgress} from './ConceptCar'
import {Electrical} from './Electrical'
import {TeardownAssembly} from './TeardownPart'
import {teardownParts} from './teardown-registry'
import {BrakeCorner} from './BrakeMechanism'
import {VEHICLE_SPEC as S} from './vehicle-spec'
import {Wheels} from './Wheels'
import type {SceneProps} from './Scene'
import {systemOffset} from './parts'

/** Loaded after the first request to open the car; no CAD or chassis code on entry. */
export default function MechanismScene(p: SceneProps) {
	const selected = p.selected
	return (
		<TeardownAssembly
			system={p.selected}
			amount={p.partsExplode}
			parts={teardownParts(p.selected)}
			assembly={p.assembly}
			hovered={p.hoveredPart}
			selected={p.selectedPart}
			anchorsRef={p.partAnchorsRef}
			onHover={p.onHoverPart}
			onSelect={p.onSelectPart}
		>
			{selected === 'powertrain' && p.engineView === 'bay' && <EngineBayHardware />}
			{(!selected || selected === 'drivetrain') && (
				<group name="system-drivetrain" position={selected ? [0, 0, 0] : systemOffset('drivetrain', p.explode)}>
					<Transmission
						stateRef={p.transmissionRef}
						xray={selected === 'drivetrain'}
						assembly={p.assembly?.id}
						steeringRef={p.mechanisms.steeringRef}
					/>
				</group>
			)}
			{(!selected || selected === 'chassis') && (
				<group name="system-chassis">
					{selected === 'chassis' ? (
						<SuspensionMechanism corner stateRef={p.mechanisms.suspensionRef} assembly={p.assembly?.id} />
					) : (
						<Chassis />
					)}
					{selected === 'chassis' && <SuspensionBrake p={p} />}
				</group>
			)}
			{!selected && (
				<group name="system-steering">
					<Steering />
				</group>
			)}
			{!selected && (
				<group name="system-electrical" position-y={layerProgress(p.explode, 0.35) * 0.35}>
					<ElectricalOverview />
				</group>
			)}
			{selected === 'steering' && (
				<group name="system-steering">
					<SteeringMechanism
						stateRef={p.mechanisms.steeringRef}
						showConstruction={p.mechanisms.steeringView === 'top'}
						closeup={p.mechanisms.steeringView === 'differential'}
						assembly={p.assembly?.id}
					/>
				</group>
			)}
			{(!selected || selected === 'brakes') && (
				<group name="system-brakes">
					{selected === 'brakes' ? (
						<BrakeMechanism stateRef={p.mechanisms.brakeRef} closeup={p.mechanisms.brakeView === 'caliper'} assembly={p.assembly?.id} />
					) : (
						<Brakes explode={p.explode} />
					)}
				</group>
			)}
			{selected === 'electrical' && (
				<group name="system-electrical">
					<Electrical />
				</group>
			)}
			{selected === 'drivetrain' && p.transmissionView === 'path' && <Wheels axle="rear" />}
		</TeardownAssembly>
	)
}

function SuspensionBrake({p}: {p: SceneProps}) {
	const ref = useRef<T.Group>(null)
	useFrame(() => {
		if (ref.current) ref.current.position.y = S.wheels.radius + p.mechanisms.suspensionRef.current.front.wheel
	})
	return (
		<group ref={ref} position={[S.dimensions.frontAxleX, S.wheels.radius, S.wheels.frontTrack / 2]}>
			<BrakeCorner front stateRef={p.mechanisms.brakeRef} index={2} compact />
		</group>
	)
}
