// English editorial copy is co-loaded with the road reader, not duplicated as
// long Chinese dictionary keys. UI controls still use the shared translator.
export const ORIGINAL_NOTES_EN={
  "cloverleaf": {
    "loop": {
      "titleEn": "Why loop around to turn left?",
      "bodyEn": "Exit right, then turn through 270° to head left without crossing oncoming traffic. The trade-off is a longer route."
    },
    "radius": {
      "titleEn": "Tight bends need lower speeds",
      "bodyEn": "The tight loop uses a model speed of 40 km/h. Its small radius saves space but limits turning speed."
    },
    "weave": {
      "titleEn": "Two streams weave here",
      "bodyEn": "Traffic joining from one loop and leaving for the next exchange positions in the same auxiliary section. Heavy traffic makes them impede one another."
    },
    "bridge": {
      "titleEn": "Separate the mainlines by height",
      "bodyEn": "Mainlines cross at different heights to avoid an at-grade crossing, requiring bridges and room to climb."
    }
  },
  "crossroads-signal": {
    "stop": {
      "titleEn": "Where to wait at red",
      "bodyEn": "At red, the car stops before the stop line, leaving the junction to crossing traffic. The cost is a queue."
    },
    "gap": {
      "titleEn": "What does a left turn wait for at green?",
      "bodyEn": "This is a permissive left turn. Green allows entry but still requires yielding to opposing through traffic. The demo car turns when a sufficient gap opens."
    },
    "phase": {
      "titleEn": "Take turns through the crossing",
      "bodyEn": "North–south and east–west take turns. This reduces simultaneous crossings but does not remove left-turn conflicts within the same green."
    },
    "clear": {
      "titleEn": "Yellow and all-red allow clearance",
      "bodyEn": "Each phase has 3 seconds of yellow and 2 seconds of all-red for vehicles already in the junction to clear. That time is unavailable for a new green."
    }
  },
  "huangjuewan": {
    "split": {
      "titleEn": "Choose the exit before the lane",
      "bodyEn": "Ramps to different destinations separate here. Choosing a lane early reduces last-minute lane changes; a wrong turn cannot be corrected by crossing arbitrarily."
    },
    "height": {
      "titleEn": "Why stack the roads?",
      "bodyEn": "Different heights separate crossing routes, requiring bridges, climbs and longer connections. Heights here are inferred from OSM layers and clearance constraints, not surveyed."
    },
    "detour": {
      "titleEn": "Why not connect in a straight line?",
      "bodyEn": "The straight-line reference ignores terrain, bridges and existing roads. Routes follow connected OSM roads, and the detour is measured from the selected path."
    },
    "merge": {
      "titleEn": "Merging remains before the exit",
      "bodyEn": "Ramps must rejoin a road and still need a gap. Grade separation removes crossings, not merging."
    }
  }
} as const
export const ORIGINAL_SUMMARIES_EN={
  "cloverleaf": "Loops and overpasses keep traffic apart without red lights for left turns, at the cost of detours, slow bends and weaving.",
  "crossroads-signal": "Signals give crossing traffic separate turns, at the cost of waiting. Left turns still yield.",
  "huangjuewan": "Connect many directions in limited hilly space, at the cost of long ramps, stacked bridges and earlier lane choices."
}
