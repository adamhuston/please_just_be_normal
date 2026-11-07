const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.webmanifest'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function checkPng(relativePath, size) {
  const image = fs.readFileSync(path.join(__dirname, relativePath));
  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(image.toString('ascii', 12, 16), 'IHDR');
  assert.equal(image.readUInt32BE(16), size);
  assert.equal(image.readUInt32BE(20), size);
}

test('manifest identifies a standalone app within its deployment subpath', () => {
  assert.equal(manifest.name, 'Please just be normal');
  assert.ok(manifest.short_name.length <= 12);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'en');
  for (const deployment of ['https://example.com/', 'https://example.com/please_just_be_normal/']) {
    const manifestUrl = new URL('manifest.webmanifest', deployment);
    for (const field of ['id', 'start_url', 'scope']) {
      assert.equal(new URL(manifest[field], manifestUrl).href, deployment);
    }
    for (const icon of manifest.icons) {
      assert.ok(new URL(icon.src, manifestUrl).href.startsWith(deployment));
    }
  }
});

test('install icons have the advertised PNG sizes and maskable purpose', () => {
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    assert.ok(icon);
    assert.equal(icon.type, 'image/png');
    assert.ok(icon.purpose.split(' ').includes('any'));
    checkPng(icon.src, size);
  }
  assert.ok(manifest.icons.some(icon => icon.purpose.split(' ').includes('maskable')));
  checkPng('icons/apple-touch-icon.png', 180);
});

test('page links the manifest, favicons, and Apple installation metadata', () => {
  for (const asset of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg', 'icons/apple-touch-icon.png']) {
    assert.ok(html.includes(`href="./${asset}"`), asset);
    assert.ok(fs.existsSync(path.join(__dirname, asset)), asset);
  }
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="Be normal"/);
  assert.match(html, /name="theme-color" content="#f4f6f3"/);
  assert.equal(manifest.background_color, '#f4f6f3');
  assert.equal(manifest.theme_color, '#f4f6f3');
});
