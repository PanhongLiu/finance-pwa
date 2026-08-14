# 发布到 GitHub Pages（永久免费地址）

> ⚠️ **请用 Git Bash 执行下面的命令，不要用 PowerShell。**
> 在 PowerShell 里会报"git 无法识别"——因为 git 没加进 PowerShell 的 PATH。
> 开始菜单搜索 **Git Bash** 打开即可（git 在那里能直接用）。
> Git Bash 里路径用斜杠，例如：`cd /c/Users/liupanhong/WorkBuddy/2026-08-14-11-19-59`

本项目的源码已经初始化为 Git 仓库，并配置好 GitHub Actions 自动发布工作流  
（`.github/workflows/deploy.yml`）。你只需要在**自己的电脑**上把代码推到 GitHub，  
即可获得一个长期稳定、自动 HTTPS 的地址：`https://<你的GitHub用户名>.github.io/<仓库名>/`

> 数据仍然只存在你手机上（IndexedDB），GitHub 上只放 App 的程序文件，不含任何财务数据。

## 前置条件

- 一个 GitHub 账号（你提供的邮箱是 `liupanhong972@163.com`）。
- 电脑上已安装 Git（本项目环境里已有 `git 2.47.1`）。
- 推荐安装 GitHub CLI（`gh`）：<https://cli.github.com/> （Windows 下载安装包即可）。

## 方式一：用 GitHub CLI（最简单，推荐）

1. 打开终端（PowerShell / Git Bash），登录 GitHub：
   ```bash
   gh auth login
   ```
   按提示选择 GitHub.com、HTTPS、浏览器授权登录。
2. 在项目目录里创建仓库并一键推送（把 `finance-pwa` 换成你想要的仓库名）：
   ```bash
   cd "C:\Users\liupanhong\WorkBuddy\2026-08-14-11-19-59"
   gh repo create finance-pwa --public --source=. --remote=origin --push
   ```
   推送后 GitHub Actions 会自动构建并发布。
3. 等 1～2 分钟，到仓库 **Actions** 标签页看 `Deploy to GitHub Pages` 任务变绿。  
   然后访问：`https://<你的GitHub用户名>.github.io/finance-pwa/`
   > 首次可能需要到仓库 **Settings → Pages** 确认发布环境已启用（Actions 方式通常会自动建好）。

## 方式二：不用 GitHub CLI（用网页 + Git）

1. 浏览器打开 <https://github.com/new> ，新建一个**公开（Public）**&#x4ED3;库，  
   仓库名随意（例如 `finance-pwa`），**不要**勾选 "Add a README"。
2. 在本机终端绑定远程并推送（把 `<用户名>` 和 `<仓库名>` 换成你自己的）：
   ```bash
   cd "C:\Users\liupanhong\WorkBuddy\2026-08-14-11-19-59"
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```
   推送时用户名填 GitHub 账号，密码填 **Personal Access Token**（GitHub 已不支持账号密码推送）。  
   token 在 GitHub → Settings → Developer settings → Personal access tokens 生成，需勾选 `repo` 权限。
3. 同方式一步骤 3，等待 Actions 自动发布。

## 在 iPhone 上打开并"添加到主屏幕"

1. iPhone 的 Safari 打开上面的 `github.io` 地址。
2. 等加载完 → 底部分享 → **添加到主屏幕**。
3. 之后就是全屏 App，可离线使用。

## ⚠️ 重要：关于你已有的数据

- 财务数据按"网址来源"隔离。**每个地址是独立的数据空间**。
- 如果你已经在之前的 CloudStudio 地址里记了数据，请先在那个 App 里  
  **设置 → 导出数据** 备份 JSON；再在新的 `github.io` 地址里 **设置 → 导入数据** 恢复。
- 之后**固定用同一个 `github.io` 地址**，你的数据就会一直跟着这个 App。

## 日后更新代码

改完代码后，在本机终端：

```bash
git add -A && git commit -m "更新说明" && git push
```

GitHub Actions 会自动重新构建发布，无需手动操作。

## 部署失败排查（实战踩坑）

如果 Actions 里 `Deploy to GitHub Pages` 的 **deploy** 步骤报 `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled`，通常是以下原因之一：

1. **仓库是私有的**：GitHub 免费账号的**私有仓库不支持 Pages**。  
   → 解决办法：仓库 **Settings → 拉到最下面 Danger Zone → Change visibility → 改为 Public（公开）**。
2. **Pages 还没开启**：进入仓库 **Settings → Pages**，Source 选 **GitHub Actions**，保存。
3. **推送令牌权限不足**：生成 Personal Access Token 时除了 `repo`，还要勾选 `workflow`（工作流权限），否则推不上去。

改完对应设置后，到 **Actions** 标签页找到失败的那次运行，点 **Re-run all jobs** 重新跑即可，无需重新推送。
