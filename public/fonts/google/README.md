# Self-hosted fonts

Latin subsets of Google Fonts, downloaded once so pages do not depend on
`fonts.googleapis.com` / `fonts.gstatic.com` at runtime or build time
(slow or blocked in some regions).

| File | Family | Notes |
|---|---|---|
| `newsreader-normal-latin.woff2`, `newsreader-italic-latin.woff2` | Newsreader | variable serif: wght 300–700, used for display headings |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | variable: wght 400–800 |
| `silkscreen-latin.woff2` | Silkscreen | bitmap pixel font, weight 400; used only for numerals (time-line percentages, journal dates, traffic stats) |

All are licensed under the SIL Open Font License 1.1.
To refresh: request the family CSS from Google Fonts with a modern browser
User-Agent, download the `latin` `woff2` files, and keep `fonts.css` in sync.
