# changelog

## 2026-10-07 · 用户两条要求：重复导入直接覆盖；手动粘进默认目录的技能，刷新要收进来

**背景（用户原话，m00001）**：「1、我发现如果我重新导入一个已经有的skill的时候，我希望你直接覆盖已有的……
如果我重新在设置-science skill中，点击添加目录添加skill的时候，你直接进行覆盖原有的就行……2、就是用户也可能
直接在技能默认目录中直接粘贴很多个skill文件夹……我觉得插件应该再点击刷新后自动导入这些新的skill，对吧？
优化一下这些功能，目前已有的不要破坏。」

**需求 2 的根因（在用户真机上量出来的，不是猜的）**：`D:\DSH\skills` 里 123 个文件夹、catalog 里 118 条记录，
差额 8 个**全部**是手工粘进去的：`课题技术路线图svg`、`自动化ai编程`、`design-master-2.1.2`、
`high-quality-skill-guidance-3.1.1`、`originpro-2.0.0`、`super-thesis-tutor-1.0.2`、`Vibe Coding 架构师`、
`Vibe Coding Rules · AI编程纪律`。其中 6 个的 `SKILL.md` 里 frontmatter `name` 完全合规
（`tech-roadmap-svg` / `agentic-coding` / `design-master` / `skill-designer` / `originpro` / `vibe-coding-architect`），
**但 `adoptUnregisteredSkills` 先按目录名做了 `isKebab` 检查，不合规就整目录 `continue`，frontmatter 根本没读**。
另外 2 个连 frontmatter 都没有，宿主本来也加载不了，跳过是对的。
注意 `skill-provider.mjs` 是直接 `readdirSync` 默认目录、按 frontmatter name 发布的——**模型那边一直能看到这些技能，
只有面板的 catalog 看不见**，两个视角对不上。

**改动**

