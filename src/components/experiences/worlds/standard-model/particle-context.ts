import type { ParticleId } from './particle-data'

type Bilingual = { zh: string; en: string }
type Interaction = 'electromagnetic' | 'strong' | 'weak'

export interface ParticleContext {
	antiparticle: Bilingual
	generation: 1 | 2 | 3 | null
	interactions: Interaction[]
	connection: Bilingual
	sourceLinks: Array<{ title: string; url: string }>
}

const cern = { title: 'CERN — The Standard Model', url: 'https://home.cern/science/physics/standard-model/' }
const pdgModel = { title: 'Particle Data Group — Standard Model and Related Topics', url: 'https://pdg.lbl.gov/2025/reviews/standard_model_and_related.html' }
const pdgNu = { title: 'Particle Data Group — Neutrino Masses, Mixing, and Oscillations', url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-neutrino-mixing.pdf' }
const pdgQcd = { title: 'Particle Data Group — Quantum Chromodynamics', url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-qcd.pdf' }
const pdgHiggs = { title: 'Particle Data Group — Higgs Boson Physics', url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-higgs-boson.pdf' }
const cernHiggs = { title: 'CERN — The Higgs boson', url: 'https://home.cern/science/physics/higgs-boson/' }
const cernW = { title: 'CERN — W boson: Sunshine and stardust', url: 'https://home.cern/science/physics/w-boson-sunshine-and-stardust/' }
const cernZ = { title: 'CERN — The Z boson', url: 'https://home.cern/science/physics/z-boson/' }

const context = (
	antiparticle: Bilingual,
	generation: ParticleContext['generation'],
	interactions: Interaction[],
	connection: Bilingual,
	sourceLinks: Array<{ title: string; url: string }>,
): ParticleContext => ({ antiparticle, generation, interactions, connection, sourceLinks })

/**
 * Cross-particle context for the museum. The interaction list names the three
 * gauge interactions in the Standard Model; Higgs-field coupling is explained
 * in its connection instead of being mislabelled as a fourth force.
 */
export const particleContexts: Record<ParticleId, ParticleContext> = {
	u: context(
		{ zh: '反上夸克', en: 'Anti-up quark' }, 1, ['electromagnetic', 'strong', 'weak'],
		{ zh: '上夸克和下夸克组成质子的价夸克骨架；胶子在其中传递并重排色荷。弱作用还能把上型夸克换成下型夸克。', en: 'Up and down quarks make the valence skeleton of a proton; gluons carry and rearrange colour inside it. The weak interaction can also turn an up-type quark into a down-type quark.' },
		[cern, pdgQcd],
	),
	d: context(
		{ zh: '反下夸克', en: 'Anti-down quark' }, 1, ['electromagnetic', 'strong', 'weak'],
		{ zh: '下夸克与上夸克共同构成质子和中子的价夸克部分；在β衰变中，弱作用把下夸克变成上夸克并发出虚W。', en: 'Down quarks join up quarks in the valence content of protons and neutrons; in beta decay, the weak interaction turns a down quark into an up quark through a virtual W.' },
		[cern, cernW, pdgQcd],
	),
	c: context(
		{ zh: '反粲夸克', en: 'Anti-charm quark' }, 2, ['electromagnetic', 'strong', 'weak'],
		{ zh: '粲夸克在高能碰撞中产生，随后和其他夸克强子化；粲—反粲束缚态J/ψ把夸克、胶子和可观测共振连在一起。', en: 'Charm is made in energetic collisions and then hadronizes with other quarks; the charm–anticharm J/ψ bound state links quarks and gluons to an observable resonance.' },
		[cern, pdgQcd],
	),
	s: context(
		{ zh: '反奇夸克', en: 'Anti-strange quark' }, 2, ['electromagnetic', 'strong', 'weak'],
		{ zh: '奇夸克被禁闭在K介子等强子内；强作用保留奇异性，而弱作用改变奇异性，造成可测的衰变和混合。', en: 'Strange quarks are confined inside hadrons such as kaons; the strong interaction preserves strangeness while the weak interaction changes it, producing measurable decays and mixing.' },
		[cern, pdgQcd],
	),
	t: context(
		{ zh: '反顶夸克', en: 'Anti-top quark' }, 3, ['electromagnetic', 'strong', 'weak'],
		{ zh: '顶夸克重且寿命极短，通常在强子化前经弱作用衰变为W和下型夸克；因此它把弱衰变“直接”暴露在强子形成之前。', en: 'Top is heavy and so short-lived that it usually decays through the weak interaction to a W and a down-type quark before hadronizing, exposing the weak decay before a top hadron can form.' },
		[cern, cernW, pdgModel],
	),
	b: context(
		{ zh: '反底夸克', en: 'Anti-bottom quark' }, 3, ['electromagnetic', 'strong', 'weak'],
		{ zh: '底夸克进入B介子等强子；这些含底系统把夸克混合、衰变和物质—反物质差异连接到实验中的时间分布。', en: 'Bottom enters hadrons such as B mesons; these systems connect quark mixing, decay and matter–antimatter differences to time-dependent experimental patterns.' },
		[cern, pdgModel],
	),
	e: context(
		{ zh: '正电子（电子的反粒子）', en: 'Positron (the electron’s antiparticle)' }, 1, ['electromagnetic', 'weak'],
		{ zh: '电子与原子核通过光子交换形成原子和化学；电子也能通过W与电子中微子联系，把原子尺度和β衰变接起来。', en: 'Electrons exchange photons with nuclei to make atoms and chemistry; a W also links an electron to an electron neutrino, connecting atomic matter to beta decay.' },
		[cern, pdgModel],
	),
	mu: context(
		{ zh: '反μ子', en: 'Antimuon' }, 2, ['electromagnetic', 'weak'],
		{ zh: 'μ子是更重的带电轻子，穿行物质时留下电离信号，随后通过弱作用衰变为电子和两个中微子；它把可见径迹连到不可见中微子。', en: 'The muon is a heavier charged lepton that leaves ionization signals as it crosses matter, then decays weakly to an electron and two neutrinos; it links a visible track to invisible neutrinos.' },
		[cern, pdgModel],
	),
	tau: context(
		{ zh: '反τ子', en: 'Antitau' }, 3, ['electromagnetic', 'weak'],
		{ zh: 'τ子可电离物质，但很快通过弱作用衰变；它的末态连到τ中微子，也可能是轻子或强子，从而横跨轻子和强子展厅。', en: 'The tau can ionize matter but quickly decays weakly; its final states include a tau neutrino and may be leptonic or hadronic, spanning the lepton and hadron galleries.' },
		[cern, pdgModel],
	),
	ve: context(
		{ zh: '电子反中微子；若中微子是Majorana粒子，粒子与反粒子的区分仍可能不是基本区别', en: 'Electron antineutrino; if neutrinos are Majorana particles, the particle–antiparticle distinction may not be fundamental' }, 1, ['weak'],
		{ zh: '电子中微子在带电流弱作用中伴随电子出现，并与μ、τ味态一起振荡。中微子有质量已知，但它是Dirac还是Majorana、反中微子是否就是自身，仍由实验检验。', en: 'The electron neutrino appears with an electron in charged-current weak interactions and oscillates with the muon and tau flavours. Neutrino mass is established, but whether neutrinos are Dirac or Majorana, and whether an antineutrino is the same particle, remains experimental.' },
		[cern, pdgNu],
	),
	vmu: context(
		{ zh: 'μ反中微子；Dirac/Majorana性质尚未确定', en: 'Muon antineutrino; its Dirac/Majorana nature is not settled' }, 2, ['weak'],
		{ zh: 'μ中微子常由π或K介子衰变产生，带电流作用会伴随μ子；传播时它可变成其他味态，说明“味”不是固定质量标签。', en: 'Muon neutrinos often come from pion or kaon decays, with a muon in charged-current interactions; in flight they can change flavour, showing that flavour is not a fixed mass label.' },
		[cern, pdgNu],
	),
	vtau: context(
		{ zh: 'τ反中微子；Dirac/Majorana性质尚未确定', en: 'Tau antineutrino; its Dirac/Majorana nature is not settled' }, 3, ['weak'],
		{ zh: 'τ中微子在τ子的弱衰变中出现，必须从短寿命τ的伴随信号推断；它和另外两种味态的振荡把不可见粒子连到可见顶点。', en: 'Tau neutrinos appear in weak tau decays and must be inferred from the short-lived tau’s companion signature; their oscillation with the other flavours links invisible particles to visible vertices.' },
		[cern, pdgNu],
	),
	gamma: context(
		{ zh: '自身（光子的反粒子就是光子）', en: 'Itself (the photon is its own antiparticle)' }, null, ['electromagnetic'],
		{ zh: '光子连接所有带电粒子的电磁相互作用：原子的能级跃迁可发射或吸收光子，探测器也靠电磁信号读出粒子。', en: 'The photon connects electromagnetism between charged particles: atomic transitions can emit or absorb photons, and detectors read particles through electromagnetic signals.' },
		[cern, pdgModel],
	),
	gluon: context(
		{ zh: '自身共轭的规范场态；色—反色标签会互换，不能把胶子理解成一个无色单态', en: 'A self-conjugate gauge-field set; colour and anticolour labels exchange, so a gluon is not one colourless singlet' }, null, ['strong'],
		{ zh: '胶子连接夸克的色荷，并且胶子彼此也作用；这使强作用既能束缚夸克形成强子，也能在高能处呈现渐近自由。', en: 'Gluons connect quark colour charges and interact with one another; this lets the strong interaction confine quarks into hadrons while becoming asymptotically free at high energy.' },
		[cern, pdgQcd],
	),
	w: context(
		{ zh: 'W⁺与W⁻互为反粒子', en: 'W+ and W− are antiparticles of one another' }, null, ['weak', 'electromagnetic'],
		{ zh: 'W把上、下型夸克或带电轻子与中微子接起来，并可改变电荷和味道；β衰变里的W是虚粒子。', en: 'The W links up/down quarks or a charged lepton/neutrino and can change charge and flavour; the W in beta decay is virtual.' },
		[cern, cernW, pdgModel],
	),
	z: context(
		{ zh: '自身（Z玻色子是中性自共轭粒子）', en: 'Itself (the neutral Z boson is self-conjugate)' }, null, ['weak'],
		{ zh: 'Z传递中性流：粒子可在不改变电荷的情况下散射；它和W共同组成电弱理论中短程弱作用的可见载体。', en: 'The Z mediates neutral currents, so particles can scatter without changing electric charge; with the W it is a visible carrier of the short-range weak interaction in electroweak theory.' },
		[cern, cernZ, pdgModel],
	),
	higgs: context(
		{ zh: '自身（希格斯玻色子为中性自共轭粒子）', en: 'Itself (the neutral Higgs boson is self-conjugate)' }, null, [],
		{ zh: '希格斯玻色子不是另一种力的载体，而是希格斯场的激发；场的耦合为W、Z和费米子质量提供部分来源。它还能经耦合和量子环路衰变到光子或胶子，但这不等于希格斯直接传递电磁力或强力。', en: 'The Higgs boson is not a carrier of another force but an excitation of the Higgs field; coupling to that field contributes to the masses of W, Z and fermions. It can decay to photons or gluons through couplings and quantum loops, which does not make it a direct carrier of electromagnetism or the strong force.' },
		[cern, cernHiggs, pdgHiggs],
	),
}
