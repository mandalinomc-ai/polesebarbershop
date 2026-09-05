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
- Cleared/verified empty agent subscriptions (`list_subscriptions` = vuoto).
- Script Windows pronto: `scripts/disattiva-popup-lavoro-da-finire.bat`
  (elimina task pianificati + scorciatoie Avvio con nomi Felice/lavoro/polese).

### Sul PC Windows
1. Scarica/apri `scripts/disattiva-popup-lavoro-da-finire.bat`
2. Tasto destro → **Esegui come amministratore**
3. Se non trova nulla: in Cursor Desktop spegni Automations / reminder
   «Felice Polese - lavoro da finire»
