# How bridges stand — model and asset provenance

Verified 2026-10-26. This is a quasi-static teaching prototype, not structural design software. The three-dimensional scene extrudes planar load paths; it is not a three-dimensional finite-element solution.

## Assets and implementation

All bridge geometry, terrain cutouts, truck geometry, icons and flow markers are procedural originals. No photographs, drawings, models, textures, film footage or external web fonts are downloaded by this world. No external solver code was copied. Existing Three.js, React Three Fiber and Drei dependencies are MIT licensed; their notices remain with the installed dependencies ([Three](https://github.com/mrdoob/three.js/blob/dev/LICENSE), [Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei/blob/master/LICENSE)). Original source code follows the repository AGPL-3.0 license; original visual content follows LICENSING.md.

## Physical reference and independent derivation

- [NOVA: Build a Bridge](https://www.pbs.org/wgbh/nova/education/tech/build-bridge.html): bridge-type topology and trade-offs. Link/reference only, no prose or images reproduced. Its historical indicative span ranges are not used as present-day limits.
- [Felix Udoeyo: Arches and Cables](https://eng.libretexts.org/Bookshelves/Civil_Engineering/Structural_Analysis_(Udoeyo)/01%3A_Chapters/1.06%3A_Arches_and_Cables): cross-check of three-hinge equilibrium and cable equilibrium. Page license is **CC BY-NC-ND 4.0**; none of its text, images or code is incorporated. The equations below and implementation are independently derived from force and moment balance.
- [WSDOT: suspension bridge basics](https://wsdot.wa.gov/TNBhistory/suspension-bridges.htm): hangers, main cables, towers and anchorages. No imagery reused. Its old longest-span ranking is not current and is not repeated.
- [WSDOT: lessons from failure](https://wsdot.wa.gov/TNBhistory/bridges-failure.htm): torsional flutter is a self-excited aerodynamic instability, not merely a driven resonance. Wind dynamics are not implemented here.

## Parameters

Units are metres and kN. All dimensions and loads below are **chosen teaching parameters**, not measurements of a named bridge: L = 120 m; deck elevation = 28 m; equivalent beam couple depth = 4 m; arch rise f = 24 m; main-cable tower elevation = 60 m; prescribed midspan sag s = 18 m; stayed tower head = 64 m (36 m above deck); suspension backstay run = 32 m, rise = 36 m; uniform deck load w = 12 kN/m; truck P = 80–640 kN, default 320 kN; 20 deck panels. The common span is for controlled comparison, not an economic recommendation for a 120 m suspension bridge. The planar force represents the whole idealized bridge; the second white cable/arch is an extruded visual counterpart, not a second copy of the numerical load.

Truck position a is clamped to [0,L]. Point load interpolation between adjacent deck nodes preserves total force and its first moment. End nodes receive half a panel's distributed load. Foundations, towers, cables and posts have no separately modeled self-weight; w is the prescribed equivalent deck load. Axle spacing and moving-load dynamics are omitted.

## Four models

**Beam:** R_A=wL/2+P(L−a)/L, R_B=wL+P−R_A; M(x)=R_A x−wx²/2−P max(0,x−a). Positive sagging produces top compression and bottom tension. The displayed pair is ±M/h with h=4 m, not uniform axial force or a material stress distribution. Maximum M is evaluated at the point load and valid zero-shear positions. Shear, elastic deflection, shear lag, prestress, reinforcement and material failure are omitted.

**Arch:** a three-hinged, untied parabolic arch with y(x)=4fx(L−x)/L². Discrete deck loads enter through the shown posts. Compute the simply supported moment diagram M₀ from those nodal loads, then H=M₀(L/2)/f. On each segment N_compression=H cos(theta)+V sin(theta); theta follows the prescribed arch tangent and V is the cumulative vertical-load equilibrium. The color shows this axial compression only. Under eccentric truck loading the real ideal arch also has M_arch=M₀−Hy and shear; those are not visualized. This is not a pure-compression funicular shape for every truck position. The red arrows show the force the arch applies outward to the banks; the banks supply equal inward reactions. Tied arches are explicitly outside this topology.

**Suspension:** an ideal funicular polygon under discrete panel loads, with **prescribed midspan sag**: H=M₀(L/2)/s, y_i=60−M₀(x_i)/H, T_i=H sqrt(1+(Δy_i/Δx)²). Each hanger has T=P_i. Tower compression is the central-span reaction plus backstay downward component H·36/32; each anchorage resists the corresponding upward component. Including anchor uplift yields total vertical ground reaction wL+P. Changing truck position changes the equilibrium cable polygon. This is a form-finding family, **not one fixed-length elastic cable under moving traffic**; neither cable-length compatibility nor deck stiffening is solved. The undeformed deck is a reference surface. Its overall dimensions are not displacement predictions. End panel loads go directly to the tower supports.

**Cable-stayed:** one central tower and ideal independently supported deck panels. Each stay carries its tributary vertical load P_i, giving T_i=P_i sqrt(x_i²+36²)/36. The deck carries cumulative horizontal components toward the tower. A load directly at the tower goes into it without a stay. Tower vertical load is wL+P; the foundation resists the eccentric moment P(a−L/2), with opposite reaction sign. This is a simplified balanced cantilever: continuous-deck load sharing, tower bending diagrams, stay pretension, elasticity and geometric nonlinearity are omitted. The approach surfaces do not introduce extra main-span supports.

## Visual encoding and controls

Blue = tension; red = compression. Radius r=0.18+0.8 sqrt(|N|/1700), in scene units; a fixed nonlinear scale with a visibility floor, **not linearly proportional stress**. For the beam, N is the equivalent couple M/h. White dots indicate the route only, not energy flow or propagation speed. A selected path step desaturates other members. Truck position, weight, pause/speed, orbit/zoom, front view and reset are available on desktop and mobile. Reduced-motion preferences stop initial motion. Browser hidden state and shared-shell pause stop playback.

`model.test.ts` checks independent closed-form central loading, total force and first moment conservation, arch crown moment equilibrium, cable joint equilibrium and anchorage balance, and stayed fan vertical/horizontal balance and base moment. These checks validate only the stated ideal models. They do not validate a real bridge or establish safe capacities.

## Span view — selected teaching design envelopes (round 2)

This view uses **four chosen design schemes**, not universal span limits, bridge design codes, an economic optimization, or assessments of named real bridges. One load model, separate section/material assumptions. All parameter values in this section are **explicit teaching choices**; they have not been fitted to the example bridges. Grey means demand exceeds the capacity of this particular scheme. A bigger/different section, a different material, foundation conditions, construction method or topology changes the answer. A short span can satisfy a cable scheme without making that scheme economical.

The main-span slider runs **20–2,000 m**. Selecting the 2,023 m Çanakkale record temporarily extends it by 23 m; dragging back inside the normal interval restores its upper endpoint. Long spans trigger a camera pull-back; truck length (10 m stylized), deck width (20 m), and deck datum (40 m) remain fixed in world metres. On mobile the **vertical geometry is exaggerated 2×**, explicitly labelled. Span dimensions remain horizontal metres. Bridge geometry illustrates the chosen family, not the exact structure of the selected example. In this view the arch is a through-arch with tension hangers and untied abutments; it differs from the first view's deck-above-arch arrangement while using the same arch equilibrium principles. Member diameters in the scene are chosen for readability, not section dimensions.

The independent equations follow ordinary force/moment equilibrium, elastic section capacity and Euler column buckling. As in round 1, no textbook text, figures or solver code are copied. The Euler expression below is deliberately a **stability proxy for a curved arch**, not a validated arch buckling solution; the assumed effective length and reduction factor must not be treated as code values. All constants below can be found in `span-model.ts`; tests independently check load balance, scaling and the overlap between schemes.

Common inputs: L in m; deck dead/service load q_d = **180 kN/m**; central comparison load P = **320 kN**; steel unit weight gamma = **78.5 kN/m³**. q_d is an assumed aggregate deck loading, not a detailed code combination; separate self weights are as stated. Only the chosen governing checks are evaluated: no deflection criterion, fatigue, lateral stability, aerodynamic stability, seismic action, anchorage/geotechnical capacity, connections, redundancy or construction-stage effects.

### Beam: fixed section area, increasing depth capped at 22 m

- Equivalent two-flange steel girder: each flange area A_f=1.4 m², total equivalent steel area A_s=3.4 m² (including an assumed 0.6 m² of webs); depth h=min(22,max(1,L/12)) m. This idealization holds steel area fixed as it redistributes over the depth; it omits plate buckling, web thickness detailing and continuity.
- Total uniform loading q=q_d+gamma A_s=446.9 kN/m.
- Simply supported central moment M=qL²/8+PL/4.
- Equivalent section modulus Z≈A_f h; chosen permissible stress sigma_b=200,000 kN/m² (200 MPa); capacity M_c=sigma_b Z.
- Utilization u=M/M_c. After h reaches its cap, capacity stops growing while the distributed-load moment grows as L². This scheme crosses u=1 around **331 m** (the exact integer endpoint is computed, never hardcoded). A continuous steel/concrete real girder such as Shibanpo is **a different scheme** and can exceed it.

### Arch: axial compression plus a stated stability proxy

- Rise f=L/5; q=q_d+50=230 kN/m, with 50 kN/m assumed distributed arch self weight.
- Three-hinge equilibrium under central P: H=qL²/(8f)+PL/(4f), V=(qL+P)/2, foot resultant N=sqrt(H²+V²).
- Equivalent aggregate rib area A=3.2 m²; chosen permissible compression sigma_a=45,000 kN/m²; N_compression=sigma_a A=144,000 kN.
- Stability proxy: E=35,000,000 kN/m², I=150 m⁴, effective length ell_e=0.55L, teaching reduction factor 2.5; N_stability=pi² E I/(ell_e²·2.5).
- N_c=min(N_compression,N_stability), u=N/N_c. This scheme crosses near **718 m**: demand grows roughly as L, while the stability proxy falls as 1/L². The fixed A and I are effective parameters, not a complete concrete/steel rib section; the arch self-weight allowance and equivalent stiffness are not a bill of materials or composite-section design. No claim that an actual 719 m arch cannot stand.

### Cable-stayed: a representative outer stay with tower-height cap

- Two tower supports; height above deck h=min(0.22L,240) m; representative outer stay horizontal reach L/2, length ell=sqrt((L/2)²+h²), sin(theta)=h/ell.
- Two cable planes. Tributary deck length d=min(40,L/8) m; one outer stay receives vertical load W=q_d d/2+P/2+gamma A ell/2, where A=0.015 m² is its fixed steel section. Half of that stay's weight is assigned to its deck end; the other half enters at the tower. This endpoint-lumped weight approximation neglects catenary curvature and secondary bending.
- Required tension T=W/sin(theta); chosen permissible tension sigma_s=750,000 kN/m²; T_c=sigma_s A=11,250 kN.
- u=T/T_c. Once tower height is capped, the stay becomes flatter as L grows; both force amplification and its own weight grow. This scheme supports the **1,088 m and 1,092 m** examples' span positions, but is grey at 1,500 m. It is **not** a continuous-deck/cable compatibility solution or a design check of those bridges.

### Suspension: constant sag-to-span ratio and fixed total main-cable area

- Sag f=0.10L. Fixed **combined** main-cable section A=1.2 m² across both cable planes. Approximate parabolic cable length factor c=1+8(f/L)²/3; projected total cable self weight q_c=gamma A c; q=q_d+q_c.
- H=qL²/(8f)+PL/(4f); support vertical share V=(qL+P)/2; cable demand T=sqrt(H²+V²).
- Chosen permissible tension sigma_c=800,000 kN/m²; T_c=sigma_c A=960,000 kN; u=T/T_c.
- The sag ratio stays fixed, so cable force grows roughly linearly with L rather than with L². This scheme remains within its selected static capacity at **2,023 m**, crossing later outside the normal slider interval. It does not account for the major aerodynamic, stiffness, anchorage and construction constraints of an actual long-span suspension bridge.

`SCHEME_LIMITS` finds each u=1 crossing by binary search on 20–5,000 m, displays the integer floor, and never uses a named bridge's span as a failure threshold. The four schemes share a deck load but **do not use equal quantities or types of material**; this is not a ranking of efficiency, cost or safety.

## Real bridge markers — facts and span conventions

Verified **2026-10-26**. “Year” means opening year, not start of construction. Only manually entered factual attributes are used; no photographs, drawings, prose or source tables are bundled. These public pages do not supply a general open-content licence; their facts are independently represented, not their copyrighted expression. No additional binary assets or dependencies are introduced.

| Family | Marker | Span / opened | Primary source and convention |
|---|---|---|---|
| Beam | Humen auxiliary navigation bridge | 270 m / 1997 | [Municipal archive](https://www.yantian.gov.cn/ytdayszxxw/lsjt/content/post_11736982.html) gives span/year; [original highway research article](https://zgglxb.chd.edu.cn/CN/article/downloadArticleFile.do?attachType=PDF&id=1246) classifies it as prestressed-concrete continuous rigid frame. The archive has a “steel structure” transcription error; not repeated. Record for its class at opening. |
| Beam | Shibanpo parallel bridge | 330 m / 2006 | [Chongqing DRC handover notice, 2006-09-07](https://fzggw.cq.gov.cn/zwxx/bmdt/202002/t20200212_5171489.html); [owner chronology](https://epaper.cqrb.cn/cqrb/2020-09/04/011/content_269617.htm). Steel/concrete continuous rigid frame, historical class record; not the simply supported steel teaching model. |
| Arch | Pingnan Third Bridge | 575 m / 2020 | [Builder's span report](https://www.gxlq.com.cn/html/2020/qiyeyaowen_0113/7297.html); [participating research centre opening notice](https://dkgqgczx.gxu.edu.cn/info/1007/1002.htm). Uses builder's published 575 m main-span convention; some academic sources use 560 m under a different arch-span definition. Do not mix those values. Record at opening. |
| Arch | Tian'e Longtan Bridge | 600 m / 2024 | [Transport-department report sourced from Guangxi Transport](https://jtj.xuancheng.gov.cn/News/show/1539540.html), opening 2024-02-01. **Calculated arch span** (not net clear opening), historical record at opening. |
| Stayed | HZMB Qingzhou navigation bridge | 458 m / 2018 | [Highways Department main-bridge facts](https://www.hzmb.gov.hk/sc/main-bridge.html); [Hong Kong Transport Department annual report](https://www.td.gov.hk/mini_site/atd/2019/tc/section1_1.html) confirms main bridge opened 2018-10-24. A single navigation span, not the 55 km crossing. |
| Stayed | Sutong Yangtze River Bridge | 1,088 m / 2008 | [Jiangsu Transport technical handover](https://jtyst.jiangsu.gov.cn/art/2008/4/14/art_41358_7515323.html); [opening history](https://jtt.hunan.gov.cn/jtt/jjzdgz/xxds/dsgs/202206/t20220609_25441686.html). Official opening 2008-06-30; record at opening, not current. |
| Stayed | Husutong Yangtze River Bridge | 1,092 m / 2020 | [Builder / SASAC opening report](https://wap.sasac.gov.cn/n2588025/n2588124/c14992281/content.html), 2020-07-01; [Jiangsu MSA technical notice, 2025-12-30](https://www.js.msa.gov.cn/art/2025/12/30/art_275_1580720.html) confirms span. First road–rail cable-stayed main span over 1 km, not “first of all cable-stayed bridges”. |
| Suspension | Yangsigang Yangtze River Bridge | 1,700 m / 2019 | [Government opening report](https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201910/t20191012_10480616.html), 2019-10-08 opening; double-deck suspension span record at opening, not a claim about all current Chinese spans. |
| Suspension | Akashi-Kaikyo Bridge | 1,991 m / 1998 | [Operator HSBE technical introduction](https://www.jb-honshi.co.jp/english/corp_index/technology/introduction/introduction_akashi.html), 1998-04-05 opening, centre span between towers; historical world suspension record. |
| Suspension | 1915 Çanakkale Bridge | 2,023 m / 2022 | [Operator FAQ](https://www.1915canakkale.com/kurumsal/sikca-sorulan-sorular) gives span and world-record claim; [operator opening notice](https://www.1915canakkale.com/basin-odasi/zaman-tuneli/1915canakkale-halkimizin-ve-dunyanin-hizmetinde) confirms 2022-03-18. 1915 is the name, 2023 is metres, **2022 is the opening year**. |

The UI deliberately says both cable-stayed and suspension schemes remain possible just beyond 1,000 m, and only the suspension **of these chosen schemes** remains at 1,500 m. Real kilometre-scale cable-stayed bridges make the brief's literal “only one type above 1,000 m” conclusion incorrect. Current or historical record categories are stated individually; no whole-bridge length is placed on this single-span ruler.
