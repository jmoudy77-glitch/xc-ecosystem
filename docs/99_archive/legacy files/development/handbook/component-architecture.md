# Component Architecture

## 1. Component Hierarchy
- **Page components**: top-level routing, data loading
- **Section components**: orchestrate UI sections
- **UI components**: reusable visual blocks

## 2. Client vs Server Components
- Server by default.
- Client only for:
  - Forms
  - Interactivity
  - Real-time updates

## 3. Props Design
- Keep props minimal.
- Use explicit interfaces.

## 4. Composition
- Prefer composition over large monolithic components.
