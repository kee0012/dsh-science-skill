# dsh-science-skill

科研技能中心：把科研技能做成 **DeepSeek Harness 上的一个独立插件**，不依赖 Science Agent。
装上之后你会得到那套东西——技能设置面板、分类标签栏、卡片式技能墙、中文名与中文简介、搜索、
**卡片内直接改分类**、开关、「+ 添加目录」、恢复默认，以及用 `/命令` 直接调用技能。

**左侧栏入口**：插件在左侧栏注册一个「技能」入口，点开就在本区展开技能墙——顶上是分类标签栏
（**可换行**：分类多了会自动排到第二行、第三行），下面按 **4 列卡片**铺开。卡片上是**三个不同的
目标**：点**卡片正文**打开该技能的详情弹窗；点右上角的 **「召唤」** 才把它的 `/命令` 引用插进
**当前会话**的输入框（**不新建会话**）并切回对话——正文点击不会误触发插入；点卡片右下角**带 ▾ 的
分类标签**能把技能直接换到别的分类，改完立即重排，设置页里的同一个技能也会同步（反之亦然）。

> 技能墙为什么在本区而不是左栏内部：原生 DSH 的左栏只声明了
> `sidebar.brand.mark` / `sidebar.brand.name` / `sidebar.toggle.badge` /
> `sidebar.panellist` / `sidebar.workspaces` / `sidebar.settings` /
> `sidebar.footer.action` 这几个孩子槽位，其中唯一能承载任意内容的
> `sidebar.workspaces` 是 `single` 且已被工作区浏览器占用。`sidebar.skills`
> 是 Science Agent 分支自己的构建里才有的座位，在这里注册等于等一个永远不会被声明的槽位，
> 技能墙因此一直不显示。现在走的是官方支持的组合：`sidebar.panellist` 一行入口 + `main`
> 一个面板。

**技能默认目录**：设置 → Science Skill →「技能默认目录」可指定一个目录，之后「+ 添加目录」导入的
技能一律装到那里；清空则回到默认的 `<dataRoot>/skills`。

- **重复导入直接覆盖，不弹确认**。对已经存在的技能再点一次「+ 添加目录」，说明你忘了它已经装过，
  或者下到了新版本——两种情况都只想要新版。所以面板每次都按覆盖导入：老文件夹被保留为
  `.<id>.old-<时间戳>` 备份，你在面板里改过的中文名、分类与示例保留在记录上，`SKILL.md` 换成新的。

指定之后，这个目录就是**唯一**被扫描的技能根（未指定时才回落到 `<dataRoot>/skills` 与
`$DSH_AGENTS_HOME/skills`），所以它不只是「安装目的地」：

- **先把文件夹填满、再来选它，也直接可用**。指向之后，面板下一次读取技能列表时会扫描该目录，
  把**还没有目录记录**的技能登记进 `catalog/data/<记录 id>.json`（adoption），它们随即出现在分类树里，
  不需要重启，也不需要逐个导入。
- **不动你的文件**。adoption 只写数据根下的记录，**从不复制、修改或删除**技能目录里的任何东西；
  已有记录也原样保留（只增不改）。
- **只认这一个目录**，所以不会混进你没选过的技能，也不会出现同名技能来自两个根目录的重复项。
  不再被扫描的旧记录会被排除出索引（记录文件保留，重新指回去就回来了）。
- **手动丢进去的也能收进来**：往目录里新增技能后，点设置面板的「刷新」即可重新扫描并登记；
  无需刷新页面。该按钮还会让宿主为**从未命名过**的技能调用你的默认模型生成中文名与中文一句话
  简介，与「+ 添加目录」导入的技能同等对待。

> 关于中文名：命名走的是**你在 DSH 里的默认对话模型**（`agent-default-model`），不给插件单独配模型。
> 只有「导入」和「刷新」会触发命名，纯扫描到的记录不会自己变成中文——所以先填满文件夹再指过来时，
> 点一次「刷新」即可补齐中文名与简介。生成结果只写进数据根的目录记录，SKILL.md 原文件不动。

对目录本身的要求：每个技能是一个子目录，内含 `SKILL.md`，frontmatter 必须有 `name:` 与 `description:`
（`name` 要能作为 kebab-case 标识：小写字母、数字、单连字符）。**子目录名可以随便起**：

