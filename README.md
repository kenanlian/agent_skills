# Agent Skills

跨 coding agent 平台共享的个人 Agent Skills 集合。仓库中的 Skill 保持平台无关；`delegate-work` 通过宿主 adapter 将统一的委派语义映射到 Codex、Cursor 和 OpenCode。

## 安装

将 `skills` 目录直接软链接到项目的 Skill 发现目录。推荐使用多个平台都支持的开放目录：

```bash
mkdir -p .agents
ln -s /absolute/path/to/agent_skills/skills .agents/skills
```

Cursor 也可以使用自己的平台目录：

```bash
mkdir -p .cursor
ln -s /absolute/path/to/agent_skills/skills .cursor/skills
```

Codex 使用 `.agents/skills` 作为项目级 Skill 发现目录；同一个链接也可被 Cursor 发现，因此通常不需要为两个平台重复链接。

## 委派模型

`delegate-work` 使用统一的四维语义描述一次委派：

- `role`: `explorer | worker | reviewer`
- `tier`: `junior | senior | expert`，只适用于 worker；explorer 和 reviewer 使用 `None`
- `access`: explorer 固定 `read-only`；worker 为 `read-only | write`；reviewer 通常为 `read-only`，在持久化审查中可使用严格限定的 `audit-write`
- `work type`: exploration、research、implementation、design、planning、analysis 或 review

其中 explorer 专门负责代码库事实发现：定位、追踪、映射、穷举和交叉验证文件、symbol、caller、consumer、route、test、registration、state/data flow 等证据。搜索范围可以很广甚至 exhaustive，但 explorer 不负责 root-cause、架构/设计选择、正确性判断或 review verdict。需要工程判断时使用相应 tier 的 worker，需要独立审查结论时使用 reviewer。

Reviewer 可以继续委派 bounded read-only explorer 做代码探索和证据收集，例如 caller/consumer closure、behavior trace、bypass sweep、negative search 和 verification-path discovery；但 finding 是否成立、severity、contract status 和最终 verdict 必须由 reviewer 自己判断，不能继续下放。

`audit-write` 不是一般写权限。reviewer 的源码、计划、实现、测试和配置仍然只读，只允许写调用方明确指定的单个 raw review artifact；manifest、execution state、adjudication 和修复仍由父流程负责。

`exploration` work type 固定路由到 explorer；worker 的 tier 决定所需推理能力；review 固定路由到 reviewer。各宿主 adapter 再把这些稳定语义映射为宿主原生 subagent。计划和任务 DAG 不应绑定具体模型。

父 Agent 必须明确指定 subagent 要加载的领域 Skill（无适用 Skill 时写 `None`），并提供 self-resolving 任务契约：稳定 artifact 用路径和 ID 引用，当前控制指令才 inline。subagent 在隔离上下文中自己解析 pointer；若返回内容不符合契约或复核有误，父 Agent 必须优先恢复同一个 subagent 修正，不得静默新建替代 subagent。

### OpenCode adapter

OpenCode 的逻辑路由保持稳定：

```text
explorer       -> built-in Explore
junior worker  -> junior-worker
senior worker  -> senior-worker
expert worker  -> expert-worker
reviewer       -> reviewer
```

`skills/delegate-work/references/opencode.md` 只定义这些逻辑 subagent、权限要求以及 continuation/resume 行为，不绑定具体 provider 或 model。

实际的 OpenCode 用户配置、模型路由和自定义 agent 模板属于本地运行环境，应由 dotfiles 管理。例如个人配置仓库可以把它们部署到：

```text
~/.config/opencode/opencode.jsonc
~/.config/opencode/agents/junior-worker.md
~/.config/opencode/agents/senior-worker.md
~/.config/opencode/agents/expert-worker.md
~/.config/opencode/agents/reviewer.md
```

因此调整模型时只需要修改 OpenCode/dotfiles 配置，不需要修改 `agent_skills`。三个 worker 必须禁止继续启动嵌套 subagent；reviewer 则需要保留 task delegation，用于委派只读 explorer 进行证据收集，同时自己保留所有 review judgment。若使用持久化审查，OpenCode 的 reviewer 配置还需要支持对 task contract 中唯一 raw-review artifact 路径的窄写权限。

