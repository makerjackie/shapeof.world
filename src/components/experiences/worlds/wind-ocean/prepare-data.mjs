/** Reproduce the checked-in binary fields from the pinned, openly licensed upstream snapshot.
 * Usage: node src/components/experiences/worlds/wind-ocean/prepare-data.mjs [--source-dir <download-folder>]
 * Without --source-dir the original JSON files are fetched from the pinned commit.
 */
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url))
const root=resolve(here,'../../../../..')
const out=resolve(root,'public/assets/wind-ocean')
const commit='5f091f0c3b60aa38a996a886985bacb3673d16c3'
const sourceFlag=process.argv.indexOf('--source-dir')
const sourceDir=sourceFlag>=0?resolve(process.argv[sourceFlag+1]):null
const fields=[
  {id:'wind',path:'weather/current/current-wind-surface-level-gfs-1.0.json',sha256:'e3c37671f43e2550c4f420bd398d36400a927342fa0aba1a951d1bda17dc8995',product:'NOAA/NCEP GFS',nominal:'2014-01-31T03:00:00.000Z',radius:6371229},
  {id:'ocean',path:'oscar/20140131-surface-currents-oscar-0.33.json',sha256:'6b64e9826e790a150a24efde8d7bca2962881cee466139042f0b5c065a31c700',product:'ESR OSCAR third degree, version 1',nominal:'2014-01-31T00:00:00.000Z',radius:6367470},
]
mkdirSync(out,{recursive:true})
const metadata={format:'signed-int16-le-u-plane-v-plane',scale:.01,missing:32767,upstreamCommit:commit,fields:[]}
for(const spec of fields){
  const source=`https://raw.githubusercontent.com/cambecc/earth/${commit}/public/data/${spec.path}`
  const raw=sourceDir?readFileSync(resolve(sourceDir,`${spec.id}-source.json`)):Buffer.from(await (await fetch(source)).arrayBuffer())
  const hash=createHash('sha256').update(raw).digest('hex')
  if(hash!==spec.sha256)throw new Error(`${spec.id}: source hash mismatch`)
  const records=JSON.parse(raw.toString('utf8')),u=records.find(r=>r.header.parameterNumber===2),v=records.find(r=>r.header.parameterNumber===3)
  const h=u.header,n=h.nx*h.ny
  if(!v||u.data.length!==n||v.data.length!==n)throw new Error('Invalid component dimensions')
  const packed=Buffer.alloc(n*4)
  let wet=0
  for(let i=0;i<n;i++){
    if(u.data[i]!==null&&v.data[i]!==null)wet++
    for(const [component,values] of [[0,u.data],[1,v.data]]){
      const value=values[i]===null?32767:Math.round(values[i]*100)
      if(value!==32767&&(Math.abs(value)>=32767||Math.abs(value/100-values[i])>1e-7))throw new Error('Input has unexpected precision/range')
      packed.writeInt16LE(value,component*n*2+i*2)
    }
  }
  const compressed=gzipSync(packed,{level:9}),name=`${spec.id}-20140131.i16.gz`
  writeFileSync(resolve(out,name),compressed)
  metadata.fields.push({id:spec.id,product:spec.product,path:`/assets/wind-ocean/${name}`,nx:h.nx,ny:h.ny,lon0:h.lo1,lat0:h.la1,dx:h.dx,dy:h.dy,radius:spec.radius,referenceTime:h.refTime,forecastHours:h.forecastTime,validTime:spec.nominal,height:h.surface1Value,source,sourceSha256:hash,binarySha256:createHash('sha256').update(packed).digest('hex'),validVectorCount:wet,compressedBytes:compressed.length})
  console.log(`${spec.id}: ${h.nx}×${h.ny}; ${wet} complete vectors; ${compressed.length} compressed bytes`)
}
writeFileSync(resolve(here,'data-meta.json'),JSON.stringify(metadata,null,2)+'\n')
