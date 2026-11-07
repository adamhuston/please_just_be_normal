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
- Markdown token escaping is undone without interpreting HTML: apostrophes, quotes, ampersands, and angle brackets remain plain characters. Literal entities are preserved except for the known whitespace artifacts.
- Cyan highlights in Original show source characters removed or replaced by the current cleanup settings. Zero-width characters and changed line breaks have visible cyan markers. Highlights update live when typing or toggling options, follow input scrolling and wrapping, and never alter the original text, selection, or copied output.
- Sample loads a short, original satirical e-mail from an imaginary George Orwell to his editor during the Spanish Civil War, explicitly labelled as fictional. Markdown, whitespace artifacts, an invisible character, punctuation, and wrapped prose demonstrate cleanup. It never overwrites existing input.
- Output uses a monospaced font, horizontal scrolling, line numbers, and a synchronized column ruler. Header displays the current line's length and longest line. Lengths count Unicode code points, not bytes or visual display columns; wide characters and combined emoji may occupy different widths.
- No text is stored or uploaded. Light/dark mode defaults to the browser's `prefers-color-scheme` setting, including Safari, and follows system changes until a theme is selected manually. Only the explicit theme preference is saved locally. Blocked storage does not prevent switching themes; older Safari media-query listeners are supported. Dependencies are pinned and bundled locally: Marked 12.0.2 and Lucide 0.468.0. Their licenses are retained under `vendor/`.

## Preview And Verification

Open `index.html` directly in a browser; no server or build step is required. For GitHub Pages, publish the repository root from the chosen branch using GitHub's Pages settings.

Run `node --test normalizer.test.cjs` for focused cleanup regressions, including default line preservation, joining, whitespace idempotence, Unicode, and Markdown. Browser checks cover gutter/ruler scroll synchronization, cursor line lengths, responsive layouts, and clipboard success/fallback handling. Clipboard availability varies by browser; blocked copying selects the output for manual copying.

Final acceptance remains a real Meltwater test email on desktop and mobile, since its editor can add formatting independently of this tool.

## Installation

- The web app manifest uses relative identity, start URL, scope, and icon paths so installation works under the GitHub Pages repository subpath as well as a custom domain.
- Install from the browser's app installation menu on supported desktop/Android browsers. On iPhone/iPad, use Safari's Share menu > Add to Home Screen, with Open as Web App enabled when offered. Installation availability and menu wording depend on the browser.
- The app launches in standalone mode. The document theme color follows the selected light/dark theme. The manifest's initial background and theme colors match the default light page.
- Icons include 192px and 512px PNGs, an SVG favicon, and a 180px Apple touch icon. The 512px artwork has an opaque background and keeps its content within the maskable icon safe zone.
- Offline use is out of scope: there is no service worker, app-shell cache, or offline fallback. An internet connection is required to reliably load or reopen the installed app; text processing remains local after loading.
- Test installation over HTTPS (GitHub Pages) or localhost, not `file://`. Run `node --test normalizer.test.cjs pwa.test.cjs` for cleanup and manifest/asset regressions. Browser verification covers manifest retrieval, icon loading, theme metadata, and existing cleanup/copy behavior. Final device acceptance includes installing and reopening on desktop and iPhone/Android; no offline support is promised.