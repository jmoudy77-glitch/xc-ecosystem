# Code Conventions

## 1. Language & Framework
- **Next.js App Router** with TypeScript
- React Server Components by default
- Use Client Components only when necessary

## 2. Naming
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Files: `kebab-case.tsx`

## 3. Types
- Always use TypeScript interfaces/types for props.
- Never use `any`; use generics or union types.

## 4. API Consistency
- Route handlers in `/app/api/.../route.ts`
- Always return JSON with:
  ```ts
  { success: boolean, data?: T, error?: string }
  ```

## 5. Error Handling
- Never swallow errors silently.
- Use structured logs.

## 6. Styling
- Use TailwindCSS.
- Avoid deeply nested class lists; extract components.
