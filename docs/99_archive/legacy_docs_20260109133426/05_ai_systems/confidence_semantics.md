# Confidence Semantics
**Authority Level:** AI Contract (binding)  
**Purpose:** Standardize how uncertainty is represented across all AI systems so coaches can calibrate trust.

---

## 1. Principle
Confidence is not “how correct we feel.”  
Confidence is a communicated measure of:
- input completeness
- signal consistency
- model/ruleset stability
- recency and relevance of data

---

## 2. Canonical Confidence Representation
AI systems must provide at least one of the following (preferably both):

### 2.1 Categorical confidence
- **High** — strong signal, sufficient data, stable inference
- **Medium** — usable signal, some uncertainty or missingness
- **Low** — weak signal, high missingness, unstable inference
- **Unknown** — insufficient data to support inference

### 2.2 Numeric confidence (optional)
A 0–1 score may be used if:
- it is calibrated and meaningful
- it is accompanied by categorical confidence
- it is not presented as “probability of being correct” unless formally defined

---

## 3. Required Coach Messaging
When confidence is Medium/Low/Unknown, AI must surface *why*:
- missing key inputs
- contradictory signals
- small sample sizes
- stale data windows
- edge-case conditions

---

## 4. Prohibited Patterns
- Presenting a precise number without explainable drivers
- Using confidence to pressure a coach (“you must…”)
- Hiding uncertainty in footnotes

---

## 5. Storage Requirements
Persist confidence with:
- model/ruleset version
- input snapshot references
- produced timestamp
