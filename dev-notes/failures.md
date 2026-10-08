# failures

按时间倒序。每条都留下「症状 → 真因 → 判据」，避免下次再花同样的时间。

## F15 · 2026-10-02 · 客户端半边 `apply` 抛 `l.inject is not a function` → 宿主报 `loading`

**症状**（与 F13 那条通知完全同一句）：`1 client plugin did not load` / `dsh-science-skill: loading`。
但纤维并不是「等着谁」——`reason` 是裸状态名 `loading`，而这个裸名来自
`packages/client/web/src/boot-client.ts:83-107 collectInactiveEntries()` 的 `else { reason: state }` 分支，
即审计那一刻纤维停在 `FiberState.LOADING(1)`。而 LOADING 的语义是**回调正在跑**
（`vendor/cordis/src/fiber.ts:625-639`：`_setEpoch` 里 `this.inertia = this._reload()` 后返回 LOADING；
`:646-673` 成功才 `this.inertia = undefined` 转 ACTIVE）。⇒ 「报 loading」= 回调**抛错后又重试**那一刻被抓拍，
不是 import 失败、不是缺服务。

**真因**：`src/client/index.tsx` 的 apply 里

```ts
const triggers = ctx.get('inputTriggers')
triggers.inject(['inputTriggers'], scope => scope.effect(…))
```

新版运行时的 `inputTriggers` 服务面**只有 `registerSource`**，没有 `inject` 方法：
`packages/client/ui-input-trigger/src/client/service.ts:31,42,55`（`class InputTriggerService extends Service`、
`super(ctx, 'inputTriggers')`、`registerSource(src): () => void`；
契约 `src/client/contract.ts:12-25` 只有 `registerSource` + `sessionOf`）。
调一个不存在的方法立刻抛，apply 在**座位注册之前**就断了：`settings.section`、`sidebar.skills`、
`/` 源一个都没执行（所以「插件装上了但什么都没出现」），而抛错后的纤维重放又让审计抓到 LOADING。

**判据（决定性取证）**：不要靠读日志猜。用 `page.route()` 改写**响应体**（不动磁盘）把
`window.__ModuleLoader__.load` 包一层，打印 register/materialize/apply/抛错：

```
[INSTR] register dsh-science-skill
[INSTR] materialize begin
[INSTR] materialized keys=["SKILL_REFERENCE_SOURCE","apply","inject","name"]
[INSTR] apply called
[INSTR] APPLY THREW l.inject is not a function
[INSTR] apply called        ← 纤维重放，宿主就是在这一刻审计
```

脚本：`probe9.cjs`（工作区根，详见 `successes.md`）。另外 `probe7.cjs` 用
`window.__ModuleLoader__.load({id, factory})` 得到 `duplicate factory registration for "<id>"`
即可证明「bundle 确实已注册」——把「bundle 没到」这条路一次堵死。

**修复**：apply 里改成读**服务属性**、调 `registerSource`、把返回的 disposer 交给 effect：

```ts
const inputTriggers = (ctx as unknown as { inputTriggers?: InputTriggerService }).inputTriggers
const source = { trigger: '/', name: SKILL_REFERENCE_SOURCE, candidates: async () => [],
  onPick: () => undefined, codec: { clipboardText: (ref) => `/${ref}`, serialize: async (ref) => `/${ref}` } }
if (typeof effect === 'function') effect(() => inputTriggers.registerSource(source), 'dsh-science-skill: slash source')
else inputTriggers.registerSource(source)
```

官方同类插件的写法是 `ctx.inject(['inputTriggers'], scope => scope.effect(() => scope.inputTriggers.registerSource(…)))`
（`packages/client/ui-input-trigger/src/client/index.ts:62`；被拆出来的 `ui-science` 也一样），
两种都行——**关键是服务面只有 `registerSource`**。测试护栏：`tests/client-bundle.test.mjs` 用
「只有 `registerSource`、没有 `inject`」的假 ctx 跑 apply，旧写法在这个假 ctx 下必炸。

## F14 · 2026-10-02 · 面板渲染出来了但样式全无：`effect(() => install)` 把安装器当成了 teardown

