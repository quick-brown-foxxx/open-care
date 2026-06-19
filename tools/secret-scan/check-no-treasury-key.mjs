#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// =============================================================================
// Constants
// =============================================================================

const SCANNED_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.md',
  '.mdx',
  '.mjs',
  '.py',
  '.sh',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const SCANNED_FILE_NAMES = new Set(['.env.example']);

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.svelte-kit',
  '.turbo',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'generated',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const IGNORED_FILE_NAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'tsconfig.tsbuildinfo',
  'yarn.lock',
]);

const FORBIDDEN_PATTERNS = [
  {
    label: 'treasury secret environment variable name',
    regex: /\bTREASURY_(?:KEY|KEYPAIR|PRIVATE_KEY|SECRET|WALLET_SECRET)\b/g,
  },
  {
    label: 'treasury private key assignment',
    regex: /\btreasury(?:[_-]?wallet)?[_-]?private[_-]?key\b\s*[:=]/gi,
  },
];

// =============================================================================
// Helpers
// =============================================================================

function isScannedFile(fileName) {
  return SCANNED_FILE_NAMES.has(fileName) || SCANNED_FILE_EXTENSIONS.has(path.extname(fileName));
}

function sourceFiles(directoryPath) {
  const files = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIR_NAMES.has(entry.name)) {
        files.push(...sourceFiles(entryPath));
      }
      continue;
    }

    if (!entry.isFile() || IGNORED_FILE_NAMES.has(entry.name) || !isScannedFile(entry.name)) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function lineAndColumn(contents, matchIndex) {
  const beforeMatch = contents.slice(0, matchIndex);
  const lines = beforeMatch.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function relativePath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

// =============================================================================
// Business Logic
// =============================================================================

function findTreasuryKeyFindings(repoRoot) {
  const findings = [];

  for (const filePath of sourceFiles(repoRoot)) {
    const contents = fs.readFileSync(filePath, 'utf8');

    for (const pattern of FORBIDDEN_PATTERNS) {
      pattern.regex.lastIndex = 0;

      for (const match of contents.matchAll(pattern.regex)) {
        const matchIndex = match.index ?? 0;
        const location = lineAndColumn(contents, matchIndex);
        findings.push({
          filePath: relativePath(repoRoot, filePath),
          line: location.line,
          column: location.column,
          label: pattern.label,
          snippet: match[0],
        });
      }
    }
  }

  return findings;
}

// =============================================================================
// CLI Interface
// =============================================================================

const repoRoot = process.cwd();
const findings = findTreasuryKeyFindings(repoRoot);

if (findings.length === 0) {
  process.stdout.write(
    'PASS: no treasury key material found in repository source, docs, tooling, or root files\n',
  );
} else {
  process.stderr.write(
    'FAIL: potential treasury key material found in repository source, docs, tooling, or root files\n',
  );
  for (const finding of findings) {
    process.stderr.write(
      `${finding.filePath}:${finding.line}:${finding.column} — ${finding.label}: ${finding.snippet}\n`,
    );
  }
  process.exitCode = 1;
}
