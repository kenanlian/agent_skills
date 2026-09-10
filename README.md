# Agent Skills

跨 coding agent 平台共享的个人 Agent Skills 集合。仓库中的 Skill 保持平台无关；`delegate-work` 通过宿主 adapter 将统一的委派语义映射到 Codex、Cursor、OpenCode 和 Pi。

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

`delegate-work` 只描述普通工作委派，不承担最终审查流程：

- `role`: `explorer | worker`
- `tier`: `junior | senior | expert`，只适用于 worker；explorer 使用 `None`
- `access`: explorer 固定 `read-only`；worker 为 `read-only | write`
- `work type`: exploration、research、implementation、design、planning 或 analysis

Explorer 专门负责代码库事实发现：定位、追踪、映射、穷举和交叉验证文件、symbol、caller、consumer、route、test、registration、state/data flow 等证据。搜索范围可以很广甚至 exhaustive，但 explorer 不负责 root-cause、架构/设计选择、正确性判断或 review verdict。需要工程判断时使用相应 tier 的 worker。

最终审查不表示成 `delegate-work` 的 `reviewer` role。计划阶段由外层控制面启动 `review-plan`；managed execute 阶段启动一个 `review-execute-candidate`，在同一 fresh read-only Session 内保留独立 Patch Gate 与 Plan Conformance Gate。`review-patch`、`review-plan-conformance` 继续作为 managed workflow 之外的独立能力。运行 Review Skill 的顶层只读 Agent仍可通过 `delegate-work` 委派 bounded explorer 收集证据，但 finding、severity、contract status 和 verdict 始终由该顶层 Review Agent判断。

父 Agent 必须明确指定 subagent 要加载的领域 Skill（无适用 Skill 时写 `None`），并提供 self-resolving 任务契约：稳定 artifact 用路径和 ID 引用，当前控制指令才 inline。subagent 在隔离上下文中自己解析 pointer；若返回内容不符合契约或复核有误，父 Agent 必须优先恢复同一个 subagent 修正，不得静默新建替代 subagent。

### OpenCode adapter

```text
explorer       -> built-in Explore
junior worker  -> junior-worker
senior worker  -> senior-worker
expert worker  -> expert-worker
```

`skills/delegate-work/references/opencode.md` 只定义这些逻辑 subagent、权限要求以及 continuation/resume 行为，不绑定具体 provider 或 model。实际的 OpenCode 用户配置、模型路由和自定义 agent 模板属于本地运行环境，应由 dotfiles 管理。

### Pi adapter

Pi 宿主使用工具 `delegate_agent`，语义角色/档位映射为同名 `agent` 参数：

```text
explorer       -> explorer
junior worker  -> junior
senior worker  -> senior
expert worker  -> expert
```

`skills/delegate-work/references/pi.md` 只定义工具、`read-only | write` 权限、续接与嵌套边界，不绑定具体 provider 或 model。后端与模型只由 `~/.pi/agent/delegate-agent.json` 决定；续接使用返回信封里的 `session_id`。

## 计划工作流

大型功能和重构的职责链为：

```text
outer control plane
├── write-plan
├── fresh read-only review-plan
├── execute-plan
└── fresh read-only review-execute-candidate
    ├── Patch Gate
    └── Plan Conformance Gate
```

1. `write-plan` 将讨论与代码库事实写成稳定的 `.dev/plan/<slug>-plan.md`，包含需求/行为契约、工作包 DAG、ownership、委派提示和验证映射。它只负责计划产物和自检，完成后立即交还控制权，不在内部启动 review、创建 `.dev/plan-review/` 或执行 review-driven revision cycle。
2. 外层控制面在独立只读上下文运行 `review-plan`，持久化结果、判定 PASS/REVISE、调度返工和限制轮数。Review Skill 返回完整报告，不在产品仓库中创建 raw review artifact。
3. `execute-plan` 按 DAG 分波次调度。Main 在开始时完整读取 plan；实现任务通过 plan/WP/contract/dependency/result pointer 委派。Worker 自己解析 canonical artifact，父 Agent 保留跨任务决策、checkpoint、集成、验收和最终验证。
4. 每次 delegated implementation attempt 把详细结果写到 `.dev/execution/<execution-id>/packages/<WP-ID>-attempt-NN.md`，只向 Main 返回 compact receipt。`.dev/execution/` 纳入 git 版本管理并永久保留。
5. 每次执行在 `.dev/plan/` 留下带时间戳的 compact execution-state 文件，只描述当前恢复/控制状态。`execute-plan` 完成实现和最终验证后立即交还控制权，不在内部运行 patch/conformance review、创建 `.dev/review/`、adjudicate findings 或执行 review retry cycle。
6. managed workflow 的外层控制面以一个 fresh read-only `review-execute-candidate` 同时完成两个不可省略的逻辑 Gate；任一 Gate FAIL 都返回 REVISE。外层验证 candidate/Plan/UI evidence identity，持久化结果，并决定完成或返回原实现会话返工。

共享的 `audit-persistence` skill/utility 只负责计划与执行阶段的机械持久化：字段、Markdown section、execution-state 表格，以及 worker Result Artifact 的 exact-path exclusive create。原则是：**谁产生语义内容，谁拥有内容；已经存在的内容和机械状态不通过 LLM 重新生成。**

计划只描述能力角色和执行契约，不绑定具体模型。模型选择、隔离方式、任务契约、ownership 和返回压缩统一由 `delegate-work` 维护。存量无 canonical heading 的 plan、以及旧 5 列 execution state，按兼容规则处理，不强制迁移。

## 持久化 helper 验证

`audit-persistence` 没有外部依赖，可以直接运行聚焦测试：

```bash
node --test 'skills/audit-persistence/agents/tests/*.test.mjs'
```