- **需求 2：记录 id 与文件夹名解耦**（`src/host/lib/skills-runtime.mjs` 的 `adoptUnregisteredSkills`）。
  目录名是合规 kebab 时仍以它作 id（历史行为一字未改）；不是时才用 frontmatter `name` 作 id，并把真实
  文件夹名写进记录的 `dir_name`。**不重命名、不移动、不复制、不删除用户的文件夹**——这条是 adoption 的底线。
  新增共享函数 `recordDirName(record, id)`：`dir_name` 来自记录文件，用前**重新校验成单个路径段**
  （空串、`.`、`..`、含 `/` 或 `\` 一律忽略、回落 id），所以记录文件无法把路径撑开。
- **三处「id 就是文件夹名」的假设跟着改**，否则新记录会当场自相矛盾：
  - `src/host/lib/catalog-runtime.mjs:84` 的孤儿判定改为 `existsSync(join(base, recordDirName(r, r?.id)))`。
    不改的话，刚采纳的记录会在同一次 `rebuildCatalogIndex` 里被判成 orphan、直接从索引里消失。
  - `src/host/index.js` 的 `locateSkillFile(id)` 先读记录再拼 `join(base, folder, SKILL.md)`——
    详情弹窗的 `SKILL.md` 原文靠它。
  - `src/host/lib/skills-runtime.mjs` 的 `deleteSkill(root,id)` 按 `dir_name` 定位要删的文件夹，
    否则「删除」会留下一个还在被宿主加载的副本。
- **同一 id 的两个文件夹不再互相顶掉**：adoption 的「已登记」集合现在由 **id（精确）+ 已覆盖的文件夹名
  （全小写，Windows 路径大小写不敏感）** 组成，目标 id 已被别的记录占用时报 `技能标识 "X" 已被占用（另一个目录已用它收录），未收录此目录`。
  原来会直接覆写那个记录，等于把前一个文件夹的技能变成无记录的孤儿。
- **需求 1：面板一律按覆盖导入**（`src/client/SkillSettingsSection.tsx`）。删掉 `pendingOverwrite`
  state、`doImportPath` 的 `already exists` 分支与那行「已存在…覆盖导入/取消」确认 UI；`+ 添加目录`
  与手动路径导入都发 `overwrite: true`。理由就是用户给的：重复添加要么是忘了、要么是下到了新版，
  两种情况都只想要新版，多问一次只是多一次点击。两个按钮各加了 `title` 说明行为。
- **覆盖导入也覆盖"实际所在的文件夹"**（`src/host/lib/skills-runtime.mjs` 的 `importSkillDir`）。
  这是需求 1 与需求 2 的交点：一个已按 `dir_name` 收录的技能，如果被当成新技能导入，会装出一个
  `skills/<id>` 与老文件夹并排——同一份技能两个副本，且两个都自称同一个 frontmatter name。
  现在读记录拿到 `dir_name`，把它当作被替换的旧目录：备份成 `.<id>.old-<时间戳>` 后删掉，
  再装新的；不带 `overwrite` 的调用方对这种情形同样得到原来的 400 `already exists`。
- **应答新增 `overwritten`**（`importSkillDir` → `/skills/import` → 面板）。文案据此分成
  「已把技能「X」添加到分类「Y」。」（首次，**原句一字未动**，老测试仍绿）与「已覆盖更新技能「X」，分类「Y」。」
- **`catalog.schema.json` 补 `dir_name` 字段说明**。该 schema 实际只作文档（记录里早已有 `examples`、
  `display_source` 两个未列字段），所以这是给读记录的人看的。
- **README**：默认目录一节补「重复导入直接覆盖」与「子目录名可以随便起」两条，`/skills/import` 一行补
  `overwritten` 语义；旧文档「子目录名同样要是 kebab-case（记录 id 就是目录名，不合规会被跳过）」
  已按新行为重写。

**复验（全部门禁，均在插件目录内）**

- `node --test tests/*.test.mjs`：**48/48**。新增 4 条：非 kebab 目录被收录且 `dir_name`/索引/详情/二次刷新不重复收录/删除删对文件夹；
  不能自我命名的目录被如实报告 + 同名两目录只收一个；重复导入覆盖（保留中文名、留备份、不带旗标仍 400）；
  已按 `dir_name` 收录的技能被重新导入时替换掉原文件夹且记录不再带 `dir_name`。
- `tsc --noEmit`：**exit 0**。
- 产物待重建（`npm run build`）：宿主半边的改动要等应用下次重启才生效，客户端半边刷新页面即可——
  与上一轮同一条约束，本轮**没有**活体卸载/重启实测，证据是单测 + 类型检查 + 产物抽查。

**未闭环（交给用户）**

- 用户真机上那 8 个目录：6 个合规的下次点「刷新」就会被收录；剩下 2 个（`super-thesis-tutor-1.0.2`、
  `Vibe Coding Rules · AI编程纪律`）**没有 frontmatter**，面板仍会跳过并给出原因——它们装上也加载不了，
  要收进来得先给它们的 `SKILL.md` 补 `--- name:/description: ---`。这一步按需求边界没有代做。

## 2026-10-04 · 按 `/dsh-plugin-studio` 评审报告动手修复（两条录错的绿字改成真的）

**背景**：`/dsh-plugin-studio` 的合同评审结论是「能装能用、合同主体通过，但 ④ 的门禁不是全绿」。
本次把报告「要修的问题」表逐条改掉。重点不是抹掉红字——三条 `verify_plugin.py` 的 FAIL 是脚本的模板布局/有意命名假设，
本轮**一条都没动**——而是把 `tsc` 与宿主生命周期这两条**实质缺陷**修掉，并把 `docs/plan.md` 里对不上的数字改成实测值。

**改动**

- **客户端类型（真缺陷）**：`tsc --noEmit` 实际 `exit 2`，而 plan 里记的是 `exit 0`。
  - `sessions.list.getSnapshot().ids` 的静态类型是 `any`，于是 `find` 的回调参数报 `TS7006`；
    补类型时不能随手写 `string`——`sessions.retainInfo(id)` 收的是**品牌类型**，写 `string` 会立刻换一条 `TS2345`。
    正解是从服务本身取：`type SessionId = Parameters<ISessions['retainInfo']>[0]`，两处 `.ids.find((id: SessionId) => ...)`。
  - `addSkillToComposer` 里 `appearance: 'skill'` 与已发布插入合同的
    `ReferenceInsert['appearance'] = 'session' | 'file' | 'folder'` 冲突（`TS2322`）。
    **不丢这个字段**：`'skill'` 正是 in-tree 构建给技能芯片的皮肤，丢掉等于让 fork 上的技能芯片退回默认样式。
    改为一次显式放宽——`type ChipAppearance = NonNullable<Parameters<SessionInput['insertReference']>[0]['appearance']>`
    + `const SKILL_CHIP_APPEARANCE = 'skill' as unknown as ChipAppearance`，注释写明「渲染器实际吃的是 primitives 的更宽
    `ReferenceIconKind`；有 skill 皮肤就渲染技能芯片，没有就回退默认 chip」。**刻意不断言** rc.2 的 `ReferenceIconKind`
    一定含 `'skill'`——primitives 不在本仓库 `node_modules` 里，无从核对，写死就是编证据。
- **宿主生命周期（真缺陷）**：路由此前直接 `webServer.register({...})`，没包在 `ctx.effect` 里，也就不在 fiber 的生命周期内——
  卸载、或 `patchReload` 换掉本插件时，`/api/dsh-science-skill` 前缀会留在 webServer 的路由表里继续应答。
  改法是最小 diff：先把整张路由表收成 `const prefixRoute = {...}`（对象体缩进一行没动），末尾接
  `ctx.effect(() => { const dispose = webServer.register(prefixRoute); return typeof dispose === 'function' ? dispose : () => {} }, 'dsh-science-skill: routes')`。
  **`typeof ... === 'function'` 这层判断不是洁癖**：cordis v4 的 `_execute` 对 effect 回调的返回值只接受「函数 / thenable / 可迭代 / null-undefined」，
  其余对象一律 `TypeError: Invalid effect`（`node_modules/@deepseek-ai/cordis/lib/index.js:1135-1167`）——把 `register` 的返回值原样交回 effect，
  等于让「宿主服务返回什么」决定插件能不能启动。
- **`VERSION` 对齐**：宿主导出 `'0.1.0'`、包是 `2.0.0`；无消费者，但同一个包里两个版本号并存迟早误导人，改成 `'2.0.0'` 并注明「纯 ESM 半边读不到 manifest，只能手工同步」。
- **补 `LICENSE`**：`package.json` 声明 `"license": "MIT"`，却一直没有许可正文（`files` 里也没列），补 MIT 全文并加进 `files`。
- **`docs/plan.md` 失真**：④ 的 `tsc → exit 0`、`node --test → 20 pass`（实为 44）、`813 行`（实为 1120）、
  `build-styles --check → 2 stylesheet / 6 shared`（实为 3 / 12）全部按实测更正，并新增一条 `ctx.effect` 的勾。
  顺带把构建链的**顺序依赖**写进 plan：`build-host.mjs` 会先清空 `lib/`，`lib/client.js` 是被它删掉再由 tsdown 补回的，
  `lib/index.js` 能活下来全靠 tsdown 的 `clean: false`——这条以前只活在脚本注释里。

**复验（全部门禁，均在插件目录内，产物由脚本重建、未手改）**

- `node --test tests/*.test.mjs`：**44/44**（新增「路由前缀注册在带 label 的 effect 内、disposer 真的接到前缀」；`boot()` 的 ctx 桩补了 `effect`）
- `tsc --noEmit`：**exit 0**（3 条报错清零）
- `node scripts/build-styles.mjs --check`：exit 0（3 stylesheet / 12 shared class name）
- `python3 …/verify_plugin.py .`：仍 **8/11**，未通过 3 条与评审一致（模板布局 ×2 + 有意命名偏离 ×1），**不是运行时合同项**
- `pnpm pack` 抽查：`package/LICENSE`、`lib/index.js`、`lib/client.js`、`lib/lib/*.mjs`、`lib/root.mjs`、`cordis.patch.yml`、`README.md`、`package.json`，无 `src/`、无 `tests/`
- 产物抽查：`node --check lib/index.js` 通过；`lib/index.js:1116` 起是 effect 注册；`lib/client.js` 里
  `const SKILL_CHIP_APPEARANCE = "skill";`（值没被改掉）、`ReactCurrentDispatcher`/`Invalid hook call` 均 0 命中（React 仍 external）

**未闭环（交给用户）**

- 阶段 ⑥ 的「README 真实安装 ref / 从目标 ref 重装验证」没有可用分发源（本插件目录与父目录都不是 git 仓库、无 remote），本轮无法闭环。
- 桌面版 GUI（19387）正在运行本插件，且本会话就跑在里面，**宿主半边的改动要等应用下次重启才生效**；客户端半边刷新页面即可。
  因此 `ctx.effect` 这条改动的证据是「单测 + 契约测试 + 产物抽查」，不是活体卸载实测。

## 2026-10-03 · 示例必须挂在技能后面（顺序是正确性本身）

**背景**：用户截图实证——在技能墙点开卡片、再点「试试这样用」里的示例，输入框里**只有那句话**，
没有技能引用芯片，模型无从知道该用哪个技能。用户指出的顺序「先加载技能，技能后面是这句话」是对的。

**根因**：插技能（芯片）与插纯文本是两个动作；示例路径只调了后者，**技能参数根本没往后传**。

**改动**

- `insertExample` 由 `(text)` 改为 **`(skill, text)`**，实现为：
  `addSkillToComposer`（插芯片）→ `insertTextIntoComposer(' ' + text)`（插文字，**前导空格**）
  → `layout.selectPanel('conversation')`。
- **顺序的机制**：两个写入都在调用当下 `actions.captureInsertion()` 取光标。先插芯片会让光标推进到
  芯片之后，**第二次捕获**因此落在芯片右侧——「第二次捕获必须发生在芯片写入之后」正是这条行为的本体，
  已写进注释。前导空格是同一件事的延伸，少了它句子会紧贴芯片、读起来像引用的一部分。
- 绑定放在 `SkillStrip.tsx`（那里同时知道「打开了哪个技能」与「点了哪条示例」）；
  **`SkillDetail.tsx` 未改**——它本来就只调 `insertExample(text)`，缺的只是上游没把技能传下来。
  「去试试」按钮仍只插技能，未被顺手改掉。
- **兜底改为「要么都插，要么都不插」**：`addSkillToComposer` 现在返回布尔；芯片插不进去时
  **连文字也不插**。原实现会在此时留下孤立句子——那正是本次要修的缺陷本身。

**复验**
- `node --test tests/*.test.mjs`：**43/43**
- 新增两条断言：①**顺序**——记录完整调用序列 `['capture','reference','capture','text']` 并严格比对，
  退回旧实现会变成 `['capture','text']` 立刻转红；②**兜底**——主视图无保留会话时断言 `calls` 为空
- `lib/client.js` 134.81 kB，`node --check` 通过；`src/host` 未动

## 2026-10-03 · 让「注册失败」可见，并修掉一个隐形的 `undefined` 类名

**背景**：技能提供者上线后，实机验证通过（用户在设置里选 `D:\DSH\skills` 后，`skill("academic-figures")`
与 `skill("drawio-reconstruction")` 都从该目录加载成功）。但**失败路径是静默的**：内核没有技能注册表、
或注册被拒时，插件只写一行日志，表现为「面板一切正常、技能却调不动」。对开源分发这是最糟的形态——
使用者只会以为插件坏了，查不到原因。

**改动**

- **宿主如实报告状态**：`GET /import-settings` 新增 `providerRegistered`（`skillProvider !== undefined`），
  GET 与 POST 共用同一值。**只增字段**，`defaultSkillDir` 的名字与语义未动，未新增路由。
- **面板把失败显示出来**：`providerRegistered === false` 时，在「技能默认目录」卡片内显示警告，
  说明技能仅面板可见、模型无法加载。复用既有的 `status + warn` 视觉，正常时什么都不渲染。
  关键区分：**`undefined`（宿主没报这个字段＝旧宿主）不告警**，只有显式 `false` 才告警，否则旧宿主
  会被冤枉成坏的。
- **修掉一个隐形缺陷**（子代理做类名自检时查出）：`SkillSettingsSection.tsx` 的激活开关关闭态引用了
  `styles.gateOff`，而 CSS 里**只有 `.gateOn`**，映射表里也没有该键 → 运行时每个未 pin 的技能都带着
  `class="gateToggle undefined"`。因为关闭态本就是默认长相，**肉眼完全看不出来**。已改为关闭态只用
  基础类。
- **把类名守卫推广到全部组件**：原来那条测试只覆盖技能墙；正因如此才漏掉了设置面板里的 `gateOff`。
  现在覆盖 `SkillStrip.tsx` / `SkillDetail.tsx` / `SkillSettingsSection.tsx` 三个组件，**这条测试
  现在能自动抓住 gateOff 这类错误**。

**复验**
- `node --test tests/*.test.mjs`：**41/41**（新增断言：有假 `skills` 服务 → `providerRegistered === true`；
  无该服务 → `false`）
- `styles.gateOff` 引用已清除；`lib/client.js` 与 `lib/index.js` 均 `node --check` 通过
- 类名守卫覆盖 3 个组件后仍全绿

## 2026-10-03 · 面板里的技能＝模型能加载的技能（注册技能提供者）

**背景**：用户问「测试一下 academic-figures 是否已加载」，实测暴露出一个**存续已久、被数量掩盖的
断层**：`skill("academic-figures")` 返回 unknown（该技能只在用户选的 `D:\DSH\skills` 里），而对照
`skill("humanizer")` 正常加载、基目录为 `D:\DSH\.dsh\skills\humanizer`。原因是内核自己的技能根
（`@deepseek-ai/dsh-skill-filesystem`）为 `<projectRoot>/.agents/skills`、`customSkillDirs`、
`<dshHome>/skills`、`<agentsHome>/skills`，**不含用户选定的目录**。结果：面板显示 111 个技能，
模型一个都用不了，点「召唤」插进去的 `/命令` 是内核解析不了的命令。

**改动**：新增 `src/host/lib/skill-provider.mjs`，插件向内核的技能注册表
（`@deepseek-ai/dsh-skill` 拥有，`registerProvider`）注册自己的提供者，把暴露的目录限定为设置里的
「技能默认目录」。

- **只注册，绝不 `provide('skills')`**：服务名每 isolate 唯一，撞名会让内核技能插件的 `apply` 抛异常
  并把对方整个插件带下线（`failures.md` F12 同类事故）。宿主没有该服务时退化为「仅面板可见」，
  插件其余功能照常。
- **契约照实现读、不猜**：`registerProvider(create)` 同步调用 `create(control)`，
  `control = { signal, invalidate }`；provider 需 `name`（`runtime` 保留、同层重名抛错）与
  `list()` / `get()`；候选项必须带 `invocation`（注册表校验允许缺省，但消费者直接读
  `.modelInvocable` 会炸）。
- **两边同一套判据**：发现复用 `diagnoseSkillDir`——与面板 adoption 是同一个函数，也读同一个设置值，
  因此不可能出现「面板 111 个、模型 80 个」。rank 取 300 / source `custom`：高于环境级 user 根
  （否则同名技能面板与模型各显示一份），低于 project 根；显式配置的 `customSkillDirs` 仍赢平局。
- **零配置**：用户不必去编辑 profile 或预设——这一点对开源分发是硬要求。
- **改设置即时生效**：`list()` 每次现读设置，只需 `control.invalidate()` 清注册表缓存；未设目录时
  注册但发布空列表（首次选目录才注册会正好撞上重名抛错的最坏时机）。
- 过程中踩到一个自造的坑并修掉：`installRoutes` 是独立顶层函数，`apply` 里的 `const` 不在其作用域，
  改为经 `options` 透传。

**复验**
- `node --test tests/*.test.mjs`：**41/41**（新增：配了目录即注册且暴露目录正确、`get()` 返回正文与
  `resourceBase`、设置变更触发 invalidate、**无 `skills` 服务时 `apply` 不抛且面板路由仍 200**）
- `provide('skills')` 全仓出现 **0 次**（红线自检）；`src/host` → `lib/` 逐字节镜像一致
- 实机待确认：重启后 `skill("academic-figures")` 应从 unknown 变为可加载——本环境无 booted harness，
  只能用假注册表验证契约形状

## 2026-10-02 · v2.0 续：卡片双目标、技能详情弹窗与「试试这样用」

**背景**：用户在实机看到技能墙后提了三件事——卡片正文不该触发插入、点技能应弹出详情、详情里要有
「试试这样用」示例，且**未来新增的技能也要自动生成**。

**改动**

- **卡片拆成双目标**（`src/client/SkillStrip.tsx`）：卡片正文打开详情，**只有「召唤」插入引用**。
  外层用 `<article role="button">` 并手写 Enter/Space，内层是真正的 `<button>`——`<button>`
  不能嵌套 `<button>`，浏览器会丢掉内层。召唤按钮先 `stopPropagation()`，两个动作互不误触。
  顺带修掉三个会**真实出错**的地方：`.summon` 原本带 `pointer-events: none`（作为主操作按钮点不动）、
  它只在卡片 hover 时显现所以 Tab 聚焦到它反而隐藏、触屏没有 hover 就看不到唯一的写操作。
- **技能详情弹窗**（新增 `src/client/SkillDetail.tsx` / `.module.css`，并在 `build-styles.mjs` 的
  `SHEETS` 注册 `ss-detail`）：头部（分类图标 / 中文名 / `/命令` / 去试试 / 关闭）、一句简介、
  **「试试这样用」**、**「技能详情」**（SKILL.md 原文，等宽、限高、可滚动）。关闭三路（X / 点遮罩 / Esc），
  打开时锁滚动并把焦点交给对话框本身而非首个控件——给首个控件会让 Enter 立刻关掉刚打开的窗。
- **示例由默认模型生成**（`skill-naming.mjs` / `index.js`）：记录新增 **`examples: string[]`**，
  与中文名 / 简介 / 分类在**同一次模型调用**里产出。`normalizeExamples()` 处理非数组、含非字符串、
  空串、超长与重复。**`examples` 是唯一「降级而非整次失败」的字段**：缺失只存空数组且 `ok` 仍为 true，
  姓名与简介缺失才 `ok:false`；且空结果**永不覆盖**已有示例。
- **详情路由** `GET /api/dsh-science-skill/skills/detail?id=`：返回展示字段 + `examples` + `markdown`
  （上限 20000 字符，超出截断并给 `truncated`）。目录被移走但记录还在 → 空 markdown 而非报错。
  安全做**两层**：拼路径之前用 `SKILL_NAME` 拒绝一切 `../`、分隔符与点号输入；解析之后再校验绝对路径
  确实落在该 skill root 之内（为 root 本身是软链/junction 的场景兜底）。
- **回填队列**：`startNamingForUnnamed` → **`startNamingBackfill`**，判定由「仅 `display_source` 缺失」
  改为「**`display_source` 缺失 或 `examples` 为空**」。所以点一次「刷新」既补齐老技能的中文名，
  也把「在 `examples` 字段出现之前就已命名」的历史记录补上示例，新导入的技能同样自动分析。
- **纯文本插入不需要降级**：点示例要把文字送进输入框，查证宿主 `InputActions` 同时声明
  `captureInsertion(): TokenSpan` 与 `insertText(text, span): boolean`（`input.d.ts` L208/L215），
  因此走 `actions.insertText(text, actions.captureInsertion())`，与既有 `insertReference` 同一套 span 协议。
- **构建与仓库**：`CategoryTree.module.css` 更名为 `SkillStrip.module.css`（文件名与语义一致，
  该 id 的类名映射本就来自它）；`build-styles.mjs` 的调色板选择器由 `:where(.ss-settings, .ss-tree)`
  修正为 `:where(.ss-settings-root, .ss-tree-root)`——**原选择器匹配不到任何元素，那块 `--dsw-sci-*`
  调色板从未生效**（设置面板靠 `var(…, fallback)` 才看着正常，而旧技能树用裸 token，配色一直在失效）。
  新增 `.gitignore`；版本号 `0.1.0 → 2.0.0`。

**复验**
- `node --test tests/*.test.mjs`：**39/39**（本轮新增：示例校验与降级、详情正常返回、路径越权被拒、
  超长截断、卡片词汇守卫、类名映射守卫）
- 类名映射自检：`SkillStrip.tsx` 与 `SkillDetail.tsx` 各 23 个引用，**缺失 0**
- 产物 132.12 kB；`lib/client.js` 与 `lib/index.js` 均 `node --check` 通过

## 2026-10-02 · v2.0：左栏入口、技能默认目录、扫描根收敛与分类兜底

**背景**：用户在实际使用里连报一串问题——左栏没有技能入口、目录选择器点了没反应、配了默认
目录却仍混进别的技能、大量技能加载不出来、名字与简介一直是英文、分类混乱。逐条查下来，多数
属于**同一个根因家族：拿一个能力不足的 YAML 子集解析器去解析整份文档，只为了其中一两个字段**。

**改动**

- **左栏入口**（`src/client/index.tsx`）：`sidebar.skills` 在原生 DSH 里**不存在**——扫过该构建
  全部 69 个客户端包，出现 0 次。原注册在等一个永远不会被声明的座位，所以静默不渲染，而设置
  面板正常（`settings.section` 确实存在）。改为官方支持的组合：`sidebar.panellist` 一行入口 +
  `main` 一个面板（key 同为 `science-skills`），点技能插入引用后自动切回对话。
- **技能默认目录**（新增 `src/host/lib/import-settings.mjs`）：设置里指定一个目录，导入一律落盘
  到那里；`GET/POST /api/dsh-science-skill/import-settings`；`importSkillDir` 增加 `opts.intoDir`，
  暂存、备份、最终目录由同一个 install root 推导。
- **扫描根收敛**（`skill-roots.mjs`）：指定默认目录后**只扫该目录**。此前同时扫 `<dataRoot>/skills`
  与 `$DSH_AGENTS_HOME/skills`，实测 277 个目录里有 **24 个同名重复项**，且「跳过」计数把用户
  从未指过的目录也算进去。
- **YAML 宽容读取**（`frontmatter-yaml.mjs`）：嵌套映射/序列因匹配前未去缩进而必然失败（键名正则
  锚定 `^`，而递进的行仍带缩进）；新增 `loadTolerant`，严格解析放弃时只扫顶层标量，且**仅在真扫到
  name/description 时才接手**，真正损坏的文件仍如实报错。另修 `readMapping` 一律按映射递归子块、
  导致嵌套列表必炸的问题。实测 `D:\DSH\skills` 由 102/111 提升到 **111/111**。
- **凭据读取**（`skill-naming.mjs`）：`.credentials.yaml` 里有一条 `client-connection/browser-session`
  记录键，`/` 超出子集解析器的键名正则，**整份凭据文件解析抛异常**；`resolveApiKey` 吞掉异常后
  报「缺少密钥」，于是**所有命名调用全部失败**——112 个技能排队、只有 1 条落盘。改为只扫 `refs:`
  块、不解析整个文档。顺带修 `effectiveSections` 在 `patchPaths` 为 undefined 时抛
  `TypeError: patchPaths is not iterable`。
- **分类兜底**（`skills-runtime.mjs` / `catalog-runtime.mjs`）：`guessCategory` 的兜底原本是
  `literature`，把每个未命中的技能都塞进「文献」；改为 **`misc`（其他）**。索引重建时把引用了
  不存在分类的记录**改判为「其他」**而不是让它消失；不再被扫描的旧记录排除出索引而非让重建失败
  （后者会让整个技能列表变空）。
- **免重启路径实测（结论：必须重启）**：改写 profile 的 `cordis.patch.yml` 触发 `patchReload: live`、
  在 `dsh.profile.bundles` 里删除再重加该 bundle、`POST /dsh-market/api/v1/restart`
  （capabilities 明确 `restart.supported=false`）三条路径全部无效——宿主半边只在启动时加载。

**复验**
- `node --test tests/*.test.mjs`：**33/33**
- `D:\DSH\skills` 用 `diagnoseSkillDir` 全量校验：**111/111 通过**
- 真实模型调用（`nameSkill`，带 profile patch）：返回 `前端界面设计` + 中文简介 + 分类 `figure`

## 2026-10-02 · 按 `/dsh-plugin-studio` 合同对齐（真合同项照改，模板布局项记录偏离）

**背景**：用户要求按既定流程，用 `/dsh-plugin-studio`（DSH 插件开发助手，
`D:\ScienceAgentData\skills\dsh-plugin-studio`）把这个能力做成独立插件。把该技能的六阶段工作流
与本插件现状逐项对照后，只改**真合同项**，其余作为**有意偏离**记录。

**改动**

- `package.json`：`exports` 补 `"./cordis.patch.yml"`；**删除整个 `peerDependencies`**
  （9 个 `@deepseek-ai/dsh-*` 与 react/react-dom 一并撤出，官方包只留 `devDependencies`）。
  整块删除而非只清官方包的理由：这些座位运行时全由 profile 提供，而声明 peer 会被内核按
  「peer 不兼容」**整包跳过** —— lab 启动日志里 `dsh-mnemon` / `@nanmicoder/dsh-agent-teams`
  就是这么被跳过的。
- `tsdown.config.ts`：`minify: true → false`。契约要求产物里出现字面量
  `window.__ModuleLoader__.load({ id: "dsh-science-skill"`，压缩会把它变成
  ``load({id:`dsh-science-skill` `` 而校验失败；官方 client 产物同样不压缩。
- `cordis.patch.yml`：注释重写。原注释说「行 id 必须与设置命名空间同步，否则 config 写不进去」——
  这个说法是**错的**（本插件的面板全部走自家 `/api/dsh-science-skill/*`，不经过 dsh-settings 的原生
  config），改成记录「为什么行 id 保留 `science-skill`」。
- `docs/plan.md`：新增，按 studio 的 `templates/plan.md` 六阶段逐项填证据，并附「与合同的偏离」表。
- `README.md`：新增「插件合同（对齐 `/dsh-plugin-studio`）」对照表；状态段的测试数 / bundle 大小更正。

> 座位 id 现状（供对照）：`settings.section` = `science-skill`（order 21，label `Skill`）、
> `sidebar.skills` = `science-skill`（order -10）。两者是不同的 slot，共用同一个 id 不冲突；
> 本文件更靠下的旧条目里记的 `science-skill-tree` 是当时的旧值。

**复验**（全部在插件目录内执行；lab 用 `link:` 安装）

- 构建链：`build-styles --check` ok（2 表 6 类名）→ `build-host` → `tsdown` →
  `lib/client.js 108.19 kB │ gzip 26.93 kB`；`node --test` **20 pass / 0 fail**；`tsc --noEmit` exit 0；
  产物含契约字面量（`hasLiteral=True`）。
- `verify_plugin.py`：**8/11**（改之前 5/11 fail）。未通过 3 项：React external（脚本找 `scripts/build.mjs`）、
  必需文件（`src/index.ts`）、名称一致性（patch 行 id）—— 均为模板布局 / 命名假设。
  顺带发现脚本的 `has_client` 门：只有 ModuleLoader id 检查**通过之后**才真跑 React external 检查，
  所以关掉 `minify` 之前那条 React PASS 是**假通过**。
- lab 重启（新 token，port 39998）后重跑探针：启动日志无 `1 entry did not activate`、无
  `1 client plugin did not load`；`probe12` → `pluginKeys=[自家两张表]`、`ssTreeDisplay=flex`、
  `ssSettingsDisplay=flex`；`probe13` → 点 `deep-research` 后 composer 文本 `deep-research\n `、
  插件无告警；`probe10` → `/api/dsh-science-skill/{info,catalog,categories}` 与 `/science/api/*` 全 200。

## 2026-10-02 · 修复 `dsh-science-skill: loading`（真因三条）＋ 隔离 lab 复验「装完能用」

**症状**（用户截图 + 本机 lab 完整复现）：真窗口右上角 `1 client plugin did not load`，明细
`dsh-science-skill: loading`；技能面板 / 侧边栏目录树 / `/` 触发器全都不出现。

> 本文件下面那条「客户端硬注入面」的记录结论是**错的**（`conversation` 不是原因，摘掉它反而引入新 bug），
> 已由本条取代；`failures.md` F13 也已按实测改写。

**真因（三条，各自独立）**

1. **F15 · 客户端 `apply` 抛错**：`const triggers = ctx.get('inputTriggers'); triggers.inject([…], …)` ——
   新版运行时的 `inputTriggers` 服务面只有 `registerSource`（`packages/client/ui-input-trigger/src/client/service.ts:55`），
   调不存在的 `inject` 立刻抛，apply 在**任何座位注册之前**断掉；纤维抛错后重放，宿主审计到
   `FiberState.LOADING(1)` 就报成裸状态名 `loading`（`packages/client/web/src/boot-client.ts:83-107` 的 `else { reason: state }`）。
2. **F14 · 样式表从不安装**：`effect(() => install, …)` 把安装器当成 disposer 收走（`vendor/cordis/src/fiber.ts:402-419`），
   面板 DOM 全在、样式为零（`display:block` 而 CSS 写的是 `flex`）。
3. **F13 · 读没声明的座位**：`conversation` 被从 `inject` 摘掉后又用 `ctx.get('conversation')` 读 →
   `undefined` → 点技能插 composer 时抛 `reading 'input'`。官方 `ui-science` 带着同一个座位正常激活，
   证明它**可以**声明；`ctx.get` 读不到声明过的座位，要用属性访问。

**改动**

- `src/client/index.tsx`（客户端）：
  - `export const inject = ['slots','sessions','conversation','remote','locale','inputTriggers']`
    （`conversation` **恢复声明**），读取改属性访问 `(ctx as unknown as { conversation: IConversation }).conversation`；
  - `inputTriggers` 改读服务属性并调 `registerSource(source)`（返回的 disposer 交给 effect），不再调 `inject`；
  - 样式安装器改成 `install()` **返回**disposer，`effect(install, 'dsh-science-skill: panel styles')`。
- `src/host/index.js`（宿主）：删掉 `ctx.get('skillGate')` 探底 + `ctx.provide('skillGate', …)`
  （F12：会撞死 fork 自己的 science-workbench，且实测无消费者），`gate` 降级为路由私用对象，
  新增诊断路由 `GET /api/dsh-science-skill/skill-gate/check?sessionId=…&name=…`。
- 测试：`tests/host.test.mjs` 改成断言 `provideCalls === []` / 座位保持原主 /
  「撞车注册永不被触发」；`tests/client-bundle.test.mjs` 新增「apply 装两张表 + 注册 `/` 源、dispose 后清空」
  的行为用例与「座位必须声明」断言；`README.md` 依赖表与 skillGate 章节同步改写。

**复验**

- 构建链：`build-styles --check` ok（2 表 6 类名）→ `build-host.mjs` → `tsdown` → `lib/client.js 65.25 kB │ gzip 17.57 kB`；
  `node --test tests/*.test.mjs` → **20 pass / 0 fail**；`tsc --noEmit` exit 0。
- 隔离 lab（`DSH_HOME=…\release\dev-test-dataroot`，port 39998，Playwright 1.61.1 无头 Chromium）：
  - 启动日志不再有 `1 entry did not activate` / `service "skillGate" has been registered`；
  - `[INSTR] apply returned undefined`（不再 `APPLY THREW`）、`notice=(none)`；
  - `/science/api/info|catalog|categories`、`/science/static/assets/science-whale.png`、
    `/api/dsh-science-skill/*` 全部 **200**（撤出 skillGate 前它们全是 404）；
  - 两个座位（侧栏技能树 + 设置 `Skill` 面板）渲染，`pluginKeys=['dsh-science-skill/skills-settings.css','dsh-science-skill/skills-strip.css']`、
    `display:flex`（截图 `probe12-*.png`）；
  - 点树里 `deep-research` → composer 出现引用芯片（截图 `probe13-after-insert.png`）；
  - 设置里拨动激活开关 → `POST /skill-gate/pin` 200 → `<dataroot>/skill-gate.json` 落盘（截图 `probe14-settings-toggle.png`）。

**数据/环境事实**：lab 用 `…\release\dev-test-dataroot\profiles\web\package.json` 加
`"dsh-science-skill": "link:D:/ScienceAgentData/workspace/科研agent开发/dsh-science-skill"` + bundles 条目
（备份 `package.json.bak-lab-20261002-175530`）与其 `node_modules` junction 实现；
**用户日常 profile（`D:\ScienceAgentData\profiles\web`）不含本插件**（无依赖项、无 junction），未被动过。

**遗留**：lab 里 stock `@deepseek-ai/dsh-client-ui-science` 仍注册同样的两个座位 → 设置侧栏出现两个 `Skill`
（提取完成后该由 fork 侧摘掉，本插件不处理）；`/science/api` 的第三方 `remote.session` 报错与
React #418/#423 与本插件无关。

## 2026-10-02 · ~~修复 dev-test 里 `dsh-science-skill: loading`（客户端硬注入面）~~（结论已作废，见上）

**症状**：dev-test 真窗口右上角 `1 client plugin did not load`，明细
`dsh-science-skill: loading`，技能面板 / 侧边栏目录树 / `/` 触发器全部不出现。

**当时的判断（错）**：`src/client/index.tsx` 的 `export const inject` 里列了 `conversation`，
它是会话作用域服务，根上下文满足不了 → 纤维停住 → 宿主报 `loading`。

**当时的改动**：从 `inject` 摘掉 `conversation`，改用 `ctx.get('conversation')` 最佳努力读取。
实测无效（用户重启后仍 `loading`），随后被上一条的三条真因取代。

## 2026-10-02 · 开源可移植性：README 重写 + 安装脚本去本机化

面向的读者从「本机开发」换成「别的机器上的人」。没有改任何运行时行为。

**`README.md`（全量重写）**

- 新增「它需要什么」：DSH `^0.2.0-rc.1`、官方客户端服务清单、**运行时零依赖**、只读写一个数据根。
- 新增「可选的 `skillGate` 挂点」：说明两侧都必须幂等注册（`ctx.get(...) === undefined` + `try/catch`），
  没有挂点时的降级行为（内核照常广告全部技能、开关只记录状态），以及 Science Agent 把三行接缝
  放在 `packages/skill/tool-skill/src/index.ts` + `science/patches/kernel/skill-gate.patch`。
  **本插件只 provide、从不 patch 内核。**
- 「安装」改成可照抄的通用步骤（ASCII junction → `dsh plugin add file:` → `install`），
  讲清为什么要 junction（`file:` 死快照 / 中文路径 GBK 乱码），并给出本包自带脚本的用法。
- 补「adoption」说明（有目录没记录的技能会被补登记）、构建顺序为什么必须是
  styles → host → tsdown、以及测试策略。
- 「状态」更新到里程碑 1–4 全部完成 + 当前验证数字。

**`scripts/install-profile.ps1`**

- 去本机化：`$Source` 缺省值改成 `Resolve-Path (Join-Path $PSScriptRoot '..')`；
  `-Link` / `-ProfileDir` 缺省从 `$DSH_HOME`（回落 `~/.dsh`）推导，不再硬编码
  `D:\ScienceAgentData\...`。
- 构建产物检查改成「缺什么就打印哪条命令」（`lib/index.js` → `build-host.mjs`；
  `lib/client.js` → `tsdown`），不再写「里程碑 2 才有」这类只在开发期成立的话。

**`src/client/SkillSettingsSection.tsx:478`**：占位符 `D:\MySkills\nature-xxx` →
`~/my-skills/nature-xxx`（跨平台，且不再像某个人的本机路径）。

**验证**：`build-styles --check` ok / `build-host` / `tsdown` → `lib/client.js` 65.12 kB
（gzip 17.56 kB）/ `tsc --noEmit` exit 0 / `node --test` 18 pass 0 fail；
`grep my-skills lib/client.js` 命中；安装脚本在临时目录实跑（缺省 Source 与 junction 创建均正确），
随后清掉临时目录。

## 2026-10-02 · dev-test 接线 + 修掉两插件争 `skillGate`

**Science Agent 仓（`science/workbench-web/plugin.mjs:1002-1023`）**

- workbench 的 `skillGate` 注册改成幂等：`ctx.get('skillGate') === undefined` 才尝试
  `ctx.provide`，并套 `try { … } catch { /* keep the existing one */ }`。
  真因与判据见 `failures.md` F12（cordis 服务名 per-isolate 唯一，bundle 层先于
  profile 用户层合成，dev-test 里本插件先 provide，workbench 后 provide 就把它自己的
  `apply` 炸了 → 整个 science layer 掉线）。

**dev-test 隔离 profile 的注册（不进发行版，只给本机实测用）**

- junction `release\dev-test-dataroot\profiles\web\node_modules\dsh-science-skill`
  → `D:\ScienceAgentData\dsh-plugins\dsh-science-skill`；
- manifest `dependencies` 加 `"dsh-science-skill": "link:D:/ScienceAgentData/dsh-plugins/dsh-science-skill"`，
  `dsh.profile.bundles` 追加 `dsh-science-skill`。

**验证**

- `pnpm --dir apps/desktop run dev-test` → exit 0；V4 source-kind 与 28 条内核重放标记全绿。
- 冒烟测试（`DSH_HOME=<dev-test-dataroot>` 起真 harness）：`/science/api/catalog` 与
  `/api/dsh-science-skill/catalog` 同时 200（各 36564 B），日志无 `did not activate` → 两插件并存。
- 插件侧 `build-styles --check` / `build-host` / `tsdown`（`lib/client.js` 65.12 kB）
  / `tsc --noEmit` exit 0 / `node --test` 18 pass 0 fail。

## 2026-10-02 · 里程碑 4：从 ui-science 摘掉已迁走的槽位注册

改动落在 **Science Agent 仓**（发行版自己的客户端包），本插件包不改代码——
这一轮的意义是「技能面从此只有本插件一份」。

**`packages/client/ui-science/src/client/index.ts`（192 → 69 行）**

- 保留 `conversation.hero.brand.mark` / `sidebar.brand.mark` / `sidebar.brand.name`
  三个品牌槽位（仍在同一嵌套 `slots.inject` 链里）、`settings.general.item` 的
  `DataRootRow`（默认存储位置）与 `installScienceStyles(ctx)`。
- 删除 `addSkillToComposer()`、`SKILL_REFERENCE_SOURCE`、`inputTriggers` 的 `/` codec 注册、
  `sidebar.skills` 的分类树注册、`settings.section` 的 `Skill` 面板注册。
- `inject` 由 7 项收窄为 `['slots','remote','remote.directoryPicker']`。
- 修掉写错的槽位 owner import：`dsh-client-ui-settings-general/client`
  → `dsh-client-ui-settings/client`（见 failures F11）。

**保留但不生效**（见 decisions D8）：`SkillStrip.tsx`、`SkillSettingsSection.tsx`、
`skill-gate.ts`、`skill-search.ts`、`ScienceCategoryIcon.tsx`、`icon-paths.ts`、`catalog.ts`
与两张 `*.module.css`。

**元数据**（见 decisions D9）：`README.md` 重写为「职责 / 不归本包管 / 改动怎么生效 /
已知红灯」；`package.json` `description` 同步更新；`dsh.client.inject` 未动。

**验证**

- `tsc -b packages/client/ui-science/tsconfig.json` → exit 0。
- 单包 `tsdown` → `lib/index.js` 0.19 kB、`lib/client.js` 20.66 kB（gzip 6.86 kB）。
- 全仓 grep：无任何代码 import 被摘掉的导出；`scripts/` 无门禁引用本包导出。
- 本插件包重建后：`build-styles --check` ok、`tsdown` 65.12 kB（gzip 17.56 kB）、
  `tsc --noEmit` exit 0、`node --test` **18 pass / 0 fail**。

**预存在红灯（非本轮引入）**：`verify-client-ui-i18n` 报本包 84 条硬编码中文
（`SkillSettingsSection` 55 / `DataRootRow` 16 / `SkillStrip` 10 / `ScienceBrand` 3）；
后两个文件仍在生效，说明这条门在拆分之前就红。

## 2026-10-03 · 里程碑 3：内核 `skillGate` 挂点 + 升级重放登记

改动落在 **Science Agent 仓**（内核与重放清单），本插件包**只**履行 D6 的约定：
宿主侧 `src/host/index.js` 继续 `ctx.provide('skillGate', …)`，没有这个挂点的纯 DSH 上
开关降级为「只记录状态」。

**内核 `packages/skill/tool-skill/src/index.ts`**

- `:13` import 补 `type Session`。
- `:49-69` 新增可选服务：`export interface SkillGateService { isActive(session: Session, name: string): boolean }`
  与 `declare module '@deepseek-ai/cordis' { interface Context { skillGate?: SkillGateService } }`。
- `:249-255`（`agent/pre-step` 里）过滤改为
  `const gate = ctx.get('skillGate')` +
  `isModelInvocable(skill) && (gate?.isActive(agent.session, skill.name) ?? true)`。
  用 `ctx.get` 而非 `ctx.skillGate`（可选服务规约）；`?? true` 保住 stock 行为。

**内核测试 `packages/skill/tool-skill/tests/tool-skill.spec.ts`**

- 新增用例 `honours a provided activation gate and leaves the catalog unfiltered without one`：
  无 gate 时目录同时含 `gated-out`/`gated-in`；`ctx.provide('skillGate', …)` 之后
  replacement catalog 只剩 `gated-in`，且 gate 收到过 `'skill-gate:gated-out'`。

**升级重放登记（Science Agent 仓）**

- 新增 `science/patches/kernel/skill-gate.patch`（4810 B、LF 行尾；反向 `git apply --check` exit 0）。
- `apps/desktop/scripts/check-science-overlays.mjs` 的 `MARKERS` 加 2 条 →
  `checked 28 kernel-overlay marker(s) and 14 fork-owned file(s)` / `every science kernel overlay is intact`。

**验证**

- `pnpm exec vitest run packages/skill/tool-skill` → **33 passed**（原 32 + 新 1）。
- `node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -b tsconfig.host.json` → exit 0。
- `node apps/desktop/scripts/check-science-overlays.mjs` → exit 0。

**本插件的配套改动（自查发现的崩溃）**

- `src/host/index.js`：gate 从「拥有」改成「兜底」——
  `const existingGate = ctx.get('skillGate')`，非空就不 provide；若探底不可靠（同一挂载批次里
  前一个 `provide` 尚未 settle 时 `ctx.get` 仍是 `undefined`）则 `try/catch` 吞掉
  `service "skillGate" has been registered at <fiber>` 并记一条日志。
  原因：`science/workbench-web` 与本插件都会 `provide('skillGate')`，而 cordis 对同一 isolate 的
  重名服务直接抛（见 failures F8；两种时序都用仓库里那份 cordis 实测过）。
- `tests/host.test.mjs`：新增
  `an activation gate already in the tree is reused, never re-registered` 与
  `a colliding registration is tolerated and the routes still come up`
  → `node --test` **18 pass / 0 fail**（16 + 2）。
- `lib/` 重建（顺序：`build-styles` → `build-host` → `tsdown`）：`lib/index.js` 32245 B、
  `lib/client.js` 65118 B。**只跑 `build-host.mjs` 会把 `client.js` 带走**（见 failures F9）。

**行为影响（要提前告知用户）**：`D:\ScienceAgentData\skill-gate.json` 现在是 `{"pinned": {}}`，
而 dev-test 里 gate 一定存在（`science/workbench-web/plugin.mjs:1005` 与本插件都会 provide），
所以**新会话里模型看到的技能目录是空的**，直到把技能 pin 上（设置页开关）或在某个会话里
用 chip 激活。用户自己打的 `/命令` 不受影响。

## 2026-10-02 · 里程碑 2：浏览器半边落地 + 构建/类型/测试闭环

**新增**

- `src/client/index.tsx`：本插件浏览器入口。导出 `name`、`SKILL_REFERENCE_SOURCE =
  'science-skill'`、`inject = ['slots','sessions','conversation','remote','locale',
  'inputTriggers']`、`apply(ctx)`；注册三处——`inputTriggers` 的 `/` 引用源（只做
  chip ↔ `/命令` 的序列化，不提供候选）、`settings.section`（id `science-skill`,
  order 21, label `Skill`）、`sidebar.skills`（id `science-skill-tree`, order -10）。
  组件用 `props as XProps` 透传（不套包装 div，否则 `:where(.ss-settings, .ss-tree)`
  的 token 块落不到 DOM 上）。
- `src/client/ui/inject.ts`：`installPanelStyles()`（幂等注入 `<style>`，见 decisions D2）
  与 `pickDirectoryFrom(remote)`（宽松读取：容忍裸 `string|null` 与 `{ok,value}` 信封；
  picker 不存在时返回 `null`，界面回落到手输路径）。
- `scripts/build-styles.mjs`：CSS Modules → `src/client/styles/*.ts` + `class-names.ts`；
  `--check` 逐字节校验。
- `scripts/link-dev-deps.mjs`：dev 依赖 junction 化（见 successes S4）。
- `scripts/codemod-milestone2.mjs`：一次性机械转换器（import 改写、`/science/api/*` →
  `` `${API_BASE}/*` ``、事件名 `science:catalog-changed` → `dsh-science-skill:catalog-changed`）。
- `tests/client-bundle.test.mjs`：3 个 bundle 契约用例（真跑 factory，见 successes S6）。

**迁入**（从 `packages/client/ui-science/src/client/`）

- `SkillSettingsSection.tsx`（748 行 → 设置页管理面板）、`SkillStrip.tsx`（628 行 → 侧栏
  分类手风琴）、`ScienceCategoryIcon.tsx` + `icon-paths.ts`、`skill-search.ts`、
  `skill-gate.ts`、两个 `.module.css`。

**未迁**（理由见 decisions D1）

- `DataRootRow.tsx` + 其 CSS、`catalog.ts`（死代码）、`ScienceBrand.tsx` + `ScienceIcon.tsx`、
  三个品牌槽位注册、`styles.ts` 与 `academic-theme.css` 的 alias 重绘。

**改动**

- `src/client/skill-gate.ts`：新增 `export const API_BASE = '/api/dsh-science-skill'`，
  四处 fetch 改走它。
- `package.json`：`build` 脚本串起 styles → host → tsdown；加 `link:dev`；`dsh.client`
  去掉 `inject`（本包不 import `ui-primitives`）；peer/dev 依赖版本改成 `^0.2.0-rc.1` 区间。
- `tsconfig.json`：加 `"tsdown"` 路径兜底（见 failures F4）。
- `src/host/index.js`：`name` 由 `'science-skill'` 改为 `'dsh-science-skill'`（见 decisions D5）。
- `README.md`：开发章节补全（styles/host/tsdown/tsc/test），状态更新到里程碑 2 完成。
- 删掉过期占位产物 `src/client/ui/styles.generated.ts`。

**验证**

- `build-styles --check` ok（2 张表、6 个重名类）；`build-host` 复制宿主半边；
  `tsdown` → `lib/client.js` 65.12 kB / gzip 17.56 kB。
- `tsc --noEmit` exit 0。
- `node --test tests/*.test.mjs` → **16 pass / 0 fail**（13 宿主 + 3 bundle）。

## 2026-10-01 · 里程碑 1：宿主半边

`src/host/index.js` + `src/host/lib/*`（`skills-runtime` / `categories-runtime` /
`catalog-runtime` / `skill-roots` / `skill-frontmatter` / `skill-acceptance` /
`skill-naming` / `skills-migrate` / `frontmatter-yaml`）与 `src/host/schema/catalog.schema.json`
从 `science/workbench-web/` 迁入；路由前缀改为 `/api/dsh-science-skill`；
`skillGate` 服务以 `ctx.provide('skillGate', …)` 发布；数据根解析改为
`config.dataRoot` → `$DSH_HOME` → `~/.dsh`。13 个宿主测试。
