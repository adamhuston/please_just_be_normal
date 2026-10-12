const input = document.getElementById('input');
const output = document.getElementById('output');
const joinLines = document.getElementById('join-lines');
const markdown = document.getElementById('markdown');
const copy = document.getElementById('copy');
const clear = document.getElementById('clear');
const notice = document.getElementById('notice');
const gutter = document.getElementById('line-numbers');
const ruler = document.getElementById('ruler-scroll');
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

function update() {
  revision += 1;
  clearTimeout(copyTimer);
  const result = normalizeText(input.value, { joinLines: joinLines.checked, stripMarkdown: markdown.checked });
  output.value = result.text;
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
  input.value = '# Team update\n\nHello\u00a0\u00a0team,\nHere is our **weekly update**.\n\n- Campaign\tresults are ready.\n- Next&nbsp;steps are on track.\n\nRead the [report](https://example.com/report).\n\nThanks,\nThe team\u200b';
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