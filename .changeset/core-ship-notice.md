---
'@slop-detect/core': patch
---

Ship the NOTICE file in the published tarball. The core package adapts
Apache-2.0-licensed detection logic from Impeccable, so Apache License 2.0
section 4(d) requires the NOTICE to travel with redistributed copies. It existed
in the repo but was missing from the package `files` allowlist.
