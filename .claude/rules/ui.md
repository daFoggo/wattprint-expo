---
paths:
  - 'src/components/**/*.tsx'
  - 'src/screens/**/*.tsx'
  - 'src/features/**/components/**/*.tsx'
  - 'src/app/**/*.tsx'
  - 'src/global.css'
---

# UI: rules an agent must not miss

Source of truth: docs/components.md and docs/design-system.md. Guard tests already fail on hard-coded colours, unsupported Uniwind variants and forbidden imports.

- Own components take `ref` as a prop (ESLint bans `forwardRef` outside `src/components/ui`); no `useContext`; use `variant` or `size`, never boolean look props or call-site colour overrides.
- 48 dp touch targets (`min-h-12`); roles and labels on pressables; error text `selectable`.
- Green text and Button fills use `primary-strong`; custom bordered controls use `border-input`.
- Third-party component needing `className`: wrap once with `withUniwind`; non-style colour props use `*ClassName="accent-..."`.
- User-visible strings are i18n keys, same keys in en and vi. `src/app` is routes only; file names are kebab-case.
- Screens with data render the shared loading, empty and error states. UI changes are checked on the device (AGENTS.md Device verification).
