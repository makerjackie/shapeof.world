import type {WorldExperience} from '../../types'

export default {
 id: 'iphone-teardown',
 publication:'making',title:'一部 iPhone，拆到每一套系统',
 poster:'/assets/posters/iphone-teardown.webp',posterMobile:'/assets/posters/mobile/iphone-teardown.webp',posterDesktop:'/assets/posters/desktop/iphone-teardown.webp',
 posterTitle:'一部手机，拆到底',posterHook:'移开玻璃，展开电池、主板、摄像头与无线线圈。走进六个实验台，让光、计算和能量一起工作。',posterSource:'原创程序化结构 · 公开规格 · 六套计算模型',posterPosition:'50% 50%',
 question:'一部手机里的系统怎样一起工作？',hook:'按 iPhone 13 外形规格制作的原创教学拆解。26 个可检查部件，跟随拍照、游戏和通话的数据路径，进入显示、计算、光学、电源、无线和触觉实验。',
 payoff:'屏幕把电流变成光，相机把光变成数据，芯片计算，电池供能，天线传递信息。把它们拆开，再看它们一起工作。',topicLabel:'手机系统',
 translations:{en:{title:'Inside an iPhone, system by system',posterTitle:'Inside a phone. All the way down.',posterHook:'Lift the glass and unfold the cell, board, cameras and charging coil. Enter six labs to make light, computation and energy work together.',posterSource:'Original procedural structure · Published specs · Six calculation models',question:'How do the systems inside a phone work together?',hook:'An original teaching teardown with iPhone 13 exterior specifications. Inspect 26 parts, trace photo, game and call data paths, and enter display, logic, optics, power, radio and haptics labs.',payoff:'A display turns current into light; a camera turns light into data. Silicon computes, the battery supplies energy, and antennas carry information. Take them apart and watch them work together.',topicLabel:'Phone systems'}},
 primaryCategoryId: 'machines-mechanisms',runtime:'scene-3d',difficulty:'advanced',lane:'structure',renderer:'iphone-teardown',duration:1200,evidence:'modeled',accent:'#b3c5cf',related:['chip-zoom','car-teardown','radio-spectrum'],
 experiencePolicy:{entryMode: 'direct',shellMode: 'minimal'},
 sources:[
  {label:'Apple · iPhone 13 技术规格',labelEn:'Apple · iPhone 13 technical specifications',url:'https://support.apple.com/en-us/111872',note:'外形、OLED、A15 与摄像头公开规格。内部教学布局不来自 Apple CAD。',noteEn:'Published exterior, display, A15 and camera specifications. Interior teaching geometry is not Apple CAD.'},
  {label:'Apple · iPhone 13 发布资料',labelEn:'Apple · iPhone 13 announcement',url:'https://www.apple.com/newsroom/2021/09/apple-introduces-iphone-13-and-iphone-13-mini/',note:'A15 核心数与对角排列摄像头。',noteEn:'A15 core counts and diagonal camera arrangement.'},
  {label:'美国能源部 · 电池的工作原理',labelEn:'US Department of Energy · How batteries work',url:'https://www.energy.gov/science/doe-explainsbatteries',note:'电子通过外电路、离子通过电解质；充放电方向反转。数值参数为独立教学选择。',noteEn:'External electron flow, internal ion flow and reversal during charging. Numerical parameters are independent teaching choices.'},
  {label:'Sony · CMOS 图像传感器',labelEn:'Sony · CMOS image-sensor technology',url:'https://www.sony-semicon.com/en/technology/is/index.html',note:'光电二极管与 CMOS 成像机制；没有使用网页图片。',noteEn:'Photodiodes and CMOS image sensing. No page images are reused.'},
  {label:'ITU-R P.525 · 自由空间衰减',labelEn:'ITU-R P.525 · Free-space attenuation',url:'https://www.itu.int/rec/R-REC-P.525/en',note:'自由空间损耗；不含遮挡、干扰或蜂窝调度。',noteEn:'Free-space attenuation without obstruction, interference or cellular scheduling.'},
 ],
 fieldNotes:[
  {label:'原创教学拆解',labelEn:'An original teaching teardown',body:'外形以 iPhone 13 公开尺寸为参照。内部 26 个可选择部件与更小的焊球、器件、螺钉均为原创程序化几何。零件布局、封装和拆解路径是教学排布，不是扫描、生产 CAD 或维修指南。',bodyEn:'The exterior refers to published iPhone 13 dimensions. The 26 selectable parts and smaller solder balls, components and screws are original procedural geometry. Layout, packages and explosion paths are teaching arrangements, not scans, production CAD or repair instructions.'},
  {label:'计算与示意的边界',labelEn:'Calculation and illustration',body:'显示用 sRGB 线性光和亮度权重；计算实验是独立八位全加器；相机用理想薄透镜；电源按 12 Wh 参考电池守恒计算；无线用自由空间链路预算和香农上界；触觉用受迫阻尼振子。芯片功能区、RGB 条纹、光路排布与粒子运动是示意。',bodyEn:'The labs calculate linear-light sRGB luminance, an independent eight-bit full adder, ideal thin-lens optics, a 12 Wh reference-cell energy balance, a free-space link budget and Shannon bound, and a driven damped oscillator. Chip blocks, RGB stripes, ray-diagram spacing and particles illustrate mechanisms.'},
 ],
 provenance:{origin:'ai-prototype',initialModel:'gpt-6'},presentation:'full-bleed',transferBudgetMb:2,fallback:'poster',
} satisfies WorldExperience
