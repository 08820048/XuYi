import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Texture Lab',
  robots: { index: false, follow: false },
}

export default function TextureLabPage() {
  return (
    <main className={styles.page}>
      <input className={`${styles.textureInput} ${styles.fiberInput}`} id="texture-fiber" type="radio" name="texture" defaultChecked />
      <input className={`${styles.textureInput} ${styles.pulpInput}`} id="texture-pulp" type="radio" name="texture" />
      <input className={`${styles.textureInput} ${styles.sandInput}`} id="texture-sand" type="radio" name="texture" />
      <input className={`${styles.textureInput} ${styles.mineralInput}`} id="texture-mineral" type="radio" name="texture" />

      <div className={styles.switcher} role="group" aria-label="选择纸张纹理">
        <label className={styles.fiberLabel} htmlFor="texture-fiber">纤维毛胚</label>
        <label className={styles.pulpLabel} htmlFor="texture-pulp">回收纸浆</label>
        <label className={styles.sandLabel} htmlFor="texture-sand">喷砂涂层</label>
        <label className={styles.mineralLabel} htmlFor="texture-mineral">矿物粉尘</label>
      </div>

      <svg className={styles.texture} aria-hidden="true">
        <defs>
          <filter id="paper-fibers" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.14" numOctaves="4" seed="17" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.055  0 0 0 0 0.455  0 0 0 0 0.565  0.22 0.22 0.22 0 0" />
          </filter>
          <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="29" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.12 0.12 0.12 0 0" />
          </filter>
          <filter id="paper-impurities" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.23" numOctaves="2" seed="43" stitchTiles="stitch" result="noise" />
            <feComponentTransfer in="noise" result="spots">
              <feFuncR type="discrete" tableValues="0 0 0 0 0 0 0 1" />
              <feFuncG type="discrete" tableValues="0 0 0 0 0 0 0 1" />
              <feFuncB type="discrete" tableValues="0 0 0 0 0 0 0 1" />
            </feComponentTransfer>
            <feColorMatrix in="spots" type="matrix" values="0 0 0 0 0.075  0 0 0 0 0.22  0 0 0 0 0.24  0.1 0.1 0.1 0 0" />
          </filter>

          <filter id="pulp-clouds" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="5" seed="11" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.055  0 0 0 0 0.455  0 0 0 0 0.565  0.24 0.24 0.24 0 0" />
          </filter>
          <filter id="pulp-flecks" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" seed="53" stitchTiles="stitch" result="noise" />
            <feComponentTransfer in="noise" result="flecks">
              <feFuncR type="discrete" tableValues="0 0 0 0 0 0 1" />
              <feFuncG type="discrete" tableValues="0 0 0 0 0 0 1" />
              <feFuncB type="discrete" tableValues="0 0 0 0 0 0 1" />
            </feComponentTransfer>
            <feColorMatrix in="flecks" type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 0 0.18  0.12 0.12 0.12 0 0" />
          </filter>

          <filter id="sand-relief" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed="71" stitchTiles="stitch" result="surface" />
            <feDiffuseLighting in="surface" surfaceScale="1.8" diffuseConstant="0.9" lightingColor="#e7ffff" result="light">
              <feDistantLight azimuth="225" elevation="48" />
            </feDiffuseLighting>
            <feBlend in="surface" in2="light" mode="soft-light" />
          </filter>
          <filter id="sand-pigment" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.38" numOctaves="2" seed="79" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.055  0 0 0 0 0.455  0 0 0 0 0.565  0.16 0.16 0.16 0 0" />
          </filter>

          <filter id="mineral-clouds" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency="0.055" numOctaves="4" seed="97" stitchTiles="stitch" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="0.35" result="softNoise" />
            <feColorMatrix in="softNoise" type="matrix" values="0 0 0 0 0.055  0 0 0 0 0.455  0 0 0 0 0.565  0.18 0.18 0.18 0 0" />
          </filter>
          <filter id="mineral-dust" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.34" numOctaves="2" seed="101" stitchTiles="stitch" result="noise" />
            <feComponentTransfer in="noise" result="dust">
              <feFuncR type="discrete" tableValues="0 0 0 0 0 0 0 0 1" />
              <feFuncG type="discrete" tableValues="0 0 0 0 0 0 0 0 1" />
              <feFuncB type="discrete" tableValues="0 0 0 0 0 0 0 0 1" />
            </feComponentTransfer>
            <feColorMatrix in="dust" type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.08  0 0 0 0 0.08  0.14 0.14 0.14 0 0" />
          </filter>
        </defs>

        <g className={`${styles.textureVariant} ${styles.fiberTexture}`}>
          <rect width="100%" height="100%" fill="#e9efed" />
          <rect width="100%" height="100%" filter="url(#paper-fibers)" opacity="0.28" />
          <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="0.5" />
          <rect width="100%" height="100%" filter="url(#paper-impurities)" opacity="0.42" />
        </g>
        <g className={`${styles.textureVariant} ${styles.pulpTexture}`}>
          <rect width="100%" height="100%" fill="#e5ebe7" />
          <rect width="100%" height="100%" filter="url(#pulp-clouds)" opacity="0.42" />
          <rect width="100%" height="100%" filter="url(#pulp-flecks)" opacity="0.62" />
          <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="0.28" />
        </g>
        <g className={`${styles.textureVariant} ${styles.sandTexture}`}>
          <rect width="100%" height="100%" fill="#e8efee" />
          <rect width="100%" height="100%" filter="url(#sand-relief)" opacity="0.3" />
          <rect width="100%" height="100%" filter="url(#sand-pigment)" opacity="0.3" />
        </g>
        <g className={`${styles.textureVariant} ${styles.mineralTexture}`}>
          <rect width="100%" height="100%" fill="#e4eae8" />
          <rect width="100%" height="100%" filter="url(#mineral-clouds)" opacity="0.48" />
          <rect width="100%" height="100%" filter="url(#mineral-dust)" opacity="0.72" />
          <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="0.22" />
        </g>
      </svg>

      <article className={styles.specimen}>
        <p className={styles.kicker}>MATERIAL STUDY / 01</p>
        <h1>粗粝，但不喧哗。</h1>
        <p className={styles.lead}>
          纸张从来不是纯白的。细小纤维、偶然留下的杂质，以及油墨渗入表面后的轻微毛边，构成了它真正的质感。
        </p>

        <div className={styles.bodyCopy}>
          <p>
            屏幕上的背景也可以保留这种不完美。青色颗粒藏在浅灰白纸底里，近看能发现密度变化，远看仍是一片安静、稳定的阅读区域。
          </p>
          <blockquote>
            好的纹理不应该先于内容被看见，但它应该让纯色背景不再显得廉价。
          </blockquote>
          <pre>
            <code>{`const texture = {
  base: '#e9efed',
  pigment: '#0e7490',
  character: 'unfinished',
}`}</code>
          </pre>
        </div>

        <footer className={styles.footer}>
          <span>XUYI / TEXTURE LAB</span>
          <span>#0E7490</span>
        </footer>
      </article>
    </main>
  )
}
