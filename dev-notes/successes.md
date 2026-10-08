# successes
按时间倒序。只记**值得复用的做法**（含「为什么这样做才对」），不记流水账。

## S11 · 2026-10-02 · 不碰磁盘的运行时插桩：`page.route()` 改**响应体**，把 load/apply 全打出来

`dsh-science-skill: loading` 的真实原因（apply 抛 `l.inject is not a function`）不是靠读日志得到的，
而是靠 Playwright 把**发给页面的那份 bundle** 改掉：

```js
page.route((u) => u.pathname.startsWith('/plugins/') && !u.pathname.endsWith('/events'), async (route) => {
  const res = await route.fetch()
  const body = await res.text()
  // 在 `window.__ModuleLoader__.load({id:`dsh-science-skill`` 前插入包装：打印 register/materialize/apply 与抛错
  await route.fulfill({ response: res, body: patched })
})
```

要点与坑：
- **必须排除 `/plugins/events`**（SSE，chunked 永不结束），否则 `route.fetch()` 挂死/抛错（probe8 就是这么崩的）。
  谓词用 `u.pathname.startsWith('/plugins/') && !u.pathname.endsWith('/events')`。
- 只改**响应体**、不动磁盘文件，因此不影响 HMR/构建，也不留任何痕迹。
- 三条打印就够定位：`register <id>` → `materialized keys=[…] inject=[…]`（导出形状）→
  `apply called` / `APPLY THREW <err>`。**「apply 抛错」与「座位不可满足」在这三行里一眼分开。**
- 配套：`window.__ModuleLoader__.load({id, factory})` 重复调用会抛
  `client-modules: duplicate factory registration for "<id>"` → 用它证明「bundle 已注册」（probe7）。
- 在页面里 `fetch(batch.url)` 三个批次 URL 全 404，而同一 URL 的 `<script src>` 是 200
  （`??` 拼接 URL 只对 script 标签生效）→ **页面内 fetch 探路不可用**，别在这上面浪费时间。

## S12 · 2026-10-02 · 座位：declare 了才有得读（`ctx.get` ≠ `ctx.<name>`）

同一条通知的第三层原因（F13）是「读了一个没声明的座位」。可复用的判据：

- 想读的服务**一律写进 `export const inject`**：声明才会等、才能用属性访问读到值；
  `ctx.get(name)` 是直接查注册表，声明过的座位在这个部署里反而取到 `undefined`。
- 想知道某个名字到底能不能当**根座位**，最快的证据是**同运行时里有没有官方插件这么写还活着**：
  本次被拆出来的 `ui-science` bundle 就带着 `conversation` 且正常激活 → 它可满足；
  而「会话作用域」只约束**用法**（别在根上直接调会话方法，要用 `conversation.input.for(actx)`）。
- 反例同样有用：全 profile 扫 `provide(…<name>…)` **零命中**时，说明这个座位没有 provider，
  谁 declare 谁就 pending——这时才该绕开或改软注入。

## S10 · 2026-10-02 · 客户端插件排障：起真 harness + 读 boot 行 + 直接要 URL，胜过猜

定位 `dsh-science-skill: loading` 时，最快的一条链路（不需要浏览器 DevTools）：

1. `$env:DSH_HOME='<repo>\apps\desktop\release\dev-test-dataroot';
   node apps\cli\lib\bin.js web --port 39998 --no-open`
   → stdout 第一行 `dsh web: http://127.0.0.1:39998/?token=<token>`，**URL 必须带 `?token=`**，否则 401。
   （别再显式传 `--profile web`：环境里已有 `DSH_PROFILE=web`，重复会报
   `option '--profile <name>' argument 'web' is invalid`。）
2. `Invoke-WebRequest` 取首页，在 `window.__DSH_BOOT__` 里搜 `"id":"<plugin>"`，读它的
   `url` / `rev`。客户端插件是**运行时按 module id 解析**的，前端产物里搜不到插件名是正常的。
3. bundle 的真实 URL 是 `plugins/??<pkg>/client.js&rev=<rev>`（`??` 是拼接语法）。
   `Invoke-WebRequest` 会吞掉 `??`，要用 `node` 发 `http.request` 验证；
   实测 `/plugins/%3F%3F…`、`/plugins/<pkg>/client.js` 都是 404，只有原样 `??` 是
   200 / `text/javascript`。→ 一步就能把「宿主没供 bundle」和「bundle 自己有问题」分开。
4. 改完插件源码后该行 `rev` 会变（本次 `812a91dca4d3` → `1ba254c09a8c`），
   这就是「宿主已按新字节重建描述符」的判据；**不需要重跑 `dev-test` / `prepare:runtime`**，
   因为 dev-test profile 的 `node_modules/<pkg>` 是指向源码目录的 junction，用户刷新即可。

排除法也和它配着用：reason 是裸状态名 → 那是 `FiberState.LOADING/…` 被原样报出（`collectInactiveEntries`
的 `else { reason: state }`），**先假定 apply 抛错**（F15），不要先怀疑 bundle 或座位；
reason 是 `import failed: …` → 查 `window.__ModuleLoader__` / factory 抛错；
reason 是 `pending (waiting for service: X)` → 查缺失服务名（F13 的 `ctx.get` 陷阱也在这一族）。

## S8 · 2026-10-02 · 摘掉一片注册之前，先量「谁在 import」再动手

里程碑 4 把 `packages/client/ui-science/src/client/index.ts` 从 192 行砍到 69 行，
顺序是：① 先 `grep` 全仓谁 import 这些符号（结论：只有 `index.ts` 自己）；
② 再 `grep scripts/` 看有没有门禁引用这个包（结论：只有两条 SKIP 名单）；
③ 改完跑 `tsc -b <pkg>/tsconfig.json` + 单包 `tsdown` 看产物尺寸掉没掉；
④ 再全仓 `grep` 一遍确认没有残留 import。

为什么值得记：客户端包受 per-file 100% 覆盖率门禁，**删代码比加代码更容易撞门**；
而「先量引用面」把「删了会不会连带坏掉别处」这个不确定性提前消掉——本次自始至终没出现
意外失败，就是这一步的收益。产物尺寸也是判据：20.66 kB 的 bundle 里本来就住着被摘掉的三个面。

## S7 · 2026-10-02 · 只在受影响包上跑检查，别动整仓聚合任务

改 `packages/client/ui-science` 时用
`tsc -b packages/client/ui-science/tsconfig.json` 与
`DSH_BUILD_FACE=client tsdown --cwd packages/client/ui-science`，
而不是 `pnpm run build:lib:client`（`tsc -b tsconfig.client.json` 会连带重建整个 client 图）。
两者结论一致（都是 exit 0），但单包路径快一个数量级，适合内循环。

**例外**：`verify-client-ui-i18n` 这类「扫全仓源码」的门禁没法单包跑，只能整仓跑——
它对本包为红，见 failures / journal 里那条预存在红灯的判据。

## S6 · 2026-10-02 · 用「真跑一遍 bundle」代替「看文件存不存在」的入口测试

`tests/client-bundle.test.mjs` 造一个 `window.__ModuleLoader__` 收集注册，
再用 `new Function(readFileSync('lib/client.js','utf8'))()` 执行真产物，然后
**真的调用 `factory(require)`**，断言返回的是 cordis 插件（有 `name` / `apply`、
没有 `default`、`inject` 是字符串数组）。

好处：它抓到了一个真 bug——入口漏写 `export const name`，bundle 少导出一个符号。
只检查「`lib/client.js` 存在」的测试不会发现。

`require` 用 `createRequire(import.meta.url)` 真解析 `react` / `react-dom` / `cordis` /
`jsx-runtime`，解析不到就回落 `{}`——这样测试既能真跑组合，又不强依赖 node_modules 装好
（`dsh.client` 声明了但没 bundle 的包会让整页报 "failed to load plugins"，这条契约值得
在测试里守住）。

## S5 · 2026-10-02 · 生成物用 `--check` 自校验

`build-styles.mjs` 把 CSS Modules 编成 TS 常量，`build-styles.mjs --check` 重算一遍
并逐字节比对，不一致非零退出。所以「改了 `.module.css` 却忘了重新生成」在 CI/提交前
一定暴露，而不是等浏览器里样式不对才查。

## S4 · 2026-10-02 · 把 dev 依赖 junction 进来，绕开私域 registry

本机 `pnpm install --offline` 报
`[ERR_PNPM_NO_OFFLINE_META] Failed to resolve @deepseek-ai/dsh-api-gateway@0.2.0-rc.1
in package mirror D:\DSH\pnpm-cache\...`：`@deepseek-ai/*` 是私域包，本机装不到。

`scripts/link-dev-deps.mjs` 改为从邻近的 DSH 仓库里找现成的包，junction 到本包
`node_modules`。落点是**两类目录**，必须都试：

- 普通 `node_modules`：`tsdown`、`typescript`、`@types/node` 在
  `<repo>/node_modules` 与 `<repo>/apps/web/node_modules`；
- pnpm 扁平 hoist 目录 `<repo>/node_modules/.pnpm/node_modules`：
  `react`、`react-dom`、`@types/react`、`@types/react-dom`、所有 `@deepseek-ai/*`、
  `cordis`。

脚本对 `react` / `@types/react` 等逐个 `resolvePackage` 取第一个命中，
`--check` 用「缺失个数」当 exit code。能连 registry 的机器上 `pnpm install` 自己就把
这些填好了，脚本无事可做——所以它是 dev-only 工具，不进发布依赖。

## S3 · 2026-10-02 · 面板样式只在渲染时才需要，注入保持幂等

`installPanelStyles()` 先查 `document.head.querySelector('style[data-plugin-css="KEY"]')`，
命中就跳过；写 `data-plugin="dsh-science-skill"` / `data-plugin-css="<key>"`；
返回的 disposer 只移除**本次新增**的 `<style>`。这样 HMR / 插件重挂载不会累积重复样式表，
卸载时也不会把别人的样式带走。

## S2 · 2026-10-02 · 跨文件重名类才加前缀

两个面板的 CSS Modules 各自都有 `.root`、`.searchInput`、`.status`。如果类名原样保留，
两张表会真冲突；如果全部加前缀，生成物就和源文件无法逐行比对、后续同步上游变难。
折中：**只给跨文件重名的类加前缀**（`ss-settings-` / `ss-tree-`），其余保持原样。
本包实测重名 6 个：`b, d, root, s, searchInput, status`。

## S1 · 2026-10-01 · 宿主半边零运行时依赖

SKILL.md 的 frontmatter YAML 自己按子集解析（`src/host/lib/frontmatter-yaml.mjs`），
不引 `js-yaml`；HTTP 只依赖 `ctx.webServer`，不引框架。结果是这个插件在任何能跑
DSH 的机器上都能直接装，**不需要联网装包**。代价是要自己维护一个 YAML 子集解析器，
但它的策略是「不认识就判为不可解析、不许动」，比猜错安全。

## S9 · 2026-10-02 · 共享同一个可选服务名的两个插件，两侧都要幂等

科学 layer（`science/workbench-web/plugin.mjs`）与本插件都会 `provide('skillGate')`，
而 cordis 的服务名 per-isolate 唯一、第二次 `provide` 直接从**调用者自己的 `apply`** 里抛错
（`Fiber…:813`）——被炸掉的不是服务，是整个插件 entry。修法是两侧都写：

```js
if (typeof ctx.provide === 'function' && ctx.get('skillGate') === undefined) {
  try { ctx.provide('skillGate', { … }) } catch { /* keep the existing one */ }
}
```

只用 `ctx.get` 探底**不够**：同一挂载批次里，前一个插件的 `provide` 还没 settle 时
`ctx.get` 也可能是 `undefined`，所以 try/catch 才是真正的兜底（`failures.md` F8/F12）。
验证手段很好用：起真 harness 后直接 curl 两个插件各自的目录路由，**两个都 200** 且日志里
没有 `did not activate`，就等于「并存且都活着」。