**症状**（lab 复现截图 + 探针）：两个面板的 DOM 都在、文字/交互全对，但**一像素样式都没有**——
`getComputedStyle('.ss-tree-root').display === 'block'`（CSS 里写的是 `flex`），
`document.querySelectorAll('style[data-plugin-css]').length === 0`。

**真因**：`src/client/index.tsx` 里

```ts
const install = (): void => { installPanelStyles([...]) }
effect(() => install, 'dsh-science-skill: panel styles')
```

`effect(execute)` 会**立刻执行 execute 并收集它返回的 disposer**
（`vendor/cordis/src/fiber.ts:402-419` 文档原话「`execute` runs immediately; the disposers it produces are
collected and run (in reverse order) …」）。`() => install` 的返回值 `install`（一个函数）被当成 disposer
收走，**安装体永远不执行**；反而在纤维卸载时被调用一次。

**判据（这条判据本身就是一次误判的教训）**：修 F15 之前，probe9 反而看到 `hasStyle=true` ——
因为那时 apply 抛错 → 纤维卸载 → 被误当 disposer 的 `install` 才跑了一次。
**「样式有时在、有时不在」正是这个形状的指纹**：先别怀疑 CSS 产物，去看 effect 回调和它 return 了什么。

**修复**：让回调**执行安装并返回 disposer**：

```ts
const install = (): (() => void) => installPanelStyles([{ key: 'dsh-science-skill/skills-settings.css', css: settingsCss },
  { key: 'dsh-science-skill/skills-strip.css', css: stripCss }])
if (typeof effect === 'function') effect(install, 'dsh-science-skill: panel styles')
else install()
```

复验：`pluginKeys:["dsh-science-skill/skills-settings.css","dsh-science-skill/skills-strip.css"]`、
`ssTreeDisplay:"flex"`；测试里用假 `document` 断言 `head.children` 的 `dataset.pluginCss` 恰好是这两张表，
且 `effects[0].dispose()` 之后 `head.children` 为空（见 F2 的家族规则）。

## F13 · 2026-10-02 · 读一个没写进 `inject` 的座位：`ctx.get('conversation')` 得 `undefined`

> 本条原先是「硬注入会话作用域服务 `conversation` 导致 loading」的结论，**该结论是错的**，已按实测改写。
> 当时的 `loading` 真因是 F15（apply 抛错）；「`conversation` 不能进 `inject`」的说法没有任何证据支持，
> 反而与运行时事实相反（见下）。

**症状**：点侧栏技能树里的一行，插件自己打印
`warning: [dsh-science-skill] could not reference the skill: TypeError: Cannot read properties of undefined (reading 'input')`，
composer 里什么也没插入（`composerText: ""`）。

**真因**：那次修复把 `conversation` 从 `export const inject` 里摘掉了，而 apply 里仍写
`const conversation = ctx.get('conversation')`。**`ctx.get` 不是「读座位」，它是直接查注册表**：
声明过的座位由 cordis 的 inject 代理解析成 `ctx.<name>`（并且只有在 `inject` 里声明，cordis 才会为它等待），
`ctx.get('conversation')` 在这个部署里返回 `undefined` → `conversation.input.for(actx)` 立刻抛。

**判据（同运行时对照，比读源码可靠）**：被拆出来的官方 `ui-science` 半边
（`…\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-science\lib\client.js`）在**同一个页面里正常激活**，
它的 `inject` 是 `["slots","sessions","conversation","remote","remote.directoryPicker","locale","inputTriggers"]`，
并且用 `addSkillToComposer(sessions, ctx.conversation, skill)`（**属性访问**）+ `conversation.input.for(actx)`。
「会话作用域」只体现在**控制器用法**上（`…ui-conversation/src/client/service.ts:520-542` 那句
`roots fail loud` 说的是别在根上直接调会话方法），不代表位子不可满足。
另外全 profile 扫 `provide(…conversation…)` 零命中，说明这个座位本来就靠 declare 才成立。

