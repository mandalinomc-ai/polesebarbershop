# Client-side popup note (not repo-controlled)

## "Felice Polese - lavoro da finire"

Searched this repo and Cloud Agent subscriptions for reminder/popup scripts
related to the Windows/Cursor dialog titled **"Felice Polese - lavoro da finire"**.

### Findings
- **No matching code** in the site repo (no scheduled scripts, toast, modal, or
  reminder copy with that title).
- **No active Cloud Agent timer/subscriptions** (`list_subscriptions` was empty).
- This popup is almost certainly a **local Windows scheduled task / Cursor local
  reminder on the user's PC**, not something deployable or killable from GitHub.

### Action from agent side
- Cleared/verified empty agent subscriptions.
- Cannot remove a Windows Task Scheduler / local Cursor reminder from the cloud
  repo. Disable it on the PC (Task Scheduler or Cursor scheduled messages).
