# 部署进度清单 — fancrafti.com

按顺序打勾，完成一项再做下一项。

---

## 阶段 1：本地确认（你当前这一步）

项目目录：
```
C:\Users\admin\.cursor\projects\empty-window\geo-commerce
```

```powershell
cd C:\Users\admin\.cursor\projects\empty-window\geo-commerce
npm install
npm run dev
```

- [ ] 浏览器打开 http://localhost:3000
- [ ] 左侧有侧栏菜单，右侧是仪表盘（不是文字竖排一列）
- [ ] 按 Ctrl+Shift+R 硬刷新后仍正常

---

## 阶段 2：准备 GitHub 仓库（Vercel 部署用）

1. 登录 https://github.com → New repository → 名称 `geo-commerce` → Create
2. 在本机 PowerShell 执行（把 URL 换成你的仓库）：

```powershell
cd C:\Users\admin\.cursor\projects\empty-window\geo-commerce
git init
git add .
git commit -m "GEO Commerce for FanCrafti"
git branch -M main
git remote add origin https://github.com/你的用户名/geo-commerce.git
git push -u origin main
```

- [ ] GitHub 上能看到代码

---

## 阶段 3：创建云数据库（Neon，免费）

1. 打开 https://neon.tech → Sign up
2. New Project → 复制 **Connection string**（PostgreSQL）
   形如：`postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

3. 用编辑器打开本机文件：
   ```
   C:\Users\admin\.cursor\projects\empty-window\geo-commerce\prisma\schema.prisma
   ```
   第 6 行改为：
   ```prisma
   provider = "postgresql"
   ```

4. 在本机执行（把连接串换成你的）：

```powershell
cd C:\Users\admin\.cursor\projects\empty-window\geo-commerce
$env:DATABASE_URL="postgresql://你的连接串"
npx prisma db push
npm run db:seed:fancrafti
```

5. 提交 schema 变更：

```powershell
git add prisma/schema.prisma
git commit -m "Use PostgreSQL for production"
git push
```

- [ ] Neon 里能看到 Site、Product 等表
- [ ] seed 脚本输出了 API Key（复制保存）

---

## 阶段 4：Vercel 部署 GEO 后台

1. 打开 https://vercel.com → 用 GitHub 登录
2. **Add New → Project** → 选择 `geo-commerce`
3. **Environment Variables** 添加：

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neon 的 PostgreSQL 连接串 |
| `NEXT_PUBLIC_APP_URL` | 先留空，部署后填 Vercel 域名 |
| `NEXT_PUBLIC_APP_NAME` | `GEO Commerce` |

4. 点击 **Deploy**，等待完成
5. 得到地址，例如：`https://geo-commerce-xxx.vercel.app`
6. 回到 Vercel → Settings → Environment Variables → 把 `NEXT_PUBLIC_APP_URL` 改为该地址 → **Redeploy**

- [ ] 公网地址能打开后台且界面正常

### （可选）绑定子域名 geo.fancrafti.com

1. Vercel 项目 → Settings → Domains → 添加 `geo.fancrafti.com`
2. 到域名 DNS（Cloudflare / 注册商）添加 CNAME：
   - 名称：`geo`
   - 目标：`cname.vercel-dns.com`（以 Vercel 页面提示为准）
3. 更新 `NEXT_PUBLIC_APP_URL=https://geo.fancrafti.com` → Redeploy

- [ ] https://geo.fancrafti.com 可访问（或暂用 vercel.app 域名）

---

## 阶段 5：WordPress 插件（fancrafti.com）

### 插件文件位置（你电脑上）

```
C:\Users\admin\.cursor\projects\empty-window\geo-commerce\wordpress\geo-commerce-connector\
```

内含：
- `geo-commerce-connector.php`
- `readme.txt`

### 上传到服务器

目标路径（cPanel / FTP）：
```
public_html/wp-content/plugins/geo-commerce-connector/
```

- [ ] 插件文件夹已上传

### WordPress 后台配置

1. https://fancrafti.com/wp-admin → 插件 → 启用 **GEO Commerce Connector**
2. **设置 → GEO Commerce**：

| 字段 | 填写 |
|------|------|
| GEO API 地址 | `https://geo-commerce-xxx.vercel.app` 或 `https://geo.fancrafti.com` |
| API 密钥 | 阶段 3 seed 输出的 `geo_...` 或后台 WordPress 页复制 |
| 启用同步 | ✓ |

- [ ] 插件已保存

---

## 阶段 6：验证同步

1. WooCommerce 编辑任意产品 → **更新**
2. GEO 后台 → **产品 GEO** → 应出现产品
3. 测试订单或改订单状态 → **订单管理** → 应出现 `WC-订单号`

- [ ] 产品同步 OK
- [ ] 订单同步 OK

---

## 阶段 7：GEO 优化（上线后）

1. **GEO 工具箱** → 生成 llms.txt → 上传到 fancrafti 根目录
2. 验证：https://fancrafti.com/llms.txt
3. 低分 SKU → 描述增强 → 贴回 WooCommerce
4. **AI 引用追踪** 记录测试查询结果

---

## 你现在卡在哪一步？

回复对应数字，我按你的进度逐步带你做：

- **1** — 本地界面仍有问题  
- **2** — 需要帮写 GitHub / Git 命令  
- **3** — Neon 数据库配置  
- **4** — Vercel 部署  
- **5** — WordPress 插件上传  
- **6** — 同步失败排查  
