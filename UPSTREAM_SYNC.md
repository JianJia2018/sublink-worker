# Upstream Sync & Local Changes

This document tracks local modifications for safe upstream merging.

## Local Commits

### fix: raw Clash YAML subscription parsing (GLaDOS support)

**File**: `src/parsers/subscription/httpSubscriptionFetcher.js`
**Test**: `test/raw-yaml-subscription.test.js`

**Problem**: `decodeContent()` unconditionally Base64-decoded all subscription text. The custom `decodeBase64()` in `src/utils.js` silently produces garbage for non-Base64 input (skips invalid chars via `indexOf` returning -1). This corrupted raw Clash YAML from providers like GLaDOS, resulting in zero parsed nodes.

**Fix**: Rewrote `decodeContent()` with format detection before decoding:
1. Early return for known config formats (JSON `{...}`, Clash YAML `proxies:`, Surge INI `[Proxy]`)
2. `looksLikeBase64()` validator (charset + length % 4 check)
3. `isReadableText()` validator (>90% printable chars in decoded output)
4. URL-decode fallback only when `%` chars present

**Merge conflict potential**: LOW. The fix is self-contained in `decodeContent()` and two private helpers. If upstream changes `decodeContent()`, inspect whether they address the same issue. If upstream adds Base64 validation to `decodeBase64()` in `utils.js`, the extra checks here become redundant but harmless.

## Syncing with Upstream

```bash
# Add upstream remote (first time only)
git remote add upstream https://github.com/7Sageer/sublink-worker.git

# Fetch and merge
git fetch upstream
git merge upstream/main

# If conflicts in httpSubscriptionFetcher.js:
# - Keep upstream changes to other functions (fetchSubscription, fetchSubscriptionWithFormat)
# - Re-apply decodeContent fix if upstream didn't fix the same issue
# - Re-run tests: npx vitest run test/raw-yaml-subscription.test.js
```

## Conflict Resolution Guide

| File | Conflict Risk | Resolution |
|---|---|---|
| `httpSubscriptionFetcher.js` | Medium | Keep our `decodeContent`, `looksLikeBase64`, `isReadableText`. Merge upstream changes to other functions. |
| `test/raw-yaml-subscription.test.js` | Low | New file, no conflict unless upstream adds same-named file. Rename ours if needed. |
| `src/utils.js` | Low | We did NOT modify this file. No conflict expected. |
