import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import rawPacks from '~/generated/packs.json'
import type { LocaleText } from '~/data/catalog'
import { useI18n } from '~/i18n'
import { usePlayer } from '~/state/player'
import { cleanSearch } from '~/lib/locale'

type Pack = {id:string;title:LocaleText;description:LocaleText;duration:number;assets:{preview:{url:string};download:{url:string;bytes:number}};events:Array<{id:string;use:string;atSeconds:number;gainDb:number}>}
const packs = rawPacks as Pack[]

export function PacksPage() {
  const {locale,t}=useI18n()
  const player=usePlayer()
  const refs=useRef(new Map<string,HTMLAudioElement>())
  useEffect(() => {
    if (player.playing) for (const audio of refs.current.values()) audio.pause()
  }, [player.playing])
  return <div className="page packs-page">
    <p className="kicker">AUDIO / {locale === 'zh' ? '场景套件' : 'SCENE KITS'}</p>
    <h1>{t('audio.packs')}</h1>
    <p className="lede">{t('audio.packsLede')}</p>
    <div className="scene-kit-grid">{packs.map(pack=><article key={pack.id} className="scene-kit">
      <p className="kicker">{pack.duration}s / {new Set(pack.events.map(e=>e.id)).size} {t('audio.assets')}</p>
      <h2>{pack.title[locale]}</h2><p>{pack.description[locale]}</p>
      <audio controls preload="none" src={pack.assets.preview.url} aria-label={pack.title[locale]} ref={element=>{if(element) refs.current.set(pack.id,element); else refs.current.delete(pack.id)}} onPlay={()=>{if(player.playing) player.toggle(); for(const [id,audio] of refs.current) if(id!==pack.id) audio.pause()}} />
      <a className="btn-solid" href={pack.assets.download.url} download={`${pack.id}.zip`}>{t('audio.downloadKit')} · {(pack.assets.download.bytes/1024/1024).toFixed(1)} MB</a>
      <details><summary>{t('audio.timeline')}</summary><ul>{pack.events.map((event,i)=><li key={i}><span>{event.atSeconds}s · {event.gainDb} dB</span><Link to="/track/$trackId" params={{trackId:event.id}} search={cleanSearch}>{event.id}</Link></li>)}</ul></details>
    </article>)}</div>
    <p className="lede">{t('audio.kitNote')}</p>
    <Link to="/rights" search={cleanSearch}>{t('audio.permissions')} ↗</Link>
  </div>
}
