# WordPress / WooCommerce 接入指南

## 架构说明

```
WordPress + WooCommerce
        │  插件自动 POST
        ▼
GEO Commerce API (/api/integrations/wordpress/*)
        │
        ▼
管理后台（产品 GEO、订单、审计、llms.txt）
```

## 步骤

### 1. 启动 GEO Commerce 后台

```bash
npx prisma db push
npm run db:seed
npm run dev
```

### 2. 添加 WordPress 站点

1. 打开 **站点管理** → 平台选择 **WordPress + WooCommerce**
2. 填写域名（如 `myshop.com`）与 WordPress 地址（`https://myshop.com`）
3. 打开 **WordPress** 集成页，复制 **API 密钥**

### 3. 安装插件

将 `wordpress/geo-commerce-connector` 上传到：

`wp-content/plugins/geo-commerce-connector/`

在 WordPress 后台启用插件，并确保 **WooCommerce** 已安装。

### 4. 配置插件

**设置 → GEO Commerce**

| 字段 | 示例 |
|------|------|
| GEO API 地址 | `http://localhost:3000` 或你的云服务器地址 |
| API 密钥 | 从后台复制的 `geo_xxx...` |

### 5. 验证同步

- 在 WooCommerce 编辑并保存任意产品 → **产品 GEO** 应出现对应条目
- 创建或更新订单状态 → **订单管理** 应出现 `WC-{订单号}`

## 同步规则

| WooCommerce 事件 | GEO Commerce |
|------------------|--------------|
| 保存产品 |  upsert 产品 + 自动 GEO 审计评分 |
| 订单新建 / 状态变更 | upsert 订单（用户 ID、SKU、数量、地址、电话、邮箱） |

订单号前缀为 `WC-`，避免与手动录入订单冲突。

## 远程部署注意

若 WordPress 在公网、GEO 后台在本地，需使用 **ngrok** 或把 GEO Commerce 部署到公网服务器，否则 WordPress 无法访问 `localhost`。

生产环境建议：

```env
NEXT_PUBLIC_APP_URL=https://geo.yourdomain.com
```

## llms.txt 放到 WordPress

1. 在 GEO 工具箱生成 `llms.txt`
2. 复制内容到 WordPress 根目录 `llms.txt`（FTP 或文件管理器）
3. 或通过 Nginx/Apache 将 `/llms.txt` 指向静态文件

## 常见问题

**Q: 同步无数据？**  
检查 API 密钥、API 地址、插件是否启用、WooCommerce 是否激活。

**Q: 访客订单用户 ID？**  
显示为 `guest`；登录用户为 WooCommerce `customer_id`。

**Q: 仅 WordPress 无 WooCommerce？**  
产品可同步；订单同步需要 WooCommerce。
