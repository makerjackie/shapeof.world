#!/usr/bin/env python3
"""Plan independent short promotional scores; each length gets a new composition."""
import json
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILES = [
    ('funk', 'Snap Fit', '咔哒合拍', 112, 'muted rhythm guitar, elastic electric bass, dry claps, tight kick', 'playful electro-funk; syncopated bass answers clipped guitar', 'product-demo'),
    ('breakbeat', 'Quick Shift', '瞬间换挡', 136, 'chopped acoustic drums, analog synth plucks, tight bass', 'crisp breakbeat; energetic drum edits and a two-note synth hook', 'fast-montage'),
    ('minimalism', 'Small Mechanisms', '微小机关', 120, 'woodblocks, pizzicato strings, marimba, brushed snare', 'tactile acoustic minimalism; interlocking wooden percussion and witty plucked melody', 'process'),
    ('house', 'Color Pop', '色彩跳动', 124, 'rounded kick, electric piano stabs, bright synth bass, shakers', 'bright compact house; buoyant chord stabs with a memorable bass hook', 'reveal'),
    ('chiptune', 'Pixel Flip', '像素翻转', 144, 'square-wave arpeggios, triangle bass, crunchy electronic drums', 'playful modern chiptune; original arcade-like call and response', 'fast-montage'),
    ('chamber', 'Paper Sprint', '纸上疾行', 116, 'pizzicato cello, staccato violin, bass clarinet, dry hand percussion', 'nimble chamber pop; surprising offbeat accents and precise short phrases', 'product-demo'),
]

def plan(batch="short-promos-2026-09", prefix="short"):
    if not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value) for value in [batch, prefix]):
        raise ValueError("Use safe lowercase batch and id prefixes")
    tracks = []
    for i, (style, en, zh, bpm, instruments, sound, use) in enumerate(PROFILES):
        for j, seconds in enumerate([15, 20, 25]):
            motif = ['a falling three-note figure', 'a rising fourth with a syncopated answer', 'a repeated note followed by a playful octave leap'][j]
            prompt = (f'Compose a COMPLETE original 30-second instrumental micro-score for a short product promotional video. '
                f'Exactly one short cue, not a full-length song. Sound: {sound}. Instruments: {instruments}. '
                f'Tempo {bpm} BPM, 4/4. Main hook: {motif}. '
                f'[00:00] Immediate confident musical hook and beat within the first half-second, no intro or fade-in. '
                f'[00:02] Establish a catchy clear groove with space for visual edits. '
                f'[00:16] One crisp stop-and-restart or timbral switch, then a slightly fuller reprise. '
                f'[00:26] A concise resolving fill. [00:29] A decisive final musical button for a logo reveal. '
                f'[00:30] End completely after the brief natural decay. Total duration 30 seconds. Maintain the hook throughout, usable from any downbeat. '
                'Punchy but not harsh, audible melody and rhythm on phone speakers, controlled sub-bass, no long riser, no slow build or repeated sections. '
                'Instrumental only. No vocals, choir, humming, singing, speech, lyrics or vocal samples. Do not imitate any artist, existing song or brand jingle.')
            tracks.append(dict(id=f'{prefix}-{style}-{seconds}', code=f'SHORT-{i+1:02d}-{seconds}', title={'en':f'{en} · {seconds}', 'zh':f'{zh} · {seconds}'},
                category='global',archetype='discovery',role='library',moods=['playful','rhythmic','confident'],topics=['short-promo',use],energy=3 if style in ['minimalism','chamber'] else 4,
                bpm=bpm,key='',instruments=instruments.split(', '),instrumental=True,model='lyria-3-clip-preview',targetDuration=seconds,prompt=prompt,recommendedWorldIds=[],styles=[style],scenarios=['motion','explain'],
                description={'en':f'A short {sound} cue for {use}.','zh':f'{zh}风格的短宣传片配乐。'},batch=batch,status='prompt-ready',collections=['short-promos'],
                shortForm={'use':use,'targetSeconds':seconds,'structureBasis':'source-prompt-intent','structure':{'hook':0,'change':16,'logo':29},'delivery':'ending-excerpt'}))
    return {'schemaVersion':1,'batch':batch,'tracks':tracks}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', default='short-promos-2026-09')
    parser.add_argument('--prefix', default='short')
    args = parser.parse_args()
    data = plan(args.batch, args.prefix)
    dest = ROOT / 'music/batches' / (args.batch + '.json')
    dest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(dest)
