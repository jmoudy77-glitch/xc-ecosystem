# Branding and Theme System
**Authority Level:** UI System Law (binding)  
**Purpose:** Define theming and branding approach (school identity, semantic tokens) and constraints for consistent UI.

---

## 1. Theme Thesis
Branding must be:
- program-specific (school identity)
- professional and restrained
- consistent across all pages and components
- implemented via semantic tokens, not ad-hoc colors

Brand should reinforce identity without distracting from coaching work.

---

## 2. Canonical Theme Layers
### 2.1 Brand Inputs (Program-configured)
- primary color(s)
- secondary/accent colors
- logo/mark assets
- typography preferences (optional)
- sport identity (XC / T&F) if used for subtle cues

### 2.2 Semantic Tokens (Controlling Contract)
All UI styling should route through semantic tokens:
- `bg`, `surface`, `muted`, `border`
- `text_primary`, `text_secondary`, `text_muted`
- `primary`, `primary_foreground`
- `danger`, `warning`, `success`, `info`
- module accents (optional, minimal)

**Rule:** Components should not hardcode brand colors directly.

---

## 3. Accessibility and Contrast
- Ensure readable contrast for text on surfaces.
- Provide dark/light variants as needed.
- Brand colors may be adjusted (within rules) to preserve accessibility.

---

## 4. Brand Placement Rules
- Hero header carries primary program identity (name/logo).
- Navigation shell uses restrained accents.
- Avoid “over-branding” inside operational workflows (boards/builders).

---

## 5. Multi-tenant Considerations
Brand configuration is tenant-scoped.
- no cross-tenant leaking of brand assets
- caching must preserve tenant boundaries
- default theme must exist for incomplete onboarding

---

## 6. Implementation Expectations
- Theme tokens should be represented as CSS variables (or equivalent) and derived from program config.
- Token contract should be documented and versioned.
- UI should remain usable even if brand inputs are missing (fallback tokens).

---

## 7. Definition of Done (Branding)
Branding system is compliant if:
- tokens are semantic and centrally defined
- components never rely on ad-hoc colors
- hero and shell consistently present identity without clutter
