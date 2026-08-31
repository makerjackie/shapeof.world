import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowSquareOut,
  ArrowUpRight,
  Heart,
  ShieldCheck,
} from '@phosphor-icons/react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { useI18n } from '~/i18n'
import { localizedPublicUrl } from '~/lib/share-url'
import '~/styles/support.css'
import { seo } from '~/utils/seo'

const KOFI_URL = 'https://ko-fi.com/shapeofworld/donate'

export const Route = createFileRoute('/support')({
  head: ({ matches }) => {
    const locale = matches[0]?.loaderData === 'zh' ? 'zh' : 'en'
    const chinese = locale === 'zh'
    return ({
      meta: seo({
        title: chinese ? '支持世界的形状' : 'Support Shape of the World',
        description: chinese
          ? '项目支持方式、支付说明与开源准备状态。'
          : 'Project support methods, payment information, and open-source preparation status.',
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl('https://shapeof.world/support', locale),
      }),
      links: [{ rel: 'canonical', href: 'https://shapeof.world/support' }],
    })
  },
  component: SupportPage,
})

function SupportPage() {
  const { t } = useI18n()

  return (
    <main className="editorial-page support-page">
      <SiteHeader />

      <section className="support-hero" aria-labelledby="support-title">
        <p className="support-kicker">{t('support.eyebrow')}</p>
        <h1 id="support-title">{t('support.title')}</h1>
        <p className="support-lede">{t('support.body')}</p>
        <p className="support-choice-lead" id="support-payment-title">
          <span>{t('support.payment.title')}</span>
          <span aria-hidden="true"> · </span>
          <span>{t('support.payment.intro')}</span>
        </p>
      </section>

      <section className="support-payment-grid" aria-labelledby="support-payment-title">
        <article className="support-method">
          <div className="support-method-copy">
            <p className="support-method-label">{t('support.payment.wechat.title')}</p>
            <h2>{t('support.payment.wechat.heading')}</h2>
            <p className="support-method-body">{t('support.payment.wechat.body')}</p>
            <p className="support-method-meta">
              <ShieldCheck aria-hidden="true" weight="regular" />
              <span>{t('support.payment.wechat.caption')}</span>
            </p>
            <p id="support-wechat-safety" className="support-method-safety">
              {t('support.payment.wechat.safety')}
            </p>
          </div>

          <figure className="support-method-visual">
            <a
              className="support-qr-action"
              href="/assets/support/wechat-support-qr.png"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('support.payment.wechat.open')}
              aria-describedby="support-wechat-safety"
            >
              <img
                src="/assets/support/wechat-support-qr.png"
                alt={t('support.payment.wechat.alt')}
                width={472}
                height={484}
                decoding="async"
              />
            </a>
            <figcaption>
              <a href="/assets/support/wechat-support-qr.png" target="_blank" rel="noopener noreferrer">
                <ArrowSquareOut aria-hidden="true" weight="regular" />
                {t('support.payment.wechat.open')}
              </a>
            </figcaption>
            <small className="support-mobile-hint">{t('support.payment.wechat.mobileHint')}</small>
          </figure>
        </article>

        <article className="support-method">
          <div className="support-method-copy">
            <p className="support-method-label">{t('support.payment.kofi.title')}</p>
            <h2>{t('support.payment.kofi.heading')}</h2>
            <p className="support-method-body">{t('support.payment.kofi.body')}</p>
            <a
              className="support-kofi"
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby="support-kofi-external support-kofi-safety"
            >
              <span>{t('support.payment.kofi.action')}</span>
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
            <p id="support-kofi-external" className="support-external-note">
              <ArrowSquareOut aria-hidden="true" weight="regular" />
              {t('support.payment.kofi.external')}
            </p>
            <p id="support-kofi-safety" className="support-method-meta">
              <ShieldCheck aria-hidden="true" weight="regular" />
              <span>{t('support.payment.kofi.safety')}</span>
            </p>
          </div>

          <div className="support-method-visual support-method-visual--cup" aria-hidden="true">
            <img
              className="support-cup"
              src="/assets/support/coffee-cup.png"
              alt=""
              width={1448}
              height={1086}
              decoding="async"
            />
          </div>
        </article>
      </section>

      <section className="support-secondary" aria-labelledby="support-open-source-title">
        <div className="support-secondary-copy">
          <p className="support-kicker">{t('support.opensource.kicker')}</p>
          <h2 id="support-open-source-title">{t('support.opensource.title')}</h2>
          <p>{t('support.opensource.body')}</p>
        </div>
      </section>

      <section className="support-impact" aria-labelledby="support-impact-title">
        <p className="support-kicker">{t('support.impact.eyebrow')}</p>
        <h2 id="support-impact-title">{t('support.impact.title')}</h2>
        <p className="support-impact-body">{t('support.impact.body')}</p>
        <p className="support-thanks">
          <Heart aria-hidden="true" weight="fill" />
          <span>{t('support.thanks')}</span>
        </p>
      </section>

      <SiteFooter />
    </main>
  )
}
