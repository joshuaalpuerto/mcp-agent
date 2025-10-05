---
mode: 'agent'
description: 'Generate a Pull request description base on the file changes.'
tools: ['runInTerminal']
---
# Create GitHub Pull Request from Specification

Create GitHub Pull Request base on the changes made in the current branch.

## Process

1. Get the changes running `git diff main ':!*.lock'` in the terminal.
2. Read the changes from terminal and use it for creating the pull request title and description.

## Requirements
- Generate and imperative, concise and descriptive title for the pull request. The title should summarize the changes made in the pull request.
- Generate a concise pull request description, focus on the intention of the developer who implemented this change and what they are trying to solve.
