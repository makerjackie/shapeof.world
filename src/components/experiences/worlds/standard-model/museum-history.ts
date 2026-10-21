import type { ParticleId } from './particle-data'

export interface DiscoveryMilestone {
	id: string
	year: number
	title: { zh: string; en: string }
	summary: { zh: string; en: string }
	particleIds: ParticleId[]
	sourceLinks: Array<{ title: string; url: string }>
	kind: 'proposal' | 'observation' | 'confirmation'
}

const cern = { title: 'CERN — The Standard Model', url: 'https://home.cern/science/physics/standard-model/' }
const fnal = { title: 'Fermilab — Worldwide Particle Physics Discoveries', url: 'https://www.fnal.gov/pub/science/particle-physics-101/worldwide-discoveries.html' }
const fnalKey = { title: 'Fermilab — Key Discoveries', url: 'https://www.fnal.gov/pub/science/particle-physics/key-discoveries.html' }
const slac = { title: 'SLAC — Our Story and History', url: 'https://www6.slac.stanford.edu/about/our-story/history' }
const cernKaon = { title: 'CERN Timeline — First strange particle', url: 'https://timeline.web.cern.ch/clifford-butler-and-george-rochester-discover-kaon-first-strange-particle' }
const desyGluon = { title: 'DESY — Happy birthday gluon', url: 'https://www.desy.de/news/news_search/index_eng.html?openDirectAnchor=1643&printversion=1' }
const cernW = { title: 'CERN — W boson: Sunshine and stardust', url: 'https://home.cern/science/physics/w-boson-sunshine-and-stardust/' }
const cernZ = { title: 'CERN — The Z boson', url: 'https://home.cern/science/physics/z-boson/' }
const higgs = { title: 'CERN — The Higgs boson', url: 'https://home.cern/science/physics/higgs-boson/' }
const pdgNu = { title: 'Particle Data Group — Neutrino Masses, Mixing, and Oscillations', url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-neutrino-mixing.pdf' }

/**
 * A compact discovery history, with grouped entries where one experimental
 * milestone established a family or related pair. A grouped summary retains
 * the dates of later confirmations instead of implying that `year` was the
 * direct discovery year for every particle in the entry.
 */
export const discoveryMilestones: DiscoveryMilestone[] = [
	{
		id: 'electron-1897', year: 1897,
		title: { zh: '电子：阴极射线中的普适成分', en: 'Electron: a universal constituent in cathode rays' },
		summary: { zh: 'J. J. 汤姆孙的阴极射线实验显示，原子之外存在质量很小、带负电且在不同材料中都相同的成分。', en: 'J. J. Thomson’s cathode-ray experiments showed a small, negatively charged constituent that was the same across materials, smaller than atoms.' },
		particleIds: ['e'], sourceLinks: [fnal], kind: 'observation',
	},
	{
		id: 'photon-1905', year: 1905,
		title: { zh: '光子：光量子假说', en: 'Photon: the light-quantum proposal' },
		summary: { zh: '爱因斯坦提出光在交换能量时可表现为离散光量子；这是理论提案，不是一次直接“看见光子”的实验。', en: 'Einstein proposed that light can exchange energy in discrete quanta; this was a theoretical proposal, not a single direct sighting of a photon.' },
		particleIds: ['gamma'], sourceLinks: [cern], kind: 'proposal',
	},
	{
		id: 'photon-1923', year: 1923,
		title: { zh: '光子：康普顿散射的动量证据', en: 'Photon: momentum evidence from Compton scattering' },
		summary: { zh: '康普顿散射显示X射线与电子碰撞时像带动量的粒子交换能量，强化了光量子作为光子来描述的证据链。', en: 'Compton scattering showed X-rays exchanging energy and momentum with electrons like particles, strengthening the evidence for light quanta described as photons.' },
		particleIds: ['gamma'], sourceLinks: [cern], kind: 'confirmation',
	},
	{
		id: 'charged-leptons-1936', year: 1936,
		title: { zh: '第二、三代带电轻子：从μ子到τ子', en: 'Second- and third-generation charged leptons: muon to tau' },
		summary: { zh: '1936年宇宙线实验发现μ子；1975年SPEAR发现τ子。它们都不是电子的激发态，而是质量更大的独立带电轻子。', en: 'Cosmic-ray experiments found the muon in 1936; SPEAR found the tau in 1975. Neither is an excited electron: both are distinct, heavier charged leptons.' },
		particleIds: ['mu', 'tau'], sourceLinks: [fnal, slac], kind: 'observation',
	},
	{
		id: 'strange-hadron-1947', year: 1947,
		title: { zh: '奇异强子：先看到现象，再提出夸克', en: 'Strange hadrons: phenomenon before the quark model' },
		summary: { zh: 'Rochester和Butler在宇宙线云室中发现K介子等奇异粒子；这是奇异强子的观测，不是直接抓到自由奇夸克。', en: 'Rochester and Butler found kaons and other strange particles in cosmic-ray photographs; this observed strange hadrons, not a free strange quark.' },
		particleIds: ['s'], sourceLinks: [cernKaon, fnal], kind: 'observation',
	},
	{
		id: 'neutrino-flavours', year: 1956,
		title: { zh: '中微子：从反电子中微子到三种味态', en: 'Neutrinos: from the electron antineutrino to three flavours' },
		summary: { zh: '1956年反应堆实验首次确认反电子中微子；1962年确认μ中微子，2000年DONUT确认τ中微子。三种味态的发现跨越了三代实验。', en: 'A reactor experiment confirmed the electron antineutrino in 1956; muon neutrinos followed in 1962, and DONUT confirmed tau neutrinos in 2000. Three generations of experiments established the three flavours.' },
		particleIds: ['ve', 'vmu', 'vtau'], sourceLinks: [fnal, fnalKey, pdgNu], kind: 'observation',
	},
	{
		id: 'quark-model-1964', year: 1964,
		title: { zh: '夸克模型：上、下、奇的理论提案', en: 'Quark model: the up, down and strange proposal' },
		summary: { zh: '盖尔曼和茨威格独立提出夸克模型，用上、下、奇夸克组织当时已知强子谱；理论中的夸克随后由散射和共振证据检验。', en: 'Gell-Mann and Zweig independently proposed the quark model, organizing known hadrons with up, down and strange quarks; scattering and resonance evidence later tested the model.' },
		particleIds: ['u', 'd', 's'], sourceLinks: [cern, fnal], kind: 'proposal',
	},
	{
		id: 'quark-structure-1968', year: 1968,
		title: { zh: '核子内部的点状成分', en: 'Point-like constituents inside nucleons' },
		summary: { zh: 'SLAC深非弹性散射显示质子内部有近似点状带电成分，确认了夸克作为核子结构成分的角色；它仍不是自由夸克束缚外的直接轨迹。', en: 'SLAC deep-inelastic scattering revealed point-like charged constituents inside the proton, confirming quarks as nucleon structure; it was not a free-quark track outside confinement.' },
		particleIds: ['u', 'd'], sourceLinks: [slac, fnal], kind: 'confirmation',
	},
	{
		id: 'heavy-quark-resonances', year: 1974,
		title: { zh: '粲与底：共振打开重夸克家族', en: 'Charm and bottom: resonances reveal heavy quarks' },
		summary: { zh: '1974年J/ψ共振在SLAC和布鲁克海文独立出现，确认粲夸克；1977年费米实验室发现Υ共振，确认底夸克。', en: 'The J/ψ resonance appeared independently at SLAC and Brookhaven in 1974, establishing charm; Fermilab’s Υ resonance in 1977 established bottom.' },
		particleIds: ['c', 'b'], sourceLinks: [fnal, fnalKey], kind: 'observation',
	},
	{
		id: 'gluon-1979', year: 1979,
		title: { zh: '胶子：三喷注的第三束', en: 'Gluon: the third jet' },
		summary: { zh: 'DESY PETRA/TASSO看到清晰三喷注：夸克对辐射出第三束喷注，成为胶子存在的关键实验标志。', en: 'DESY PETRA/TASSO saw clear three-jet events: a quark pair radiated a third jet, a key experimental signature of the gluon.' },
		particleIds: ['gluon'], sourceLinks: [desyGluon, cern], kind: 'observation',
	},
	{
		id: 'weak-bosons-1983', year: 1983,
		title: { zh: 'W与Z：电弱理论的载体现身', en: 'W and Z: electroweak carriers appear' },
		summary: { zh: 'CERN UA1和UA2在质子—反质子碰撞中分别发现带电W和中性Z的衰变信号，验证了电弱理论的核心预言。', en: 'CERN’s UA1 and UA2 collaborations found charged-W and neutral-Z decay signatures in proton–antiproton collisions, validating central electroweak predictions.' },
		particleIds: ['w', 'z'], sourceLinks: [cernW, cernZ], kind: 'observation',
	},
	{
		id: 'top-1995', year: 1995,
		title: { zh: '顶夸克：六夸克家族闭合', en: 'Top quark: completing the six-quark family' },
		summary: { zh: '费米实验室CDF和DØ在Tevatron看到顶夸克成对产生及其衰变末态，完成了六种夸克的实验确认。', en: 'Fermilab’s CDF and DØ experiments saw top-pair production and decay signatures at the Tevatron, completing the experimental confirmation of six quarks.' },
		particleIds: ['t'], sourceLinks: [fnalKey, fnal], kind: 'observation',
	},
	{
		id: 'higgs-2012', year: 2012,
		title: { zh: '希格斯玻色子：统计峰中的新粒子', en: 'Higgs boson: a new particle in a statistical excess' },
		summary: { zh: 'ATLAS和CMS在约126 GeV区域各自报告新粒子信号；后续测量确认其性质与希格斯玻色子相符。', en: 'ATLAS and CMS independently reported a new-particle signal near 126 GeV; later measurements confirmed properties consistent with the Higgs boson.' },
		particleIds: ['higgs'], sourceLinks: [higgs, cern], kind: 'observation',
	},
]