**修复**：`inject` 恢复为 `['slots','sessions','conversation','remote','locale','inputTriggers']`，
读取改成属性访问 `(ctx as unknown as { conversation: IConversation }).conversation`。
复验：点树里的 `deep-research` → composer 里出现 `deep-research` 引用芯片（截图 `probe13-after-insert.png`）。

**规则（两条一起记）**：
1. 要读的服务**一律写进 `inject`**：声明 = 我等你，属性访问 = 拿到的值；`ctx.get` 只用来读**可选**座位。
2. `export const inject` 里**不要**写「靠别人的作用域才存在」的名字（那才会 pending），
   但「会话作用域的控制器」是可以声明的座位——判据是**同运行时里有没有官方插件这么写还活着**。

## F12 · 2026-10-02 · 两个插件都 `provide('skillGate')` → science-workbench 整个插件激活失败

**症状**（dev-test 冒烟测试的 harness 日志）：

```
dsh: warning: 1 entry did not activate
science-workbench (file:///…/resources/science-layer/workbench-web/plugin.mjs):
  Error: service "skillGate" has been registered at <dsh-science-skill>
  at Fiber.<anonymous> (…/vendor/cordis/lib/index.js:813:31)
  at Proxy.provide (…/cordis/lib/index.js:801:25)
  at Object.apply [as callback] (…/science-layer/workbench-web/plugin.mjs:1005:9)
```

science-workbench 的**全部** `/science/api/*` 路由与它的技能设置页一起消失（报错发生在它自己的
`apply` 里，整个 entry 报废）。我这边新插件的 `provide` 早就有 `ctx.get` 探底 + try/catch 兜底，
所以只有 workbench 那一侧炸。

**真因**：cordis 的服务名 per-isolate 唯一（`@deepseek-ai/cordis/lib/index.js:813`：
`throw new Error('service "…" has been registered at <fiber>')`）。新插件与 science layer 都想
provide 同一个可选挂点，而 **bundle 层先于 profile 的 `cordis.patch.yml` 用户层合成**，所以
dev-test 里新插件先 provide、workbench 后 provide 就抛。

**修复（方向已改：不再抢座位，而是根本不 provide）**：早先的做法是去给 fork 那个无防护的 provide
打补丁，但 `science/workbench-web/plugin.mjs` 是 fork-owned 文件，而本轮口径是**科研agent 源码全量回退到快照**
（见 `decisions.md`），补丁不能留在那儿。于是改成从我这边撤出：
`src/host/index.js` 删掉整段 `ctx.get('skillGate')` 探底 + `ctx.provide('skillGate', gate.service)`，
`gate` 对象降级为**只给自家路由用**的内部对象，并新增一条诊断路由
`GET /api/dsh-science-skill/skill-gate/check?sessionId=…&name=…` 让「pin ∪ 本会话激活」的并集语义继续是活代码。
撤出的依据是一次**消费者扫描**：

```
Get-ChildItem '<profiles>\web\node_modules\@deepseek-ai' -Recurse -Include *.js,*.mjs | Select-String 'skillGate'   → 零命中
dev-test release\resources 递归扫 *.js,*.mjs                                                                        → 只命中 workbench-web/plugin.mjs 自身
```

⇒ 现役 harness 里没有任何内核/工具读这个座位：我们 provide 既无用、又必然让那个**无防护的对方** apply 抛错。
真有人读时，其 provider 读的也是我们一直在写的同一个 `<root>/skill-gate.json`，语义不丢。

**判据**：
- 重启 harness 后启动日志里**没有** `1 entry did not activate`、也没有 `service "skillGate" has been registered`，
  且 `/science/api/info|catalog|categories` 与 `/science/static/assets/science-whale.png` 全部恢复 **200**
  （撤出前它们全是 404）→ 对方插件活着，接缝没了。
- 更一般的判据：**两个插件共享同一个可选服务名时，先问「到底谁读它」**。没人读就没必要 provide；
  有人读就只能在**自己这侧**让步（对方的 apply 你 try/catch 不到）。

## F11 · 2026-10-02 · 槽位的 owner 包 ≠ 服务所在的包：`settings.general.item` 是 `ui-settings` 声明的

