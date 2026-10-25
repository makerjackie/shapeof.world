import packed from '../data/huangjuewan-runtime.json'
import { decodeHuangjuewan } from './packed-data'
import { createHuangjuewan } from './huangjuewan-core'

// Synchronous model/test entry. The browser worker fetches the packed data only
// when this real-world design is selected, then calls the same factory.
export const { HUANGJUEWAN_METADATA, HUANGJUEWAN_TERRAIN, sampleHuangjuewanTerrain,
  shortestHuangjuewanRoute, buildHuangjuewan, huangjuewanTopologySummary, huangjuewan
} = createHuangjuewan(decodeHuangjuewan(packed))
