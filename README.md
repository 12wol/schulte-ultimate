# 舒马特测试终极无敌版（schulte-ultimate）

朋友间使用的舒尔特方格 Web 端：登录账号、每次成绩入库、按日查询、每日最快/最慢/平均、多日趋势、排行榜、开发者日志。UI 使用 [animal-island-ui](https://github.com/guokaigdg/animal-island-ui)（动森风格，CC BY-NC，仅限非商用）。

## 本地启动（约 10 分钟）

### 1. Supabase

1. 打开 [supabase.com](https://supabase.com) 新建项目  
2. **Project Settings → API**：复制 `Project URL` 与 `anon` `public` key  
3. **SQL Editor**：粘贴并执行 `supabase/migrations/001_init.sql`  
4. **Authentication → Providers → Email**  
   - **必须关掉 Confirm email**（不要邮箱验证）  
5. 若你之前已执行过 `001_init.sql`，再执行一次 `002_username_login.sql`（用户名登录）

登录方式为 **用户名 + 密码**（用户名全局唯一，3～20 位英文/数字/下划线），不需要真实邮箱。

默认开发者口令（可在 SQL 里改 `app_config.developer_passcode`）：

```text
island-dev-2026
```

### 2. 环境变量

```bash
cp .env.example .env.local
```

填入：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. 安装与运行

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址即可。

## 一键上线（Vercel，最省事）

1. 把本仓库推到 GitHub  
2. 打开 [vercel.com](https://vercel.com) → Import 该仓库  
3. Framework 选 Vite，Root 保持默认  
4. Environment Variables 添加与 `.env.local` 相同的两个 `VITE_*`  
5. Deploy → 把生成的 `https://xxx.vercel.app` 发给朋友  

以后改代码 `git push` 会自动重新部署。

## 功能地图

| 页面 | 作用 |
|------|------|
| 小岛 | 总览、变体入口（后续可扩） |
| 测试 | 舒尔特方格 3×3～7×7，完成后自动入库 |
| 今日 | 当日最快 / 最慢 / 平均 + 每一次明细 |
| 趋势 | 近 7 / 14 / 30 日三条折线 |
| 历史 | 按日期查看当日指标与明细 |
| 排行 | 今日榜 / 总榜（同网格可比） |
| 设置 | 昵称、默认网格、开发者口令解锁 |
| 日志 | 仅开发者可见的操作与错误日志 |

## 扩展新变体

1. 在 `src/variants/registry.ts` 增加条目（先可标 `coming_soon`）  
2. 在 `supabase` 的 `test_variants` 表插入对应 `id`  
3. 增加独立棋盘组件，并在 `PlayPage` 按 `variant_id` 路由  

`test_attempts.meta` 为 JSON，可存放变体专属字段，无需改表结构。

## 许可说明

本项目业务代码可按你自己的约定分享给朋友使用。UI 组件库 `animal-island-ui` 为 **CC BY-NC 4.0**，不可商用。
