# XuYi

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/08820048/XuYi)

XuYi 是基于开源项目 [qiaomu-blog-opensource](https://github.com/joeseesun/qiaomu-blog-opensource) 二次调整的个人博客系统。

原项目已经提供了完整的博客前台、后台管理、编辑器、AI 写作辅助、图片上传、Cloudflare Workers / D1 / R2 部署能力。这个仓库在此基础上做了一些面向个人使用的改动和增强，让它更适合作为 `xuyi.dev` 的长期写作站点。

## 主要改动

- 将站点品牌、README、仓库链接和页面展示统一为 `XuYi`。
- 将 footer 和文章作者相关文案统一调整为 `XuYi`。
- 修复 Cloudflare Workers Builds 部署流程，改为生成 OpenNext 产物后再部署。
- 对齐线上 Worker 名称、D1 数据库和 R2 存储桶绑定，适配当前 Cloudflare 项目。
- 新增文章详情页代码块高亮，支持常见代码语言自动识别。
- 新增编辑器代码块高亮能力，让写作时也能看到更接近前台的代码展示效果。
- 新增数学公式支持，粘贴 `$...$` / `$$...$$` 形式的 LaTeX 内容后可在编辑器和前台详情页渲染。
- 新增可配置“关于我”页面，后台填写 Markdown，前台独立渲染。
- 调整本地开发配置，避免本地启动时强依赖 Cloudflare 远程绑定。
- 初始化线上 D1 表结构和默认设置，补齐后台登录所需 secret。
- 支持 DeepSeek 作为默认文本 AI provider，并将摘要、标签、slug 生成切换到 DeepSeek profile。

## 功能概览

- 前台博客首页、文章详情、分类页、搜索页。
- 后台管理文章、分类、站点设置、主题、导航、API Token。
- 后台管理友联，并在前台提供独立的友联页面。
- 后台配置“关于我”Markdown，并在前台提供 `/about` 页面。
- Novel / Tiptap 富文本编辑器。
- 支持代码块、数学公式、表格、图片、音频、视频、YouTube、Twitter/X 嵌入。
- 支持文章草稿、公开发布、密码访问、隐藏文章。
- 支持 AI 文本改写、摘要生成、标签生成、slug 生成。
- 支持首页邮件订阅（Resend 发送 + 一键退订），发布新文章时邮件通知订阅者。
- 支持图片上传到 Cloudflare R2。
- 支持部署到 Cloudflare Workers，并使用 D1 作为数据库。

## 本地启动

```bash
git clone https://github.com/08820048/XuYi.git
cd XuYi
npm install
cp .env.example .env.local
npm run db:init:local
npm run dev
```

本地访问：

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 编辑器：`http://localhost:3000/editor`

本地开发使用独立的本地 D1 和 R2，不会读写线上数据。首次启动前运行 `npm run db:init:local` 创建表结构和默认设置。
本地后台密码来自 `.env.local` 中的 `ADMIN_PASSWORD`。

## 环境变量

本地开发至少需要：

```env
ADMIN_PASSWORD=your-admin-password
ADMIN_TOKEN_SALT=random-string
AI_CONFIG_ENCRYPTION_SECRET=another-random-string
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

线上部署时，这些值应该配置到 Cloudflare Worker 的 Variables / Secrets 中：

- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SALT`
- `AI_CONFIG_ENCRYPTION_SECRET`
- `AI_API_KEY`，可选，用于外部 AI provider
- `RESEND_API_KEY`，可选，启用首页邮件订阅与新文章通知
- `NEWSLETTER_FROM_EMAIL`，可选，订阅邮件发件人地址

## 邮件订阅

首页分页下方有订阅表单，读者提交邮箱后立即订阅。之后每次发布新文章，订阅者会收到一封带文章链接和退订入口的通知邮件。

启用步骤：

1. 注册 [Resend](https://resend.com)，在控制台为博客域名添加 DNS 验证记录。
2. 设置 secret：`npx wrangler secret put RESEND_API_KEY -c wrangler.toml`。
3. 在 `wrangler.toml` 的 `[vars]` 里把 `NEWSLETTER_FROM_EMAIL` 改成自有域名发件地址，例如 `XuYi <blog@xuyi.dev>`。

未配置 `RESEND_API_KEY` 时订阅表单会静默失败提示，不影响其他功能；免费额度为每天 100 封、每月 3000 封。

## Cloudflare 部署

这个项目部署目标是 Cloudflare Workers：

- Workers 运行 Next.js / OpenNext 产物。
- D1 存储文章、分类、站点配置和 AI 配置。
- R2 存储上传图片和附件。

可以直接使用 README 顶部的 Deploy Button，也可以本地用 CLI 部署：

```bash
npm install
npx wrangler login
npm run build
npx wrangler deploy
```

首次部署后需要初始化远程 D1：

```bash
npx wrangler d1 execute DB --remote --file=db/schema.sql -c wrangler.toml
npx wrangler d1 execute DB --remote --file=db/seed-template.sql -c wrangler.toml
```

设置线上管理员 secret：

```bash
npx wrangler secret put ADMIN_PASSWORD -c wrangler.toml
npx wrangler secret put ADMIN_TOKEN_SALT -c wrangler.toml
npx wrangler secret put AI_CONFIG_ENCRYPTION_SECRET -c wrangler.toml
```

## AI 配置

后台可以配置不同 AI provider。当前推荐的文本模型配置：

- Provider：`DeepSeek`
- Base URL：`https://api.deepseek.com/v1`
- Model：`deepseek-chat`

配置完成后，可以在后台的 AI 生成器设置中，将摘要、标签、slug 等文本生成任务绑定到该 provider profile。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- OpenNext for Cloudflare
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Novel / Tiptap
- KaTeX
- highlight.js

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run db:init:local` | 初始化或修复本地 D1 数据库 |
| `npm run lint` | 代码检查 |
| `npm run build` | 构建 OpenNext / Cloudflare Workers 产物 |
| `npm run preview` | 本地 Worker 预览 |
| `npm run deploy` | 使用项目脚本部署到 Cloudflare |
| `npm run cf:init` | 初始化 Cloudflare 资源 |

## 致谢

本项目基于 [qiaomu-blog-opensource](https://github.com/joeseesun/qiaomu-blog-opensource) 调整而来，感谢原项目提供的完整博客系统基础。

## 作者

- XuYi
- GitHub：<https://github.com/08820048>
- Blog：<https://xuyi.dev>
