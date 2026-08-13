---
name: research-library-api
description: Research an external library, framework, or API using the exact local dependency version, upstream source, and official documentation. Use for source-verified conceptual, implementation, or behavioral answers; do not modify the project.
---

# Research library or API

Answer with evidence from source code or official documentation. Do not rely on model memory for API details.

## Project boundary

Read project files and dependencies, but do not create, modify, delete, format, install packages in, or change Git state in the project directory.

When third-party source is unavailable locally and external source inspection requires temporary writes:

1. Create one unique directory using a system-safe temporary-directory mechanism.
2. Record its exact path immediately.
3. Clone, check out, and write third-party source only inside that directory.
4. Delete only that exact directory, and only after confirming this run created it. Never use a globbed or parent-directory deletion.
5. If ownership, path identity, or cleanup preconditions cannot be verified, do not delete anything. If temporary writes, network, or shell access are unavailable, fall back to available authoritative evidence and state the limitation.

## Investigation

1. Classify the question as conceptual, implementation, or behavioral.
2. Check local dependencies first: exact version, type definitions, entry points, implementation, and tests.
3. When needed, locate the canonical upstream source and investigate the requested version rather than the latest version by default.
4. Cross-reference two authoritative locations where practical: types and implementation, or implementation and tests.
5. Locate where defaults are assigned. Quote source signatures exactly when the signature is material.
6. For independent source traces, follow `delegate-work` and give each built-in read-only subagent an explicit version, source scope, question, and return contract.

## Output

Use Markdown with:

- Answer
- Version investigated
- Sources: repository or package, path and line range, with concise evidence
- API or configuration details
- Breaking changes and caveats, when relevant

Clearly distinguish verified facts, inferences, and evidence limitations.
