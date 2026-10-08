# dsh-science-skill 插件计划

> 本插件的形态、合同与验证流程按 **DSH 插件开发助手（`/dsh-plugin-studio`）** 的六阶段工作流装配与校验。
> 它把科研agent 内置的「技能中心」能力（左侧栏技能树 + 设置-Skill 面板 + `/命令` 引用）拆成一个**可独立安装**的插件。
> 每阶段决策确定后勾选对应项，未通过不得进入下一阶段。

## 阶段 ①：需求捕获

- [x] 插件名：`dsh-science-skill`
- [x] 一句话目标：给任意 DSH profile 装上「科研技能中心」——技能目录/分类、左侧栏技能树、设置里的 Skill 面板、技能激活门与 `/` 引用芯片。
- [x] 能力面清单：
  - 设置面板 `settings.section`（`id: science-skill`，`label: Skill`）：技能搜索、分类筛选与增删改、目录导入、按技能控件（激活开关）
  - 主面板：`sidebar.panellist` 一行入口 + `main` 面板（`key: science-skills`，与设置座位共用同一个 `SECTION_ID`，两者是不同 slot 不冲突）：分类标签栏 + 卡片式技能墙（中文名 / 简介 / 英文 id + **可点开改分类**的分类标签）。注：早期设计稿写的 `sidebar.skills` 是 Science Agent 分支专有座位，stock DSH 不声明（见「与合同的偏离」）
  - 点技能 → 输入框引用芯片：注册 `/` 触发源（只带 codec，无候选），经 `conversation` 座位写入 draft
  - 技能激活门：`pinned`（跨重启持久）+ `active`（按会话），落盘 `<root>/skill-gate.json`
  - 宿主 HTTP API（前缀 `/api/dsh-science-skill/`）：`catalog`、`categories`（+ `/suggest`、`/create`、`/rename`、`/delete`、`/reorder`、`/restore`）、`skills`（+ `/validate`、`/import`、`/update`、`/delete`）、`skill-gate/{state,pin,session,check}`。**没有** `info` / `health` 路由（studio 模板的示例路由），未匹配的 rel 一律 404（`src/host/index.js:828`）
- [x] 目标 profile：web

## 阶段 ②：形态与分发决策

- [x] 形态：`bundle-client`（宿主半边 + 浏览器半边，经 `cordis.patch.yml` 插入 profile 加载树）
- [x] 分发方式：本地目录（开发期 `link:` 到隔离 lab profile）；发布期按用户流程另定 git 源
- [x] 包管理器：pnpm

## 阶段 ③：配方装配

- [x] 宿主半边：`src/host/index.js`（纯 ESM JS，1136 行）→ `scripts/build-host.mjs` 原样复制到 `lib/index.js`
- [x] 浏览器半边：`src/client/index.tsx`（TSX + CSS Modules）→ `scripts/build-styles.mjs` 编译样式，`tsdown` 出 `lib/client.js`
- [x] `inject` 已覆盖所有服务：宿主 `['webServer']`；客户端 `['slots','sessions','conversation','remote','locale','inputTriggers']`（全部属性访问）
- [x] 冒烟功能就绪（偏离 studio 模板：不另造 `GET /{name}/health` 示例路由，改用真实消费面取证）：`GET /api/dsh-science-skill/catalog` 返回 200 + 设置 `Skill` 面板与主面板技能墙两个座位真的渲染（独有类名 `ss-settings-*` / `ss-tree-*`，非 stock ui-science 的 `CategoryTree_*`）+ 拨技能开关落盘 `<root>/skill-gate.json`
- [x] 未手改 `lib/`

## 阶段 ④：本地验证

- [x] 构建链（三条命令有先后依赖）：`node scripts/build-styles.mjs`（产物落 `src/client/styles/`，`--check` 只校验）→ `node scripts/build-host.mjs`（**先清空再拷贝 `lib/`，会顺带删掉 `lib/client.js`**，所以必须紧挨 tsdown 之前跑；`lib/index.js` 能活下来是因为 tsdown 配了 `clean: false`）→ `node node_modules/tsdown/dist/run.mjs` → `lib/client.js`
- [x] `node --test tests/*.test.mjs` → 48 pass / 0 fail（2026-10-07 实测；原记 20 pass 已陈旧，其中含新增的「路由注册必须在 `ctx.effect` 内」契约测试）
- [x] `tsc --noEmit` → exit 0（2026-10-04 复测才算数：修掉两条隐式 `any` 与 `appearance` 的联合类型冲突后才是真的 exit 0，此前实际是 `exit 2`，本行曾被误记）
- [x] 宿主的生命周期注册全部收进 `ctx.effect`：路由包成 `ctx.effect(() => webServer.register(prefixRoute), 'dsh-science-skill: routes')` 并消费 disposer（此前是裸 `webServer.register(...)`，不在 fiber 生命周期内——卸载或 `patchReload` 换掉本插件时，`/api/dsh-science-skill` 前缀会留在 webServer 路由表里）；`tests/host.test.mjs` 新增契约测试钉住 label 与 disposer 确实接到前缀
- [ ] `python3 <skill>/scripts/verify_plugin.py .` 通过 8/11 —— 未通过 3 条全部是脚本对**模板项目布局/命名**的假设（见「与合同的偏离」），不是运行时合同项

## 阶段 ⑤：安装与浏览器冒烟

