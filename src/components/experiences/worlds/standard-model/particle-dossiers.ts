import type { ParticleId } from './particle-data'

export interface MuseumText { zh: string; en: string }
export interface MuseumClaim { text: MuseumText; sourceIds: string[] }
export interface MuseumDossier {
  summary: MuseumClaim
  occurrence: MuseumClaim
  behaviour: MuseumClaim
  discovery: MuseumClaim
  boundary: MuseumClaim
  related: ParticleId[]
}

export const museumSources: Record<string, { title: string; url: string; checkedAt: string }> = {
  pdgMuon: { title: 'PDG — Muon particle listing and decay modes', url: 'https://pdg.lbl.gov/2024/listings/rpp2024-list-muon.pdf', checkedAt: '2026-09-14' },
  cern: { title: 'CERN — The Standard Model', url: 'https://home.cern/science/physics/standard-model/', checkedAt: '2026-09-14' },
  fnal: { title: 'Fermilab — Worldwide Particle Physics Discoveries', url: 'https://www.fnal.gov/pub/science/particle-physics-101/worldwide-discoveries.html', checkedAt: '2026-09-14' },
  fnalKey: { title: 'Fermilab — Key Discoveries', url: 'https://www.fnal.gov/pub/science/particle-physics/key-discoveries.html', checkedAt: '2026-09-14' },
  pdgMass: { title: 'PDG — Quark Masses', url: 'https://pdg.lbl.gov/2025/reviews/rpp2025-rev-quark-masses.pdf', checkedAt: '2026-09-14' },
  pdgQcd: { title: 'PDG — Quantum Chromodynamics', url: 'https://pdg.lbl.gov/2024/reviews/rpp2024-rev-qcd.pdf', checkedAt: '2026-09-14' },
  pdgHiggs: { title: 'PDG — Higgs boson physics', url: 'https://pdg.lbl.gov/2024/reviews/rpp2024-rev-higgs-boson.pdf', checkedAt: '2026-09-14' },
  pdgNu: { title: 'PDG — Neutrino Masses, Mixing, and Oscillations', url: 'https://pdg.lbl.gov/2023/reviews/rpp2022-rev-neutrino-mixing.pdf', checkedAt: '2026-09-14' },
  higgs: { title: 'CERN — The Higgs boson', url: 'https://home.cern/science/physics/higgs-boson/', checkedAt: '2026-09-14' },
  nobelHiggs: { title: 'Nobel Prize — The 2013 Physics Prize', url: 'https://www.nobelprize.org/prizes/physics/2013/press-release/', checkedAt: '2026-09-14' },
  cernKaon: { title: 'CERN Timeline — First strange particle', url: 'https://timeline.web.cern.ch/clifford-butler-and-george-rochester-discover-kaon-first-strange-particle', checkedAt: '2026-09-14' },
  slacHistory: { title: 'SLAC — History', url: 'https://www6.slac.stanford.edu/about/our-story/history', checkedAt: '2026-09-14' },
  desyGluon: { title: 'DESY — Happy birthday gluon', url: 'https://www.desy.de/news/news_search/index_eng.html?openDirectAnchor=1643&printversion=1', checkedAt: '2026-09-14' },
  bnlNu: { title: 'Brookhaven — Neutrino research', url: 'https://www.bnl.gov/science/neutrinos.php', checkedAt: '2026-09-14' },
  cernW: { title: 'CERN — W boson', url: 'https://home.cern/science/physics/w-boson-sunshine-and-stardust/', checkedAt: '2026-09-14' },
  cernZ: { title: 'CERN — Z boson', url: 'https://home.cern/science/physics/z-boson/', checkedAt: '2026-09-14' },
}

const c = (zh: string, en: string, ...sourceIds: string[]): MuseumClaim => ({ text: { zh, en }, sourceIds })

