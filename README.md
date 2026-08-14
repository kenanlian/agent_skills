# Agent Skills

跨 coding agent 平台共享的个人 Agent Skills 集合。仓库只维护平台无关的 Skill；任务委派使用 Codex、Cursor 等宿主平台提供的内置 subagent，不提供自定义 subagent 配置。

## 安装

将 `skills` 目录直接软链接到项目的 Skill 发现目录。推荐使用两个平台都支持的开放目录：

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

使用 `delegate-work` Skill 构造自包含的任务契约，并按其中的平台路由选择内置 subagent、模型和推理强度。该 Skill 是委派路由的唯一规范，README 不重复维护易失效的映射。

父 Agent 必须明确指定 subagent 要加载的领域 Skill（无适用 Skill 时写 `None`），并提供清楚的任务、目标、范围和返回内容。subagent 在隔离上下文中执行；若返回内容不符合契约或复核有误，父 Agent 必须恢复同一个 subagent 修正，不得新建替代 subagent。

## 计划工作流

大型功能和重构使用以下闭环：

1. `write-plan` 将讨论与代码库事实写成稳定的 `docs/plan/<slug>-plan.md`，包含需求/行为契约、工作包 DAG、ownership、委派提示和验证映射。
2. 计划完成后，由用户决定是否运行 `review-plan`；Agent 根据接口、数据、安全、兼容、并发、发布和任务规模给出风险建议。确认的范围内问题自动修订并复审，新增决策或范围扩展仍由用户决定。
3. `execute-plan` 按 DAG 分波次调度。封闭可验证的串行或并行节点都可委派，父 Agent 保留跨任务决策、checkpoint、集成和最终验证。
4. 每次执行在 `docs/plan/` 留下带时间戳的 execution-state 文件，用于跨会话恢复并永久记录工作包、验证和审查结果。
5. 实现验证通过后，由用户决定运行 `review-plan-conformance`、`review-patch`、两者或跳过；Agent 根据变更风险给出建议，并自动闭环计划范围内的确认问题。

计划只描述能力角色和执行契约，不绑定具体模型。模型选择、隔离方式、任务契约、ownership 和返回压缩统一由 `delegate-work` 维护。
