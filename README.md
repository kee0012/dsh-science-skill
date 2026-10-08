# dsh-science-skill

科研技能中心：把散落在磁盘上的技能，变成 DSH 里一面可浏览、可分类、可一键调用的技能墙。

这是一个 **DeepSeek Harness 插件**，不依赖 Science Agent。装上之后你会得到：技能设置面板、分类标签栏、卡片式技能墙、搜索、卡片内直接改分类、开关、导入与刷新，以及用 `/命令` 调用技能的能力。

## 功能特性

**左侧栏入口与技能墙**

- 侧栏注册一个「技能」入口，点开在本区展开技能墙：顶部是分类标签栏（分类多了会自动排到下一行），下面按 4 列铺开卡片。
- 卡片上有三个彼此独立的目标：点**卡片正文**打开该技能的详情弹窗；点右上角**「召唤」**才把它的 `/命令` 引用插入**当前会话**的输入框（不新建会话）；点右下角**带 ▾ 的分类标签**能直接把技能换到别的分类，改完立即重排，设置面板里的同一个技能同步。
- 技能墙用官方 `sidebar.panellist` 一行入口 + `main` 一个面板实现。

**技能详情与「试试这样用」**

- 详情弹窗自上而下是：分类图标、中文名、`/命令`、「去试试」（等同召唤）、一句简介，然后是**「试试这样用」**——几条中文示例提问，点任意一条就把这句话插入当前会话的输入框，不会覆盖你后续的编辑。
- 最下面是**「技能详情」**：该技能 `SKILL.md` 的原文，等宽、限高、可滚动。
- 中文名、中文简介、分类与示例由**你在 DSH 里的默认对话模型**在同一次调用里一并生成，不需要给插件单独配模型；模型偶尔没给出示例时只降级为空数组，中文名与分类照常保留。

**分类管理与开关**

- 分类可创建、改名、删除、排序、恢复默认，并可按名称推荐图标。
- 每个技能可单独开关，开关状态持久化在数据根下。

**导入与刷新**

- 导入技能目录、校验一个目录能否导入、刷新重新扫描，都在设置面板里完成。
- **重复导入直接覆盖**：老文件夹被保留为 `.<id>.old-<时间戳>` 备份，你在面板里改过的中文名、分类与示例保留在记录上，`SKILL.md` 换成新的。
- 桌面版与 `dsh web` 都可用。

## 安装

插件托管在 GitHub（`kee0012/dsh-science-skill`，未发布到 npm），DSH 支持以 git 依赖方式直接安装：

```sh
# 从 GitHub 安装（推荐，日常使用；拉取默认分支最新提交）
dsh plugin --profile desktop add github:kee0012/dsh-science-skill
```

> 安装后需要**重启 DSH**，新的服务端代码与 client bundle 才会生效。

## 使用

**导入技能**

1. 打开 设置 → Science Skill，在「技能默认目录」里指定一个目录（只接受绝对路径，留空＝未设置）。
2. 点「+ 添加目录」选择要导入的技能文件夹，确认分类即可。指定了默认目录时，导入的技能一律装到那里；未指定则回落到数据根下的 `skills`。
3. 技能已经躺在目录里但没被登记？点「刷新」重新扫描：插件会把它们登记进目录记录，并为从未命名过的技能生成中文名、中文简介与示例。

**技能目录要求**

- 每个技能是一个子目录，内含 `SKILL.md`。
- `SKILL.md` 的 frontmatter 必须有 `name:` 与 `description:`；`name` 要能当 kebab-case 标识用（小写字母、数字、单连字符）。
- 子目录名可以随便起，不要求等于 `name`——不合规的目录名用 frontmatter 的 `name` 当记录标识，插件不重命名、不移动你的文件夹。

**调用技能**

- 在技能墙上点卡片的**「召唤」**，或打开详情弹窗点**「去试试」**，该技能的 `/命令` 引用就会被插入当前会话的输入框，回车发送即可。
- 也可以直接在输入框里敲 `/` 加技能标识调用。

## 技能目录规则与数据存放

**技能根如何解析**

- 只加载你在「技能默认目录」里设定的那一个目录，可以用 `skillDirs` 配置追加额外的根。
- 未设定时回落到 `<dataRoot>/skills`，以及 `$DSH_AGENTS_HOME`（缺省 `~/.agents`）下的 `skills`。
- 插件同时**以提供者身份**接入内核技能注册表，把暴露的目录限定为你选定的那一个，因此面板上显示的技能就是模型能加载的技能；内核没有这个注册表时插件照常工作，只是退化为「仅面板可见」。

