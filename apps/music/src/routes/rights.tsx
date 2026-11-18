import { COMMERCIAL_CONTACT, LicenseNotice, LICENSE_URL } from '~/components/LicenseNotice'
import { useI18n } from '~/i18n'

export function RightsPage() {
  const { locale, t } = useI18n()
  const zh = locale === 'zh'
  return <div className="page rights-page">
    <p className="kicker">AUDIO / {zh ? '许可' : 'LICENCE'}</p>
    <h1>{t('audio.permissions')}</h1>
    <LicenseNotice />
    <p className="lede">{zh ? '自 2026-11-17 起，本站全部音频（音乐、音效、环境声、循环版与场景套件）按 CC BY-NC 4.0 提供，只能用于非商业用途。' : 'From 2026-11-17 all audio on this site (music, effects, ambience, loops and scene kits) is offered under CC BY-NC 4.0, for non-commercial use only.'}</p>
    <div className="rights-grid">
      <section><h2>{zh ? '非商业使用' : 'Non-commercial use'}</h2><p>{t('audio.licenseNote')}</p></section>
      <section><h2>{zh ? '商业使用' : 'Commercial use'}</h2><p>{zh ? '不授权商用，包括带广告或收益的视频、商业推广、付费产品、游戏与应用、客户项目以及付费分发音频。商用请先发邮件到 hi@makerjackie.com 取得作者书面授权；作者网站 makerjackie.com 上也有微信。' : 'No commercial use is licensed: this includes monetized or sponsored videos, advertising, paid products, games and apps, client work and selling the files. To ask for written permission, email hi@makerjackie.com; WeChat is listed on makerjackie.com.'}</p></section>
      <section><h2>{zh ? '来源记录' : 'Provenance'}</h2><p>{zh ? 'Vertex AI 上 Lyria 3 的服务条款曾于 2026-09-22 核对；Gemini API 上的 Lyria 3.5 为项目自己的影片生成；原创程序合成音效没有使用外部采样，也不是实地录音。2026-11-17 之前的旧条款（Shape Audio Permission 1.0、CC0）作为历史记录保存在 rights.json 中，不再提供。' : 'Lyria 3 on Vertex AI: provider terms reviewed on 2026-09-22. Lyria 3.5 on the Gemini API: made for the project\'s own films. Original procedural sounds use no external samples and are not field recordings. Earlier terms (Shape Audio Permission 1.0, CC0) are kept as history in rights.json and are no longer offered.'}</p></section>
      <section><h2>{zh ? '循环与格式' : 'Loops and formats'}</h2><p>{zh ? '“已验证循环”表示通过波形接缝检查和自动音频审核。请下载专用循环 WAV；普通 MP3 预览与原曲未必适合循环。Lyria 的 WAV 循环版来自 MP3，不是无损原始录音。' : 'Verified loops passed PCM seam checks and automated audio review. Use the designated loop WAV; an MP3 preview or full original may not loop. Lyria loop WAVs derive from MP3 and are not lossless original recordings.'}</p></section>
    </div>
    <p className="lede">{t('audio.permissionNote')}</p>
    <div className="action-row"><a className="btn-solid" href={LICENSE_URL}>{t('license.read')}</a><a className="btn-ghost" href="https://creativecommons.org/licenses/by-nc/4.0/legalcode">CC BY-NC 4.0 legal code ↗</a><a className="btn-ghost" href={COMMERCIAL_CONTACT}>{t('license.contact')}</a><a className="btn-ghost" href="/rights.json">{zh ? '机器可读许可档案' : 'Machine-readable licence profiles'}</a></div>
  </div>
}
