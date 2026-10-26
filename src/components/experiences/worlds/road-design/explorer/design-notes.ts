// Editorial anchors refer to actual lane properties/IDs. Sources and the
// distinction between this model and real installations are in SOURCES.md.
type Anchor='entry'|'stop'|'connector'|'left'|'waiting'|'crossover'|'ring'|'loop'|'bridge'|'ramp'|'merge'
interface Note { title:string; titleEn:string; body:string; bodyEn:string; anchor:Anchor; fraction?:number }
interface DesignNotes { summary:string; summaryEn:string; neighbours:{id:string;label:string;body:string;bodyEn?:string}[]; notes:Note[] }
export const DESIGN_NOTES:Record<string,DesignNotes>={
 't-junction':{
  summary:"让主路优先、支路等空当，用较少路面接通三向；代价是支路车多时难以驶入。",summaryEn:"Give the main road priority and connect three arms with little pavement; the tradeoff is long waits for busy side-road traffic.",
  neighbours:[{id:'crossroads-yield',label:'十字 · 无信号',body:"少一个进口会少一些相交路线；十字路口连接四向，却需要处理更多相互让行。",bodyEn:"One fewer approach means fewer intersecting paths; a crossroads connects four arms but adds more yielding relationships."}],
  notes:[
   {anchor:'entry',title:"主路先走，支路找空当",titleEn:"Main road first, side road waits for a gap",body:"本模型让东西向主路优先，支路驶入要等空当；不用固定红灯，代价是支路等待不均。",bodyEn:"This model gives east–west traffic priority. Side-road vehicles wait for gaps instead of fixed red lights, with uneven waiting times as the tradeoff."},
   {anchor:'left',title:"左转要跨过一股车",titleEn:"A left turn crosses one stream",body:"支路左转必须穿过近侧主路车流，再汇入远侧方向；路径短，却比右转需要更大的空当。",bodyEn:"A side-road left turn crosses the near stream before joining the far stream. The path is short but needs a larger gap than a right turn."},
   {anchor:'connector',title:"转弯不能和直行一样快",titleEn:"Turns cannot be as fast as through traffic",body:"路口用小半径曲线连接三条路，节省用地；转弯车必须降速，也会影响同车道后车。",bodyEn:"Tight curves connect three roads with little land. Turning vehicles must slow down and may delay vehicles behind them."},
  ],
 },
 'crossroads-yield':{
  summary:"用让行和空当连接四向，省去信号等待；代价是交叉仍在，车多时互相阻挡。",summaryEn:"Connect four arms by yielding into gaps, without signal waits; the tradeoff is remaining crossings and mutual obstruction at high demand.",
  neighbours:[{id:'t-junction',label:'T 字路口',body:"T 字少一条支路，关系更少；这里多接通一个方向，也增加相交路线。",bodyEn:"A T-junction has one fewer branch and simpler interactions. A crossroads connects an extra direction and adds intersecting paths."},{id:'crossroads-signal',label:'十字 · 信号灯',body:"信号能分时处理横向车流；低流量时却可能在没有来车时仍要等红灯。",bodyEn:"Signals separate crossing traffic in time, but at low demand a driver may wait at red even when no one is coming."}],
  notes:[
   {anchor:'stop',title:"先看空当，再进路口",titleEn:"Find a gap before entering",body:"这里没有固定信号相位，车辆根据优先级与可接受空当驶入；低流量时灵活，繁忙时可能长等。",bodyEn:"There are no fixed signal phases here. Vehicles enter according to priority and acceptable gaps: flexible at low demand, with potentially long waits when busy."},
   {anchor:'left',title:"左转同时面对两边来车",titleEn:"Left turns face traffic from both sides",body:"左转既要横穿对向直行，又要接入出口方向；省去了绕行，却保留交叉与合流。",bodyEn:"Left turns cross opposing through traffic and join the exit stream. This saves a detour while retaining crossing and merging conflicts."},
   {anchor:'connector',title:"路面相交，不能同时占用",titleEn:"Intersecting paths cannot occupy the same space",body:"两条车道线形在同一高度相交，模型会让车等待；这种冲突需要让行处理，不能用立交的合流来等同。",bodyEn:"Where lane paths cross at the same height, the model makes vehicles wait. Yield-controlled crossings are different from merges on a grade-separated interchange."},
  ],
 },
 roundabout:{
  summary:"用单向环行把直角交叉改成低速汇入；代价是绕行，入口要等环内空当。",summaryEn:"Replace right-angle crossings with low-speed, one-way circulation; the tradeoff is a detour and waiting for a gap in circulating traffic.",
  neighbours:[{id:'crossroads-yield',label:'十字 · 无信号',body:"环岛用弯曲和单向行驶减少横穿，代价是直行也要转弯绕岛。",bodyEn:"Curves and one-way circulation reduce crossing movements, but even through traffic must bend around the island."},{id:'crossroads-signal',label:'十字 · 信号灯',body:"没有固定红灯可减少空等；环内持续车流也可能让某个入口长时间难以汇入。",bodyEn:"No fixed red light means less empty waiting, but a continuous circulating stream can leave an entry waiting for a long time."}],
  notes:[
   {anchor:'stop',title:"进环先让环内车",titleEn:"Yield to traffic already in the roundabout",body:"入口让行把决定集中在环内来车的空当；不用固定红灯，代价是繁忙入口可能排队。",bodyEn:"Entry control makes the circulating gap the key decision. It avoids fixed red lights, but a busy entry may queue."},
   {anchor:'ring',title:"直行也要绕中央岛",titleEn:"Through traffic also goes around the island",body:"曲线让所有车降速并沿同一方向行驶，减少横穿；代价是直行和左转都增加行程。",bodyEn:"Curves slow all vehicles and guide them in one direction, reducing crossings. Through and left-turn trips become longer."},
   {anchor:'merge',title:"出口从环道分出去",titleEn:"Leave by diverging from the ring",body:"单车道环岛不需要在环内换道，出口直接分流；容量仍受单车道和入口空当限制。",bodyEn:"This single-lane roundabout requires no lane changes within the ring. Its capacity is still limited by one lane and available entry gaps."},
  ],
 },
 'crossroads-channelized':{
  summary:"用专用车道、待转区与左转相位分开任务；代价是更宽路口和更多等待时段。",summaryEn:"Separate tasks with dedicated lanes, waiting areas and left-turn phases; the tradeoff is a wider junction and more waiting periods.",
  neighbours:[{id:'crossroads-signal',label:'十字 · 信号灯',body:"许可左转要等对向空当；这里用专用相位分开左转，代价是其他方向等待。",bodyEn:"Permissive left turns wait for opposing gaps. A dedicated phase separates them here, at the cost of making other directions wait."},{id:'continuous-flow',label:'连续流交叉口',body:"把部分左转交叉前移，可在中心同时放行；需要额外的上游路口与储车空间。",bodyEn:"Moving some left-turn crossings upstream allows concurrent movements at the centre, but needs extra upstream signals and storage space."}],
  notes:[
   {anchor:'left',title:"左转先排进专用车道",titleEn:"Queue in a dedicated left-turn lane",body:"左转储车与直行分开，减少堵住直行车的机会；代价是增加道路宽度，队列过长仍会溢出。",bodyEn:"Left-turn storage is separated from through traffic, reducing blockage. It needs extra width, and a long queue can still spill back."},
   {anchor:'waiting',title:"待转区不是随时能进",titleEn:"The waiting area is not always open",body:"本模型只在同方向直行或左转绿灯时允许进入待转区，左转相位才驶离；多存几辆车，却需要两处信号控制。",bodyEn:"This model admits vehicles to the waiting area during the same-direction through or left green; they leave on the left-turn phase. Extra storage needs two control points."},
   {anchor:'connector',title:"左转和对向直行分时走",titleEn:"Separate left turns and opposing through traffic in time",body:"专用左转相位避免同放时争用交叉位置；代价是一个周期要分给更多相位。",bodyEn:"A protected left-turn phase avoids competing for the crossing at the same time. More phases share the cycle, increasing waits elsewhere."},
   {anchor:'entry',title:"宽路口仍有清空时间",titleEn:"A wide junction still needs clearance time",body:"多车道容纳更多排队车辆，不能让所有方向同时通过；黄灯和全红仍要为路口清空留时间。",bodyEn:"More lanes store more vehicles, but all directions cannot move together. Yellow and all-red intervals still reserve time to clear the junction."},
  ],
 },
 'continuous-flow':{
  summary:"把南北左转的交叉前移，让中心左转与直行同放；代价是上游信号和更长的选道区。",summaryEn:"Move north–south left-turn crossings upstream so left and through can run together at the centre; the tradeoff is upstream signals and a longer lane-choice area.",
  neighbours:[{id:'crossroads-channelized',label:'十字 · 渠化与待转区',body:"中心少分一些左转时段，代价是把交叉与排队移到上游；本模型只改造南北左转。",bodyEn:"Fewer separate left-turn periods are needed at the centre, but crossings and queues move upstream. This model modifies only north–south left turns."},{id:'ddi',label:'分散式菱形立交',body:"两者都借换侧解除左转横穿；DDI 是高速匝道与跨线道路的连接，这里仍是平面十字路口。",bodyEn:"Both use a crossover to remove an opposing left-turn crossing. A DDI serves freeway ramps and a crossroad; this remains an at-grade crossroads."}],
  notes:[
   {anchor:'crossover',title:"左转先在上游换到外侧",titleEn:"Left turns cross to the outside upstream",body:"南北左转在上游信号控制下穿过对向车道，提前换到外侧；交叉被搬走，并没有凭空消失。",bodyEn:"North–south left turns cross opposing lanes at an upstream signal and move to the outside. The crossing has moved, not disappeared."},
   {anchor:'left',title:"中心可以与对向直行同放",titleEn:"Left and opposing through can run together at the centre",body:"已换侧的左转从外侧转出，不再横穿中心的对向直行；代价是需要足够长的连接和储车段。",bodyEn:"The displaced left turn leaves from the outside without crossing opposing through traffic at the centre. It needs enough connecting and vehicle-storage length."},
   {anchor:'stop',title:"两处信号要配合",titleEn:"Two signals must work together",body:"上游交叉与中心信号分配不同放行时段，避免抢占同一片路面；配合不好就会把队列堵在中间。",bodyEn:"The upstream crossover and central signals assign different movement times to avoid sharing the same pavement. Poor coordination can trap queues between them."},
   {anchor:'connector',title:"这里只改造了一半",titleEn:"Only half the approaches are displaced here",body:"本模型只把南北左转前移，东西左转仍需让对向直行；少改道路，也保留了部分许可左转冲突。",bodyEn:"Only north–south left turns are moved upstream in this model. East–west left turns still yield to opposing through traffic: less rebuilding, with some permissive-left conflicts retained."},
  ],
 },
 diamond:{
  summary:"用跨线桥保持高速直行，四条匝道接入地面路口；代价是两个匝道端点仍等信号。",summaryEn:"Keep freeway through traffic moving over a bridge and connect four ramps to ground-level junctions; the tradeoff is signals at both ramp terminals.",
  neighbours:[{id:'ddi',label:'分散式菱形立交',body:"DDI 让跨线道路换侧，减少左转横穿；传统菱形更直观，却需要额外左转放行时段。",bodyEn:"A DDI changes the crossroad driving side to remove left-turn crossings. A conventional diamond is familiar but needs extra left-turn signal time."},{id:'parclo',label:'部分苜蓿叶',body:"环道可替代部分端点左转，代价是更大用地和更慢转弯。",bodyEn:"Loops replace some terminal left turns at the cost of more land and slower curves."}],
  notes:[
   {anchor:'bridge',title:"高速直行从上面跨过",titleEn:"Freeway through traffic passes above",body:"上下分离让高速直行不经过地面信号；代价是桥梁、净空和接坡长度。",bodyEn:"Grade separation keeps freeway through traffic clear of ground-level signals. It requires a bridge, clearance and approach grades."},
   {anchor:'stop',title:"匝道尽头仍是一个路口",titleEn:"A ramp terminal is still a junction",body:"匝道把高速车流带到地面信号处，与横向道路轮流通过；下了高速不等于全程自由流。",bodyEn:"Ramps bring freeway traffic to signals where it takes turns with the crossroad. Leaving the freeway does not mean a free-flow trip throughout."},
   {anchor:'left',title:"左转要单独分配时间",titleEn:"Left turns need their own time",body:"端点左转会横穿对向车流，本模型用信号相位分开；代价是增加周期中的等待。",bodyEn:"Terminal left turns cross opposing traffic, separated by signal phases in this model. The tradeoff is additional waiting within the cycle."},
   {anchor:'merge',title:"上高速还要等合流空当",titleEn:"Joining the freeway still needs a gap",body:"加速车道让匝道车调整速度后汇入主线；省去平面交叉，却仍需要车距与横向空间。",bodyEn:"An acceleration lane lets ramp vehicles adjust speed before merging. It replaces a crossing but still needs spacing and lateral room."},
  ],
 },
 ddi:{
  summary:"两次换侧让上匝道左转避开对向直行；代价是交叉点仍受信号控制，指引更复杂。",summaryEn:"Two crossovers let entering left turns avoid opposing through traffic; the tradeoff is signal-controlled crossovers and more complex guidance.",
  neighbours:[{id:'diamond',label:'菱形立交',body:"减少左转横穿和相位需求，但中间路段改成左侧通行，需要清楚的标线指引。",bodyEn:"Fewer left-turn crossings and phase types, but the middle section switches to left-side driving and needs clear markings."},{id:'parclo',label:'部分苜蓿叶',body:"不用大环道也能解除部分左转横穿；仍需两处换侧信号，不能替代全自由流枢纽。",bodyEn:"Some left-turn crossings are removed without large loops. Two crossover signals remain, so this does not replace an all-free-flow system interchange."}],
  notes:[
   {anchor:'connector',title:"第一处交叉先把行车侧换过来",titleEn:"The first crossover changes the driving side",body:"跨线道路两股车在信号控制下交叉，中间改走左侧；左转更顺，代价是驾驶路径不如传统菱形熟悉。",bodyEn:"Crossroad streams cross under signal control and use the left side in the middle. Left turns become simpler, but the path is less familiar than a conventional diamond."},
   {anchor:'left',title:"左转直接接上匝道",titleEn:"Left turns connect directly to the ramp",body:"换侧后，上匝道左转不必横穿对向直行；省去这处交叉，仍要处理匝道与主线的合流。",bodyEn:"After the crossover, entering left turns avoid crossing opposing through traffic. The ramp still has to merge with the freeway."},
   {anchor:'stop',title:"交叉点依旧要等灯",titleEn:"Crossovers still require signal waits",body:"两处换侧点必须轮流放行。本模型用两个主相位，减少相位种类，却不会取消红灯等待。",bodyEn:"The two crossover points must alternate movements. This model uses two main phases: fewer phase types, with red-light waiting still present."},
   {anchor:'bridge',title:"高速与跨线道路仍分层",titleEn:"The freeway and crossroad remain grade separated",body:"主线直行绕开地面信号，跨线道路承担换侧；代价是桥梁和两端足够的排队空间。",bodyEn:"Freeway through traffic bypasses the ground-level signals while the crossroad handles the crossovers. Bridges and queue storage on both sides are required."},
  ],
 },
 parclo:{
  summary:"用两个环道替代部分左转横穿；代价是环道占地、低速，剩下的端点仍等灯。",summaryEn:"Replace some left-turn crossings with two loops; the tradeoff is loop land use, low speed and remaining signal terminals.",
  neighbours:[{id:'diamond',label:'菱形立交',body:"减少部分端点左转交叉与相位，代价是把道路铺到两个象限里。",bodyEn:"Fewer terminal left-turn crossings and phases, but roads occupy two additional quadrants."},{id:'cloverleaf',label:'全苜蓿叶立交',body:"少建两个环道且本布局没有相邻环间交织；仍保留信号端点，不能做到全方向自由流。",bodyEn:"Two fewer loops and no adjacent-loop weaving in this layout, but signal terminals remain, so all movements are not free flowing."}],
  notes:[
   {anchor:'loop',title:"部分左转先向右绕环",titleEn:"Some left turns first exit right into a loop",body:"本布局用两个环道替代跨线道路的左转横穿，减少端点相位；代价是多走一圈和增加用地。",bodyEn:"Two loops replace crossroad left-turn crossings in this layout, reducing terminal phase needs. The tradeoff is a longer trip and more land."},
   {anchor:'stop',title:"剩下的路口仍靠红绿灯",titleEn:"The remaining junctions still use signals",body:"没有被环道替代的匝道端点继续分时放行；省了部分桥与环道，也保留停车等待。",bodyEn:"Ramp terminals not replaced by loops continue to alternate movements. Fewer bridges and loops are needed, while stopping and waiting remain."},
   {anchor:'bridge',title:"主线直行继续跨过去",titleEn:"Mainline through traffic still crosses above",body:"高速直行与跨线道路上下分开，不受端点红灯影响；代价是桥梁与接坡。",bodyEn:"The freeway and crossroad are grade separated, keeping freeway through traffic clear of terminal red lights. Bridges and approach grades are required."},
   {anchor:'merge',title:"环道出口仍需汇入",titleEn:"A loop exit still has to merge",body:"绕环消除了对应左转的横穿，出口仍要接回主线；小半径带来的低速需要加速距离。",bodyEn:"The loop removes its left-turn crossing but must reconnect to the mainline. The low speed from its tight curve requires acceleration distance."},
  ],
 },
 trumpet:{
  summary:"一个环道加定向匝道接通三向，保持自由流；代价是一个左转绕远、另一条匝道需要跨越。",summaryEn:"One loop and directional ramps connect three arms with free flow; the tradeoff is a longer looping left turn and another ramp crossing above.",
  neighbours:[{id:'t-junction',label:'T 字路口',body:"三向连接从平面让行改成立体分离，代价是更多桥梁和用地。",bodyEn:"A three-arm connection moves from at-grade yielding to grade separation, requiring more bridges and land."},{id:'cloverleaf',label:'全苜蓿叶立交',body:"三岔只需一个环道，减少相邻环间交织；不能直接承担四岔的全部转向。",bodyEn:"A three-arm junction needs only one loop and less adjacent-loop weaving. It cannot directly serve every movement at a four-arm junction."}],
  notes:[
   {anchor:'loop',fraction:.15,title:"一个左转绕环，少做一次横穿",titleEn:"One left turn loops instead of crossing",body:"东进南出的左转沿环道下降，接到支线；避免横穿主线，代价是小半径、低车速和绕行。",bodyEn:"The east-to-south left turn descends around a loop into the branch road. It avoids crossing the mainline at the cost of a tight radius, low speed and a detour."},
   {anchor:'left',title:"另一股左转直接跨过去",titleEn:"The other left turn crosses directly above",body:"南进西出走半定向匝道跨越主线，路线比绕环舒展；代价是更高的桥和接坡距离。",bodyEn:"The south-to-west semi-directional ramp crosses the mainline with a more open path than a loop. It needs a higher bridge and approach length."},
   {anchor:'bridge',title:"三岔不需要四片叶子",titleEn:"Three arms do not need four leaves",body:"主线保持直行，支线由四股转向接入；少一个方向就能少做一些匝道，但不能直接扩成完整四岔。",bodyEn:"The mainline stays straight while four turning streams connect the branch. One fewer arm reduces the ramps needed, but this is not a complete four-arm layout."},
   {anchor:'merge',title:"没有红灯，仍然需要合流",titleEn:"No red light, but merges remain",body:"匝道在下游汇入主路，加速段帮助接近主线速度；自由流并不表示车辆能不看空当直接切入。",bodyEn:"Ramps merge into the mainline downstream; acceleration sections help match speed. Free flow does not mean a driver can enter without an available gap."},
  ],
 },
 turbine:{
  summary:"用向外旋开的左转匝道避开环间交织；代价是更长的匝道、更大用地和桥梁。",summaryEn:"Outward-spiralling left ramps avoid adjacent-loop weaving; the tradeoff is longer ramps, more land and bridges.",
  neighbours:[{id:'cloverleaf',label:'全苜蓿叶立交',body:"不再让相邻环道进出车辆交换位置，左转更舒展；代价是匝道向外铺开。",bodyEn:"Vehicles from adjacent loops no longer exchange positions, and left turns are more open. Ramps spread farther outward."},{id:'stack',label:'四层堆叠式',body:"本模型的涡轮降低最高层级，代价是向外延伸；堆叠把更多路径放到高处。",bodyEn:"This model lowers the highest level by spreading the turbine outward. A stack carries more paths on higher decks."}],
  notes:[
   {anchor:'left',title:"左转沿外侧旋开",titleEn:"Left turns spiral outward",body:"左转走独立的舒展曲线，不用绕小环；减少急弯，代价是匝道更长、向外占地。",bodyEn:"Left turns use independent open curves instead of tight loops. Fewer sharp bends require longer ramps and more land outside."},
   {anchor:'bridge',title:"交叉分散到不同高度",titleEn:"Crossings are spread across different heights",body:"匝道在不同位置上跨或下穿，把相交路线分开；降低中心堆叠程度，却增加桥梁展开范围。",bodyEn:"Ramps pass over or under at different locations to separate intersecting paths. Less central stacking spreads bridges across a wider area."},
   {anchor:'entry',title:"先分流，再去转弯",titleEn:"Diverge before making the turn",body:"出口在上游分开，让转向车辆离开主线后减速；代价是驾驶者需要更早识别目的方向。",bodyEn:"Upstream exits let turning vehicles leave the mainline before slowing. Drivers must identify their destination earlier."},
   {anchor:'merge',title:"独立匝道减少交织",titleEn:"Independent ramps reduce weaving",body:"本布局没有相邻环道共用的交织段，出口和入口各自接主线；合流空当和加速长度仍不可少。",bodyEn:"This layout has no shared section between adjacent loops. Separate entrances and exits still require merging gaps and acceleration length."},
  ],
 },
 stack:{
  summary:"把定向左转叠到高处，分离交叉与环间交织；代价是高桥、长接坡和更多桥面。",summaryEn:"Stack directional left turns above to separate crossings and adjacent-loop weaving; the tradeoff is high bridges, long grades and more deck area.",
  neighbours:[{id:'cloverleaf',label:'全苜蓿叶立交',body:"定向左转代替小环与交织，路线更舒展；代价是更多高架桥。",bodyEn:"Directional left turns replace tight loops and weaving with a more open path, requiring more elevated bridges."},{id:'turbine',label:'涡轮立交',body:"更多路径集中在上层，平面更紧凑；涡轮向外展开，最高层级更低。",bodyEn:"More paths are concentrated on upper decks for a tighter footprint. A turbine spreads outward with a lower highest level."}],
  notes:[
   {anchor:'bridge',title:"把相交路线一层层分开",titleEn:"Separate intersecting routes level by level",body:"直行分居底下两层，定向左转利用更高桥层；消除平面横穿，代价是高桥和维护负担。",bodyEn:"Through traffic uses the bottom two levels and left turns use higher decks. At-grade crossings are removed at the cost of high bridges and maintenance."},
   {anchor:'left',title:"左转不用绕 270°",titleEn:"Left turns do not need a 270° loop",body:"独立定向匝道顺着目标方向转出，避免小环与环间交织；代价是跨越其他道路的桥面。",bodyEn:"Independent directional ramps turn toward their destination without tight loops or adjacent-loop weaving. They need decks crossing other roads."},
   {anchor:'entry',title:"爬升要从很远处开始",titleEn:"The climb must start well in advance",body:"匝道不能突然升高，连接段逐渐爬到桥层；满足坡度与净空需要额外长度。",bodyEn:"Ramps cannot rise abruptly; their connections climb gradually. Grade and clearance requirements add approach length."},
   {anchor:'merge',title:"桥层分开了交叉，没消除合流",titleEn:"Decks separate crossings, not merges",body:"转向车最终仍要汇入目标主线，加速段留出调整速度的空间；车多时这里仍会形成瓶颈。",bodyEn:"Turning vehicles still join their destination mainline. Acceleration sections provide space to adjust speed, but merges can still become bottlenecks."},
  ],
 },
}