## 计划工作流

大型功能和重构使用以下闭环：

```text
write-plan
↓
stable R/C/WP/V IDs
execute-plan
↓
pointer-based delegation
↓
implementation worker
├── source changes
├── detailed result artifact
└── compact receipt
↓
Main
↓
compact execution state
```

角色分工：

```text
Canonical plan    = semantic source of truth
Worker artifact   = local execution evidence
Execution state   = current recovery/control state
Main conversation = orchestration + decisions + verification
```

1. `write-plan` 将讨论与代码库事实写成稳定的 `.dev/plan/<slug>-plan.md`，包含需求/行为契约、工作包 DAG、ownership、委派提示和验证映射。每个工作包必须有含稳定 `WP-*` 标识的唯一 canonical heading，供后续 agent 用 plan 路径 + ID 直接定位。Stable ID 只用于寻址和协调，不要生成 execution shard 或从 plan 机械抽取第二份语义副本。
2. 计划完成后，由用户决定是否运行 `review-plan`。每轮计划副本通过确定性复制保存；reviewer 自己把完整 raw review 写入 `.dev/plan-review/.../round-NN-review.md`，只向父 Agent 返回 verdict、artifact path 和紧凑 finding index。父 Agent 独立 adjudicate 并按需读取具体 finding，而不接收完整 review 用于转抄。
3. `execute-plan` 按 DAG 分波次调度。封闭可验证的串行或并行节点都可委派。Main 在开始时完整读取 plan，但委派实现任务时传递 plan/WP/contract/dependency/result 的 pointer，而不是复制 WP 正文。Worker 自己解析 canonical artifact；解析失败则 fail-closed 返回 blocker。父 Agent 保留跨任务决策、checkpoint、集成、验收和最终验证。
4. 每次 delegated implementation attempt 把详细结果写到 `.dev/execution/<execution-id>/packages/<WP-ID>-attempt-NN.md`，只向 Main 返回 compact receipt。`.dev/execution/` 与 plan、review artifact 一样纳入 git 版本管理（经现有 `.dev` 存储），永久保留、不清理；它与已 gitignore 的 `delegations/`（临时 relay）不同。
5. 每次执行在 `.dev/plan/` 留下带时间戳的 compact execution-state 文件，只描述当前恢复/控制状态：WP 行指向 latest attempt 与 result artifact，active blocker 只保留仍影响下一步的事项。decision、blocker、deviation、verification 等语义仍由执行 Agent 判断，但文件的字段、表格和 section 更新通过 `audit-persistence` helper 做窄范围 serialization，避免反复读取并 patch 整个大文件。
6. 实现验证通过后，默认运行 `review-plan-conformance` 与 `review-patch`（可由用户显式调整或拒绝）。选中的 reviewer 分别直接写自己的 immutable raw artifact，并只返回 compact control result；父执行 Agent 负责 adjudication、修复和是否继续下一轮。execution state 只保存 compact review 指针，不复制 finding/adjudication 正文。
7. 执行 Review 只记录 `HEAD`、review scope 和 diff base/head 等元数据；当前不保存每轮 reviewed patch snapshot，接受 worktree 历史不能完全重建的审计精度。

共享的 `audit-persistence` skill/utility 负责机械持久化：不可变 copy、frontmatter/字段更新、Markdown section 更新、execution-state 表格行更新，以及 worker Result Artifact 的 exact-path exclusive create。原则是：**谁产生语义内容，谁拥有内容；已经存在的内容和机械状态不通过 LLM 重新生成。**

计划只描述能力角色和执行契约，不绑定具体模型。模型选择、隔离方式、任务契约、ownership 和返回压缩统一由 `delegate-work` 维护。存量无 canonical heading 的 plan、以及旧 5 列 execution state，按兼容规则处理，不强制迁移。旧 5 列活跃 state 继续用原 5 列表、原 deviations heading、以及无 Result Artifact 的 standalone worker return 执行到完成；新 6 列 execution 才使用 attempt 编号、Result Artifact 和 compact receipt。

## 持久化 helper 验证

`audit-persistence` 没有外部依赖，可以直接运行聚焦测试：

```bash
node --test 'skills/audit-persistence/agents/tests/*.test.mjs'
```
