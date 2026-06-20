# Goal Progress Check Automation Prompt

You are checking whether the repository is moving toward the product goal described in `GOAL.md`.

Repository: `narumiruna/otter`
Branch: `main`

Every run:

1. Read `GOAL.md`, `README.md`, and the repository file tree.
2. Inspect recent git history and current repository contents.
3. Determine whether the repo has made meaningful progress toward the goal since the previous visible state.
4. Produce a concise report with:
   - current status
   - evidence of progress, if any
   - gaps or blockers
   - the single most useful next step
5. Write the report in Traditional Chinese.
6. Do not make commits or push changes unless explicitly instructed by the user in a later run.
7. If `GOAL.md` is missing or unclear, report that as the blocker and suggest the smallest clarification needed.

Use the progress criteria in `GOAL.md` as the source of truth. Treat unrelated churn as non-progress.
