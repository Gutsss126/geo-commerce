# GEO Commerce

面向**电商独立站**的 **GEO（Generative Engine Optimization，生成式引擎优化）** 工具与管理后台。

**默认推荐栈：WordPress + WooCommerce**（内置插件同步产品与订单）。

帮助品牌在 ChatGPT、Perplexity、Google AI Overview、Claude 等 AI 搜索与问答场景中被**发现、理解并正确引用**。

## 功能概览

| 模块 | 说明 |
|------|------|
| **管理后台** | 站点、产品、审计报告、引用追踪 |
| **GEO 审计引擎** | 站点级 / 产品级评分与可执行建议 |
| **工具箱** | `llms.txt`、JSON-LD Schema、FAQ 建议、描述增强 |
| **订单管理** | 用户 ID、SKU、数量、收件地址、联系方式、状态流转 |
| **REST API** | 供 Shopify 主题、App 或 CI 集成 |
| **CLI** | 本地或流水线批量审计 |

## 快速开始

```bash
cd geo-commerce
npm install
npx prisma db push
npm run db:seed
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

演示数据包含 WordPress 站点 `demo-outdoor.com`、2 个 SKU 与 2 笔订单。

## WordPress / WooCommerce 快速接入

1. 后台 **站点管理** 添加站点（平台选 WordPress），在 **WordPress** 页复制 API 密钥  
2. 将 `wordpress/geo-commerce-connector` 上传到 `wp-content/plugins/` 并启用  
3. **设置 → GEO Commerce** 填写 API 地址与密钥  
4. 保存 WooCommerce 产品 / 订单后，数据自动出现在本后台  

详细说明见 [docs/wordpress-setup.zh-CN.md](docs/wordpress-setup.zh-CN.md)。

**已上线 WordPress 店（如 [fancrafti.com](https://fancrafti.com/)）** → [docs/fancrafti-production.md](docs/fancrafti-production.md)，运行 `npm run db:seed:fancrafti` 预置站点。

## 管理后台页面

- `/` — 总览仪表盘
- `/sites` — 站点与品牌实体
- `/products` — 产品 GEO 分与审计
- `/orders` — 订单列表、创建、详情与状态更新
- `/orders/[id]` — 单订单详情（地址、联系方式、SKU 明细）
- `/audits` — 历史审计明细
- `/tools` — llms.txt、Schema、描述增强
- `/citations` — AI 引用记录（可扩展自动抓取）
- `/integrations/wordpress` — WordPress 插件配置与 API 密钥

## API 示例

```bash
# 产品审计（无需入库）
curl -X POST http://localhost:3000/api/audit/product \
  -H "Content-Type: application/json" \
  -d '{"title":"超轻帐篷","description":"重量1.2kg，防水3000mm","category":"户外/帐篷"}'

# 获取 llms.txt（需先 seed 或创建站点）
curl http://localhost:3000/api/llms/demo-outdoor.com

# 产品 JSON-LD
curl "http://localhost:3000/api/schema/product?domain=demo-outdoor.com&slug=ultralight-tent-pro-2p"

# 创建订单
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "<站点ID>",
    "userId": "user_001",
    "contactName": "张三",
    "contactPhone": "13800138000",
    "contactEmail": "zhang@example.com",
    "shippingCountry": "CN",
    "shippingProvince": "广东省",
    "shippingCity": "深圳市",
    "shippingAddress": "南山区科技园南路 1 号",
    "shippingPostalCode": "518000",
    "items": [{ "sku": "TENT-PRO-2P", "quantity": 2 }]
  }'

# 按用户 ID 查询订单
curl "http://localhost:3000/api/orders?userId=user_8f3a21bc"
```

## CLI 示例

```bash
npm run cli -- audit:product --title "双人帐篷" --desc "1.2kg 3000mm防水"
npm run cli -- llms --name "Demo" --domain example.com
npm run cli -- schema --title "帐篷" --brand "Demo" --price 189.99
```

## 独立站部署建议

1. 将 `/api/llms/[domain]` 反向代理到商店根路径的 `llms.txt`（或直接在主题中托管生成内容）。
2. 在产品 Liquid / 模板中嵌入 `/api/schema/product` 返回的 JSON-LD。
3. 对 Top 20 SKU 定期跑 `audit:product`，GEO 分 &lt; 60 的优先改描述与 FAQ。
4. 在 `/citations` 记录各 AI 引擎实测引用，迭代内容策略。

## 技术栈

- Next.js 15 · React 19 · Tailwind CSS 4
- Prisma + SQLite（可换 PostgreSQL）
- TypeScript · Zod

## WordPress API（插件使用）

```bash
# 同步产品（Header: X-GEO-API-Key）
curl -X POST http://localhost:3000/api/integrations/wordpress/products \
  -H "X-GEO-API-Key: geo_xxx" -H "Content-Type: application/json" \
  -d '{"externalId":"123","title":"帐篷","slug":"tent","sku":"TENT-01","price":99}'

# 同步订单（支持 WooCommerce billing/shipping/line_items 结构）
curl -X POST http://localhost:3000/api/integrations/wordpress/orders \
  -H "X-GEO-API-Key: geo_xxx" -H "Content-Type: application/json" \
  -d @order.json
```

## 后续可扩展

- WordPress 后台一键拉取 llms.txt
- Shopify OAuth 同步产品
- 自动监测 Perplexity / ChatGPT 引用（需第三方 API）
- 多语言 GEO 与 hreflang 检查
- 团队权限与 Webhook 告警

## 许可

MIT
