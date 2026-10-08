# decisions

只记**会影响后续改动**的决定，以及当时的理由。倒序（新的在上）。

## D13 · 2026-10-02 · 与 `/dsh-plugin-studio` 合同的取舍：真合同项照改，模板布局项记偏离

改用 `/dsh-plugin-studio` 的六阶段工作流交付本插件，跑了它的
`scripts/verify_plugin.py`（11 项）逐条判定。三类处理：

- **照改（3 项，都是真合同项）**：① `@deepseek-ai/*` 撤出依赖面 —— 直接**删掉整个 `peerDependencies`**，
  官方包只留 `devDependencies`（理由见下）；② 补 `exports["./cordis.patch.yml"]`；
  ③ `minify: false`，让产物保留契约要的字面量 `window.__ModuleLoader__.load({ id: "dsh-science-skill"`。
- **记录偏离（3 项，都是脚本对模板工程的假设）**：① React external —— 脚本只认 `scripts/build.mjs` 的
  `clientConfig.external`，本插件用 `tsdown.config.ts` 的 `deps.neverBundle` 表达同一件事；
  ② 必需文件要求 `src/index.ts` + `src/client/index.ts` —— 本插件宿主半边是 813 行纯 ESM JS 的
  `src/host/index.js`（JSDoc 类型；改名 `.ts` 会在 `strict` 下把无注解 JS 变成成片类型错误），
  浏览器半边含 JSX 必须是 `.tsx`；③ 名称一致性要求 patch 行 id 等于包名 —— 保留 `science-skill`。

判据与反证：

- **为什么连 peer 一起删**：这些座位运行时全由 profile 提供，声明 peer 不但没用，还会被内核按
  「peer 不兼容」**整包跳过**。这不是理论——lab 启动日志里 `dsh-mnemon`、`@nanmicoder/dsh-agent-teams`
  就是这样被跳过的（日志把它们的 peerDependencies 整段打出来）。
- **行 id ≠ 包名是生态常态**：官方 `@deepseek-ai/dsh-web-app/cordis.patch.yml` 里写的是
  `- id: ui-science / name: '@deepseek-ai/dsh-client-ui-science'`；第三方 `dsh-mnemon → id: mnemon`、
  `dshmarket → id: dsh-market`、`@dickpy/dsh-imagegen → id: imagegen`、`@cocofhu/skillhub → id: skillhub`、
  `@michengai/dsh-agency-agents → id: agency-agents`。加载链路（`packages/boot/app-boot/src/profile.ts:58/73`、
  `index.ts:335/346`、`plugin-manager/src/operations.ts:105`）只要求行 id **唯一**，安装时也只用它定位 patch。
- **为什么值得偏离**：为迎合这三条检查而改目录结构 / 行 id，要牺牲已经过 lab 端到端验证的东西，
  收益只是让一个脚本多打三个 PASS —— 且 D5 已定「`science-skill` 是这个能力的源名」
  （客户端 `SKILL_REFERENCE_SOURCE`、两个 slot 命名空间）。

计划与逐项证据落在 `docs/plan.md`，README 里有同一张对照表。当前 `verify_plugin.py` = **8/11**。

## D12 · 2026-10-02 · `skillGate` 座位：只读，不 provide

**决定**：`src/host/index.js` **不再** `ctx.provide('skillGate', …)`（删掉整段探底 + provide），
`gate` 对象只服务于自家 `/api/dsh-science-skill/*` 路由。

**理由**：
- 对方（fork 的 `science/workbench-web/plugin.mjs:1002-1011`）是**无防护**的 provide，
  我们先 provide 就会让它的 `apply` 抛 `service "skillGate" has been registered`，
  它整个插件（含 `/science/api/*` 全部路由）下线——try/catch 救不了，因为抛的是**别人**的 apply（F12）。
- 实测**没有消费者**：`profiles/web/node_modules/@deepseek-ai` 与 dev-test `resources` 递归扫 `skillGate`，
  只命中 `workbench-web/plugin.mjs` 自己（F12 的判据段）。既然没人读，provide 是纯粹的负收益。