- 目录名本身合规时，它就直接当记录 id（`/命令` 另按 frontmatter `name` 走）；
- 目录名不合规——带大写、空格、点、中文（`OriginPro 2.0.0`、`Vibe Coding 架构师`）——就用
  frontmatter 的 `name` 当记录 id，记录的 `dir_name` 记住真实文件夹，**不重命名、不移动你的文件夹**；
- 两个文件夹声明了同一个 `name`，先扫到的收录，后一个会跳过并说明「技能标识已被占用」；
- 点号开头的子目录视为导入残留，一律忽略。既没有合规目录名、`SKILL.md` 里也没有合规 `name`
  （或整份没有 frontmatter）的文件夹会跳过并给出原因——这种技能宿主本来也加载不了。

**技能详情与「试试这样用」**：点卡片正文会打开该技能的详情弹窗，自上而下是——分类图标、中文名、
`/命令`、「去试试」（等同召唤）、一句简介，然后是 **「试试这样用」**：几条**中文示例提问**，
点任意一条就把这句话**插入当前会话的输入框**（用的是宿主 `InputActions` 的
`insertText(text, span)`，与技能引用同一套 span 协议，不会覆盖后续编辑）。最下面是
**「技能详情」**：该技能 `SKILL.md` 的原文，等宽、限高、可滚动。

示例由**你的默认对话模型**在命名时一并生成（与中文名/简介/分类同一次调用，不额外发请求），
存在记录的 `examples` 字段里。所以：

- **每个技能都会有**：老技能点一次「刷新」补齐，**新导入的技能自动分析**——回填队列的判定是
  「从未命名 **或** 没有示例」，两者任一即入队；
- 模型偶尔没给出示例时**只降级为空数组**，中文名与分类照常保留，不会因示例缺失而整次命名失败；
- 弹窗在示例为空时给一句提示，而不是显示一个空区块。

弹窗靠 `GET /api/dsh-science-skill/skills/detail?id=<技能标识>` 取数，返回记录展示字段加
`examples` 与 `markdown`（上限 20000 字符，超出会带 `truncated`）。`id` 会先按 kebab 形式校验、
再确认解析出的路径确实落在某个技能根之内，因此 `../` 之类的输入读不到根外文件。该路由**不可用时
弹窗不会白屏**：头部与简介用卡片已有字段渲染，两块正文降级为一句提示。

## 它是什么，不是什么

**是**：一个自带宿主半边 + 浏览器半边的 cordis 插件包。有自己的 HTTP 路由前缀
（`/api/dsh-science-skill/*`），有自己的包装配（`cordis.patch.yml`），去掉任何 Science Agent
的东西也能跑。

**不是**：不是把 DSH 的技能内核搬走，也不接管技能发现。内核仍然是权威——它自己合并各提供者的
目录、解析同名技能的胜负、决定模型能看到什么（`packages/skill/*`）。本插件在其之上负责
「科研场景的展示层、分类层与激活开关」，并且**只以提供者的身份**贡献一个来源（见下节），
不 `provide` 内核的服务、不改内核、不动你的 profile 配置。

## 面板里的技能，就是模型能加载的技能

这是本插件存在的**前提**，不是附加功能。技能来自哪个目录由用户选定，如果那个目录不在内核的
发现范围里，面板上再漂亮也没用——点「召唤」插进输入框的 `/命令` 会是一条内核解析不了的命令。

所以插件在宿主半边会**向内核的技能注册表注册一个自己的提供者**（`ctx.skills.registerProvider`），
把它暴露的目录限定为用户配置的「技能默认目录」：

- **用户零配置**：不需要去编辑 profile 或预设里的 `customSkillDirs`，选完目录就完事——这一点对
  开源分发尤其重要，否则每个使用者都要先读一遍宿主的配置文档；
- **加法而非接管**：只注册提供者，**绝不 `provide('skills')`**。服务名每个 isolate 唯一，撞名会让
  内核技能插件的 `apply` 抛异常、把对方整个插件带下线（`dev-notes/failures.md` F12 是同类事故）；
  宿主没有这个服务时（纯 DSH 或老版本）插件照常工作，只是退化为「仅面板可见」；
- **两边不可能说两套话**：提供者与面板 adoption 用的是**同一个校验函数**（`diagnoseSkillDir`），
  也读同一个设置值，所以不会出现「面板显示 111 个、模型只认 80 个」；
- **优先级**：用户选定的目录按 `custom` 语义排（rank 300）——高于环境级 user 根，否则同名技能
  会「面板显示一份、模型加载另一份」，而面板正是用户做选择的地方；低于 project 根，因为工作区
  专属技能更具体。你在 profile 里显式配置的 `customSkillDirs` 仍然赢平局。