**登记规则**

- 目录名本身合规时，直接用它当记录标识（`/命令` 另按 frontmatter 的 `name` 走）。
- 目录名不合规（带大写、空格、点、中文）时，用 frontmatter 的 `name` 当记录标识，并记住真实文件夹名。
- 两个文件夹声明了同一个 `name` 时，先扫到的收录，后一个跳过并说明「技能标识已被占用」。
- 点号开头的子目录视为导入残留，一律忽略；既没有合规目录名、`SKILL.md` 里也没有合规 `name` 的文件夹会被跳过并给出原因。
- 不再被扫描的旧记录会被排除出索引，但记录文件保留——把默认目录指回去就回来了。

**不动你的文件**

- 登记只写数据根下的记录，**不复制、不修改、不删除**技能目录里的任何东西；已有记录也原样保留（只增不改）。

**数据放在哪里**

数据根按顺序解析：插件配置的 `dataRoot`（相对路径按 `process.cwd()` 解析）→ `$DSH_HOME` → `~/.dsh`。数据根下会用到：

| 路径 | 作用 |
| --- | --- |
| `catalog/data/<id>.json` | 每个技能一条元数据（中文名、简介、分类、命令、示例提问） |
| `catalog/index.json` | 聚合索引，面板读它 |
| `catalog/categories.json` | 分类表，数组顺序就是面板顺序 |
| `catalog/schema.json` | 记录结构校验；缺失时从插件自带 schema 播种一次 |
| `skill-gate.json` | 全局技能开关（`{"pinned": {"<name>": true}}`） |
| `skill-import.json` | 技能默认目录（`{"defaultSkillDir": "<绝对路径>"}`，空串＝未设置） |

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

全部挂在 `/api/dsh-science-skill` 下。读接口返回 JSON，写接口收 JSON body。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/skills` | 技能列表（含中文名、简介、分类、`/命令`、示例提问） |
| GET | `/skills/detail?id=` | 单个技能的展示字段 + 示例 + `SKILL.md` 原文（上限 20000 字符，超出带 `truncated`；`id` 非法 400、不存在 404） |
| POST | `/skills/refresh` | 重新扫描：登记新技能、重建索引，并为「从未命名或没有示例」的技能启动回填（3 条并发） |
| GET | `/import-settings` | 技能默认目录（未设置时为空串） |
| POST | `/import-settings` | 设/清技能默认目录：`{defaultSkillDir}`（只接受绝对路径或空串） |
| GET | `/skills/validate?path=` | 校验一个技能目录能不能导入 |
| POST | `/skills/import` | 导入技能目录：`{path, overwrite?, category?}`；不带 `overwrite` 时同名技能返回 400 `already exists`，应答含 `overwritten` 与「已覆盖更新」文案 |
| POST | `/skills/update` | 改展示信息与分类：`{id, displayName?, displaySummary?, category?}` |
| POST | `/skills/delete` | 删除技能（`internal` 共享包拒绝删除） |
| GET | `/categories` | 分类表 |
| GET | `/categories/suggest?label=` | 按名称推荐图标 |
| POST | `/categories/create｜rename｜delete｜reorder｜restore` | 分类增删改序与恢复默认 |
| GET | `/catalog` | 聚合索引原文 |
| GET | `/skill-gate/state?sessionId=` | 该会话的激活集合与全局开关 |
| POST | `/skill-gate/pin` | 改全局开关：`{name, enabled}` |
| POST | `/skill-gate/session` | 推某会话的激活集合：`{sessionId, names[]}` |

## 兼容性

- 需要 DSH `^0.2.0-rc.1`：宿主半边只依赖 `ctx.webServer`，客户端半边使用官方插槽与 `slots` / `sessions` / `conversation` / `remote` / `locale` / `inputTriggers` 服务。
- 零运行时 npm 依赖，离线机器也能装起来。
- 可选：内核提供 `skillGate` 挂点时，面板里的开关会真正影响模型可见的技能目录；没有该挂点时插件照常工作，开关只记录状态。

## 已知限制

- 技能最终能否被模型加载，仍由 DSH 内核决定。同名技能存在多个来源时，按内核的优先级规则胜负，面板上显示的不一定是最终生效的那一份。
- 插件只读写数据根，不接管技能发现，也不 patch 内核。

## 反馈与贡献

问题、建议与 Pull Request 都欢迎：[Issues](https://github.com/kee0012/dsh-science-skill/issues)。

## 许可证

MIT
