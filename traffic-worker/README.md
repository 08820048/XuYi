# traffic-stats

Cloudflare Worker：统一返回各产品站点近 30 天访问数据，供博客前端展示。

- 单接口：`GET /api/traffic`
- 数据来源：Cloudflare GraphQL Analytics API（`httpRequests1dGroups`），按 PRODUCTS 里的 Zone 逐个查询
- Token 只存在 Worker Secret 里，不进前端、不进仓库
- 整份响应用 Worker Cache API 缓存 1 小时（`Cache-Control: public, max-age=3600`）

## 响应示例

```json
{
  "updatedAt": "2026-10-01T02:00:00.000Z",
  "rangeDays": 30,
  "products": [
    {
      "name": "产品A",
      "domain": "a.example.com",
      "requests": 123456,
      "pageViews": 78901,
      "bytes": 2345678901,
      "uniquesYesterday": 456,
      "daily": [
        { "date": "2026-04-04", "pageViews": 301 },
        { "date": "2026-04-05", "pageViews": 288 }
      ]
    }
  ]
}
```

统计口径：`requests` / `pageViews` / `bytes` 为近 30 个完整自然日（UTC，含昨天、不含今天）的逐日累加；`uniquesYesterday` 只取昨天的 `uniq.uniques`（独立访客不能跨天相加）；`daily` 为近 180 个完整自然日的逐日 `pageViews`（升序），供前端画趋势图和算环比。

## 配置

编辑 `wrangler.toml`：

1. `CORS_ORIGIN`：改成你的博客域名（只放行这些来源，多个来源用英文逗号分隔，如 `https://xuyi.dev,http://localhost:3000`）
2. `PRODUCTS`：JSON 数组，每项 `{ name, domain, zoneId }`，把 `zoneId` 换成真实 Zone ID（Cloudflare 控制台 Zone Overview 页面右侧可见）。只写要展示的站点，测试站不要加进来

## Token 权限

创建 API Token（Cloudflare 控制台 → My Profile → API Tokens）：

- 权限：**Account Analytics Read** + **Zone Analytics Read**
- 资源：只勾选 PRODUCTS 里要展示的那几个 Zone（不要给 All zones）

## 设置 Secret

```sh
cd traffic-worker
wrangler secret put CF_API_TOKEN
# 粘贴上面创建的 Token
```

不要把 Token 写进 wrangler.toml 或任何仓库文件。

## 部署

```sh
cd traffic-worker
wrangler deploy
```

注意：Worker 的 Cache API 在 `*.workers.dev` 域名下不生效，绑定自定义域后缓存才工作。

## 博客前端调用示例

```js
const res = await fetch('https://traffic-stats.<your-subdomain>.workers.dev/api/traffic')
if (!res.ok) return // 静默降级，不展示统计
const data = await res.json()
// data.products: [{ name, domain, requests, pageViews, bytes, uniquesYesterday }]
```

错误响应也是 JSON（如 `{ "error": "Failed to fetch analytics data" }`），不含 Token 或任何凭证。