- **改设置即时生效**：提供者每次列目录时现读设置，改完立刻反映，不需要重注册。
- **失败是看得见的**：内核没有技能注册表、或注册被拒时，插件**不会静默失去能力**——面板会在
  「技能默认目录」旁给出警告，说明这些技能目前只在面板可见、模型无法加载。对分发来说这条很关键：
  静默降级会让使用者以为插件坏了，却查不到原因。

> 如果你更希望技能由内核的默认根（`$DSH_HOME/skills`、`~/.agents/skills`）来提供，那就把技能放进
> 那些目录、并让本插件的默认目录指向同一个位置——两条路径看到的是同一批文件。

## 它需要什么

| 需要 | 说明 |
| --- | --- |
| DSH `^0.2.0-rc.1` | 宿主半边只依赖 `ctx.webServer`；浏览器半边依赖下面那批官方客户端服务与槽位 |
| 官方客户端服务 | 座位 `slots` / `sessions` / `conversation` / `remote` / `locale` / `inputTriggers` —— **全部写进 `export const inject`，并用属性访问 `ctx.<name>` 读取**（`ctx.get(name)` 读不到声明过的座位，见 `dev-notes/failures.md` F13） |
| `conversation` 的用法 | 座位本身可以声明（官方 `ui-science` 带着同一份名单且正常激活）；「会话作用域」只约束**用法**：插入走 `conversation.input.for(actx)`，不要在根上下文直接调会话方法 |
| **可选**：内核 `skillGate` 挂点 | 见下节。没有它插件照常工作，只是开关不影响模型目录 |
| 运行时 npm 依赖 | **零**。不装任何包，离线机器也能装起来 |

文件系统层面插件只读写**一个数据根**（见「数据放在哪」），不碰机器上其他位置。

### 可选的 `skillGate` 挂点

同一个数据根里可能同时跑着两个插件（例如 Science Agent 自己的 science layer）。这个座位
**由对方 provide，我们只读**：cordis 的服务名每个 isolate 唯一，我们一旦也 `provide`
就会让对方的 `apply` 抛 `service "skillGate" has been registered at <…>`，把对方整个插件（连同
它的 `/science/api/*`）带下线。实测扫描也表明**当前没有任何内核/工具读这个座位**
（见 `dev-notes/failures.md` F12），所以本插件**完全不 provide**，`gate` 对象只服务于自家路由：

```
GET  /api/dsh-science-skill/skill-gate/state              → { ok, pinned: […], active: […] }
POST /api/dsh-science-skill/skill-gate/pin   { name, enabled }
POST /api/dsh-science-skill/skill-gate/session { sessionId, names }
GET  /api/dsh-science-skill/skill-gate/check?sessionId=…&name=…   → { ok, active }   ← 诊断
```

全局开关持久化在 `<dataRoot>/skill-gate.json`（`{"pinned":{"<skill>":true}}`）——对方插件读的是同一个文件，
所以即使座位属于对方，语义也不丢。

**没有这个挂点时（纯 DSH）**：内核照常广告全部模型可调用技能，插件里的开关只记录状态、
不影响目录。**有挂点时**：模型只看到「已 pin（或本会话已激活）」的技能，全关就是空目录。

Science Agent 仓早期把 `skillGate` 接缝放在 `packages/skill/tool-skill/src/index.ts`（`science/patches/kernel/skill-gate.patch`）。
本插件**从不 patch 内核**，也不假设自己拥有这个座位。

## 数据放在哪

按顺序解析数据根：

1. 插件配置的 `dataRoot`（相对路径按 `process.cwd()` 解析）；
2. `$DSH_HOME`；
3. `~/.dsh`。

技能目录按顺序解析（并用 `skillDirs` 配置追加）：

1. 「技能默认目录」里配置的目录（见下表的 `skill-import.json`；未设置时跳过）；
2. `<dataRoot>/skills`；
3. `$DSH_AGENTS_HOME`（缺省 `~/.agents`）下的 `skills`。

数据根下会用到：

