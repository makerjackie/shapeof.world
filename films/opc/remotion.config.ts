import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("angle");
// HTML rasterized on the CPU: GPU rasterization drew stale or scrambled text on some frames (tools/chrome.sh)
Config.setBrowserExecutable(path.resolve("tools/chrome.sh"));
