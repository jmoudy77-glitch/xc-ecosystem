# Testing Strategy

## 1. Types of Testing
- **Unit tests** (utils, helpers)
- **Component tests**
- **Integration tests** (API routes)
- **End-to-end tests** (Playwright)

## 2. Coverage Targets
- 80% for utilities
- 60% for UI components
- 75% for critical APIs

## 3. Database Testing
- Use Test Supabase instance.
- Seed fixtures per test.

## 4. Mocking
- Mock network calls.
- Avoid mocking Supabase client unless necessary.
