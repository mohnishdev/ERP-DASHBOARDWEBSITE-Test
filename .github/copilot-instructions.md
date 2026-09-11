# Next.js Migration Rules

We are migrating an existing large Vanilla HTML/CSS/JS application to Next.js.

The PRIMARY requirement is:

PRESERVE THE EXISTING UI EXACTLY.

Do NOT redesign anything.

Do NOT improve the UI.

Do NOT change spacing.

Do NOT change colors.

Do NOT change typography.

Do NOT change dimensions.

Do NOT change borders.

Do NOT change shadows.

Do NOT change icons.

Do NOT change responsive behavior.

Do NOT change HTML structure unless React/Next.js requires it.

Do NOT rename existing CSS classes unless absolutely necessary.

Do NOT rewrite existing CSS unnecessarily.

Do NOT replace the existing CSS system with Tailwind.

Do NOT introduce a UI component library.

Do NOT globally refactor CSS.

Do NOT change JavaScript behavior during a UI migration.

Do NOT migrate multiple pages at once.

Do NOT modify unrelated files.

Do NOT delete working legacy code.

Do NOT "clean up" code unless explicitly requested.

When migrating a component/page:

1. Inspect the original admin.html first.
2. Identify the exact HTML structure.
3. Identify the CSS rules used by that structure.
4. Identify the JavaScript behavior used by that structure.
5. Reproduce the same DOM hierarchy in React as closely as possible.
6. Reuse the original CSS wherever possible.
7. Move only the required CSS.
8. Move only the required JavaScript behavior.
9. Preserve class names.
10. Preserve IDs where they are required by existing behavior.
11. Make the smallest possible change.
12. Do not touch unrelated components.
13. Do not modify other pages.
14. Do not refactor working code during migration.

After completing a migration:

- Report exactly which files were changed.
- Report which original HTML/CSS/JS was migrated.
- Report any behavior that could not yet be migrated.
- Do not continue to the next component automatically.

WAIT FOR THE NEXT INSTRUCTION.

The migration must be incremental and reversible.