| 路径 | 作用 |
| --- | --- |
| `catalog/data/<id>.json` | 每个技能一条元数据（中文名、简介、分类、命令、**`examples` 示例提问**） |
| `catalog/index.json` | 聚合产物，面板读它 |
| `catalog/categories.json` | 分类表，**数组顺序就是面板顺序** |
| `catalog/schema.json` | 记录结构校验；缺失时从插件自带 schema 播种一次 |
| `skill-gate.json` | 全局技能开关（`{"pinned": {"<name>": true}}`） |
| `skill-import.json` | 技能默认目录（`{"defaultSkillDir": "<绝对路径>"}`，空串＝未设置） |

**和 DSH 官方技能能力共用同一套数据根**，所以本插件不会另建一份技能目录。宿主在启动时会把
「有技能目录但没有 catalog 记录」的技能补登记（adoption 只增不改），这样手工拷进去的技能也能
立刻出现在面板里；文件夹名不合规的技能用 frontmatter 的 `name` 登记，文件夹保持原样。

## 安装

目标机器上只需要：一份 DSH、一个能跑 Node ≥ 22.5 的环境、这个插件目录。

```powershell
# 1) 把这个仓库放到一个纯 ASCII 路径，然后建 junction（PowerShell 需要管理员或开发者模式）
$src  = 'C:\plugins\dsh-science-skill'          # 本插件源码/发布目录（纯 ASCII）
$link = "$env:USERPROFILE\.dsh\plugins\dsh-science-skill"
New-Item -ItemType Directory -Force -Path (Split-Path $link) | Out-Null
if (-not (Test-Path $link)) { New-Item -ItemType Junction -Path $link -Target $src | Out-Null }

# 2) 注册进 profile（dsh 在 PATH 里）
dsh plugin --profile web add file:$($link -replace '\\','/')
dsh plugin --profile web install
```

`dsh` 不在 PATH 时，用仓库里的 CLI 跑同样两条：`node <dsh 仓库>\apps\cli\lib\bin.js plugin ...`。

本插件目录自带 `scripts/install-profile.ps1`，它做同样的事（检查构建产物、幂等建 junction、
打印后续命令），**不擅自改 profile**：

```powershell
pwsh -File scripts/install-profile.ps1 -Source <本插件目录> -Link <纯 ASCII junction 路径> -ProfileDir <$DSH_HOME>\profiles
```

为什么推荐 junction 而不是直接把插件放进 profile：`file:` 依赖会被 pnpm 硬链接成 install
那一刻的**死快照**，之后重建的 `lib/` 不会进 profile；而路径里带中文时，`cmd.exe` 的 GBK
处理会把 `file:` 值弄成乱码（历史上出现过 `link:D:/.../寮€鍙?` 和「declares no dsh.bundle」）。

重启 harness 后生效：设置页出现 **Skill** 分区，侧栏出现技能分类树。

从零发布（打包给别的机器）时，`package.json` 的 `files` 已经只包含 `lib/`、
`cordis.patch.yml`、`README.md` —— 源码与 dev 脚本都不必带。

## 配置

```yaml
- id: science-skill
  name: dsh-science-skill
  config:
    enabled: true        # false 时不注册任何路由
    dataRoot: ''         # 缺省走 $DSH_HOME
    skillDirs: []        # 追加的技能根（相对路径按 dataRoot 解析）
    naming: true         # 导入技能时用默认模型起中文名；关掉则只做规则推断
```

## HTTP 接口

