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
- `access`: explorer/reviewer 固定 `read-only`；worker 为 `read-only | write`
- `work type`: exploration、research、implementation、design、planning、analysis 或 review

其中 explorer 专门负责代码库事实发现：定位、追踪、映射、穷举和交叉验证文件、symbol、caller、consumer、route、test、registration、state/data flow 等证据。搜索范围可以很广甚至 exhaustive，但 explorer 不负责 root-cause、架构/设计选择、正确性判断或 review verdict。需要工程判断时使用相应 tier 的 worker，需要独立审查结论时使用 reviewer。

`exploration` work type 固定路由到 explorer；worker 的 tier 决定所需推理能力；review 固定路由到 reviewer。各宿主 adapter 再把这些稳定语义映射为具体模型或 subagent。计划和任务 DAG 不应绑定具体模型。

父 Agent 必须明确指定 subagent 要加载的领域 Skill（无适用 Skill 时写 `None`），并提供清楚的任务、目标、范围、权限边界和返回内容。subagent 在隔离上下文中执行；若返回内容不符合契约或复核有误，父 Agent 必须优先恢复同一个 subagent 修正，不得静默新建替代 subagent。

### OpenCode agents

OpenCode 的 explorer 直接路由到内置 `Explore` subagent；worker 和 reviewer 使用四个自定义 subagent：

```text
Explore          # built-in
junior-worker
senior-worker
expert-worker
reviewer
```

自定义模板位于：

```text
platforms/opencode/agents/
```

可以复制或软链接到全局配置：

```bash
mkdir -p ~/.config/opencode/agents
ln -s /absolute/path/to/agent_skills/platforms/opencode/agents/junior-worker.md ~/.config/opencode/agents/junior-worker.md
ln -s /absolute/path/to/agent_skills/platforms/opencode/agents/senior-worker.md ~/.config/opencode/agents/senior-worker.md
ln -s /absolute/path/to/agent_skills/platforms/opencode/agents/expert-worker.md ~/.config/opencode/agents/expert-worker.md
ln -s /absolute/path/to/agent_skills/platforms/opencode/agents/reviewer.md ~/.config/opencode/agents/reviewer.md
```

也可以放到项目级 `.opencode/agents/`。

内置 `Explore` 的模型选择由 OpenCode 自己负责，本仓库暂不绑定具体模型。四个自定义 agent 的模板也故意不写死 `model`，因为 OpenCode 中可用的 provider/model ID 取决于本地接入的 Codex、Kimi、GLM 等服务。安装后可在四个自定义 agent 的 frontmatter 中取消 `model:` 示例注释并填写本地有效的 `provider/model#variant`。推荐语义映射是：

- `junior-worker` → 低成本、快速的 coding model；
- `senior-worker` → 默认主力 coding model；
- `expert-worker` → 最强的 coding/reasoning model；
- `reviewer` → 强 review model，尽量与产生被审查工作的模型不同。

三个 worker 禁止继续启动嵌套 subagent；`reviewer` 额外禁止文件编辑。Explorer 固定用于只读 evidence gathering；具体 worker 任务是否可写仍由 `delegate-work` task contract 的 `access` 和 write ownership 决定。

## 计划工作流

大型功能和重构使用以下闭环：

1. `write-plan` 将讨论与代码库事实写成稳定的 `.dev/plan/<slug>-plan.md`，包含需求/行为契约、工作包 DAG、ownership、委派提示和验证映射。
2. 计划完成后，由用户决定是否运行 `review-plan`；Agent 根据接口、数据、安全、兼容、并发、发布和任务规模给出风险建议。确认的范围内问题自动修订并复审，新增决策或范围扩展仍由用户决定。
3. `execute-plan` 按 DAG 分波次调度。封闭可验证的串行或并行节点都可委派，父 Agent 保留跨任务决策、checkpoint、集成和最终验证。
4. 每次执行在 `.dev/plan/` 留下带时间戳的 execution-state 文件，用于跨会话恢复并永久记录工作包、验证和审查结果。
5. 实现验证通过后，由用户决定运行 `review-plan-conformance`、`review-patch`、两者或跳过；Agent 根据变更风险给出建议，并自动闭环计划范围内的确认问题。

计划只描述能力角色和执行契约，不绑定具体模型。模型选择、隔离方式、任务契约、ownership 和返回压缩统一由 `delegate-work` 维护。
