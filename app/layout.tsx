import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import { RouteTransitionIndicator } from "@/components/RouteTransitionIndicator";
import { ToastProvider } from "@/components/Toast";
import { CustomJsInjector } from "@/components/CustomJsInjector";
import {
  FONT_CONFIG,
} from "@/lib/appearance";
import { getAppCloudflareEnv } from "@/lib/cloudflare";
import { getSetting } from "@/lib/db";
import { getSiteUrl, getSiteUrlObject } from "@/lib/site-config";

const geistSans = localFont({
  src: [
    { path: "./fonts/geist/Geist-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/geist/Geist-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/geist/Geist-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/geist/Geist-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["system-ui", "Arial", "Helvetica", "sans-serif"],
});

const geistMono = localFont({
  src: [
    { path: "./fonts/geist/GeistMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/geist/GeistMono-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/geist/GeistMono-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/geist/GeistMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["SFMono-Regular", "Consolas", "Monaco", "monospace"],
});

const SITE_URL = getSiteUrl()
const ICON_VERSION = '20260506'

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: "Cerebellum",
    template: "%s · Cerebellum",
  },
  description: '记录思考，分享所学，留住当下。技术、生活、读书笔记的数字花园。',
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_VERSION}`, sizes: 'any' },
      { url: `/icon-192.png?v=${ICON_VERSION}`, sizes: '192x192', type: 'image/png' },
      { url: `/icon-512.png?v=${ICON_VERSION}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: `/manifest.json?v=${ICON_VERSION}`,
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: "Cerebellum",
    title: "Cerebellum",
    description: '记录思考，分享所学，留住当下。技术、生活、读书笔记的数字花园。',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: "Cerebellum",
      },
    ],
  },
  twitter: {
    card: 'summary',
    site: '@vista8',
    creator: '@vista8',
    title: "Cerebellum",
    description: '记录思考，分享所学，留住当下。技术、生活、读书笔记的数字花园。',
    images: ['/icon-512.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let customJs = ''
  let bodyFont = ''
  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const [customJsValue, bodyFontValue] = await Promise.all([
        getSetting(env.DB, 'custom_js'),
        getSetting(env.DB, 'body_font'),
      ])
      customJs = customJsValue || ''
      bodyFont = bodyFontValue || ''
    }
  } catch {}

  const font = FONT_CONFIG[bodyFont]

  const appearanceApplyScript = `
(function(){
  var f = ${JSON.stringify(FONT_CONFIG)};
  var k = "${bodyFont || ''}";
  function applyFont(key) {
    var c = f[key];
    document.documentElement.setAttribute('data-font', key || 'default');
    if (c) {
      document.documentElement.style.setProperty('--body-font', c.family);
      if (c.link && !document.getElementById('qm-font-link')) {
        var l = document.createElement('link');
        l.id = 'qm-font-link';
        l.rel = 'stylesheet';
        l.href = c.link;
        document.head.appendChild(l);
      }
    } else {
      document.documentElement.style.removeProperty('--body-font');
    }
  }
  applyFont(k);
})();
`

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-font={bodyFont || 'default'}
      data-theme="refined"
    >
      <head>
        {font?.link && <link rel="stylesheet" href={font.link} />}
        {font && (
          <style dangerouslySetInnerHTML={{ __html: `:root { --body-font: ${font.family}; }` }} />
        )}
        <Script
          id="appearance-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: appearanceApplyScript }}
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="66b435e0-5ca6-4001-9716-7faa4760ca9d"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <GlobalShortcuts />
          <Suspense fallback={null}>
            <RouteTransitionIndicator />
          </Suspense>
          {children}
        </ToastProvider>
        {customJs && <CustomJsInjector code={customJs} />}
      </body>
    </html>
  );
}
