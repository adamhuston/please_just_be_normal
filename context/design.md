"Please just be normal" is a webtool designed to help our digital strategists deterministically normalize digital text for consistent and accurate display.

Generated text often includes whitespace characters like $nbsp; or $tab; as well as enforced line breaks. This is incompatible with e-mail and web display, which relies on word wrapping for natural spacing on different width screens.

Use cases:
- Normalizing text ensures consistent formatting across different platforms and devices.
- Helps prevent display issues caused by irregular spacing or hidden characters.
- Ensures that text is displayed correctly across different e-mail clients and web browsers.
- Improves readability and user experience by maintaining consistent spacing and line breaks.

This web tool will be a Github Pages deployment with just a few users every once in awhile. It can only be HTML CSS and JS, without any server-side processing.

## Implementation

- Original text and live normalized output remain separate. Copy exports only plain text, never line numbers or the ruler.
- Line breaks are preserved by default. Optional joining combines single prose lines, retaining blank lines and recognizable list, heading, quote, and fenced-code boundaries. It is a heuristic, not a semantic paragraph detector; review the output before copying.
- Cleanup converts known whitespace entities (`&nbsp;`, `&#160;`, `&#xA0;`, `&Tab;`, `$nbsp;`, `$tab;`), Unicode spaces, and tabs to ordinary spaces. Repeated spaces and line-edge spaces are removed. Line endings are standardized. Soft hyphens, zero-width spaces, word joiners, and byte-order marks are removed; emoji and language joiners remain unchanged.
- Markdown cleanup is opt-in and uses Marked tokens, not rendered HTML. It removes formatting syntax while retaining list items, text, and link/image destinations. Code indentation is not preserved by whitespace cleanup. Literal Markdown-like text can change under this option; keep it off when exact syntax matters.
- Output uses a monospaced font, horizontal scrolling, line numbers, and a synchronized column ruler. Header displays the current line's length and longest line. Lengths count Unicode code points, not bytes or visual display columns; wide characters and combined emoji may occupy different widths.
- Nothing is stored or uploaded. Dependencies are pinned and bundled locally: Marked 12.0.2 and Lucide 0.468.0. Their licenses are retained under `vendor/`.

## Preview And Verification

Open `index.html` directly in a browser; no server or build step is required. For GitHub Pages, publish the repository root from the chosen branch using GitHub's Pages settings.

Run `node --test normalizer.test.cjs` for focused cleanup regressions, including default line preservation, joining, whitespace idempotence, Unicode, and Markdown. Browser checks cover gutter/ruler scroll synchronization, cursor line lengths, responsive layouts, and clipboard success/fallback handling. Clipboard availability varies by browser; blocked copying selects the output for manual copying.

Final acceptance remains a real Meltwater test email on desktop and mobile, since its editor can add formatting independently of this tool.