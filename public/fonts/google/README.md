# Self-hosted fonts

Latin subsets of three Google Fonts, downloaded once so pages do not depend on
`fonts.googleapis.com` / `fonts.gstatic.com` at runtime or build time
(slow or blocked in some regions).

| File | Family | Notes |
|---|---|---|
| `bricolage-grotesque-latin.woff2` | Bricolage Grotesque | variable: wght 200–800, opsz 12–96 |
| `silkscreen-latin.woff2` | Silkscreen | pixel font, weight 400 |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | variable: wght 400–800 |

All three are licensed under the SIL Open Font License 1.1.
To refresh: request the family CSS from Google Fonts with a modern browser
User-Agent, download the `latin` `woff2` files, and keep `fonts.css` in sync.