全部挂在 `/api/dsh-science-skill` 下。读接口返回 JSON；写接口收 JSON body。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/skills` | 技能列表（含中文名、简介、分类、`/命令`、**`examples` 示例提问**） |
| GET | `/skills/detail?id=` | 单个技能的展示字段 + 示例 + **`SKILL.md` 原文**（上限 20000 字符，超出带 `truncated`；`id` 非法 400、不存在 404） |
| POST | `/skills/refresh` | 重新扫描：登记新技能、重建索引，并为「从未命名或没有示例」的技能启动回填（3 条并发） |
| GET | `/import-settings` | 技能默认目录（未设置时为空串） |
| POST | `/import-settings` | 设/清技能默认目录：`{defaultSkillDir}`（只接受绝对路径或空串） |
| GET | `/skills/validate?path=` | 校验一个技能目录能不能导入 |
| POST | `/skills/import` | 导入技能目录：`{path, overwrite?, category?}`；面板一律带 `overwrite: true`，不带时同名技能仍回 400 `already exists`；应答含 `overwritten` 与「已覆盖更新」文案 |
| POST | `/skills/update` | 改展示信息与分类：`{id, displayName?, displaySummary?, category?}` |
| POST | `/skills/delete` | 删除技能（`internal` 共享包拒绝删除） |
| GET | `/categories` | 分类表 |
| GET | `/categories/suggest?label=` | 按名称推荐图标 |
| POST | `/categories/create｜rename｜delete｜reorder｜restore` | 分类增删改序与恢复默认 |
| GET | `/catalog` | 聚合索引原文 |
| GET | `/skill-gate/state?sessionId=` | 该会话的激活集合与全局开关 |
| POST | `/skill-gate/pin` | 改全局开关：`{name, enabled}` |
| POST | `/skill-gate/session` | 推某会话的激活集合：`{sessionId, names[]}` |

`/api/*` 这一层由 harness 的 Connection 负责鉴权（同源浏览器请求带 cookie 即通过）。

## 插件合同（对齐 `/dsh-plugin-studio`）

本插件的形态、合同与验证流程按 DSH 插件开发助手（`/dsh-plugin-studio`）的六阶段工作流装配，
计划与逐项证据见 [`docs/plan.md`](docs/plan.md)。它的轻量校验脚本
`scripts/verify_plugin.py` 一共 11 项，本插件 **8 项通过**；未通过的 3 项都是该脚本对
**模板项目布局/命名**的假设，不是运行时合同项：

| 检查 | 状态 | 说明 |
| --- | --- | --- |
| 禁止声明 `@deepseek-ai/*` 依赖 | ✅ | 官方包只留在 `devDependencies`；`peerDependencies` 整体删除——运行时全部由 profile 提供，声明 peer 反而可能被内核按「peer 不兼容」整包跳过（启动日志里 `dsh-mnemon` / `@nanmicoder/dsh-agent-teams` 就是这个下场） |
| bundle 合同（`dsh.bundle.patch` + `exports`） | ✅ | `exports` = `"."` / `"./client"` / `"./cordis.patch.yml"` / `"./package.json"` |
| client 合同（ModuleLoader id） | ✅ | 产物里保留字面量 `window.__ModuleLoader__.load({ id: "dsh-science-skill"`，因此**关闭 `minify`**（官方 client 产物同样不压缩） |
| React 保持 external（client 形态） | ⚠️ 布局偏离 | 脚本只在 `scripts/build.mjs` 的 `clientConfig.external` 里找名单；本插件用 `tsdown.config.ts` 的 `deps.neverBundle` / `alwaysBundle` 表达同一件事（react、react/jsx-runtime、react-dom、react-dom/client 全在其中） |
| 必需文件齐备 | ⚠️ 布局偏离 | 模板假定 `src/index.ts` + `src/client/index.ts`；本插件宿主半边是纯 ESM JS 的 `src/host/index.js`（1120 行，JSDoc 类型；改名 `.ts` 会在 `strict` 下把无注解 JS 变成成片类型错误），浏览器半边含 JSX 必须是 `src/client/index.tsx` |
| 名称一致性（package name / patch id / client id） | ⚠️ 命名偏离 | `cordis.patch.yml` 的行 id 保留 `science-skill`（= 客户端 `SKILL_REFERENCE_SOURCE` 与两个 slot id 的命名空间，也是 Science Agent 仓里这个能力的原名）。真实生态并不要求行 id 等于包名：官方行是 `- id: ui-science / name: '@deepseek-ai/dsh-client-ui-science'`，`dsh-mnemon → id: mnemon`、`dshmarket → id: dsh-market`、`@dickpy/dsh-imagegen → id: imagegen` 同理 |

## 开发

```powershell
node scripts/link-dev-deps.mjs   # 本机取巧：把 dev 依赖 junction 进 node_modules（见下）
node scripts/build-styles.mjs    # CSS Modules → TS 常量（浏览器半边用）
node scripts/build-host.mjs      # 宿主半边 → lib/（复制，无编译）
node node_modules/tsdown/dist/run.mjs   # 浏览器半边 → lib/client.js
node node_modules/typescript/bin/tsc --noEmit   # 类型检查
node --test tests/*.test.mjs     # 宿主半边 + bundle 契约测试
```

也可以直接 `pnpm run build`（= 上面前三条的命令串）。

**宿主半边是纯 ESM JavaScript（JSDoc 类型），没有构建步骤**，发布靠把 `src/host` 复制到
`lib/`，这样源码树与安装后的相对 import 完全一致。浏览器半边（`src/client`）是 TSX，
走 `tsdown`；CSS Modules 没有构建期管线（`tsdown` 不处理 CSS），由 `build-styles.mjs`
编成 TS 常量字符串，运行时用 `<style>` 注入。

**顺序有意义**：`build-host.mjs` 会重建整个 `lib/`，把上一轮 `tsdown` 产的 `lib/client.js`
带走。改完必须按 `build-styles → build-host → tsdown` 走一遍（`pnpm run build` 就是这么排的），
否则浏览器半边会缺产物。

`build-host.mjs` 在 `lib/client.js` 还不存在时会写一个**只注册模块、什么都不做的占位
bundle**。这不是多余动作：`dsh.client` 声明了、bundle 却缺失的包会让客户端模块系统
组装失败，整页报 "failed to load plugins"；而插件往往在 UI 到位之前就先进了 profile。
占位 bundle 说协议、不占任何槽位，`tsdown` 一跑就被真 bundle 覆盖。

**零运行时依赖**：SKILL.md frontmatter 的 YAML 由 `src/host/lib/frontmatter-yaml.mjs`
按子集自行解析（宁可判为「不认识、不许动」，也不猜）。插件本身不装任何 npm 包，
离线机器上也能装起来。

`scripts/link-dev-deps.mjs` 是**给连不上私域 registry 的开发机用的**：它把
`react` / `react-dom` / `@types/*` / `@deepseek-ai/dsh-*` / `cordis` / `tsdown` / `typescript`
从邻近的 DSH 仓库 `node_modules` 里找出来、junction 到本包 `node_modules`。能正常
`pnpm install` 的机器不需要它（那时它无事可做，`--check` 会直接报 ok）。

测试策略：`tests/host.test.mjs` 在临时数据根上真跑宿主半边（路由、分类、导入删除、门控、
双 gate 争座）；`tests/client-bundle.test.mjs` 真加载 `lib/client.js`，断言它注册的模块 id
与 `apply`/`inject` 契约（不 mock 打包产物）。

## 状态

- 里程碑 1（宿主半边）：完成。路由、分类、门控、播种、adoption。
- 里程碑 2（浏览器半边 UI）：完成。设置页技能面板、主面板卡片式技能墙、`/命令` chip、
  面板样式注入。
- 里程碑 3（内核 `skillGate` 接缝）：完成（落在 Science Agent 仓的
  `packages/skill/tool-skill/src/index.ts` + `science/patches/kernel/skill-gate.patch`，
  workbench 的 gate 注册也改成了幂等）。
- 里程碑 4（从 Science Agent 的 `ui-science` 摘掉已迁走的槽位注册）：完成。
- 里程碑 5（面板内改分类 + 搜索修复）：完成。主面板卡片右下角的分类标签成了可选菜单，改完即时重排，
  并经 `dsh-science-skill:catalog-changed` 与设置页双向同步（`reload` 只读、`refresh` 才广播，
  避免两个视图互相派发）；搜索改为「有卡片可显示就不显示空状态」，此前命中多少条都会被空状态顶掉。
- 当前验证：`node scripts/build-styles.mjs --check` ok（3 stylesheet(s), 20 shared class name(s)）；
  `tsc --noEmit` exit 0；`node --test` **44 pass / 0 fail**；`/dsh-plugin-studio` 的
  `verify_plugin.py` **8/11**（未通过 3 项均为布局/命名假设，见上表）；
  `dsh-plugin-dev check`（studio 自带 CLI）**pass 8 / fail 1 / warn 1 / skip 5**——唯一 fail
  `manifest-peers` 属误报：命中的是 JSDoc 里的类型引用 `import('@deepseek-ai/cordis').Context`，
  而产物只 import `node:` 内置与相对路径、`dependencies` 为空（删掉 peer 的理由见上表）；
  warn 仅「五语 README 不齐」（本插件只维护中文 `README.md`）；
  `lib/client.js` 144.18 kB（gzip 34.81 kB，**不压缩**，好让合同要求的 ModuleLoader 字面量在产物里可核）。
- 隔离 lab 实测（`dev-test-dataroot` profile + `link:` 安装）：启动日志无 `1 entry did not activate`、
  无 `1 client plugin did not load`；`/api/dsh-science-skill/*` 与 `/science/api/*` 全 200；
  设置面板与侧栏树样式装上（`display:flex`）；点技能 → 输入框出现引用芯片；
  拨技能开关 → `POST /skill-gate/pin` 200 并落盘 `<dataRoot>/skill-gate.json`。
- 未做：打包（按既定流程，等用户在自己的客户端实测通过后再备份/打包）。