**症状**：里程碑 4 重写 `packages/client/ui-science/src/client/index.ts` 时，为
`settings.general.item` 写了 `import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'`。

**真因**：槽位声明在 `@deepseek-ai/dsh-client-ui-settings`（`ui-settings/src/client/contract/slots.ts`），
不是名字更像的 `ui-settings-general`。全仓 55 处同类 import **无一例外**都是 `ui-settings/client`——
我当时没查就按名字猜了。

**修复**：改成 `import type {} from '@deepseek-ai/dsh-client-ui-settings/client'`。

**判据**：加槽位 import 前先 `Select-String -Path <repo>\packages\client\*\src\client\*.ts* -Pattern '<槽位名>'`，
或直接看「已注册同类槽位的包」怎么 import。`ui-science` 自己的 `DataRootRow.tsx:14` 早就是正确写法，
我当时正在改的文件里就有答案。

## F10 · 2026-10-02 · `dev-test` 不重新编译 workspace 包 → 用户实测看不到本轮改动

**症状**：改完 `packages/client/ui-science`（或任何 workspace 包）后直接
`pnpm --dir apps/desktop run dev-test`，用户实测到的还是上一轮的 `lib/client.js`。

**真因**：`apps/desktop/scripts/build-dev-test.mjs` 只把 `science/` 重新同步进
`vendor/science-layer`，**不编译任何 workspace 包**；`vendor/harness` 由
`prepare-runtime.mjs` 用 `pnpm --filter @deepseek-ai/dsh deploy …` 从**已构建产物**里搬，
而 `dev-test` 脚本自身**不调用** `prepare-runtime`。

**修复 / 正确顺序**（仓库根）：

```powershell
pnpm run build                                    # 重建 workspace 的 lib/
node apps/desktop/scripts/prepare-runtime.mjs     # 刷新 vendor/harness
pnpm --dir apps/desktop run dev-test              # 出免安装测试版
```

**判据**：改过 workspace 包就必须重跑前两步。另注意 `prepare-runtime.mjs:329-339`
的 `syncWebFrontendArtifact()` 会在 `apps/web/dist` 与 `resources/web-frontend-dist`
不一致时**覆盖权威前端产物**——重建前端属发布敏感面，动之前先问用户。

## F9 · 2026-10-03 · `build-host.mjs` 会重建 `lib/`，之后再跑测试会读不到 `lib/client.js`

**症状**：`node --test tests/*.test.mjs` 里 3 个 client-bundle 用例全挂，
第一条断言 `run \`node scripts/build-host.mjs\` then tsdown first`，另两条
`ENOENT … lib\client.js`。上一秒这套测试还是 18/18。

**真因**：只跑了 `build-host.mjs`（`node --test` 之前），而它重建 `lib/`——
`tsdown` 上一轮产的 `lib/client.js` 被这次重建带走了。`lib/` 里只剩
`index.js` / `root.mjs` / `lib/` / `schema/`。

**修复**：改宿主半边之后必须**按顺序**重建：`build-styles` → `build-host` → `tsdown`，
也就是直接跑 `pnpm run build`（它就是这个顺序）。

**判据**：`Get-ChildItem lib -File` 必须同时有 `client.js` 与 `index.js`；
只改了 `src/host/index.js` 就重跑 `build-host.mjs` 的场合，记得补一次 `tsdown`。

## F8 · 2026-10-03 · 两个插件都 `provide('skillGate')` = cordis 抛异常，第二次注册的那个半边整块不加载

**症状**（发现于自查，未等实测）：内核挂点一装，dev-test 里 `science/workbench-web/plugin.mjs`
与本插件**都会** `ctx.provide('skillGate', …)`。

**真因**：cordis 的服务名在同一个 isolate 上唯一——
`@deepseek-ai/cordis/lib/index.js:813`
`if (this.store[key]) throw new Error(\`service "${name}" has been registered at <${this.store[key].fiber.name}>\`)`，
而 `key` 就是 `ctx[symbols.isolate][name]`（`:805-806` 用 `??=` 分配，所以两个插件拿到**同一个** key）。
`ctx.provide` 的 effect 抛异常 → 那个插件加载失败 → 本插件（后加载的）的设置页与侧栏技能树一起消失。