- 语义不丢：对方读的是我们一直在写的同一个 `<root>/skill-gate.json`。

**代价**：如果将来真有内核要读这个座位，得由**对方**提供（或双方约定由谁拥有）。
本插件保留了 `skill-gate/check` 诊断路由，让「pin ∪ 本会话激活」的并集语义继续是活代码。

## D11 · 2026-10-02 · 复用被拆出的官方 `ui-science` 作为「当前 DSH 的 API 事实来源」

**决定**：客户端半边遇到「这个服务到底怎么用」时，先看**同一个运行时里、同样功能、还活着的官方插件**
怎么写，再回仓库源码对照；两者冲突时以**活着的那份**为准。

**理由**：本轮三条真因里有两条都与「仓库源码 ≠ 运行时事实」有关：
- `inputTriggers`：仓库里曾有 `inject` 面，运行时只有 `registerSource`（F15）；
- `conversation`：仓库注释强调会话作用域（容易被读成「不可声明」），
  而运行时里 `ui-science` 就把它写进 `inject` 并用属性访问（F13）。

**做法**：`…\dev-test-dataroot\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-science\lib\client.js`
（同样是当初被拆出来的能力）——`node`/`Select-String` 直接读它的 `inject` 数组与调用点即可。

## D10 · 2026-10-02 · 要读的服务一律写进 `inject`，用属性访问取值

**决定**：`export const inject` 列全本半边要用的座位（含 `conversation`），
读取一律 `ctx.<name>`（类型上做一次 cast）；`ctx.get(name)` 只用于**可选**挂点（如 `remote` 的命名空间）。

**理由**：cordis 只为**声明过的**座位等待并建立属性代理；`ctx.get` 是直接查注册表，
对声明过的座位反而读到 `undefined`（F13 现场：`conversation.input` 抛 `reading 'input'`）。
另外「会话作用域」约束的是**用法**（`conversation.input.for(actx)`），不是座位本身。

## D9 · 2026-10-02 · 更新 ui-science 的职责描述与 README，但不动 `dsh.client.inject`

里程碑 4 之后 `ui-science` 的 `package.json` `description` 与 `README.md` 都改成
「科研品牌 + 默认存储位置行 + 学术主题；技能面见 `dsh-science-skill`」——
描述失真会误导下一个改这个包的人。

但 `package.json` 的 `dsh.client.inject`（`ui-layout` / `ui-renderer` / `ui-sidebar` / `locale`）
**刻意不动**：`ui-layout` 现在已无人 import，可它在发行侧是加载顺序声明，删掉属于
「为整洁去动一条能整页失败的清单」，收益不成比例。要动它得单独验证一次完整前端加载。

## D8 · 2026-10-02 · 里程碑 4 只摘「入口引用」，不删 ui-science 里的旧文件

`packages/client/ui-science/src/client/` 下的 `SkillStrip.tsx` / `SkillSettingsSection.tsx` /
`skill-gate.ts` / `skill-search.ts` / `ScienceCategoryIcon.tsx` / `icon-paths.ts` /
`catalog.ts` 与两张 `*.module.css` 在里程碑 4 之后**已无人 import**，但仍然留在原地。

理由：
- 它们不再进任何构建产物（入口不引用就不会被 bundle），留着**零运行时成本**；
- 它们是本次搬迁的**逐行对照物**（新插件的 `src/client/` 就是它们的改写版），
  出问题时能直接 diff；
- 这个仓库的改动可以回退——真删了，回退成本就从「改一行 import」变成「从 git 考古」。

代价：`Science agent` 那套中文硬编码文案仍在树里（`verify-client-ui-i18n` 会继续报到它们，
见 journal 里那条预存在红灯）。**将来要清理时整批删**，别零散删。

## D7 · 2026-10-02 · 本插件的开发文档只写插件目录，不写进 Science Agent 仓

