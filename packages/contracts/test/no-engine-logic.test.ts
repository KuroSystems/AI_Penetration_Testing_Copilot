import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Acceptance criterion: "no engine-specific logic present yet".
 *
 * Enforced structurally rather than by review: the contracts package may not
 * touch the network, the filesystem, child processes, timers or globals, and
 * may not depend on anything except Zod. If a later phase tries to sneak an
 * implementation in here, this test fails.
 */
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : [];
  });

const sourceFiles = walk(srcDir);

const BANNED_IMPORTS = [
  'node:fs',
  'node:net',
  'node:http',
  'node:https',
  'node:child_process',
  'node:worker_threads',
  'node:dgram',
  'node:tls',
  'fs',
  'child_process',
  'better-sqlite3',
  'sqlite3',
  'axios',
  'undici',
  'express',
];

const BANNED_RUNTIME_CALLS = [
  'setTimeout(',
  'setInterval(',
  'fetch(',
  'process.env',
  'crypto.randomUUID(',
  'Math.random(',
  'new Date(',
  'Date.now(',
  'console.log(',
];

describe('contracts package contains no engine logic', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  for (const file of sourceFiles) {
    const rel = relative(srcDir, file);
    const content = readFileSync(file, 'utf8');

    it(`${rel} imports nothing but contracts and zod`, () => {
      const imports = [...content.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]!);
      for (const specifier of imports) {
        const allowed = specifier === 'zod' || specifier.startsWith('.') || specifier.startsWith('zod/');
        expect(allowed, `${rel} imports "${specifier}"`).toBe(true);
        expect(BANNED_IMPORTS).not.toContain(specifier);
      }
    });

    it(`${rel} performs no I/O, timing or randomness`, () => {
      for (const call of BANNED_RUNTIME_CALLS) {
        const inCode = content
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
          .join('\n');
        expect(inCode.includes(call), `${rel} contains "${call}"`).toBe(false);
      }
    });

    it(`${rel} declares no classes`, () => {
      // Contracts are data and interfaces; a class here means behaviour crept in.
      expect(/^\s*(export\s+)?(abstract\s+)?class\s/m.test(content), rel).toBe(false);
    });
  }
});
