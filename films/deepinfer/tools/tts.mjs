#!/usr/bin/env node
// Generate narration with word timings, trim silence, and write a timings sheet.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const filmArg = process.argv[2] ?? "deepinfer-open-source";
const film = join(root, "cuts", filmArg);
const config = JSON.parse(readFileSync(join(film, "narration.json"), "utf8"));
const outDir = join(film, "output", "audio", "vo");
mkdirSync(outDir, { recursive: true });

const runSh = join(process.env.HOME, ".agents/skills/mj-voice/scripts/run.sh");
const only = process.argv.slice(3);

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed (${r.status})\n${r.stdout}\n${r.stderr}`);
  }
  return r.stdout;
}

const timings = [];
for (const line of config.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const rawWav = join(outDir, `${line.id}.raw.wav`);
  const wav = join(outDir, `${line.id}.wav`);
  const jsonPath = join(outDir, `${line.id}.raw.json`);
  if (!existsSync(wav) || !existsSync(jsonPath)) {
    console.log(`TTS ${line.id} ...`);
    const stdout = sh("bash", [
      runSh, "voice", "tts", line.text,
      "--voice", config.voice,
      "--direction", config.direction,
      "--speed", String(config.speed),
      "--subtitles",
      "--out", rawWav,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const last = stdout.trim().split("\n").filter((l) => l.trim().startsWith("{")).pop();
    if (!last) throw new Error(`No JSON from TTS for ${line.id}: ${stdout}`);
  }
  const meta = JSON.parse(readFileSync(jsonPath, "utf8"));
  const words = meta.sentences.flatMap((s) => s.words).filter((w) => w.word);
  if (!words.length) throw new Error(`No word timings for ${line.id}`);
  const start = Math.max(0, words[0].startTime - 0.08);
  const end = words.at(-1).endTime + 0.14;
  const dur = +(end - start).toFixed(3);
  sh("ffmpeg", ["-y", "-v", "error", "-i", rawWav,
    "-af", `atrim=start=${start.toFixed(3)}:end=${end.toFixed(3)},asetpts=PTS-STARTPTS`,
    "-ar", "48000", "-ac", "1", wav]);
  const measured = Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", wav]).trim());
  timings.push({
    id: line.id,
    text: line.text,
    file: `audio/vo/${line.id}.wav`,
    duration: +measured.toFixed(3),
    words: words.map((w) => ({
      w: w.word,
      s: +(w.startTime - start).toFixed(3),
      e: +(w.endTime - start).toFixed(3),
    })),
  });
  console.log(`  ${line.id}: ${measured.toFixed(2)}s`);
}

const outPath = join(outDir, "timings.json");
const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : [];
const merged = new Map(prev.map((t) => [t.id, t]));
for (const t of timings) merged.set(t.id, t);
const ordered = config.lines.map((l) => merged.get(l.id)).filter(Boolean);
writeFileSync(outPath, JSON.stringify(ordered, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
