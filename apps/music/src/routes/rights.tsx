import { useI18n } from '~/i18n'

export function RightsPage() {
  const { locale, t } = useI18n()
  const zh = locale === 'zh'
  return <div className="page rights-page">
    <p className="kicker">AUDIO / {zh ? '使用说明' : 'PERMISSIONS'}</p>
    <h1>{t('audio.permissions')}</h1>
    <p className="lede">{zh ? '每个素材都有自己的使用条件。下载时请保存对应元数据。' : 'Each asset has its own usage terms. Keep its metadata with your download.'}</p>
    <div className="rights-grid">
      <section><h2>Google Lyria</h2><p>{zh ? '标记“可商用”的音乐允许用于商业视频、游戏与应用，也允许修改。署名可选；单独分发文件时保留来源和许可说明。授权限于项目方有权授予的范围。' : 'Music marked for commercial use may be edited and used in commercial videos, games and apps. Attribution is optional; retain the source and permission notice when redistributing standalone files. Permission covers only rights controlled by the project.'}</p></section>
      <section><h2>CC0</h2><p>{zh ? '标记 CC0 的原创程序合成音效与环境声可商用、修改和再分发，无需署名。这些声音不是实地录音，也没有使用外部采样。' : 'Original procedural sounds marked CC0 may be used commercially, modified and redistributed without attribution. They are synthesized, without external samples, and are not field recordings.'}</p></section>
      <section><h2>{t('audio.unknown')}</h2><p>{t('audio.unknownNote')}</p></section>
      <section><h2>{zh ? '循环与格式' : 'Loops and formats'}</h2><p>{zh ? '“已验证循环”表示通过波形接缝检查和自动音频审核。请下载专用循环 WAV；普通 MP3 预览与原曲未必适合循环。Lyria 的 WAV 循环版来自 MP3，不是无损原始录音。' : 'Verified loops passed PCM seam checks and automated audio review. Use the designated loop WAV; an MP3 preview or full original may not loop. Lyria loop WAVs derive from MP3 and are not lossless original recordings.'}</p></section>
    </div>
    <p className="lede">{t('audio.permissionNote')}</p>
    <div className="action-row"><a className="btn-solid" href="/audio-license.txt">{t('audio.readTerms')}</a><a className="btn-ghost" href="/rights.json">{zh ? '机器可读权限档案' : 'Machine-readable permissions'}</a></div>
  </div>
}