- [x] 安装成功：隔离 lab profile `…\release\dev-test-dataroot\profiles\web`（`link:` + `dsh.profile.bundles` 登记）
- [x] 启动日志无 `plugin tree failed to load`、无 `1 entry did not activate`
- [x] 浏览器无 `slot entry crashed`、无 `1 client plugin did not load`
- [x] 冒烟功能可用（Playwright 无痕探针）：
  - `probe10`：`apply returned undefined` / `notice=(none)`，`/api/dsh-science-skill/*` 与 `/science/api/*` 全 200
  - `probe12`：设置面板 81 张技能卡渲染、样式装上（`pluginKeys` 恰为两张表、`display:flex`）
  - `probe13`：点 `deep-research` → 输入框出现引用芯片
  - `probe14`：拨技能开关 → `POST /skill-gate/pin` 200 → `<root>/skill-gate.json` 落盘（探测后已还原）

## 阶段 ⑥：发布

- [x] 构建产物已入库（`lib/`）
- [ ] README 使用真实安装 ref（等分发源确定）
- [ ] 从目标 ref 重装验证通过
- [ ] 用户在自己客户端实测通过 → 才进入备份/打包（用户既定流程）

## 与合同的偏离

| `verify_plugin.py` 检查 | 结果 | 说明 |
| --- | --- | --- |
| 禁止声明 `@deepseek-ai/*` 依赖 | 已修 | 官方包移出 `peerDependencies`，只留 `devDependencies`；`peerDependencies` 整体删除（运行时由 profile 提供，避免「peer 不兼容 → profile bundle 被跳过」） |
| bundle 合同（`dsh.bundle.patch` + exports） | 已修 | 补 `exports["./cordis.patch.yml"]` |
| client 合同（ModuleLoader id） | 已修 | 关闭 `minify`，产物里出现契约要求的字面量 `window.__ModuleLoader__.load({ id: "dsh-science-skill"`（官方 client 产物同样不压缩） |
| React 保持 external（client 形态） | 有意偏离 | 脚本要找 `scripts/build.mjs` 里的 `clientConfig.external`；本插件用 `tsdown.config.ts` 的 `deps.neverBundle`/`alwaysBundle` 表达同一件事（react / react/jsx-runtime / react-dom / react-dom/client 全在其中）。注意该检查只在 ModuleLoader id 检查通过后才真正执行（`has_client` 门），所以它是关掉 `minify` 之后才浮现的，早先那条 PASS 是假通过 |
| 必需文件（README/LICENSE/tsconfig/src） | 有意偏离 | 模板假定 `src/index.ts` + `src/client/index.ts`；本插件宿主半边是纯 JS 的 `src/host/index.js`（改名 `.ts` 会在 `strict` 下把 1136 行无注解 JS 变成成片类型错误），浏览器半边含 JSX 必须 `src/client/index.tsx`。**LICENSE 已于 2026-10-04 补上**（此前 package.json 声明 MIT 却没有许可正文），该条现在只剩 `src/index.ts` 一处 |
| 名称一致性（package name / patch id / client id） | 有意偏离 | patch 行 id 保留 `science-skill`（= 客户端 `SKILL_REFERENCE_SOURCE` 的命名空间，与两个 slot id 同源）。官方行 `- id: ui-science / name: '@deepseek-ai/dsh-client-ui-science'`、`dsh-mnemon -> id: mnemon`、`dshmarket -> id: dsh-market` 都不满足该规则 |

## 备注

- 降级说明：本机无 `pnpm run gates` 对应的项目脚本，改以「`build-styles --check` + `build-host` + `tsdown` + `node --test` + `tsc --noEmit` + `verify_plugin.py`」作为门禁，全部在插件目录内执行。
- 决策变更记录：见 `dev-notes/decisions.md`（D12 skillGate 只读不 provide、D10/D11 座位声明与属性访问、D13 与 studio 合同的取舍）。
- 最近变更（2026-10-05 ~ 10-06，每次都在 `src/` 落地后重新构建 `lib/`）：
  - 主面板可改分类：`src/client/SkillStrip.tsx` 的卡片分类标签换成可选菜单（写入走宿主既有的
    `POST /skills/update`），并经 `dsh-science-skill:catalog-changed` 与设置页双向同步；
    `src/client/SkillSettingsSection.tsx` 拆出只读 `reload`（广播版仍是 `refresh`），避免两个视图互相派发。
  - 搜索空状态修复：`SkillStrip.tsx` 的 `emptyState` 原先「只要在搜索中就返回『没有匹配』」，未先判
    `visible.length`，任何命中都会被空状态顶掉；改为「有卡片可显示就不算空」。
  - 元数据对齐（2026-10-06）：`engines.node` 由 `>=22.5` 收紧为 `^22.19.0 || >=24.0.0`（内核包均不声明
    engines，此为插件自选声明），并补 `packageManager: "pnpm@11.7.0"` 让构建可复现。
  - 同步与适配审计（2026-10-06）：重建后 `lib/` 与 `src/` 哈希零差异；`node --test` 48 pass / 0 fail；
    `tsc --noEmit` exit 0；`build-styles --check` ok（3 stylesheet / 20 shared class name）；
    `dsh-plugin-dev check --json`（0.3.22）pass 8 / fail 1 / warn 1 / skip 5——唯一 fail `manifest-peers`
    系 JSDoc 里的 `import('@deepseek-ai/cordis').Context` 误报（`dependencies: {}`，产物只 import `node:` 内置）；
    warn 仅「五语 README 不齐」；
    `verify_plugin.py` 8/11（未通过 3 项仍是模板布局/命名假设）；内核侧 API 逐项实测存在
    （`sidebar.panellist`、`settings.section`、`layout.selectPanel`、`inputTriggers.registerSource`、
    `ctx.skills.registerProvider`、`webServer.register({ kind: 'prefix' })`——对照 `@deepseek-ai/dsh-desktop@0.2.0-rc.2`）。
