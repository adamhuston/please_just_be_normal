const input = document.getElementById('input');
const inputHighlights = document.getElementById('input-highlights');
const output = document.getElementById('output');
const joinLines = document.getElementById('join-lines');
const markdown = document.getElementById('markdown');
const copy = document.getElementById('copy');
const clear = document.getElementById('clear');
const notice = document.getElementById('notice');
const gutter = document.getElementById('line-numbers');
const ruler = document.getElementById('ruler-scroll');
const themeToggle = document.getElementById('theme-toggle');
const themeMedia = matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#181b1a' : '#f4f6f3';
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
}

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.themePreference = theme;
  applyTheme(theme);
  try { localStorage.setItem('normalizer-theme', theme); } catch {}
});
function handleSystemThemeChange(event) {
  if (!document.documentElement.dataset.themePreference) applyTheme(event.matches ? 'dark' : 'light');
}
if (typeof themeMedia.addEventListener === 'function') {
  themeMedia.addEventListener('change', handleSystemThemeChange);
} else {
  themeMedia.addListener(handleSystemThemeChange);
}
applyTheme(document.documentElement.dataset.theme);

let copyTimer;
let revision = 0;
let lineLengths = [0];

function syncScroll() {
  gutter.scrollTop = output.scrollTop;
  ruler.scrollLeft = output.scrollLeft;
}

function updateCursor() {
  const line = output.value.slice(0, output.selectionStart).split('\n').length;
  document.getElementById('line-info').textContent = `Ln ${line}: ${lineLengths[line - 1] ?? 0} chars`;
}

function updateLineInfo() {
  const lines = output.value.split('\n');
  lineLengths = lines.map(line => Array.from(line).length);
  gutter.textContent = lines.map((line, index) => index + 1).join('\n');
  document.getElementById('line-count').textContent = `${lines.length} line${lines.length === 1 ? '' : 's'}`;
  const longest = lineLengths.reduce((maximum, length) => Math.max(maximum, length), 0);
  document.getElementById('longest-line').textContent = `Longest: ${longest} chars`;
  const track = document.getElementById('ruler-track');
  const stops = Math.ceil(Math.max(120, longest) / 10);
  track.replaceChildren(...Array.from({ length: stops }, (_, index) => {
    const stop = document.createElement('span');
    stop.textContent = (index + 1) * 10;
    return stop;
  }));
  updateCursor();
  syncScroll();
}

function syncInputScroll() {
  inputHighlights.scrollTop = input.scrollTop;
  inputHighlights.scrollLeft = input.scrollLeft;
}

function updateHighlights(ranges) {
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const { start, end } of ranges) {
    fragment.append(document.createTextNode(input.value.slice(cursor, start)));
    const mark = document.createElement('mark');
    const text = input.value.slice(start, end);
    for (const character of text) {
      if (/[\u00ad\u200b\u2060\ufeff\r\n\u0085\u2028\u2029]/.test(character)) {
        const marker = document.createElement('span');
        marker.className = 'cleanup-marker';
        marker.textContent = character;
        mark.append(marker);
      } else {
        mark.append(document.createTextNode(character));
      }
    }
    fragment.append(mark);
    cursor = end;
  }
  fragment.append(document.createTextNode(input.value.slice(cursor) + '\n'));
  inputHighlights.replaceChildren(fragment);
  syncInputScroll();
}

function update() {
  revision += 1;
  clearTimeout(copyTimer);
  const result = normalizeText(input.value, { joinLines: joinLines.checked, stripMarkdown: markdown.checked });
  output.value = result.text;
  updateHighlights(result.highlights);
  const labels = { artifacts: 'artifacts replaced', spaces: 'spaces normalized', invisible: 'invisibles removed', lineEndings: 'line endings normalized', joined: 'lines joined' };
  const changes = Object.entries(result.counts).filter(([, count]) => count).map(([key, count]) => `${count} ${labels[key]}`);
  if (markdown.checked && normalizeText(input.value).text !== result.text) changes.push('Markdown cleaned');
  document.getElementById('summary').textContent = changes.join(' / ') || 'No changes';
  document.getElementById('result-state').textContent = !input.value ? 'Ready' : input.value === result.text ? 'Already normal' : 'Cleaned';
  for (const [element, text] of [['input-count', input.value], ['output-count', result.text]]) {
    const count = Array.from(text).length;
    document.getElementById(element).textContent = `${count.toLocaleString()} character${count === 1 ? '' : 's'}`;
  }
  clear.disabled = !input.value;
  copy.disabled = !output.value;
  document.getElementById('copy-label').textContent = 'Copy text';
  notice.textContent = '';
  updateLineInfo();
}

input.addEventListener('input', update);
input.addEventListener('scroll', syncInputScroll);
joinLines.addEventListener('change', update);
markdown.addEventListener('change', update);
output.addEventListener('scroll', syncScroll);
for (const event of ['click', 'keyup', 'select', 'focus']) output.addEventListener(event, updateCursor);
clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
document.getElementById('sample').addEventListener('click', () => {
  if (input.value) {
    notice.textContent = 'Clear original text before loading sample.';
    return;
  }
  input.value = '# Subject: Dispatch from Spain, pending approval by reality\n\nDear\u00a0\u00a0Editor,\nBarcelona has a shortage of bread and a surplus of **official explanations**.\nI enclose the [dispatch](https://example.com/dispatch); please don\'t improve the facts.\nThey have already been improved by three newspapers and a committee.\n\nA few *editorial notes*:\n- The\tcensor has approved every sentence except the informative ones.\n- Our&nbsp;latest victory is still looking for a suitable event.\n- My expense$tab;claim is the only document all factions agree is fiction.\n\nYou asked for local\u200b colour. The coffee is brown;\nthe political distinctions are rather less reliable.\nPlease retain \"perhaps.\" It is the best-sourced word in the piece.\n\nYours,\nGeorge\n\n';
  update();
  input.focus();
});

copy.addEventListener('click', async () => {
  const text = output.value;
  const currentRevision = revision;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    output.focus();
    output.select();
    try { copied = document.execCommand('copy'); } catch { copied = false; }
  }
  if (currentRevision !== revision) return;
  if (copied) {
    document.getElementById('copy-label').textContent = 'Copied';
    notice.textContent = 'Copied as plain text.';
    copyTimer = setTimeout(() => { document.getElementById('copy-label').textContent = 'Copy text'; notice.textContent = ''; }, 2500);
  } else {
    notice.textContent = 'Clipboard unavailable. Normalized text selected for manual copy.';
  }
});

lucide.createIcons();
update();