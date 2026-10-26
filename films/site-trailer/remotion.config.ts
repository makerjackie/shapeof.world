import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
// WebGL (the 3D laptop) on the GPU through ANGLE; the default headless GL is software.
Config.setChromiumOpenGlRenderer("angle");
