#!/usr/bin/env python3
"""Fresh independent promotional scores across eighteen ensembles and five lengths."""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('shorts', Path(__file__).with_name('plan-shorts.py'))
shorts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shorts)
PROFILES = [
    (p[0], en, zh, *p[3:]) for p, (en, zh) in zip(shorts.PROFILES, [
        ('Magnetic Click', '磁力轻响'), ('Fast Forward', '快进一格'),
        ('Clockwork Play', '发条游戏'), ('Prism Dance', '棱镜舞步'),
        ('Pixel Bounce', '像素弹跳'), ('Paper Kites', '纸鸢起飞'),
    ])
] + [
 ('bossa','Sunlit Steps','日光步伐',108,'nylon guitar, rim clicks, upright bass, shaker','brisk bossa nova with clipped sunny guitar answers','lifestyle'),
 ('jazz-trio','Pocket Swing','口袋摇摆',132,'acoustic piano, upright bass, brushed drums','nimble swinging jazz trio with dry piano accents','process'),
 ('gypsy-jazz','Silver Wheels','银色车轮',148,'acoustic rhythm guitar, violin, upright bass','bright acoustic swing with precise offbeat guitar chops','fast-montage'),
 ('soul','Velvet Motion','丝绒律动',102,'electric piano, warm bass guitar, crisp drums, muted trumpet','instrumental soul with a warm short brass hook','lifestyle'),
 ('dub','Rubber Orbit','弹性轨道',96,'deep bass guitar, rimshot drums, organ stabs, spring echo','spacious rhythmic dub with playful bass and short echoes','product-demo'),
 ('acoustic-folk','Little Workshop','小小工坊',118,'fingerpicked guitar, handclaps, mandolin, kick drum','tactile upbeat acoustic folk with a nimble mandolin hook','process'),
 ('guzheng','Jade Sparks','玉石火花',126,'guzheng plucks, electronic bass, dry kick, woodblocks','contemporary guzheng electronica with sharp plucked accents','reveal'),
 ('koto','Folded Light','折叠光线',110,'koto, muted synth bass, tight electronic drums, bamboo clicks','spare koto groove with spacious precise rhythmic gestures','product-demo'),
 ('oud','Copper Steps','铜色脚步',122,'oud, darbuka, electric bass, handclaps','nimble oud-led groove with syncopated hand percussion','fast-montage'),
 ('kora','Golden Threads','金色丝线',116,'kora, calabash percussion, soft bass, shakers','buoyant interlocking kora ostinatos and crisp percussion','lifestyle'),
 ('synthwave','Neon Switch','霓虹开关',128,'analog synth arpeggios, gated snare, synth bass, kick','bright retro-futuristic synth groove with a compact melodic hook','reveal'),
 ('post-rock','Open Horizon','展开地平线',130,'clean electric guitar, melodic bass, tight acoustic drums','energetic instrumental guitar rock with immediate sparkling riff','reveal'),
]

def plan(batch='promo-library-2026-09', prefix='promo'):
    base = shorts.plan(batch, prefix)['tracks'][0]
    records=[]
    motifs=['descending pentatonic triplet','syncopated rising fourth','two staccato notes and an octave leap','a dotted rhythmic question and short answer','a bright five-note arch']
    for i, profile in enumerate(PROFILES):
        style,en,zh,bpm,instruments,sound,use=profile
        for j, seconds in enumerate([15,20,25,35,40]):
            short_source=seconds<=25
            source_seconds=30 if short_source else 60
            track=base.copy()
            track.update(id=f'{prefix}-{style}-{seconds}',code=f'PROMO-{i+1:02d}-{seconds}',title={'en':f'{en} · {seconds}','zh':f'{zh} · {seconds}'},styles=[style],topics=['short-promo',use],bpm=bpm,instruments=instruments.split(', '),energy=3 if i%3==0 else 4,model='lyria-3-clip-preview' if short_source else 'lyria-3-pro-preview',targetDuration=seconds)
            track['prompt']=(f'Compose one complete original {source_seconds}-second instrumental promotional score. Sound: {sound}. Instruments: {instruments}. Tempo {bpm} BPM. Distinct motif: {motifs[j]}. '
                f'Immediate catchy hook and clear beat at 00:00, with no slow introduction. Maintain a strong compact groove from every downbeat, suitable for a {seconds}-second {use} film. '
                'Use short two-bar melodic gestures, crisp edit accents, mobile-speaker-friendly midrange and space for narration. Vary the timbre halfway through while keeping the pulse. '
                f'Keep the musical hook and full groove active until the last two seconds. At 00:{source_seconds-2:02d}, play a decisive resolving tonic button, followed by less than one second of natural decay, then end completely. '
                'No fade-out, extended outro, breakdown, long riser or silent gap. Punchy and tuneful, never harsh. '
                'Instrumental only. No vocals, choir, humming, singing, speech, lyrics or vocal samples. Do not imitate any artist, existing song or brand jingle.')
            track['description']={'en':f'{sound.capitalize()} for {use}.','zh':f'{zh}：节奏清晰的短片配乐。'}
            track['shortForm']={'use':use,'targetSeconds':seconds,'structureBasis':'source-prompt-intent','structure':{'hook':0,'change':source_seconds//2,'logo':source_seconds-2},'delivery':'ending-excerpt'}
            records.append(track)
    return {'schemaVersion':1,'batch':batch,'tracks':records}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', default='promo-library-2026-09')
    parser.add_argument('--prefix', default='promo')
    args=parser.parse_args()
    data=plan(args.batch, args.prefix)
    dest=ROOT/'music/batches'/f"{data['batch']}.json"
    dest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(dest)
