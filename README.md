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

最终审查不表示成 `delegate-work` 的 `reviewer` role，由调用方自行组织。顶层只读审查 Agent 仍可通过 `delegate-work` 委派 bounded explorer 收集证据，但 finding、severity、contract status 和 verdict 始终由该顶层审查 Agent 判断。

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
