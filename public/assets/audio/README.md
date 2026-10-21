# Site & experience audio

## Default world soundtrack

| File | Purpose | Notes |
|------|---------|-------|
| `hidden-shapes.mp3` | GLO-B01 main theme, fallback bed | Plays only inside a world that does not own a soundtrack, sonification, or ambient bed. Worlds with an assigned original stream the matching preview from `music-cdn.shapeof.world`. Mute control is in the experience toolbar. |

Canonical stream: `https://music-cdn.shapeof.world/tracks/hidden-shapes/v3/preview.mp3`.
Do not use `r2.dev` URLs. Category tracks are not stored in this directory; official world packs copy unique previews into `runtime/audio/`.

## Demo audio for spectrum-pins

Short **public-domain / CC0 classical** clips used as demo tracks in the spectrum pin visualizer.
Each file is trimmed to about 55–75 seconds (with a short fade-out) and looped by the player.

| File | Piece | Performer | License | Source |
|------|-------|-----------|---------|--------|
| `classic-bach-prelude1.mp3` | Bach, WTC I, Prelude No. 1 in C, BWV 846 | Kimiko Ishizaka | [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) | [Internet Archive: Open Well-Tempered Clavier](https://archive.org/details/bach-well-tempered-clavier-book-1) |
| `classic-bach-prelude2.mp3` | Bach, WTC I, Prelude No. 2 in C minor, BWV 847 | Kimiko Ishizaka | PDM 1.0 | same |
| `classic-bach-prelude15.mp3` | Bach, WTC I, Prelude No. 15 in G, BWV 860 | Kimiko Ishizaka | PDM 1.0 | same |
| `classic-bach-fugue1.mp3` | Bach, WTC I, Fugue No. 1 in C, BWV 846 | Kimiko Ishizaka | PDM 1.0 | same |
| `classic-bach-goldberg-v1.mp3` | Bach, Goldberg Variations, Variatio 1 | Kimiko Ishizaka | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Internet Archive: Open Goldberg Variations](https://archive.org/details/The_Open_Goldberg_Variations-11823) |
| `classic-beethoven-fur-elise.mp3` | Beethoven, Bagatelle in A minor “Für Elise” | Artur Schnabel (1938) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Internet Archive: Bagatelles Op. 33 and Fur Elise](https://archive.org/details/BagatellesOp.33AndFurElise) |

These are **not** synthetic sine demos. Composition rights for Bach and Beethoven are long expired; the chosen recordings are explicitly released as public domain / CC0 on Internet Archive.

Re-trim (from downloaded masters):

```bash
ffmpeg -y -i source.mp3 -vn -t 75 -af "afade=t=out:st=73.8:d=1.2" \
  -codec:a libmp3lame -b:a 128k -ar 44100 -ac 2 public/assets/audio/classic-….mp3
```
