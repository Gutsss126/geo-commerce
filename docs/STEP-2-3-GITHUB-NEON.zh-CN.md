# 阶段 2 & 3：GitHub + Neon 数据库（界面 OK 之后）

## 阶段 2：推送到 GitHub（约 5 分钟）

### 2.1 在 GitHub 创建空仓库

1. 打开 https://github.com/new  
2. Repository name：`geo-commerce`  
3. 选 **Private**（推荐）或 Public  
4. **不要**勾选 "Add a README"（本地已有代码）  
5. 点击 **Create repository**

### 2.2 在本机推送（复制 GitHub 页上的命令，或执行下面）

项目目录（必须在此目录执行）：

```
C:\Users\admin\.cursor\projects\empty-window\geo-commerce
```

```powershell
cd C:\Users\admin\.cursor\projects\empty-window\geo-commerce

git branch -M main
git remote add origin https://github.com/你的GitHub用户名/geo-commerce.git
git push -u origin main
```

> 本地已完成 `git init` 和首次 commit，你只需添加 remote 并 push。

---

## 阶段 3：Neon 数据库（约 10 分钟）

Vercel 不能使用 SQLite，必须用 PostgreSQL。

### 3.1 注册 Neon

1. https://neon.tech → Sign up（可用 GitHub 登录）  
2. **New Project** → 名称 `geo-commerce` → Create  
3. Dashboard → **Connection string** → 选 **Pooled connection** → 复制  
   形如：  
   `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

### 3.2 修改 Prisma 为 PostgreSQL

用编辑器打开：

```
C:\Users\admin\.cursor\projects\empty-window\geo-commerce\prisma\schema.prisma
```

第 5–7 行改为：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3.3 初始化云数据库并导入 FanCrafti

PowerShell（**把连接串换成你的 Neon 字符串**）：

```powershell
cd C:\Users\admin\.cursor\projects\empty-window\geo-commerce

$env:DATABASE_URL="postgresql://你的Neon连接串"
npx prisma db push
npm run db:seed:fancrafti
```

终端会输出 **API Key**（`geo_...`）→ **复制保存**，WordPress 插件要用。

### 3.4 提交并推送 schema 变更

```powershell
git add prisma/schema.prisma
git commit -m "Switch to PostgreSQL for Vercel deployment"
git push
```

---

## 阶段 4 预告：Vercel（Neon 完成后）

1. https://vercel.com → Import `geo-commerce` 仓库  
2. Environment Variables：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | Neon 连接串（与上面相同） |
| `NEXT_PUBLIC_APP_URL` | 部署后填，如 `https://geo-commerce-xxx.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `GEO Commerce` |

3. Deploy → 打开 Vercel 给的 URL → 确认界面正常  
4. Settings → 更新 `NEXT_PUBLIC_APP_URL` → Redeploy  

---

## 完成后回复我

- **「GitHub 好了」** → 我带你配 Vercel  
- **「Neon 好了」** + 你的 Vercel 域名 → 我带你装 WordPress 插件  
- 遇到报错 → 把完整报错贴过来  