export const particleDossiers: Record<ParticleId, MuseumDossier> = {
  u: {
    summary: c('上夸克是第一代夸克，电荷为正三分之二。它与下夸克、胶子共同参与质子和中子的内部结构。', 'The up quark is a first-generation quark with charge +2/3. With down quarks and gluons, it helps form protons and neutrons.', 'cern'),
    occurrence: c('它从不以自由粒子出现；在质子、中子等强子内部，价夸克与胶子及海夸克一起运动。', 'It is never observed free: inside hadrons, valence quarks move with gluons and fluctuating sea quarks.', 'cern', 'pdgQcd'),
    behaviour: c('它参加强相互作用，也能通过弱相互作用变成下型夸克。拉开夸克会储存强作用能量并触发强子化。', 'It feels the strong interaction and can change into a down-type quark through the weak interaction. Pulling it apart stores strong-field energy and leads to hadronization.', 'cern', 'pdgQcd'),
    discovery: c('1968 年 SLAC 深非弹性散射显示质子内有点状带电成分，支持夸克模型；这确认的是夸克结构，不是抓到自由上夸克。', 'Deep-inelastic scattering at SLAC in 1968 revealed point-like charged constituents in the proton, confirming quark structure rather than a free up quark.', 'fnal', 'cern'),
    boundary: c('画面只表现价夸克的定性束缚，不计算 QCD 的胶子场、海夸克、强子化或概率振幅；颜色只是视觉编码。', 'The scene shows qualitative valence-quark binding. It does not calculate QCD fields, sea quarks, hadronization or amplitudes; colours are visual coding.', 'pdgQcd'),
    related: ['d', 'gluon', 'w'],
  },
  d: {
    summary: c('下夸克是第一代夸克，电荷为负三分之一。质子含两个上夸克和一个下夸克，中子含一个上夸克和两个下夸克；这只是价夸克组成。', 'The down quark is a first-generation quark with charge −1/3. Proton and neutron valence content is uud and udd; these are not all their internal constituents.', 'cern'),
    occurrence: c('它被禁闭在强子中，不能单独飞出探测器；原子核里的质子和中子都含有下夸克。', 'It is confined inside hadrons and cannot fly into a detector alone; both protons and neutrons in nuclei contain down quarks.', 'cern', 'pdgQcd'),
    behaviour: c('弱相互作用可把下夸克变成上夸克，产生中子到质子的 β 衰变链；强相互作用则把它束缚在强子里。', 'The weak interaction can turn a down quark into an up quark in neutron beta decay, while the strong interaction confines it in hadrons.', 'cern', 'fnalKey'),
    discovery: c('1968 年 SLAC 的深非弹性散射揭示核子内部点状成分；结合质子、中子电荷和夸克模型，确认了上、下夸克的结构角色。', 'SLAC deep-inelastic scattering in 1968 exposed point-like constituents in nucleons; charge patterns and the quark model established the up/down roles.', 'fnal', 'cern'),
    boundary: c('画面只显示中子的三个价夸克被拉开后回弹；省略胶子、海夸克和强子化，不是在演示 β 衰变。', 'This scene only shows the neutron’s three valence quarks stretching and returning; gluons, sea quarks and hadronization are omitted, and beta decay is not shown.', 'pdgQcd'),
    related: ['u', 'w', 've'],
  },
  c: {
    summary: c('粲夸克是第二代上型夸克，电荷为正三分之二。它通常藏在含粲强子中，质量参数依赖所采用的量子场论定义。', 'Charm is a second-generation up-type quark with charge +2/3. It is usually hidden in charmed hadrons, and its mass depends on the field-theory scheme.', 'cern', 'pdgMass'),
    occurrence: c('高能碰撞可产生粲夸克，随后它与反夸克或其他夸克强子化；不能把它从强子中单独拉出。', 'High-energy collisions can create charm, which then hadronizes with antiquarks or other quarks; it cannot be pulled out of a hadron alone.', 'pdgQcd'),
    behaviour: c('它受强相互作用，也能经弱相互作用衰变。粲偶素 J/ψ 是粲夸克与反粲夸克的束缚态。', 'It feels the strong interaction and decays through the weak interaction. Charmonium J/ψ is a bound charm–anticharm state.', 'cern', 'fnal'),
    discovery: c('1974 年 SLAC 与布鲁克海文独立发现 J/ψ 共振，形成“十一月革命”；共振证据确认了粲夸克，而非理论预言本身。', 'SLAC and Brookhaven independently found the J/ψ resonance in 1974, the “November Revolution”; the resonance confirmed charm experimentally.', 'fnal'),
    boundary: c('J/ψ 的束缚态只作概念示意；画面不计算势能、谱线宽度、强子化或碰撞截面。', 'The J/ψ bound state is conceptual; the scene does not calculate its potential, line width, hadronization or collision cross section.', 'pdgQcd'),
    related: ['s', 'gluon', 'b'],
  },
  s: {
    summary: c('奇夸克是第二代下型夸克，电荷为负三分之一。“奇”来自含它的强子表现出的奇异性量子数。', 'Strange is a second-generation down-type quark with charge −1/3. “Strangeness” names a quantum number carried by hadrons containing it.', 'cern'),
    occurrence: c('宇宙线和高能碰撞能产生奇夸克；它随 K 介子、Λ 等强子出现，始终被禁闭而非自由存在。', 'Cosmic rays and high-energy collisions produce strange quarks; they appear inside kaons, lambdas and other hadrons, never free.', 'cern', 'fnal'),
    behaviour: c('强相互作用保存奇异性，但弱相互作用可改变它，造成奇异强子的较慢衰变和混合现象。', 'The strong interaction preserves strangeness, while the weak interaction can change it, producing slower strange-hadron decays and mixing.', 'cern', 'fnalKey'),
    discovery: c('1947 年曼彻斯特的 Rochester 与 Butler 在宇宙线云室照片中发现 K 介子这一首个奇异粒子；奇夸克是后来模型中的结构解释。', 'In 1947 Rochester and Butler found the kaon, the first strange particle, in cosmic-ray cloud-chamber photographs; the strange quark came later as the structural explanation.', 'cernKaon'),
    boundary: c('K 介子不是简单的 s—反 s 对；图中配对只展示夸克禁闭与量子数线索，不复现真实强子谱。', 'A kaon is not simply an s–anti-s pair; the pairing only hints at confinement and quantum numbers, not the real hadron spectrum.', 'pdgQcd'),
    related: ['c', 'u', 'gluon'],
  },
  t: {
    summary: c('顶夸克是第三代上型夸克，电荷为正三分之二，也是已知最重的基本费米子。', 'Top is a third-generation up-type quark with charge +2/3 and the heaviest known elementary fermion.', 'cern', 'pdgMass'),
    occurrence: c('它在高能碰撞等极短暂环境中产生，寿命短到通常在形成强子前就衰变，因此没有顶介子。', 'It is produced in fleeting high-energy environments. It decays before hadronizing, so no top meson is formed.', 'cern', 'fnalKey'),
    behaviour: c('顶夸克几乎总经弱相互作用衰变为 W 玻色子和下型夸克，常见末态含底夸克。', 'Top almost always decays through the weak interaction into a W boson and a down-type quark, commonly bottom.', 'fnalKey'),
    discovery: c('1995 年费米实验室 CDF 与 DØ 在 Tevatron 看到顶夸克成对产生及其衰变末态，完成六夸克家族的实验确认。', 'In 1995, Fermilab’s CDF and DØ saw top-pair production and decay signatures at the Tevatron, completing the six-quark family experimentally.', 'fnalKey', 'fnal'),
    boundary: c('顶夸克衰变时标被大幅拉长供人观看；轨迹、能量和“来不及禁闭”均未按事件生成器定量模拟。', 'The top decay timescale is greatly expanded for viewing; tracks, energies and the pre-hadronization timing are not generated quantitatively.', 'fnalKey'),
    related: ['b', 'w', 'gluon'],
  },
  b: {
    summary: c('底夸克是第三代下型夸克，电荷为负三分之一。它让 B 介子成为研究物质与反物质差异的重要系统。', 'Bottom is a third-generation down-type quark with charge −1/3. B mesons make it a key system for studying matter–antimatter differences.', 'cern', 'fnal'),
    occurrence: c('高能碰撞会产生底夸克，它随后进入 B 介子或其他强子；夸克禁闭使探测器看到的是强子喷注和衰变链。', 'High-energy collisions create bottom, which enters B mesons or other hadrons; confinement leaves jets and decay chains in detectors.', 'cern', 'fnalKey'),
    behaviour: c('底夸克受强相互作用并经弱相互作用衰变；含底强子的混合和 CP 破坏可检验夸克混合矩阵。', 'Bottom feels the strong interaction and decays weakly; mixing and CP violation in bottom hadrons test quark mixing.', 'cern', 'fnal'),
    discovery: c('1977 年费米实验室发现 Υ 共振，证实其中含底夸克与反底夸克；后来 B 工厂精密测量其衰变差异。', 'Fermilab found the Υ resonance in 1977, establishing bottom–antibottom content; B factories later measured its decay asymmetries precisely.', 'fnal'),
    boundary: c('当前场景是 Υ 中底夸克与反底夸克的束缚示意；不演示 B 介子衰变，也不计算强子化、CKM 参数或 CP 不对称度。', 'The current scene sketches bottom and antibottom bound in an Υ; it does not show B decay or calculate hadronization, CKM values or CP asymmetry.', 'fnal', 'pdgQcd'),
    related: ['t', 'c', 'w'],
  },
  e: {
    summary: c('电子是第一代带负电轻子，至今没有发现内部结构。它参与原子、化学键和电流，也属于基本费米子。', 'The electron is a first-generation charged lepton with no observed internal structure. It shapes atoms, chemical bonds and currents.', 'cern', 'fnal'),
    occurrence: c('电子可稳定存在于原子和导体中，也能由放射性衰变、加速器或高能光子过程产生。', 'Electrons persist in atoms and conductors, and can be produced in radioactive decay, accelerators or high-energy photon processes.', 'cern', 'fnal'),
    behaviour: c('电子参与电磁和弱相互作用；它与光子交换能量，和原子核共同形成量子化的原子态。', 'Electrons take part in electromagnetic and weak interactions; they exchange energy with photons and form quantized atomic states with nuclei.', 'cern'),
    discovery: c('1897 年 J. J. 汤姆孙用阴极射线实验测出电子的普适性，实验确认了比原子更小的带电成分。', 'In 1897 J. J. Thomson’s cathode-ray experiments established the electron as a universal charged constituent smaller than atoms.', 'fnal'),
    boundary: c('氢原子云显示位置概率分布，不是电子物质云或经典轨道；画面没有求解完整原子多体动力学。', 'The hydrogen cloud shows a position probability distribution, not electron stuff or a classical orbit; full many-body dynamics are not solved.', 'fnal', 'cern'),
    related: ['mu', 'gamma', 've'],
  },
  mu: {
    summary: c('μ 子是第二代带负电轻子，性质像电子但更重，属于基本费米子。', 'The muon is a second-generation charged lepton: electron-like in charge and interactions, but much heavier.', 'cern', 'fnal'),
    occurrence: c('宇宙线撞击高层大气会产生 μ 子；它们能穿过大气到达地面，也可在加速器中制备。', 'Cosmic rays create muons high in the atmosphere; many reach the ground, and accelerators can produce them too.', 'fnal'),
    behaviour: c('以 μ⁻ 为例，μ 子经弱相互作用衰变为电子、μ 中微子和电子反中微子；它穿行物质时会留下电离信号。', 'For μ⁻, weak decay produces an electron, a muon neutrino and an electron antineutrino; the muon leaves ionization signals as it crosses matter.', 'pdgMuon'),
    discovery: c('1936 年安德森与内德迈耶在宇宙线实验中发现 μ 子；它后来被确认是独立的第二代轻子，而非电子的激发态。', 'Anderson and Neddermeyer found the muon in cosmic rays in 1936; it was later established as a distinct second-generation lepton, not an excited electron.', 'fnal'),
    boundary: c('穿透距离和衰变轨迹是定性演示；画面不模拟大气级联、随机寿命或材料中的完整能损。', 'Penetration and decay tracks are qualitative; the scene does not simulate air showers, random lifetimes or full material energy loss.', 'fnal'),
    related: ['e', 'vmu', 'w'],
  },
  tau: {
    summary: c('τ 子是第三代带负电轻子，电荷与电子相同但更重，寿命很短。', 'The tau is a third-generation charged lepton with the electron’s charge, much greater mass and a very short lifetime.', 'cern', 'fnal'),
    occurrence: c('它在高能碰撞中产生，随即通过弱相互作用衰变为轻子或强子与相应中微子。', 'It is produced in high-energy collisions and promptly decays weakly into leptons or hadrons plus the corresponding neutrino.', 'cern', 'fnal'),
    behaviour: c('τ 子同时参与电磁和弱相互作用；衰变末态总含 τ 中微子或其反粒子，守恒量约束着分支。', 'The tau participates in electromagnetic and weak interactions; its decays include a tau neutrino or antineutrino and obey conservation laws.', 'cern', 'fnal'),
    discovery: c('1975 年 SLAC 的 SPEAR 实验观测到 τ 轻子；它成为第三代轻子的首个实验迹象。', 'The SPEAR experiment at SLAC observed the tau lepton in 1975, the first experimental sign of a third-generation lepton.', 'slacHistory'),
    boundary: c('τ 的短寿命与多种衰变被合并成一段粒子雨；不展示真实分支比、顶点分辨率或随机事件样本。', 'The tau’s short life and many decay modes are compressed into one shower; real branching fractions, vertices and event sampling are omitted.', 'fnal'),
    related: ['mu', 'vtau', 'w'],
  },
  ve: {
    summary: c('电子中微子是与电子配对的中微子味态，电中性、只弱相互作用显著，且不是单一质量本征态。', 'The electron neutrino is the flavour state paired with the electron: neutral, weakly interacting, and not a single mass eigenstate.', 'cern', 'pdgNu'),
    occurrence: c('β⁻ 衰变和反应堆裂变链产生电子反中微子；恒星聚变主要产生电子中微子。飞行中两者都可能转化为其他味态。', 'Beta-minus decay and reactor fission chains produce electron antineutrinos; stellar fusion mainly produces electron neutrinos. Either can change flavour in flight.', 'fnal', 'pdgNu'),
    behaviour: c('它通过带电流弱相互作用产生或探测电子，也通过中性流作用；味态混合导致中微子振荡。', 'Charged-current weak interactions produce or detect an electron, while neutral currents also act; mixing causes neutrino oscillation.', 'pdgNu'),
    discovery: c('1956 年莱因斯与科万在萨凡纳河反应堆探测到反中微子反应，首次实验证实中微子的存在。', 'Reines and Cowan detected reactor antineutrino interactions at Savannah River in 1956, the first experimental confirmation of neutrinos.', 'fnal'),
    boundary: c('振荡动画把传播距离和混合幅度艺术化；味态是质量本征态的叠加，不能把一颗中微子标成固定单一质量。', 'The oscillation animation stylizes distance and mixing. A flavour state is a superposition of mass eigenstates, not one fixed mass.', 'pdgNu'),
    related: ['vmu', 'vtau', 'e', 'w'],
  },
  vmu: {
    summary: c('μ 中微子是与 μ 子配对的中微子味态，电中性、质量极小，不能用一个味态质量概括。', 'The muon neutrino is the flavour state paired with the muon: neutral, very light, and not described by one flavour-state mass.', 'cern', 'pdgNu'),
    occurrence: c('π 和 K 介子衰变、宇宙线簇射与加速器束流会产生 μ 中微子；它可在飞行中变味。', 'Pion and kaon decays, cosmic-ray showers and accelerator beams produce muon neutrinos; they may change flavour in flight.', 'fnal', 'pdgNu'),
    behaviour: c('带电流作用会伴随 μ 子出现；中性流作用不辨认味态。不同质量本征态的相位差造成振荡。', 'Charged-current interactions accompany a muon; neutral currents do not select flavour. Phase differences between mass eigenstates drive oscillation.', 'pdgNu'),
    discovery: c('1962 年布鲁克海文实验用中微子束发现只有 μ 子而无电子的反应，确认了第二种中微子味态。', 'In 1962 Brookhaven’s neutrino beam produced muons without electrons, establishing a second neutrino flavour.', 'bnlNu'),
    boundary: c('颜色渐变只表达味态概率随传播变化；未给出真实能谱、基线、物质效应或质量排序。', 'The colour morph only expresses changing flavour probability; real spectra, baselines, matter effects and mass ordering are not shown.', 'pdgNu'),
    related: ['ve', 'vtau', 'mu', 'w'],
  },
  vtau: {
    summary: c('τ 中微子是与 τ 子配对的第三种中微子味态，电中性且质量极小；味态不等于单一质量。', 'The tau neutrino is the third flavour state paired with the tau: neutral and very light; a flavour state is not one mass.', 'cern', 'pdgNu'),
    occurrence: c('高能碰撞中 τ 子衰变会产生 τ 中微子；它们难以探测，因为需要识别短寿命 τ 的伴随信号。', 'Tau decays in high-energy collisions produce tau neutrinos; they are hard to detect because a short-lived tau must be tagged.', 'fnal', 'pdgNu'),
    behaviour: c('它以弱相互作用为主，带电流反应伴随 τ 子；与其他质量本征态叠加会产生味态振荡。', 'It mainly interacts weakly; a charged-current event brings a tau, and superposition with other mass eigenstates causes oscillation.', 'pdgNu'),
    discovery: c('2000 年费米实验室 DONUT 直接看到 τ 衰变顶点与缺失能量，首次实验证实 τ 中微子。', 'In 2000 Fermilab’s DONUT experiment identified tau decay vertices with missing energy, directly confirming the tau neutrino.', 'fnal'),
    boundary: c('画面是三种中微子味态的概率柱随传播变化，不是粒子雨或 τ 衰变；柱高、距离和颜色都未按实验参数定量绘制。', 'The scene shows flavour-probability bars changing in propagation, not a particle shower or tau decay; heights, distance and colour are not fitted to data.', 'pdgNu'),
    related: ['ve', 'vmu', 'tau', 'w'],
  },
  gamma: {
    summary: c('光子是电磁场的量子，电中性、无静止质量、传播速度为真空光速，是电磁相互作用的载体。', 'The photon is a quantum of the electromagnetic field: neutral, massless at rest, and the carrier of electromagnetism.', 'cern', 'fnal'),
    occurrence: c('带电粒子加速、原子能级跃迁和物质湮灭都能产生光子；光子也可在真空中传播很远。', 'Accelerated charges, atomic transitions and annihilation can produce photons; photons can travel far through vacuum.', 'cern', 'fnal'),
    behaviour: c('光子可被吸收、发射或散射，也携带能量和动量；电磁作用的长程来自其无质量。', 'Photons can be absorbed, emitted and scattered, carrying energy and momentum; their masslessness gives electromagnetism long range.', 'cern'),
    discovery: c('光电效应等实验促成光量子观念；费曼图和量子电动力学后来把光子确立为电磁场的量子载体。', 'Experiments such as the photoelectric effect motivated light quanta; QED later established the photon as the electromagnetic field quantum.', 'fnal', 'cern'),
    boundary: c('波纹和光点是场量子的视觉隐喻；没有显示真实电磁场振幅、偏振测量或单光子概率。', 'Ripples and dots are a visual metaphor for field quanta; real field amplitudes, polarization measurements and single-photon probabilities are omitted.', 'cern'),
    related: ['e', 'w', 'z'],
  },
  gluon: {
    summary: c('胶子是强相互作用的规范玻色子，携带色荷并连接夸克；“颜色”是量子标签，不是可见颜色。', 'The gluon is the gauge boson of the strong interaction. It carries colour charge and links quarks; colour is a quantum label, not visible colour.', 'cern', 'pdgQcd'),
    occurrence: c('胶子存在于强子内部和高能碰撞产生的喷注中；单个胶子不能脱离强子以自由粒子被观测。', 'Gluons populate hadrons and high-energy collision jets; an individual gluon is not observed as a free isolated particle.', 'cern', 'pdgQcd'),
    behaviour: c('胶子传递强相互作用，而且彼此也能相互作用，造成渐近自由与低能禁闭的并存。', 'Gluons transmit the strong interaction and interact with one another, giving asymptotic freedom at high energy and confinement at low energy.', 'cern', 'pdgQcd'),
    discovery: c('1979 年 DESY 的 PETRA/TASSO 首次展示清晰三喷注：正负夸克伴随辐射一个胶子；随后 PETRA 各实验重复观察。', 'In 1979 DESY’s PETRA/TASSO showed clear three-jet events: a quark pair radiating a gluon; the other PETRA experiments soon reproduced the signature.', 'desyGluon'),
    boundary: c('胶子流线和“颜色交换”是 QCD 概念图；八种色荷组合的共轭关系不等于八张独立的反胶子卡，也不计算格点 QCD、喷注簇射或强子化。', 'Flux lines and colour exchange are QCD concept art; the conjugate relations of eight colour-charge combinations are not eight separate antigluon cards, and lattice QCD, jet showers and hadronisation are not calculated.', 'pdgQcd'),
    related: ['u', 'd', 's', 'gamma'],
  },
  w: {
    summary: c('W 玻色子是带电的弱相互作用载体，有 W⁺ 与 W⁻；它让费米子改变味道并参与 β 衰变。', 'The W boson is a charged weak-interaction carrier, W⁺ or W⁻. It lets fermions change flavour and mediates beta decay.', 'cern'),
    occurrence: c('W 可在高能碰撞中作为真实短寿命粒子产生，也可在 β 衰变等过程中作为虚交换线出现。', 'A W can be produced as a real short-lived particle in high-energy collisions, or appear as a virtual exchange in beta decay.', 'cern', 'fnalKey'),
    behaviour: c('W 很快衰变为轻子与中微子，或夸克与反夸克；其质量使弱相互作用只在很短距离显著。', 'The W quickly decays to a lepton and neutrino or to quarks; its mass makes the weak interaction short-ranged.', 'cern'),
    discovery: c('1983 年 CERN 的 UA1 与 UA2 实验在质子—反质子碰撞中分别看到 W 的带电衰变信号。', 'In 1983 CERN’s UA1 and UA2 experiments saw charged W decay signatures in proton–antiproton collisions.', 'cernW'),
    boundary: c('β 衰变画面中的 W 是虚交换，不应理解为真实 W 被碰撞产生；真实 W 的产生与衰变另有能量门槛。', 'The W in beta decay is virtual, not a real W produced in a collision; real W production and decay require a different energy threshold.', 'cern'),
    related: ['z', 'd', 've', 't'],
  },
  z: {
    summary: c('Z 玻色子是中性的弱相互作用载体。它传递中性流，使粒子在不改变电荷的情况下发生弱相互作用。', 'The Z boson is the neutral weak-interaction carrier. It mediates neutral currents without changing electric charge.', 'cern'),
    occurrence: c('高能碰撞能产生真实 Z 并从其衰变重建；低能散射中常以虚 Z 交换表现弱中性流。', 'High-energy collisions can produce a real Z reconstructed from its decays; low-energy scattering often uses virtual Z exchange.', 'cern', 'fnalKey'),
    behaviour: c('Z 会衰变为费米子对，包括轻子或夸克；其大质量让中性弱作用程很短。', 'The Z decays to fermion pairs, including leptons or quarks; its large mass makes neutral weak interactions short-ranged.', 'cern'),
    discovery: c('1983 年 CERN UA1 与 UA2 在质子—反质子碰撞中发现无电荷的 Z 衰变事例，验证电弱理论。', 'In 1983 CERN’s UA1 and UA2 found neutral Z decay events in proton–antiproton collisions, validating the electroweak theory.', 'cernZ'),
    boundary: c('中性流示意中的 Z 线通常表示虚交换；卡片不会把每次散射都画成真实 Z 碰撞或给出精确截面。', 'A Z line in a neutral-current sketch usually denotes virtual exchange; the card does not turn every scattering into a real Z collision or exact cross section.', 'cern'),
    related: ['w', 'gamma', 've', 'higgs'],
  },
  higgs: {
    summary: c('希格斯玻色子是希格斯场的量子激发，电中性、自旋为零。与场的耦合为部分基本粒子质量提供来源。', 'The Higgs boson is a quantum excitation of the Higgs field, neutral and spin zero. Coupling to the field contributes to masses of some elementary particles.', 'cern', 'higgs'),
    occurrence: c('它只在足够高能的碰撞中短暂产生，随后按不同衰变道消失；背景事例中重建的是统计峰。', 'It appears briefly in sufficiently energetic collisions and then decays through several channels; experiments reconstruct a statistical excess over background.', 'higgs'),
    behaviour: c('希格斯可衰变为光子、Z、W、τ 或夸克等末态；费米子 Yukawa 耦合与质量有关，但不等于“给一切质量”。', 'The Higgs can decay to photons, Z, W, taus or quarks; fermion Yukawa couplings are related to mass, but it does not simply “give everything mass”.', 'higgs', 'nobelHiggs', 'pdgHiggs'),
    discovery: c('2012 年 7 月 4 日 CERN 的 ATLAS 与 CMS 各自报告约 126 GeV 区域新粒子；后续测量确认其符合希格斯玻色子。', 'On 4 July 2012 ATLAS and CMS each reported a new particle near 126 GeV; later measurements established consistency with the Higgs boson.', 'cern', 'higgs', 'nobelHiggs'),
    boundary: c('“场中穿行”是概念化画面；粒子质量来源还涉及电弱对称性破缺与束缚能，动画不是完整量子场计算。', '“Moving through a field” is conceptual; masses also involve electroweak symmetry breaking and binding energy, so this is not a full field calculation.', 'cern', 'higgs'),
    related: ['w', 'z', 't', 'e'],
  },
}
