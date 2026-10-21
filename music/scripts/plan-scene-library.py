#!/usr/bin/env python3
"""Plan independent Lyria scores for editing, narration and game scenes."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILES = [
    ('funk', 'Pocket Camera', '口袋相机', 112, 'muted guitar, elastic bass, dry drums', 'syncopated stop-motion product reveal'),
    ('breakbeat', 'Rapid Assembly', '快速组装', 138, 'breakbeat drums, marimba, rounded synth bass', 'precise fast-cut making-of montage'),
    ('house', 'Soft Geometry', '柔软几何', 124, 'Rhodes stabs, soft four-on-floor kick, plucked bass', 'bright colorful interface demonstration'),
    ('chamber', 'Tiny Inventions', '小小发明', 116, 'pizzicato cello, bass clarinet, woodblock', 'witty tactile miniature mechanisms'),
    ('chiptune', 'Pocket Planet', '口袋星球', 142, 'pulse-wave lead, triangle bass, crisp electronic drums', 'playful original pixel-art motion'),
    ('bossa', 'Window Garden', '窗边花园', 106, 'nylon guitar, brushed percussion, upright bass', 'sunny home and lifestyle demonstration'),
    ('jazz-trio', 'Morning Notes', '清晨笔记', 124, 'acoustic piano, brushed drums, double bass', 'nimble elegant process film'),
    ('soul', 'Warm Circuit', '温暖电路', 100, 'electric piano, muted brass, electric bass, snare', 'warm human-centered product story'),
    ('dub', 'Floating Objects', '漂浮物件', 94, 'organ stabs, deep bass, rimshot, short tape echo', 'spacious playful object transformations'),
    ('acoustic-folk', 'Handmade Map', '手作地图', 114, 'fingerstyle guitar, mandolin, hand percussion', 'optimistic craft and travel sequence'),
    ('guzheng', 'Porcelain Steps', '瓷器轻步', 118, 'guzheng, plucked bass, dry electronic percussion', 'modern material and design close-ups'),
    ('koto', 'Paper Architecture', '纸上建筑', 108, 'koto, soft synth bass, bamboo percussion', 'careful precise construction reveal'),
    ('oud', 'Copper Compass', '铜色罗盘', 120, 'oud, darbuka, bass guitar', 'lively geographical discovery'),
    ('kora', 'Woven Sunlight', '编织日光', 112, 'kora, calabash, shakers, soft bass', 'interlocking patterns and natural motion'),
    ('synthwave', 'Night Transit', '夜间穿行', 126, 'analog arpeggios, rounded bass, tight gated snare', 'original retro-futuristic transport montage'),
    ('post-rock', 'Open Windows', '打开窗户', 120, 'clean guitar harmonics, bass, restrained acoustic drums', 'uplifting architecture and open landscapes'),
    ('minimalism', 'Measured Motion', '有序运动', 120, 'marimba, muted piano, woodblocks', 'satisfying mechanical transformations'),
    ('lofi', 'Small Desk', '小小书桌', 86, 'soft electric piano, restrained drums, warm bass', 'quiet study and tutorial backdrop without vinyl noise'),
    ('ambient', 'Glass Observatory', '玻璃观测站', 80, 'soft analog pads, felt piano, sparse bell, light pulse', 'calm scientific observation with a gentle clear pulse'),
    ('orchestral', 'First Flight', '初次飞行', 128, 'staccato strings, French horn, timpani, harp', 'small-scale adventurous discovery without epic bombast'),
]
GAMES = [
    ('lofi','Garden Workshop','花园工坊',84,'Rhodes, muted bass, brushed drums','cozy crafting and management'),
    ('chiptune','Clock Tower','钟楼机关',132,'pulse arpeggios, triangle bass, noise percussion','light platforming and mechanical puzzles'),
    ('ambient','Underwater Archive','水下档案馆',72,'soft pads, glass marimba, muted sub bass','unhurried underwater exploration'),
    ('chamber','Library Puzzle','书库谜题',98,'pizzicato quartet, clarinet, woodblocks','thoughtful puzzle solving'),
    ('synthwave','Orbital Dock','轨道船坞',112,'analog sequencer, filtered bass, restrained drums','science-fiction navigation'),
    ('acoustic-folk','Village Market','村庄集市',106,'acoustic guitar, flute, hand percussion','friendly village and shop'),
    ('minimalism','Hidden Corridor','隐秘长廊',92,'low marimba, bass clarinet, quiet ticking percussion','mild stealth and suspense'),
    ('orchestral','Copper Guardian','铜色守卫',140,'low strings, brass, tight cinematic drums','energetic tactical combat'),
    ('koto','Moonlit Courtyard','月下庭院',82,'koto, bamboo flute, soft bass','quiet courtyard exploration'),
    ('house','Neon Workshop','霓虹工坊',122,'muted synth plucks, steady electronic drums, rubber bass','rhythmic building and automation'),
]
NO_VOICES = 'Instrumental only. No vocals, no choir, no humming, no singing, no speech, no lyrics, no vocal samples. No imitation of any artist, song, film, game or brand. '

def plan(batch='scene-audio-2026-09', prefix='scene'):
    records=[]
    for i,(style,en,zh,bpm,instruments,use) in enumerate(PROFILES):
        for j,seconds in enumerate([15,25,40,90]):
            short=seconds<60
            source=30 if seconds<30 else 60 if short else 90
            motif=['a clipped falling fifth answered by two repeated notes','an offbeat three-note arch and held answer','a rising fourth followed by a descending step','a restrained two-note motif separated by spacious pauses'][j]
            brief=(f'Compose an original complete {source}-second instrumental cue for {use}. Instruments: {instruments}. {bpm} BPM in 4/4. Motif: {motif}. ')
            brief+=('Start the hook and beat immediately; maintain a clear pulse and concise two-bar phrases. One fresh timbral answer halfway through. Keep the groove throughout, then a decisive tonic ending during the last second with a very short natural decay. No slow intro, long outro, riser, silence or fade-out. Mobile-speaker-friendly bass. ' if short else 'A restrained background score for spoken explanation: sparse midrange, no busy lead, no sharp accents or sudden loudness changes. Establish the texture in four seconds, add a subtle counter-pattern at 30 seconds, simplify at 60 seconds, resolve naturally in the last four seconds. ')
            ident=f'{prefix}-{style}-{seconds}'
            r=dict(id=ident, code=f'SCENE-{i+1:02d}-{seconds}',title={'en':f'{en} · {seconds}', 'zh':f'{zh} · {seconds}'},category='global',archetype='library',role='library',kind='music',moods=['rhythmic','playful'] if short else ['calm','warm'],topics=[use,'product-video' if short else 'narration'],energy=3 if short else 2,bpm=bpm,key='',instruments=instruments.split(', '),instrumental=True,model='lyria-3-clip-preview' if seconds<30 else 'lyria-3-pro-preview',targetDuration=seconds,prompt=brief+NO_VOICES,recommendedWorldIds=[],styles=[style],scenarios=['motion','explain'] if short else ['explain','focus'],description={'en':use,'zh':f'{zh}，适合'+('短片剪辑。' if short else '旁白讲解。')},batch=batch,status='prompt-ready',collections=['short-promos'] if short else ['narration'],rightsProfile='lyria-commercial-2026-09',usage={'narrationFriendly':not short,'placement':'background','tags':[use]})
            if short:
                r['shortForm']={'use':'product-demo' if i%3==0 else 'process' if i%3==1 else 'lifestyle','targetSeconds':seconds,'structureBasis':'source-prompt-intent','delivery':'ending-excerpt'}
            records.append(r)
    for i,(style,en,zh,bpm,instruments,use) in enumerate(GAMES):
        for j,(mode,cn) in enumerate([('menu','菜单'),('exploration','探索'),('challenge','挑战'),('rest','休息')]):
            energy=[2,2,4,1][j]
            variation=['gentle suspended chords and sparse upper notes','interlocking low and high motifs over a steady ostinato','more active low percussion with syncopated short accents','long warm notes and very sparse softly plucked answers'][j]
            prompt=(f'Compose an original 90-second instrumental game background cue for {use}, {mode} state. Instruments: {instruments}. {bpm} BPM, exact steady 4/4. Energy {energy}/5. '
                f'Use a repeating eight-bar harmonic cycle. Variation: {variation}. '
                'Stable consistent texture from the first bar through the last bar, no intro, no build, no breaks, no final cadence or fade. No tempo changes. Keep the lead sparse so repeated playback is comfortable. Original composition for a reusable game loop. '+NO_VOICES)
            records.append(dict(id=f'{prefix}-game-{style}-{mode}',code=f'GAME-{i+1:02d}-{j+1}',title={'en':f'{en} · {mode.title()}','zh':f'{zh} · {cn}'},category='global',archetype='library',role='library',kind='music',moods=['focused',mode],topics=['game',use,mode],energy=energy,bpm=bpm,key='',instruments=instruments.split(', '),instrumental=True,model='lyria-3-pro-preview',targetDuration=90,prompt=prompt,recommendedWorldIds=[],styles=[style],scenarios=['game-'+mode],description={'en':f'{use}, {mode}.','zh':f'{zh}的{cn}配乐。'},batch=batch,status='prompt-ready',collections=['game-audio'],loopRequested=True,rightsProfile='lyria-commercial-2026-09',usage={'narrationFriendly':j!=2,'placement':'background','gameState':mode}))
    return {'schemaVersion':1,'batch':batch,'tracks':records}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--batch',default='scene-audio-2026-09')
    p.add_argument('--prefix',default='scene')
    a=p.parse_args()
    data=plan(a.batch,a.prefix)
    dest=ROOT/'music/batches'/f'{a.batch}.json'
    if dest.exists(): raise SystemExit('Manifest exists; inspect before replacing it.')
    dest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(f'{dest}: {len(data["tracks"])} independent compositions')
