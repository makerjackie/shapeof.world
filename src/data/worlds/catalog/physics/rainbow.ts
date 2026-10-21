import type { WorldExperience } from '../../types'

export default {
    id: 'rainbow',
    publication: 'public',
    title: '彩虹为什么会有两道？',
    poster: '/assets/posters/rainbow.webp',
    posterMobile: '/assets/posters/mobile/rainbow.webp',
    posterDesktop: '/assets/posters/desktop/rainbow.webp',
    posterTitle: '彩虹为什么会有两道？',
    posterHook: '外面那道更淡，颜色也反过来。跟着阳光走进一颗雨滴，看看多一次反射带来了什么。',
    posterSource: '浏览器内实时几何光学 · 斯涅尔定律与菲涅尔透过率 · 水的色散取自 Hale & Querry · 从侧面到第一视角的连续镜头',
    posterPosition: '50% 45%',
    question: '外面那道彩虹从哪里来，为什么更淡、颜色相反，两圈之间还更暗？',
    hook: '先看天空里的双彩虹，再走进水滴，比较一次和两次反射。改变太阳高度与水滴大小，看彩虹下沉，或淡成白色的雾虹。',
    payoff: '主虹来自水滴内的一次反射，副虹来自两次反射。多一次反射让外圈更淡、颜色反转；两圈之间缺少这两类光路送来的光，形成较暗的亚历山大暗带。',
    topicLabel: '几何光学',
    translations: {
      en: {
        title: 'Why are there two rainbows?',
        posterTitle: 'Why are there two rainbows?',
        posterHook: 'The outer bow is fainter, and its colours run backwards. Follow sunlight into a drop to see what one extra reflection changes.',
        posterSource: 'Real-time in-browser geometric optics · Snell\'s law with Fresnel throughput · water dispersion after Hale & Querry · one continuous camera from side view to first person',
        question: 'Where does the outer rainbow come from, and why is it fainter and reversed, with darker sky between the two arcs?',
        hook: 'Start with a double rainbow, then enter a drop to compare one reflection with two. Change the Sun’s height and the drop size to lower the bows or blend their colours into a pale fogbow.',
        payoff: 'One internal reflection makes the primary bow; two make the secondary. The extra reflection makes the outer bow fainter and reverses its colours. Less light from these two paths reaches the gap, forming Alexander’s dark band.',
        topicLabel: 'Geometric optics',
      },
    },
    primaryCategoryId: 'light-magic',
    runtime: 'diagram-2d',
    difficulty: 'intro',
    lane: 'structure',
    renderer: 'rainbow',
    duration: 420,
    evidence: 'modeled',
    accent: '#ffcf7d',
    related: [],
    sources: [
      {
        label: 'Met Office · 双彩虹、雾虹与完整圆虹',
        labelEn: 'Met Office · Double rainbows, fogbows and full circles',
        url: 'https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/rainbows',
        note: '两次反射、反向色序、暗带、连续光谱，以及完整圆虹的观察条件。',
        noteEn: 'Two reflections, reversed colours, the dark band, continuous spectra and the conditions for seeing a full circle.'
      },
      {
        label: 'Atmospheric Optics · 细条纹彩虹与水滴大小',
        labelEn: 'Atmospheric Optics · Supernumeraries and drop size',
        url: 'https://www.atoptics.org.uk/rainbows/supdrsz.htm',
        note: '区分副虹与干涉形成的细条纹；水滴变小会让色带变宽、颜色变淡。',
        noteEn: 'Distinguishes the secondary bow from interference fringes; smaller drops broaden the bands and dilute their colours.'
      },

      {
        label: 'Hale & Querry 1973 · 水在 200nm–200µm 的光学常数（Applied Optics）',
        labelEn: 'Hale & Querry 1973 · Optical constants of water, 200 nm to 200 µm (Applied Optics)',
        url: 'https://doi.org/10.1364/AO.12.000555',
        note: '水的折射率随波长的变化取自这里；它决定红边 42.4°、紫边 40.7°。',
        noteEn: 'Water\'s refractive index against wavelength comes from here; it fixes the red edge at 42.4° and the violet edge at 40.7°.',
      },
      {
        label: 'Nussenzveig 1977 · 彩虹的理论（《科学美国人》）',
        labelEn: 'Nussenzveig 1977 · The theory of the rainbow (Scientific American)',
        url: 'https://doi.org/10.1038/scientificamerican0477-116',
        note: '从笛卡尔光线、焦散到艾里与米氏理论的完整综述；本作只做到几何光学加近似衍射。',
        noteEn: 'The full account from the Descartes ray and the caustic to Airy and Mie theory; this world stops at geometric optics with approximate diffraction.',
      },
      {
        label: 'Adam 2002 · 彩虹与宝光的数学物理（Physics Reports）',
        labelEn: 'Adam 2002 · The mathematical physics of rainbows and glories (Physics Reports)',
        url: 'https://doi.org/10.1016/S0370-1573(01)00076-X',
        note: '最小偏向角、亮边作为焦散、亚历山大暗带与高阶彩虹的推导。',
        noteEn: 'Derivations of the minimum deviation, the bright edge as a caustic, Alexander\'s band, and higher-order bows.',
      },
      {
        label: 'Atmospheric Optics（Les Cowley）· 主虹',
        labelEn: 'Atmospheric Optics (Les Cowley) · The primary rainbow',
        url: 'https://atoptics.co.uk/blog/primary-rainbow/',
        note: '观测事实：红在外、弧内比弧外亮，彩虹是一个亮盘而不只是一圈颜色。',
        noteEn: 'Observational facts: red outside, brighter inside the arc than outside, the bow as a lit disc rather than just a ring of colour.',
      },
      {
        label: 'MacTutor · 卡玛尔·丁·法尔西传记',
        labelEn: 'MacTutor · Biography of Kamal al-Din al-Farisi',
        url: 'https://mathshistory.st-andrews.ac.uk/Biographies/Al-Farisi/',
        note: '约 1300 年，法尔西与弗赖贝格的西奥多里克各自用装水的玻璃球确认彩虹来自单颗水滴。',
        noteEn: 'Around 1300, al-Farisi and Theodoric of Freiberg each used a water-filled glass sphere to show the rainbow comes from single drops.',
      },
      {
        label: 'USGS 水科学学校 · 雨滴是泪珠形的吗？',
        labelEn: 'USGS Water Science School · Are raindrops shaped like teardrops?',
        url: 'https://www.usgs.gov/special-topics/water-science-school/science/are-raindrops-shaped-teardrops',
        note: '小于 1 毫米的雨滴接近完美球形，更大的会被气流压扁；泪珠形是水滴落前挂着的样子。',
        noteEn: 'Raindrops under 1 mm are nearly perfect spheres; larger ones flatten in the airflow. The teardrop is the shape of water hanging before it drips.',
      },
      {
        label: 'Wyman, Sloan & Shirley 2013 · CIE XYZ 配色函数的解析近似（JCGT）',
        labelEn: 'Wyman, Sloan & Shirley 2013 · Simple analytic approximations to the CIE XYZ colour matching functions (JCGT)',
        url: 'https://jcgt.org/published/0002/02/01/',
        note: '把每个角度的光谱积分成屏幕颜色。',
        noteEn: 'Integrates the spectrum at each angle into a screen colour.',
      },
    ],
    fieldNotes: [
      {
        label: '外圈：副虹，也叫霓',
        labelEn: 'The outer arc: the secondary rainbow',
        body: '外面较淡的一圈来自阳光在水滴里反射两次。每次碰到水面，都有一部分光透出去，最后留下的光较少。主虹外红内紫；副虹内红外紫，所以两道红边隔着暗带相对。主虹的色带约在 41°–42°，副虹约在 50°–53°；角度都从背向太阳的方向量起。',
        bodyEn: 'The outer arc comes from sunlight reflecting twice inside a drop. Some light escapes at each encounter with the surface, leaving less for the secondary bow. The primary has red outside and violet inside; the secondary has red inside and violet outside. Their red edges face one another across the dark gap. The primary spans roughly 41°–42°, the secondary 50°–53°, measured from the direction opposite the Sun.'
      },
      {
        label: '为什么两圈之间更暗',
        labelEn: 'Why the gap looks darker',
        body: '一次反射的光主要落在主虹以内，两次反射的光落在副虹以外。两道红边之间，大约 42°–50° 的方向，缺少这两类光路送来的光，所以比两侧更暗。这就是亚历山大暗带。那里仍有普通天光和其他散射光，并不是一圈黑暗的空洞。',
        bodyEn: 'Once-reflected light falls inside the primary bow; twice-reflected light falls outside the secondary. Between their red edges, roughly 42°–50°, these two paths contribute very little light. This relative deficit is Alexander’s dark band. Ordinary skylight and other scattered light remain there.'
      },
      {
        label: '白光怎样分成颜色',
        labelEn: 'How white light separates into colours',
        body: '水对不同波长的光折射程度不同。白色阳光进出水滴时，红光与紫光沿不同方向离开。对同一位观察者，某个方向的雨滴送来的光以某些颜色为主，许多方向连起来就形成色带。彩虹是连续的光谱，「七色」只是便于描述的分法。',
        bodyEn: 'Water bends different wavelengths by different amounts, so red and violet light leave a drop in different directions. For one observer, drops in a particular direction contribute some wavelengths more strongly than others. Together these directions form the coloured bands. The spectrum is continuous; seven colours are a convenient way to describe it.'
      },
      {
        label: '42° 和 51° 怎样出现',
        labelEn: 'Where 42° and 51° come from',
        body: '移动入射点，光离开水滴的方向会变化。在某个位置附近，许多相邻光线的出射方向几乎不变，光便集中成亮边，称为焦散。主虹约 42° 是一次反射光偏离回头方向的最大角；副虹约 51° 是两次反射光的最小角。光路遵循斯涅尔定律：sin i = n sin r。i 是入射角，r 是折射角，n 是水的折射率。',
        bodyEn: 'Moving the entry point changes a ray’s outgoing direction. Near a turning point, neighbouring rays leave in almost the same direction, creating a bright caustic. About 42° is the maximum return angle for one reflection; about 51° is the minimum for two. The paths follow Snell’s law: sin i = n sin r, where i is the incidence angle, r the refraction angle, and n the refractive index of water.'
      },
      {
        label: '彩虹有一整圈，为什么只看见弧',
        labelEn: 'Why a full circle looks like an arc',
        body: '彩虹的圆心在背向太阳的方向，接近你头部影子的方向。站在平地上时，下半圈通常被地面挡住，或没有合适的水滴送光；从飞机或高处向下看，如果下方有阳光照亮的水滴，就可能看到完整圆虹。本场景演示的是平地前方的雨幕。',
        bodyEn: 'The centre is opposite the Sun, in the direction of your head’s shadow. At ground level, the lower part is usually blocked or lacks droplets to send light. From an aircraft or another high viewpoint, sunlit droplets below you can complete the circle. This scene models a rain curtain ahead of an observer on flat ground.'
      },
      {
        label: '太阳升高，彩虹为什么下沉',
        labelEn: 'Why a higher Sun makes a lower rainbow',
        body: '太阳每升高一度，彩虹圆心就向下移一度。主虹顶部的高度大约等于 42° 减去太阳高度；副虹的圆更大，落到地平线下要更晚。太阳高于约 42° 时，平地上通常看不到前方地平线以上的主虹。但从高处向下看瀑布水雾等，仍可能看见；正午的太阳也并非处处都高于 42°。',
        bodyEn: 'For each degree the Sun rises, the bow’s centre drops a degree. The primary’s top is roughly 42° minus the Sun’s elevation. The larger secondary remains above the horizon longer. Above about 42°, the primary is normally below the horizon for a ground-level observer. Looking down at spray from a high viewpoint can still reveal it, and the midday Sun is not always above 42°.'
      },
      {
        label: '雾虹和细条纹，和副虹有什么不同',
        labelEn: 'Fogbows and fine fringes are different phenomena',
        body: '雾滴很小，衍射让色带变宽、互相重叠，形成近乎白色的雾虹。另一种现象是主虹紫边内侧紧挨着的几条浅色细弧，叫干涉虹或附加虹；它们来自光波干涉，容易出现在水滴大小比较一致时。它们与远在外侧、由两次反射形成的副虹不同。本作近似演示雾虹的展宽，不绘制干涉条纹。',
        bodyEn: 'Tiny fog droplets spread the colours through diffraction, producing a broad, nearly white fogbow. Narrow pastel arcs just inside the primary’s violet edge are supernumerary bows. They arise from wave interference and are clearer when drop sizes are similar. They differ from the distant secondary arc, which comes from two reflections. This model approximates fogbow broadening but does not render interference fringes.'
      },
      {
        label: '走近彩虹，换了哪些雨滴',
        labelEn: 'What changes when you walk',
        body: '彩虹由太阳、水滴和你的眼睛共同决定。你移动时，给你送光的雨滴换了，但它们仍在相近的角度上，所以不能像靠近一座桥那样走到彩虹脚下。左右走到雨幕边缘，弧会缺一块；走出这片雨后，如果前方不再有水滴，彩虹就消失。',
        bodyEn: 'The Sun, the drops and your eye together determine the rainbow. As you move, different drops send light at nearly the same angles. You cannot approach its foot as you would a bridge. Move towards the edge of the rain curtain and part of the arc disappears; pass beyond it with no droplets ahead and the bow vanishes.'
      },
      {
        label: '雨滴的形状与模型边界',
        labelEn: 'Drop shape and model limits',
        body: '小雨滴接近球形，大雨滴会被气流压扁。本作按球形水滴计算折射、一次或两次反射、色散和菲涅尔能量损失。水滴大小控件表示半径，0.5 mm 半径对应约 1 mm 直径。雾虹只用近似衍射展宽，未模拟完整波动光学、偏振或非球形雨滴。天空、地面和亮度经过艺术化处理，副虹显示亮度适度增强以便辨认；雨滴被放大，雨幕被简化为竖直雨带。侧面视图标示的是送进观察者眼里的光，不是旁观镜头会看到的真实色彩。',
        bodyEn: 'Small drops are nearly spherical; larger raindrops flatten in the airflow. The model uses spherical drops, refraction, one or two reflections, dispersion and Fresnel energy losses. The size control reports radius: 0.5 mm corresponds to a diameter of about 1 mm. Fogbow width uses an approximate diffraction model; full wave optics, polarization and nonspherical drops are omitted. Sky, ground and brightness are artistically graded; the secondary is modestly brightened for readability. Visible drops are enlarged and rain is simplified to a vertical curtain. The side view shows the light sent to the observer, not the colours a separate camera would actually see.'
      },
    ],
    experiencePolicy: {
      entryMode: 'guided',
      guideStyle: 'story',
      shellMode: 'standard',
    },
    provenance: {
      origin: 'multi-model',
    },
    presentation: 'full-bleed',
    transferBudgetMb: 1,
    fallback: 'poster',
  } satisfies WorldExperience