用户明确要求（原话见会话）：本轮只在 `dsh-science-skill` 这个文件夹里写开发文档。
所以 `dev-notes/` 全部落在插件目录内；涉及 Science Agent 仓的改动（内核补丁、重放登记、
ui-science 瘦身）也在这里记，而不是写回那仓的 `dev-notes/`。

推论：`dsh-science-skill/dev-notes/` 是本轮唯一的记录面——写之前先看这里，别去
`science-agent-desktop/dev-notes/` 找本插件的状态。

## D6 · 2026-10-03 · 开关要真的影响模型，就必须在内核留一个可选挂点（补丁留在 Science Agent 仓）

「技能按需激活」的判据在**目录生成**那一刻，而目录是内核的事：
`packages/skill/tool-skill/src/index.ts` 的 `agent/pre-step` 里
`snapshot.skills.filter(isModelInvocable)`。插件的 provider 拿不到会话
（`SkillLookupOptions` 只有 `cwd` / `signal`），所以**纯插件做不到「按会话激活」**。

因此内核里加回一个**可选服务** `skillGate`（`SkillGateService.isActive(session, name)`，
`declare module '@deepseek-ai/cordis'` 里声明为 `skillGate?`），过滤写成
`gate?.isActive(agent.session, skill.name) ?? true`。**`?? true` 是这个设计的全部价值**：
没装门控的 harness 一行不改就保持 stock 行为，不会「一个坏插件让整页技能消失」。

代价与纪律：
- 这是写在上游会覆盖的文件上的改动，所以它是**内核补丁**
  `science/patches/kernel/skill-gate.patch`，并在
  `apps/desktop/scripts/check-science-overlays.mjs` 的 `MARKERS` 里登记 2 条
  （源文件 `ctx.get('skillGate')` + 测试里的 `gated-out`）。升级后必须重放。
- **补丁与登记留在 Science Agent 仓**，不进本插件包：本插件是外部插件，
  只 `provide('skillGate', …)`；它不需要、也不应该携带内核补丁。
  换言之，本插件在**没有这个挂点的纯 DSH 上仍然可用**——只是开关只记录状态、
  不影响模型目录（即今天的旧行为）。

## D5 · 2026-10-02 · 插件 id 统一为包名 `dsh-science-skill`

宿主半边原先写 `export const name = 'science-skill'`。cordis 的 `plugin()` 会把
`plugin.name` 记在 fiber 上用于诊断（`@deepseek-ai/cordis/lib/index.js:1625`），
id 与包名不一致只会给日志添噪音；`cordis.patch.yml` 的插入行本来就是
`id: science-skill` / `name: dsh-science-skill`。两边现在都是 `dsh-science-skill`。

顺手核实过：客户端 runner 注册模块用的是 `moduleIdOf(half.pluginId)`，
**不读** bundle 导出的 `name`（`packages/extensions/cordis-client-runner/src/client/runtime.ts:368-378`）。
所以客户端那个 `name` 是给诊断和测试用的，不是加载契约。

## D4 · 2026-10-02 · profile 里的依赖必须是 junction，不能是 `file:` 硬链接快照

profile 原本是 `"dsh-science-skill": "file:D:/ScienceAgentData/dsh-plugins/dsh-science-skill"`。
pnpm 对 `file:` 是**硬链接/复制**到 `profiles/web/node_modules/`，于是那次 install 的瞬间
就是快照：后来 `tsdown` 产出的 `lib/client.js` 根本不在 profile 里，客户端半边永远不加载，
而且 `export const name` 这类源码改动也不会进去。

`dsh-academic-figure` 和 `expert-team` 用的都是 `"link:..."`（junction，活的）。
**结论：本包在 profile 里必须是 junction。** 这次是把 `profiles/web/node_modules/dsh-science-skill`
整个目录换成 junction（旧快照挪到 `profiles\web\.cleanup-backup-dsh-science-skill-snapshot`）。
以后重装 profile 时若 `pnpm` 又把它变回快照，就重复这一步。

