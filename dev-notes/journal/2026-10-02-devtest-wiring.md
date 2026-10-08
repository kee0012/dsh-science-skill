# 2026-10-02 · dev-test 交付链打通 + 首次冒烟测试（里程碑 3 之后的接线）

## 这一轮的目标

把「开发版仓库改完之后，怎么让用户在自己的开发版窗口里真的看到新插件 + 内核接缝」这条路走通。

## 关键结构事实：dev-test 是**隔离数据根**

- `apps\desktop\release\dev-test-userdata\.science-data-root.json` 指向
  `apps\desktop\release\dev-test-dataroot` —— 这才是 dev-test 的 `DSH_HOME`，
  **不是** `D:\ScienceAgentData`。所以 dev-test 与安装版、与用户日常的开发版互不干扰。
- 该数据根有自己的一套 `skills\`（81 个）、`catalog\data\`（81 条记录）、`skill-gate.json`
  （当前 `{"pinned": {"anti-fraud": true, "academic-humanizer-zh": true}}`）与 `profiles\web\`。
- dev-test profile 原 manifest 已备份为 `profile\package.json.bak-prescience-skill`。

## 这轮做完的事

1. **`pnpm run build`**（仓库根，`tsx scripts/build.ts`）→ 内核 `packages/skill/tool-skill/lib/index.js`
   含 `skillGate`（14434 B）；`apps/web/dist` 也重建了。
2. **`pnpm --dir apps/desktop run prepare:runtime`** → 刷新 `apps\desktop\vendor\{harness,science-layer,…}`，
   让 `vendor/harness/node_modules/@deepseek-ai/dsh-tool-skill/lib/index.js` 也带上接缝。
   （`vendor` 在 **`apps\desktop\vendor`**，不是仓库根。）
3. **注册进 dev-test 隔离 profile**：
   - junction：`release\dev-test-dataroot\profiles\web\node_modules\dsh-science-skill`
     → `D:\ScienceAgentData\dsh-plugins\dsh-science-skill`；
   - manifest：`dependencies` 加 `"dsh-science-skill": "link:D:/ScienceAgentData/dsh-plugins/dsh-science-skill"`，
     `dsh.profile.bundles` 末尾追加 `dsh-science-skill`。**bundle 自动挂载，不需要 insert 行。**
4. **`pnpm --dir apps/desktop run dev-test`** → exit 0，两道硬门全绿
   （`scanned 206 plugin package(s), 4483 runtime file(s)`；
   `checked 28 kernel-overlay marker(s) and 14 fork-owned file(s)`）。
5. **修掉 F12（两插件争 `skillGate`）**：`science/workbench-web/plugin.mjs:1002-1023` 改成幂等 + try/catch。
   冒烟测试复验：`/science/api/catalog` 与 `/api/dsh-science-skill/catalog` 同时 200（各 36564 B），
   日志无 `did not activate`。
6. 冒烟测试收尾：临时服务已 kill（端口 39999 已释放）。日志 `..\devtest-smoke2.log`。

## 结论：seat 的 owner 是本插件

workbench 的那段 `ctx.get('skillGate') === undefined` 在本次 boot 里**没有**进入 provide 分支
（没有 `already registered` 日志、没有 `did not activate`，而它的 `/science/api/catalog` 又活着），
说明新插件先 provide、workbench 跳过 —— 本机组合下会话内激活有效。

## 请你（用户）在真窗口里验

```powershell
& "D:\ScienceAgentData\workspace\科研agent开发\science-agent-desktop\apps\desktop\release\dev-test\ScienceAgent.exe" --user-data-dir="D:\ScienceAgentData\workspace\科研agent开发\science-agent-desktop\apps\desktop\release\dev-test-userdata"
```

1. 设置页出现新的 **Skill** 分区（来自 `dsh-science-skill`，不再是 ui-science 那份）；
2. 侧栏出现技能分类树；点一条技能能插进输入框变成 `/命令` chip；
3. 开关能写进**这个数据根**的 `skill-gate.json`（`{"pinned": {…}}`），刷新后仍在；
4. **内核接缝已生效**：现在模型只看到「已 pin（或本会话已激活）」的技能。
   该数据根当前 pin 了 `anti-fraud`、`academic-humanizer-zh` 两条 —— 开一个新会话，
   模型能用的技能应只有这两条（外加它自己的内建工具）。全关掉就一条都没有，
   这是设计行为（`skill-gate.json` 为空 = 模型看不到科研技能）。
5. 「+ 添加目录」「恢复默认」、亮/暗主题样式。

## 未做 / 下一步

- 打包：等你实测确认、并且你明确说「可以打包」之后再做。
- 开源可移植性：README 的安装章节（junction + `dsh plugin add` + `dsh plugin install`）还待补。
