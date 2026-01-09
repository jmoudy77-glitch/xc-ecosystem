# AI UI Guidelines
**Authority Level:** UI System Law (binding)  
**Purpose:** Define how AI/derived analytics must be presented to coaches to preserve trust, calibration, and sovereignty.

---

## 1. Labeling (Non-negotiable)
Any AI/derived output must be labeled as:
- **Derived** (interpretation) or **Forecast** (probabilistic)
Never label derived outputs as “truth” or “fact.”

---

## 2. Confidence Must Be Visible
Always show:
- confidence category (High/Medium/Low/Unknown)
Optional:
- numeric confidence (only if meaningful and accompanied by category)

---

## 3. Rationale Must Be Available
At minimum, provide an expandable “Why” that includes:
- top drivers
- key supporting facts
- major assumptions
- notable data gaps

---

## 4. Provenance Must Be Available
Provide:
- produced timestamp
- model/ruleset version (in advanced view)
- key inputs used (references or summarized provenance)

---

## 5. No Command Voice
AI must present:
- options, not commands
- tradeoffs, not moralizing
- warnings as signals, not alarms (unless truly critical)

---

## 6. Action Coupling Rules
If AI output drives a recommended action:
- the action must be explicitly initiated by the coach
- show consequence preview
- show reversibility

AI must never silently trigger irreversible changes.

---

## 7. Default UI Pattern
- Compact display: label + confidence + short summary
- Expanded drawer/modal: rationale + provenance + assumptions + history

---

## 8. Failure Mode Handling
When confidence is Low/Unknown:
- say so plainly
- state what is missing
- avoid precise numbers
- propose the smallest next data collection action (if helpful)
