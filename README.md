# PorryZ.github.io

This site is deployed from the repository root and does not use git submodules.

## CI note
If Actions fails with a missing submodule URL for `PorryZ.github.io`, the fix is to remove the stale submodule entry because this repository is intentionally submodule-free.

## Debugging
Use `git ls-files -s | rg "PorryZ\.github\.io"` to confirm there is no 160000 gitlink entry for a submodule in the index.