## D3 · 2026-10-02 · 只搬 `--dsw-sci-*` 调色板，不搬 alias 重绘与 chip 重绘

Science Agent 的 `src/styles/academic-theme.css` 有两件事：① 把**整个 harness** 的
`--dsw-alias-*` 重绘成论文纸面色（还有 `--dsw-specific-sidebar-*`、聊天气泡、
`[data-ref-chip='skill']`）；② 给两个面板提供 `--dsw-sci-*` 调色板。

只搬 ②。①是 Science Agent 的**整窗品牌**（换皮肤 + 改宿主静态 `ui-primitives` 渲染的
chip），不是技能管理的能力；放在插件里会去改别人的界面。而且用户在拍板时选了
「接受丢图标、用纯 DSH 默认 chip」，①里给 chip 上色的那两条正好失去必要性。

代价：`SkillSettingsSection.module.css` 有 53 处、`CategoryTree.module.css` 有 6 处
`--dsw-sci-*`，后者**全部没有 fallback**，所以调色板必须跟着走。
`scripts/build-styles.mjs` 的 `SCI_TOKENS` 输出 `:where(.ss-settings, .ss-tree) { … }`
与 `body[data-ds-dark-theme] :where(.ss-settings, .ss-tree) { … }` 两块——**挂在面板根元素上，
不挂 `:root`**（自定义属性在使用它的元素上求值，宿主把 alias 定义在 `body` 上，
挂根元素时 body 的值已经继承到位）。

## D2 · 2026-10-02 · 浏览器半边的样式走「CSS Modules 编译成 TS 常量 + 运行时 `<style>` 注入」

`tsdown` 没有 CSS 管线（不能 `import './X.module.css'`，产物里也不会有 `.css`），
而宿主没有给插件别的样式注入 API——宿主自己的 6 张主题表就是手写
`createElement('style')` + `head.appendChild`，用 `data-plugin` / `data-plugin-css`
两个 dataset 键去重（见 `packages/client/web` 与参考插件
`D:\ScienceAgentData\workspace\开发\dsh-academic-figure\src\client\ui\inject.ts` 的注释）。

所以 `scripts/build-styles.mjs` 把两个 `.module.css` 编成
`src/client/styles/*.ts`（导出 `CSS_KEY` 与 `CSS`）与 `class-names.ts`
（类名映射），运行时由 `src/client/ui/inject.ts` 幂等注入。
**生成物是签名过的**：`build-styles.mjs --check` 重算并逐字节比对，不一致就非零退出，
避免「改了 CSS 忘了重新生成」。

跨文件重名的类才加前缀（`ss-settings` / `ss-tree`）：两张表都有 `.root`、`.searchInput`、
`.status`，以及链式选择器用的单字母 `.b` / `.d` / `.s`（`.badge.b {}`、`.status.s {}`）。
改写只动类名 token，所以 `.ss-settings-badge.b` 是正确产物，不是误报。

## D1 · 2026-10-01 · 只搬「展示层 + 分类层 + 激活开关」，不动技能内核

技能的发现与加载是 DSH 内核的事（`packages/skill/*`），本插件搬到的是
Science Agent 里那层 UI 与管理面：`science/workbench-web` 的
`skills-runtime` / `categories-runtime` / `catalog-runtime` / `skill-roots` /
`skill-frontmatter` / `skill-acceptance` / `skill-naming` / `skills-migrate` /
`frontmatter-yaml`，加上 `packages/client/ui-science/src/client` 的
`SkillSettingsSection` / `SkillStrip`（+ `skill-search` / `skill-gate` / 分类图标）。

**明确不搬**：数据根切换行（`DataRootRow`）与 `dataroot-health`、Science Whale 品牌槽位、
`academic-theme` 的 alias 重绘、`catalog.ts`（死代码，全仓无人 import）、
`appearance: 'skill'` 的 chip 样式表（在宿主静态包里，插件够不着）。

技能数据根**共用** `$DSH_HOME`（DSH 官方的 `skills/` 目录），不另建一份。
