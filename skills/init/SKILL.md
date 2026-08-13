---
name: init
description: Generate an AGENTS.md repository guide by delegating independent codebase scans to platform-built-in read-only subagents, then synthesizing the evidence into one concise file.
---

Generate AGENTS.md by following the `delegate-work` skill to launch platform-built-in read-only subagents for independent scans of core source, tests, configuration and build files, and scripts or documentation. Give every subagent a clear goal, non-overlapping scope, and explicit evidence return contract, then synthesize the results into one file.

<structure>
- **Project Overview**: Brief description of project purpose
- **Architecture & Data Flow**: High-level structure, key modules, data flow
- **Key Directories**: Main source directories, purposes
- **Development Commands**: Build, test, lint, run commands
- **Code Conventions & Common Patterns**: Formatting, naming, error handling, async patterns, dependency injection, state management
- **Important Files**: Entry points, config files, key modules
- **Runtime/Tooling Preferences**: Required runtime (e.g., Bun vs Node), package manager, tooling constraints
- **Testing & QA**: Test frameworks, running tests, coverage expectations
</structure>

<directives>
- You MUST title the document "Repository Guidelines"
- You MUST use Markdown headings for structure
- You MUST be concise and practical
- You MUST focus on what an AI assistant needs to help with the codebase
- You SHOULD include examples where helpful (commands, paths, naming patterns)
- You SHOULD include file paths where relevant
- You MUST call out architecture and code patterns explicitly
- You SHOULD omit information obvious from code structure
</directives>

<output>
After analysis, you MUST write AGENTS.md to the project root.
</output>