**修复**：把本插件的 gate 定位从「拥有」改成「**兜底**」，并且**两层**防护——
```js
const existingGate = ctx.get('skillGate')
if (existingGate === undefined && typeof ctx.provide === 'function') {
  try { ctx.provide('skillGate', gate.service) }
  catch (error) { log(`an activation gate is already registered, keeping the existing one: ${message(error)}`) }
}
```
两层不是多余的，实测（用仓库里那份 cordis 跑临时脚本）确认了两种时序：
- 已 settled 的服务：`ctx.get('skillGate')` **能**拿到（第二次 `provide` 会抛）；
- 但同一个挂载批次里前一个插件刚 `provide`、尚未 settle 时，`ctx.get` **仍是 undefined**，
  这时第二次 `provide` 照样抛。

也就是说 `ctx.get` 探底不是可靠的互斥锁，`try/catch` 才是。抛出的错误发生在**本插件自己的
`apply` 里**，所以不接住 = 路由/目录/设置页整块不加载。

**判据**：`tests/host.test.mjs` 两个用例——
`an activation gate already in the tree is reused, never re-registered`（get 命中时不 provide）
与 `a colliding registration is tolerated and the routes still come up`（`get` 返回 undefined
且 `provide` 抛时，路由仍注册、日志里有 `already registered`）。
**教训**：外部插件占用一个**可选服务**的座位前先 `ctx.get` 探底、并把注册本身放进 try/catch；
「提供默认实现」和「抢占服务名」是两件事。

## F7 · 2026-10-03 · 用 PowerShell 写 patch 文件会把 LF 变成 CRLF，`git apply` 全灭

**症状**：`science/patches/kernel/skill-gate.patch` 看着完全正确（`diff --git` /
`index` / `@@` 都在），但 `git apply --reverse --check` 与 `--check` 都报
`patch does not apply`，两个文件都失败。

**真因**：生成命令用了 `git diff … | Set-Content -Encoding utf8`。
PowerShell 的 `Set-Content` 会把管道里的 `\n` 归一成 `\r\n`，
于是补丁里每行都多一个 `\r`，上下文行永远匹配不上。
对照：`skill-chip.patch` 是 **CRLF=0 / LF=83**，我生成的这份是 **CRLF=101 / LF=0**。

**修复**：`[System.IO.File]::WriteAllText($path, ($text -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))`
（UTF8 不带 BOM，行尾显式归一成 LF）。

**判据**（以后写任何 patch 都跑这条）：
```powershell
git apply --reverse --check science/patches/kernel/<name>.patch   # exit 0 = 内容与工作树完全一致
```
反向能干净应用，就同时证明了「补丁内容正确」和「已应用」。

## F6 · 2026-10-02 · profile 里的 `file:` 依赖是死快照，客户端半边永远不加载

**症状**：插件在 `profiles/web/package.json` 的 `dsh.profile.bundles` 里、junction 也建好了，
但 `profiles/web/node_modules/dsh-science-skill/lib/` 里**没有 `client.js`**（只有
`index.js` / `root.mjs` / `lib/` / `schema/`），且 `index.js` 比源码产物还大（31897 vs 30935）。

**真因**：依赖写的是 `"file:D:/ScienceAgentData/dsh-plugins/dsh-science-skill"`。
pnpm 对 `file:` 是硬链接/复制**当时的**目录内容——那次 install 发生在 `tsdown` 产出
`client.js` 之前，于是 profile 里是一份死快照。旁边 `dsh-academic-figure` / `expert-team`
写的都是 `"link:..."`（junction，活的）。

**修复**：把 `profiles/web/node_modules/dsh-science-skill` 整个目录换成 junction，
旧快照挪到 `profiles\web\.cleanup-backup-dsh-science-skill-snapshot`。

**判据**：`Get-Item profiles\web\node_modules\dsh-science-skill -Force` 的 `LinkType`
必须是 `Junction`；`Test-Path ...\lib\client.js` 必须为真。

## F5 · 2026-10-02 · 客户端入口漏写 `export const name`

