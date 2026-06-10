# FanCrafti (https://fancrafti.com/) 生产环境接入

你的 WordPress 店已在公网；GEO Commerce 管理后台也必须部署在 **HTTPS 公网地址**，插件才能从 `fancrafti.com` 服务器回调同步。

## 推荐架构

```
https://fancrafti.com          ← WordPress + WooCommerce + 插件
        │
        │  HTTPS POST (服务器端，无需 CORS)
        ▼
https://geo.fancrafti.com      ← GEO Commerce 后台（建议子域名）
   或 https://app.fancrafti.com
```

不建议插件指向 `http://localhost:3000`（线上 WP 无法访问你本机）。

---

## 第一步：部署 GEO Commerce 到公网

任选一种方式，得到公网 URL，记为 `GEO_API_BASE`（无末尾斜杠）。

### 方案 A — Vercel（最快）

1. 将 `geo-commerce` 仓库推到 GitHub  
2. [vercel.com](https://vercel.com) → Import 项目  
3. 环境变量：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | PostgreSQL 连接串（Vercel Postgres / Neon / Supabase） |
| `NEXT_PUBLIC_APP_URL` | `https://你的-vercel-域名.vercel.app` 或自定义域名 |
| `NEXT_PUBLIC_APP_NAME` | `GEO Commerce` |

4. 将 `prisma/schema.prisma` 中 `provider` 改为 `postgresql` 后重新 `prisma db push`  
5. Deploy 成功后访问后台，在 **站点管理** 添加 FanCrafti

### 方案 B — 同服务器子域名（fancrafti 同机）

Nginx 反代本机 `3000` 端口到 `geo.fancrafti.com`，并配置 SSL（Certbot）。

```nginx
server {
    listen 443 ssl http2;
    server_name geo.fancrafti.com;

    ssl_certificate     /etc/letsencrypt/live/geo.fancrafti.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/geo.fancrafti.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`.env` 生产配置：

```env
DATABASE_URL="file:./prisma/prod.db"
NEXT_PUBLIC_APP_URL="https://geo.fancrafti.com"
```

---

## 第二步：在 GEO 后台登记 FanCrafti

**站点管理** → 添加站点：

| 字段 | 填写 |
|------|------|
| 品牌名 | FanCrafti |
| 域名 | `fancrafti.com`（不要 https） |
| WordPress 地址 | `https://fancrafti.com` |
| 平台 | WordPress + WooCommerce |

保存后打开 **WordPress** 集成页，复制该站点的 **API 密钥**（`geo_...`）。

也可运行种子脚本预置站点：

```bash
npm run db:seed:fancrafti
```

---

## 第三步：在 fancrafti.com 安装插件

1. FTP / 主机面板上传 `wordpress/geo-commerce-connector` →  
   `wp-content/plugins/geo-commerce-connector/`
2. WordPress 后台 → 插件 → **启用** GEO Commerce Connector  
3. 确认 **WooCommerce** 已启用  
4. **设置 → GEO Commerce**：

| 字段 | 示例 |
|------|------|
| GEO API 地址 | `https://geo.fancrafti.com`（你的实际部署地址） |
| API 密钥 | 从 GEO 后台复制的 `geo_...` |
| 启用同步 | ✓ |

5. 编辑任意 WooCommerce 产品并保存 → 到 GEO 后台 **产品 GEO** 检查  
6. 下一笔测试单或改订单状态 → **订单管理** 应出现 `WC-订单号`

---

## 第四步：GEO 内容落地到 WordPress

| 项目 | 做法 |
|------|------|
| **llms.txt** | GEO 工具箱生成 → 上传到网站根目录 `public_html/llms.txt`，访问 `https://fancrafti.com/llms.txt` 可打开 |
| **JSON-LD** | 用主题/插件插入 Schema，或请求 `GET {GEO_API}/api/schema/product?domain=fancrafti.com&slug=产品slug` |
| **产品描述** | 在 GEO 后台审计低分 SKU，用「描述增强」后贴回 WooCommerce 产品页 |

---

## 验证清单

- [ ] `https://fancrafti.com` 可正常访问  
- [ ] GEO 后台 HTTPS 可访问（非 localhost）  
- [ ] 插件 API 地址与密钥正确  
- [ ] 保存产品后 GEO **产品 GEO** 有数据  
- [ ] 订单变更后 GEO **订单管理** 有 `WC-*` 订单  
- [ ] （可选）`https://fancrafti.com/llms.txt` 可访问  

---

## 故障排查

**插件同步失败**  
- 主机是否允许 `wp_remote_post` 访问外网  
- API 密钥是否与 GEO 后台一致  
- 服务器防火墙是否拦截出站 HTTPS  

**GEO 后台打不开**  
- 检查 Node 进程、Nginx、`NEXT_PUBLIC_APP_URL` 是否与访问域名一致  

**订单没有用户 ID**  
- 访客单为 `guest`；登录用户为 WooCommerce `customer_id`  

---

## 联系信息（插件 / llms.txt）

建议在 llms.txt 的 Contact 使用：`hello@fancrafti.com`（按你实际客服邮箱修改）。
