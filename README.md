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

使用 `delegate-work` Skill 构造自包含的任务契约，并选择宿主平台的内置 subagent：

| 工作类型 | Codex | Cursor |
| --- | --- | --- |
| 只读探索、审查、研究 | `explorer` | `Explore` |
| 实现、修改、测试 | 优先 `worker`，必要时 `default` | `generalPurpose` |

父 Agent 必须明确指定 subagent 要加载的领域 Skill，并提供清楚的任务、目标、范围和返回内容。平台内置 subagent 负责在独立上下文中读取该 Skill、执行任务并按契约返回结果。