**症状**：`tests/client-bundle.test.mjs` 断言 `plugin.name === 'dsh-science-skill'`，
actual 是 `undefined`；bundle 尾部只有 `n.SKILL_REFERENCE_SOURCE=L,n.apply=V,n.inject=z`。

**真因**：抄蓝本 `ui-science/src/client/index.ts` 时漏了 `export const name`。

**教训**：外部插件的两个半边都要有 `name`。顺带核实过客户端 runner **不读**这个字段
（它用 `moduleIdOf(half.pluginId)` 注册模块），所以它不是加载契约、是诊断字段——
但缺了仍然说明这个入口和别的插件长得不一样。

## F4 · 2026-10-02 · `tsdown.config.ts` 报 `Cannot find module 'tsdown'`

**真因**：本包自己的 `node_modules` 里没有 `tsdown`（离线装不到），而 `tsconfig.json`
的 `paths` 只映射了 DSH 那些包。

**修复**：`paths` 里加一条容器专用兜底
`"tsdown": ["../science-agent-desktop/node_modules/tsdown"]`，让配置文件的
`import type { UserConfig } from 'tsdown'` 能解析。发布包不依赖它（`tsdown` 是 devDependency）。

## F3 · 2026-10-02 · codemod 漏了 `css[expr]` 这种括号索引

**症状**：`TS2552: Cannot find name 'css'. Did you mean 'CSS'?`

**真因**：`codemod-milestone2.mjs` 的替换规则是 `\bcss\.`（点号形式），
`SkillSettingsSection.tsx` 里 `css[msg.kind]`、`css[s.status]` 两处是括号索引，
没被命中。手工改成 `styles[msg.kind]` / `styles[s.status]` 即可。

**教训**：类名引用有两种写法，机械改写要按「所有 `css` 标识符」处理，别只匹配点号。

## F2 · 2026-10-02 · `effect()` 的回调必须**返回** disposer（当年的修法是错的，见 F14）

**症状**：`Argument of type '() => void' is not assignable to parameter of type '() => () => void'`

**真因**：cordis 的 `effect(setup, label)` 约定 setup 函数**返回**清理函数。

**当时的修法（错）**：把 `effect(install, label)` 改成 `effect(() => install, label)`。
它满足类型（返回的 `install` 恰好是 `() => void`），但语义完全相反：**`install` 被当成 disposer 收走，
永不执行，只在卸载时被调一次**。TS 抓不到这个错，代价是三处面板全裸奔（见 F14 的完整取证）。

**正确修法**：让**执行安装**的那个函数返回真正的 disposer，然后把**它本身**交给 effect：

```ts
const install = (): (() => void) => installPanelStyles([...])   // 返回移除自己新增标签的 disposer
if (typeof effect === 'function') effect(install, '…: panel styles') else install()
```

**一般规则**：`effect(f, label)` 里 `f` 必须是「跑一遍、把清理函数还回来」的函数。
`f = () => somethingThatReturnsDisposer` 只在这一种情况下对：`somethingThatReturnsDisposer` 是**安装动作**本身
而不是 disposer——判断方法是问「`f()` 的返回值会在卸载时被调用，这个返回值是不是我希望在卸载时跑的东西？」
（`effect(() => registerSource(src))` 就是对的：`f()` 的返回值才是 disposer。）

## F1 · 2026-10-02 · `pnpm install --offline` 装不了 `@deepseek-ai/*`

**症状**：`[ERR_PNPM_NO_OFFLINE_META] Failed to resolve
@deepseek-ai/dsh-api-gateway@0.2.0-rc.1 in package mirror
D:\DSH\pnpm-cache\v11\metadata\registry.npmjs.org\@deepseek-ai\dsh-api-gateway.jsonl`

**真因**：`@deepseek-ai/*` 是私域包；store 在 `D:\.pnpm-store\v11`，cache-dir 在
`D:\DSH\pnpm-cache`，两边都没有它们的元数据。

**结论**：本机不要指望 pnpm 装这批包，走 `scripts/link-dev-deps.mjs`（见 successes S4）。
**不要**为了让 install 过而往包里写 registry 凭据。
