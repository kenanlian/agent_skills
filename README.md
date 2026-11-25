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

默认由主 Agent 自己完成。只有当独立任务可以并行推进、长调查只需带回结论和证据，或重要判断需要第二意见时，才使用 `delegate-work`。

- `explorer` 只读、无档位：负责找调用点、追踪数据流等事实调查，不做根因判断或审查裁决。
- `worker` 负责实现或判断，默认 `senior`。做法已定且风险低时用 `junior`；判断困难或出错代价高时用 `expert`，即使任务只读。

委派时说清目标、边界和验收方式即可，不必填写工作类型。只有写任务才指定可修改的路径。主 Agent 负责共享决策、集成和最终验收；并行任务不得交叉写入，下游依赖的结果须先验证。

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
