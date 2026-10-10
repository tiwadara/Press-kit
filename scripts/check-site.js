#!/usr/bin/env node
// Checks every HTML file in the site without network access or dependencies:
// - basic structure: doctype, <html lang>, <title>, no duplicate ids, every <img> has alt
// - every local href/src/srcset/poster and CSS url() points to a file that exists
// - every same-page "#anchor" link points to an existing id
// Usage: node scripts/check-site.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // http:, https:, mailto:, tel:, data:, //cdn...

function htmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (/\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function checkFile(file) {
  const errors = [];
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  // Ignore comments so commented-out markup is not checked.
  const text = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const fail = (index, msg) => errors.push(`${rel}:${lineOf(text, index)}: ${msg}`);

  if (!/^\s*<!doctype html>/i.test(text)) fail(0, 'missing <!doctype html>');
  if (!/<html\b[^>]*\blang="[^"]+"/i.test(text)) fail(0, '<html> has no lang attribute');
  if (!/<title>[^<]*\S[^<]*<\/title>/i.test(text)) fail(0, 'missing or empty <title>');

  const ids = new Map();
  for (const m of text.matchAll(/\sid="([^"]*)"/g)) {
    if (ids.has(m[1])) fail(m.index, `duplicate id "${m[1]}" (first on line ${lineOf(text, ids.get(m[1]))})`);
    else ids.set(m[1], m.index);
  }

  for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt=/i.test(m[0])) fail(m.index, '<img> has no alt attribute');
  }

  const refs = [];
  for (const m of text.matchAll(/\s(href|src|poster)="([^"]*)"/gi)) refs.push([m.index, m[1], m[2]]);
  for (const m of text.matchAll(/\ssrcset="([^"]*)"/gi)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.push([m.index, 'srcset', url]);
    }
  }
  for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) refs.push([m.index, 'url()', m[2]]);

  for (const [index, attr, raw] of refs) {
    const ref = decodeEntities(raw.trim());
    if (ref === '') { fail(index, `empty ${attr}`); continue; }
    if (EXTERNAL.test(ref)) continue;
    const [beforeHash, hash] = ref.split('#');
    const target = beforeHash.split('?')[0];
    if (target === '') {
      // Same-page anchor: "#top" must match an id ("#" alone is allowed).
      if (hash && !ids.has(decodeURIComponent(hash))) fail(index, `${attr}="${raw}" points to a missing id`);
      continue;
    }
    let resolved;
    try {
      resolved = target.startsWith('/')
        ? path.join(root, decodeURIComponent(target))
        : path.resolve(path.dirname(file), decodeURIComponent(target));
    } catch {
      fail(index, `${attr}="${raw}" is not a valid URL`);
      continue;
    }
    if (!resolved.startsWith(root)) { fail(index, `${attr}="${raw}" points outside the site`); continue; }
    let stat = null;
    try { stat = fs.statSync(resolved); } catch { /* missing */ }
    if (stat && stat.isDirectory()) {
      try { stat = fs.statSync(path.join(resolved, 'index.html')); } catch { stat = null; }
    }
    if (!stat) fail(index, `${attr}="${raw}" points to a file that does not exist`);
  }

  return { errors, refs: refs.length };
}

const files = htmlFiles(root);
if (files.length === 0) {
  console.error('No HTML files found.');
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const { errors, refs } = checkFile(file);
  for (const e of errors) console.error(`error  ${e}`);
  failures += errors.length;
  console.log(`${errors.length ? 'fail' : 'pass'}  ${path.relative(root, file)} (${refs} links checked)`);
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} HTML file(s) passed.`);
