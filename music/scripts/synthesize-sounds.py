#!/usr/bin/env python3
"""Reproducible sample-free sound design. Requires numpy==2.3.5 and FFmpeg.

Outputs are original synthesis, never field recordings or Lyria output. Recipe,
seed, source hash, full-file metrics and automated listening remain auditable.
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import math
import subprocess
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 44100
RECIPE = 'sow-dsp-1'
BATCH = 'sound-design-2026-09'
spec = importlib.util.spec_from_file_location('library', Path(__file__).with_name('generate-library.py'))
lib = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lib)

# Each entry is a distinct event design; alternate exports are not additional assets.
EVENTS = {
 'ui': ('Interface / 界面', 'ui', '''Tap|轻点;Toggle on|开启开关;Toggle off|关闭开关;Soft confirm|柔和确认;Back|返回;Focus|获得焦点;Panel open|面板展开;Panel close|面板收起;Tab switch|切换标签;Slider notch|滑杆刻度;Drag start|开始拖拽;Drop in place|放置到位;Selection|选择项目;Deselect|取消选择;Refresh|刷新;Save|保存;Delete|删除;Undo|撤销;Message sent|消息送出;Notification muted|关闭提醒'''),
 'transition': ('Transitions / 转场', 'video-transition', '''Air swipe|空气划过;Ribbon sweep|丝带掠过;Page turn|翻页转场;Quick zoom|快速推进;Camera pullback|镜头拉远;Spin|旋转转场;Reverse swell|反向渐强;Soft reveal|柔和揭晓;Hard cut|硬切重音;Digital scan|数字扫描;Glitter trail|闪光拖尾;Deep pass|低沉掠过;Wind rush|疾风掠过;Elastic stretch|弹性拉伸;Fold|折叠转场;Unfold|展开转场;Tunnel|穿过隧道;Downward sweep|下降扫频;Lift|向上抬升;Final reveal|结尾揭晓'''),
 'impact': ('Impacts / 撞击', 'impact', '''Wood knock|木块敲击;Hollow box|空箱碰撞;Metal tick|金属轻敲;Steel plate|钢板撞击;Glass clink|玻璃轻碰;Ceramic tap|陶瓷轻敲;Rubber bounce|橡胶弹跳;Low thump|低沉撞击;Stone hit|石块碰撞;Plastic snap|塑料卡扣;Heavy landing|重物落地;Tiny drop|小物掉落;Anvil strike|铁砧敲击;Dull punch|闷声冲击;Bright crack|清脆裂响;Sub hit|低频重击;Soft cushion|软垫落物;Spring boing|弹簧回弹;Bell rim|钟沿轻击;Logo accent|标志落点'''),
 'notification': ('Notifications / 提示', 'ui', '''Success|操作成功;Gentle error|温和报错;Warning pair|双音警告;New message|新消息;Task complete|任务完成;Timer ready|计时就绪;Countdown tick|倒计时单响;Calendar reminder|日程提醒;New idea|灵感提示;Connection found|连接成功;Connection lost|连接断开;Upload done|上传完成;Download ready|下载就绪;Quiet reminder|轻声提醒;Attention|注意提示;Progress step|进度推进;Permission granted|权限通过;Permission denied|权限拒绝;Welcome|欢迎提示;Goodbye|结束提示'''),
 'game': ('Game actions / 游戏动作', 'gameplay', '''Coin pickup|拾取金币;Gem pickup|拾取宝石;Health restore|恢复生命;Mana restore|恢复能量;Level up|等级提升;Checkpoint|到达检查点;Quest accepted|接受任务;Quest complete|完成任务;Item equip|装备物品;Item unequip|卸下物品;Inventory open|打开背包;Treasure open|开启宝箱;Door unlock|解锁门锁;Life lost|失去生命;Respawn|重新出现;Jump|跳跃;Double jump|二段跳;Dash|冲刺;Shield block|护盾格挡;Puzzle solved|解开谜题'''),
 'footstep': ('Footsteps / 脚步', 'gameplay', '''Wood walk|木地板步行;Wood run|木地板跑动;Gravel step|碎石脚步;Sand step|沙地脚步;Snow crunch|积雪踩踏;Grass step|草地脚步;Mud step|泥地脚步;Puddle step|浅水脚步;Metal walkway|金属栈道;Hollow stairs|空心楼梯;Concrete step|水泥地脚步;Stone floor|石板脚步;Carpet step|地毯脚步;Boot landing|靴子落地;Barefoot step|赤足脚步;Sneak|轻声潜行;Heel click|鞋跟轻响;Robot step|机械脚步;Creature step|生物脚步;Heavy stomp|沉重跺脚'''),
 'mechanical': ('Mechanisms / 机械', 'mechanism', '''Switch click|机械开关;Latch|搭扣扣合;Key press|键盘按键;Button spring|按键弹簧;Ratchet|棘轮转动;Gear shift|齿轮换挡;Servo move|舵机移动;Motor start|电机启动;Motor stop|电机停止;Hydraulic release|液压泄放;Valve turn|阀门转动;Camera shutter|机械快门;Printer feed|进纸机构;Clock tick|时钟滴答;Lock bolt|锁舌滑动;Tool spin|工具旋转;Scanner pass|扫描机构;Elevator stop|升降停止;Magnet snap|磁铁吸合;Machine ready|机器就绪'''),
 'magic': ('Magic / 魔法', 'fantasy', '''Spark cast|施放火花;Ice shard|冰晶飞出;Fire burst|火焰喷出;Wind spell|风系法术;Earth pulse|大地脉冲;Healing glow|治愈光芒;Teleport|瞬间传送;Portal open|传送门开启;Portal close|传送门关闭;Magic shield|魔法护罩;Enchant|附魔;Dispel|解除法术;Crystal resonate|水晶共鸣;Fairy dust|微光粉尘;Spell charge|法术蓄力;Spell release|法术释放;Wand flick|挥动魔杖;Runes activate|符文激活;Mystery shimmer|神秘闪烁;Treasure sparkle|宝藏闪光'''),
 'scifi': ('Science fiction / 科幻', 'science-fiction', '''Laser zap|激光短射;Plasma shot|等离子发射;Energy charge|能量充能;Energy discharge|能量释放;Shield on|护盾开启;Shield hit|护盾受击;Warp start|跃迁启动;Warp arrival|跃迁抵达;Scanner ping|扫描回波;Radar sweep|雷达扫过;Data transfer|数据传输;Computer blip|计算机短音;Airlock release|气闸释放;Reactor pulse|反应堆脉冲;Drone pass|无人机掠过;Robot wake|机器人唤醒;Power down|系统断电;Hologram open|全息展开;Gravity pulse|重力脉冲;Space beacon|太空信标'''),
 'retro': ('Retro arcade / 复古街机', 'arcade', '''Arcade start|街机开始;Arcade select|街机选择;Pixel jump|像素跳跃;Pixel fall|像素下落;Pixel coin|像素金币;Pixel hit|像素受击;Pixel shoot|像素射击;Pixel explosion|像素爆破;Pixel powerup|像素强化;Pixel lose|像素失败;Pixel win|像素胜利;Extra life|增加生命;High score|刷新纪录;Stage clear|关卡完成;Countdown beep|倒数蜂鸣;Retro cursor|复古光标;Retro confirm|复古确认;Retro cancel|复古取消;Retro alarm|复古警报;Retro boot|复古开机'''),
 'water': ('Water / 水声', 'water', '''Single drop|单滴水声;Twin drops|双滴水声;Small bubble|小气泡;Bubble rise|气泡上浮;Bubble pop|气泡破裂;Water plop|落入水中;Small splash|小水花;Wide splash|大片水花;Drip echo|水滴回声;Liquid pour|液体倾倒;Bottle glug|瓶口咕噜;Stream trickle|细流经过;Underwater ping|水下轻响;Ice crack|冰块裂开;Ice clink|冰块轻碰;Raindrop tap|雨点轻敲;Wet click|湿润轻响;Water swoosh|水流掠过;Foam burst|泡沫破裂;Deep bubble|深水气泡'''),
 'foley': ('Designed foley / 合成拟音', 'foley', '''Paper flutter|纸张扑动;Card slide|卡片滑动;Cloth swish|布料擦过;Zip close|拉链合拢;Bag rustle|袋子沙响;Brush stroke|刷子划过;Pencil stroke|铅笔划线;Pen click|按动圆珠笔;Scissor snip|剪刀剪切;Tape peel|胶带揭起;Velcro pull|魔术贴撕开;Chain jingle|链条轻响;Key jingle|钥匙轻响;Marble roll|弹珠滚动;Dice toss|骰子投掷;Book close|合上书本;Cup set|放下杯子;Squeak|短促摩擦;Clap accent|拍手重音;Soft breath of air|轻柔气流'''),
}
ENVIRONMENTS = {
 'wind': [('Meadow breeze','草地微风'),('Mountain air','山间气流'),('Desert wind','沙漠风声'),('Canyon gusts','峡谷阵风'),('Winter wind','冬日寒风')],
 'rain': [('Fine drizzle','细雨'),('Roof rain','屋顶雨声'),('Window rain','窗边雨声'),('Heavy shower','骤雨'),('Distant storm','远处风暴')],
 'water': [('Slow surf','缓慢海浪'),('Pebble shore','卵石海岸'),('Small stream','细小溪流'),('Waterfall mist','瀑布水雾'),('Underwater current','水下暗流')],
 'forest': [('Forest dawn','林间晨声'),('Summer insects','夏日虫声'),('Night clearing','夜间空地'),('Bamboo breeze','竹林风声'),('Woodland dusk','林间暮色')],
 'room': [('Quiet ventilation','安静通风'),('Large hall air','大厅气流'),('Soft fan','柔和风扇'),('Window draft','窗边穿堂风'),('Warm cabin','温暖小屋')],
 'machine': [('Engine room','机舱底噪'),('Server room','服务器机房'),('Factory hum','工厂低鸣'),('Electric train','电车行进'),('Airship cabin','飞艇座舱')],
 'space': [('Orbital station','轨道空间站'),('Reactor chamber','反应堆舱'),('Alien cavern','异星洞穴'),('Deep-space vessel','深空飞船'),('Energy field','能量场')],
 'texture': [('Soft pink noise','柔和粉噪'),('Deep brown noise','深沉棕噪'),('Airy texture','轻盈空气'),('Glassy atmosphere','玻璃质感氛围'),('Low-frequency bed','低频背景')],
}

def seed_for(ident): return int(hashlib.sha256(ident.encode()).hexdigest()[:8],16)

def noise(n, rng, low=40, high=12000, slope=0):
    f=np.fft.rfftfreq(n,1/SR)
    spectrum=np.fft.rfft(rng.standard_normal(n))
    shape=(1/(1+(np.maximum(f,1)/high)**6))*(1/(1+(low/np.maximum(f,1))**6))
    shape*=np.maximum(f,40)**(-slope/2)
    spectrum*=shape
    x=np.fft.irfft(spectrum,n)
    return x/max(float(np.std(x)),1e-8)

def tone(seconds, start, end=None, decay=5, bright=0, phase=0):
    t=np.arange(max(1,round(seconds*SR)))/SR
    end=start if end is None else end
    cycles=start*t+(end-start)*t*t/(2*max(seconds,1/SR))
    angle=2*np.pi*cycles+phase
    x=np.sin(angle)+bright*np.sin(2*angle)*.3+bright*np.sin(3*angle)*.15
    env=(1-np.exp(-t*900))*np.exp(-t*decay/max(seconds,.01))
    env*=np.minimum(1,(seconds-t)/.015)
    return x*env

def add(x, event, at, gain=1, circular=False):
    start=round(at*SR)
    if circular:
        np.add.at(x,np.arange(start,start+len(event))%len(x),event*gain)
    elif start<len(x):
        size=min(len(event),len(x)-start)
        x[start:start+size]+=event[:size]*gain

def render_event(family,i,seed):
    rng=np.random.default_rng(seed)
    durations={'ui':.12+(i%5)*.07,'transition':.45+(i%7)*.25,'impact':.25+(i%6)*.17,'notification':.65+(i%5)*.19,'game':.4+(i%7)*.16,'footstep':.28+(i%4)*.08,'mechanical':.18+(i%6)*.2,'magic':1+(i%7)*.28,'scifi':.3+(i%7)*.24,'retro':.25+(i%6)*.16,'water':.3+(i%7)*.19,'foley':.22+(i%6)*.15}
    d=durations[family]; n=round(d*SR); t=np.arange(n)/SR; x=np.zeros(n)
    base=[220,330,440,550,660,880,110,165][i%8]
    if family in ('ui','notification','game','retro'):
        notes=1 if family=='ui' else 2+i%4
        intervals=[0,7,12,4,9] if i%3!=1 else [7,3,0,-5,-12]
        for j in range(notes):
            f=base*2**(intervals[j]/12)
            event=tone(d*.6,f, f*(1.1 if i%4==0 else .97),decay=5,bright=.8 if family=='retro' else .12)
            if family=='retro': event=np.round(event*12)/12
            add(x,event,j*d*.65/notes,.7**j)
        x+=noise(n,rng,600,8000)*np.exp(-t*120)*.035
    elif family=='transition':
        env=np.maximum(0,np.sin(np.pi*np.arange(n)/(n-1)))**(1.4+i%3)
        x=noise(n,rng,90+70*i,1800+230*i,.5)*env*.24
        x+=tone(d,80+30*i,1800 if i%2==0 else 45,decay=0)*env*.22
        x*=.65+.35*np.cos(2*np.pi*(2+i%5)*t/d)
    elif family in ('impact','footstep'):
        materials=[(130,[1,1.6,2.7]),(90,[1,2.2,3.4]),(1300,[1,2.71,4.07]),(220,[1,2.33,3.91]),(1800,[1,1.4,2.4]),(700,[1,2.1,3.7])]
        f,partials=materials[i%6]
        for j,r in enumerate(partials): add(x,tone(d,f*r,f*r*.94,decay=5+i%3),0,.55/(j+1))
        burst=noise(n,rng,100,1700+(i%6)*1400)*np.exp(-t*(25 if family=='impact' else 18))
        x+=burst*(.12 if family=='impact' else .32)
        if family=='footstep':
            add(x,tone(d*.4,80+i*5,50,decay=7),.06,.55)
            x+=noise(n,rng,900,9000)*np.exp(-((t-.09)/.035)**2)*(.08+i%4*.05)
        if i in [6,17]: add(x,tone(d*.55,240,90,decay=4),d*.35,.5)
    elif family=='mechanical':
        x=noise(n,rng,200,6000)*np.exp(-t*65)*.28
        cycles=1+i%5
        for j in range(cycles): add(x,tone(d*.5,70+23*i,80+20*i,decay=6,bright=.6),j*d*.55/cycles,.35)
        if i in [6,7,8,13,15,16,17]:
            x+=np.sin(2*np.pi*((60+7*i)*t+90*t*t/d))*np.sin(np.pi*t/d)**2*.15
    elif family=='magic':
        for j in range(4+i%6):
            f=base*2**([0,7,12,19,24,28,31,36,40][j]/12)
            add(x,tone(d*.7,f,f*(1.03 if i%2 else .99),decay=5),j*d*.5/(4+i%6),.4/(1+j*.3))
        x+=noise(n,rng,1400,9000,1)*np.sin(np.pi*t/d)**2*.055
    elif family=='scifi':
        x=tone(d,120+80*i,45 if i%3 else 1600,decay=3,bright=.5)
        x*=.7+.3*np.sin(2*np.pi*(12+i*2)*t)
        x+=noise(n,rng,400,6000)*np.sin(np.pi*t/d)**2*.09
        if i%4==0: add(x,tone(d*.4,2200,1500,decay=6),d*.4,.25)
    elif family=='water':
        for j in range(1+i%5):
            add(x,tone(min(.3,d*.7),480+70*i+120*j,900+70*i,decay=6),j*d*.65/(1+i%5),.55/(j+1))
        if i>=6:
            x+=noise(n,rng,200,4500,1)*np.sin(np.pi*t/d)**3*.18
    else:
        x=noise(n,rng,250+(i%5)*200,3500+(i%4)*1200,1)*np.sin(np.pi*t/d)**2*.28
        x*=np.maximum(0,np.sin(2*np.pi*(4+i%9)*t/d))**(1+i%3)
        if i in [7,11,12,13,14,16]:
            for j in range(3): add(x,tone(d*.6,650+390*j+i*20,decay=8),j*d*.15,.16)
    # Millisecond ramps remove discontinuities without erasing the transient.
    edge=min(round(.003*SR),n//4)
    x[:edge]*=np.linspace(0,1,edge); x[-edge:]*=np.linspace(1,0,edge)
    return x

def render_environment(family,i,seed,duration):
    rng=np.random.default_rng(seed); n=round(SR*duration); t=np.arange(n)/SR
    low,high,slope={'wind':(25,1600,1.5),'rain':(180,11000,.3),'water':(80,6500,1),'forest':(120,8000,1.2),'room':(35,900,1.5),'machine':(30,3000,1),'space':(20,1500,1.7),'texture':(25,4000,1+i*.3)}[family]
    x=noise(n,rng,low,high*(.7+i*.14),slope)*.13
    # All modulators have integer periods; filtering is circular via the FFT.
    swell=.7+.2*np.sin(2*np.pi*(1+i%3)*t/duration)+.1*np.sin(2*np.pi*7*t/duration)
    x*=swell
    if family in ('machine','space','room'):
        for j in range(1,5):
            freq=round((35+9*i)*j*duration)/duration
            x+=np.sin(2*np.pi*freq*t+rng.uniform(0,6.28))*(.05/j)*swell
    if family=='water': x*=.75+.25*np.sin(2*np.pi*(3+i)*t/duration)
    if family=='rain':
        for _ in range(150+60*i):
            at=rng.uniform(0,duration)
            add(x,tone(.025,rng.uniform(900,3500),decay=7),at,rng.uniform(.015,.07),True)
    if family=='forest':
        for j in range(8+3*i):
            at=rng.uniform(0,duration)
            add(x,tone(.15+rng.random()*.2,1600+rng.random()*1400,3000+rng.random()*900,decay=4),at,.06,True)
    if family=='space':
        for j in range(5): add(x,tone(3,170+130*j+i*17,175+130*j+i*17,decay=4),j*duration/5,.04,True)
    return x

def manifest():
    records=[]
    for family,(label,scene,names) in EVENTS.items():
        for i,name in enumerate(names.split(';')):
            en,zh=name.split('|'); ident=f'sfx-{family}-{i+1:02d}'
            records.append({'id':ident,'code':f'SFX-{family.upper()}-{i+1:02d}','title':{'en':en,'zh':zh},'kind':'sfx','family':family,'designIndex':i,'seed':seed_for(ident),'scenarios':[scene], 'description':{'en':f'Original synthesized {en.lower()} for editing and interactive projects. Designed sound, not a field recording.','zh':f'用于剪辑与交互的{zh}合成音效，非实地录音。'}})
    for family,names in ENVIRONMENTS.items():
        for i,(en,zh) in enumerate(names):
            ident=f'ambience-{family}-{i+1:02d}'
            records.append({'id':ident,'code':f'AMB-{family.upper()}-{i+1:02d}','title':{'en':f'{en} · designed ambience','zh':f'{zh} · 合成环境声'},'kind':'ambience','family':family,'designIndex':i,'seed':seed_for(ident),'targetDuration':30+i%3*15,'scenarios':['environment','game-exploration'],'description':{'en':f'Synthesized {en.lower()} atmosphere. A designed looping texture, not an authentic location or wildlife recording.','zh':f'{zh}的合成循环氛围，用于营造场景，不是真实地点或动物的录音。'}})
    return records

def write_wav(path,x):
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x,-.999,.999)*32767).round().astype('<i2').tobytes())

def qa_metrics(x,loop=False):
    rms=float(np.sqrt(np.mean(x*x))); peak=float(np.max(np.abs(x)))
    differences=np.diff(x)
    boundary=float(abs(x[-1]-x[0]))
    normal=float(np.quantile(np.abs(differences),.999))
    return {'method':'full-pcm-analysis','sampleRate':SR,'channels':1,'samples':len(x),'duration':round(len(x)/SR,6),'peakDbfs':round(20*math.log10(max(peak,1e-12)),2),'rmsDbfs':round(20*math.log10(max(rms,1e-12)),2),'dcOffset':float(np.mean(x)),'finite':bool(np.isfinite(x).all()),'clippedSamples':int(np.sum(np.abs(x)>=.999)),'boundaryStep':boundary,'internalStepP999':normal,'seamPassed':bool(loop and boundary<=max(normal*1.5,.015))}

def process(record,review=False,candidate='c1'):
    record=dict(record)
    version='v'+candidate[1:]
    if candidate != 'c1': record['seed']+=int(candidate[1:])*10000
    ident=record['id']; d=ROOT/'music/.cache/sound-design'/ident
    if candidate != 'c1': d=d/candidate
    out=ROOT/'music/.cache/processed'/ident/version
    d.mkdir(parents=True,exist_ok=True); out.mkdir(parents=True,exist_ok=True)
    fingerprint=hashlib.sha256((json.dumps(record,sort_keys=True)+RECIPE).encode()).hexdigest()
    intent=d/'intent.json'
    if intent.exists() and json.loads(intent.read_text())['sha256']!=fingerprint: raise ValueError('Changed recipe requires a new version')
    lib.write(intent,{'sha256':fingerprint,'recipe':RECIPE})
    ambience=record['kind']=='ambience'
    if not (out/'master.wav').exists() or not (d/'metrics.json').exists():
        x=render_environment(record['family'],record['designIndex'],record['seed'],record['targetDuration']) if ambience else render_event(record['family'],record['designIndex'],record['seed'])
        x-=np.mean(x)
        if not np.isfinite(x).all(): raise ValueError('Nonfinite synthesis rejected before encoding')
        x*=min(.78/max(float(np.max(np.abs(x))),1e-8),.14/max(float(np.sqrt(np.mean(x*x))),1e-8))
        write_wav(out/'master.wav',x)
        # Analyse the actual quantized delivery samples, not a precursor.
        with wave.open(str(out/'master.wav'),'rb') as w: actual=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
        metrics=qa_metrics(actual,ambience)
        if not metrics['finite'] or metrics['clippedSamples'] or metrics['rmsDbfs'] < -50: raise ValueError('PCM quality rejected')
        if ambience and not metrics['seamPassed']: raise ValueError('Loop boundary rejected')
        lib.write(d/'metrics.json',metrics)
        bins=np.array_split(np.abs(actual),min(160,len(actual)))
        peaks=[round(float(np.max(b))/max(float(np.max(np.abs(actual))),1e-8),4) for b in bins]
        lib.write(out/'waveform.json',{'duration':metrics['duration'],'peaks':peaks})
    for filename,args in [('preview.mp3',['-codec:a','libmp3lame','-b:a','112k']),('game.ogg',['-codec:a','vorbis','-strict','experimental','-ac','2','-q:a','5'])]:
        if not (out/filename).exists() or (out/filename).stat().st_size == 0:
            subprocess.run(['ffmpeg','-y','-v','error','-i',str(out/'master.wav'),*args,str(out/filename)],check=True)
        subprocess.run(['ffmpeg','-xerror','-v','error','-i',str(out/filename),'-f','null','-'],check=True)
    if ambience and not (d/'loop-review.mp3').exists():
        # Three real repetitions reveal audible seam/pattern defects.
        subprocess.run(['ffmpeg','-y','-v','error','-stream_loop','2','-i',str(out/'master.wav'),'-codec:a','libmp3lame','-b:a','96k',str(d/'loop-review.mp3')],check=True)
    metrics=json.loads((d/'metrics.json').read_text())
    audio_review=None
    if review:
        audio_review=review_sound(d/'loop-review.mp3' if ambience else out/'preview.mp3',d,record)
        if not audio_review.get('suitableForLibrary') or audio_review.get('voicesDetected') or audio_review.get('audibleDefect'):
            lib.write(d/'state.json',{'state':'rejected','review':audio_review})
            return ident,'rejected: '+audio_review.get('reason','')
    hashes={name:{'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest(),'bytes':(out/name).stat().st_size} for name in ['master.wav','preview.mp3','game.ogg','waveform.json']}
    result={**record,'status':'generated','batch':BATCH,'role':'library','category':'global','archetype':'library','moods':['atmospheric'] if ambience else [],'topics':[record['family'],record['kind']],'styles':['ambience-'+record['family'] if ambience else 'sfx-'+record['family']],'energy':2 if ambience else 3,'energyBasis':'design-intent','bpm':0,'key':'','instruments':[],'instrumental':True,'model':'procedural-dsp','prompt':'','duration':metrics['duration'],'collections':['environment-audio' if ambience else 'sound-effects'],'rightsProfile':'original-synthesis-cc0','assets':{key:f'https://music-cdn.shapeof.world/tracks/{ident}/v1/{filename}' for key,filename in [('preview','preview.mp3'),('master','master.wav'),('game','game.ogg'),('waveform','waveform.json')]},'generation':{'generator':'Shape of the World procedural sound design','model':'procedural-dsp','recipe':RECIPE,'seed':record['seed'],'sha256':hashes['master.wav']['sha256'],'externalSamples':False},'assetIntegrity':{key:hashes[filename] for key,filename in [('preview','preview.mp3'),('master','master.wav'),('game','game.ogg'),('waveform','waveform.json')]},'technicalReview':metrics,'audioReview':audio_review,'loop':{'seamless':bool(ambience and audio_review and audio_review.get('seamlessLoop')),'basis':'full-pcm seam analysis and automated listening to three repetitions' if ambience and audio_review else 'not seam-reviewed','asset':'master' if ambience else None,'sampleRate':SR,'startSample':0,'endSample':metrics['samples']},'usage':{'placement':'background' if ambience else 'event','narrationFriendly':ambience},'metadataBasis':'Event labels and energy are design intent; duration and PCM metrics are measured; audioReview is model inference. All audio is synthesis, not field recording.'}
    if ambience and not result['loop']['seamless']:
        result['description']={lang:text.replace('looping ', '').replace('循环', '') for lang,text in result['description'].items()}
    if candidate != 'c1': result['assets']={k:url.replace('/v1/','/'+version+'/') for k,url in result['assets'].items()}
    lib.write(d/'track.json',result)
    lib.write(d/'state.json',{'state':'reviewed' if audio_review else 'rendered'})
    return ident,'reviewed' if audio_review else 'rendered'

def review_sound(audio,directory,record):
    sha=hashlib.sha256(audio.read_bytes()).hexdigest()
    dest=directory/f'review-{sha[:16]}.json'
    if dest.exists(): return json.loads(dest.read_text())
    import base64
    model='gemini-2.5-flash'
    ambience=record['kind']=='ambience'
    prompt=('Listen to the entire audio. This is an intentionally synthesized '+('environmental sound texture repeated exactly three times for loop testing' if ambience else 'isolated sound effect')+'. It is not music or a realistic field recording; musical melody or a long structure is NOT required. Assess technical usability for video/game sound design. Return JSON: suitableForLibrary:boolean, voicesDetected:boolean, audibleDefect:boolean, description:{en:string,zh:string}, reason:string'+(', seamlessLoop:boolean' if ambience else '')+'. Reject unintended speech/singing, severe clipping, clicks from broken edits, long unintended silence or glitches; a deliberate impact, electronic beep or stylistic noise is not a defect. '+('Judge audible seams across repetitions: reject clicks, gaps or abrupt textural changes. ' if ambience else '')+'Describe only audible qualities, not imagined real events. Be concise.')
    response=lib.review_request(f'https://aiplatform.googleapis.com/v1/projects/{lib.PROJECT}/locations/global/publishers/google/models/{model}:generateContent',{'contents':[{'role':'user','parts':[{'text':prompt},{'inlineData':{'mimeType':'audio/mpeg','data':base64.b64encode(audio.read_bytes()).decode()}}]}],'generationConfig':{'responseMimeType':'application/json','temperature':.1}},180)
    text=''.join(p.get('text','') for c in response.get('candidates',[]) for p in c.get('content',{}).get('parts',[]) if not p.get('thought'))
    data=json.loads(text)
    for k in ['suitableForLibrary','voicesDetected','audibleDefect']+(['seamlessLoop'] if ambience else []):
        if type(data.get(k)) is not bool: raise ValueError('Invalid review '+k)
    data.update(model=model,reviewedAt=lib.now(),method='automated-audio-review',scope='three-complete-repetitions' if ambience else 'full-audio',sha256=sha)
    lib.write(dest,data)
    return data

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--review',action='store_true'); p.add_argument('--pilot',action='store_true'); p.add_argument('--jobs',type=int,default=3,choices=range(1,7)); p.add_argument('--ids',nargs='+'); p.add_argument('--candidate',default='c1')
    a=p.parse_args(); records=manifest()
    import re
    if not re.fullmatch(r'c[1-9][0-9]*',a.candidate): p.error('Invalid candidate')
    lib.write(ROOT/'music/batches'/f'{BATCH}.json',{'schemaVersion':1,'batch':BATCH,'recipe':RECIPE,'assets':records})
    if a.pilot: records=[r for r in records if (r['kind']=='sfx' and r['designIndex'] in [0,7]) or (r['kind']=='ambience' and r['designIndex']==0 and r['family'] not in ['space','texture'])]
    if a.ids: records=[r for r in records if r['id'] in a.ids]
    if a.review: lib.token()
    failed=0
    def safe(r):
        try: return process(r,a.review,a.candidate)
        except Exception as e:
            d=ROOT/'music/.cache/sound-design'/r['id']
            if a.candidate!='c1': d=d/a.candidate
            lib.write(d/'state.json',{'state':'failed','error':str(e)})
            return r['id'],'failed: '+str(e)[:150]
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.jobs) as pool:
        for ident,state in pool.map(safe,records):
            lib.log(f'{ident}: {state}'); failed+=state.startswith(('failed','rejected'))
    lib.log(f'{len(records)-failed}/{len(records)} ready'); return 1 if failed else 0

if __name__=='__main__': raise SystemExit(main())
