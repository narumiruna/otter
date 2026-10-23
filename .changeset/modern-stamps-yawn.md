---
"@narumitw/otter-api": patch
---

Accept ENCRYPTION_KEY as exactly 64 hexadecimal characters and reject invalid nonempty keys before deployment. Existing Base64 keys must be converted to hex without changing their decoded bytes.
