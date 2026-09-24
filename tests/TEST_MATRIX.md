# BeautyFlow E2E test matrix

- `test:browser` — public/admin smoke + safe booking selection
- `test:browser:full` — real verified booking -> admin -> calendar -> delete -> slot restored
- `test:browser:waitlist` — public waitlist -> admin waitlist -> assign -> calendar -> cleanup
- `test:browser:all` — all Chromium suites above
- `test:browser:mobile` — existing mobile smoke suite

Owner-only destructive actions are intentionally not automated without a dedicated owner test account.
