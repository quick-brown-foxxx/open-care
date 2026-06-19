import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

interface WranglerConfig {
  d1_databases?: unknown;
  env?: unknown;
  vars?: unknown;
}

interface ParsedWranglerConfig {
  config: WranglerConfig;
  relativePath: string;
}

type WranglerBlockName = 'd1_databases' | 'vars';

interface WranglerBlock {
  path: string;
  value: unknown;
}

const ANCHOR_CRON_CONFIG = 'apps/anchor-cron/wrangler.jsonc';
const OPERATOR_CONFIG = 'apps/operator/wrangler.jsonc';
const TG_BOT_CONFIG = 'apps/tg-bot/wrangler.jsonc';

const repoRoot = path.resolve(import.meta.dirname, '..');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function relativePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function wranglerConfigPaths(directoryPath: string): string[] {
  const configPaths: string[] = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.wrangler' && entry.name !== '.git') {
        configPaths.push(...wranglerConfigPaths(entryPath));
      }
      continue;
    }

    if (entry.isFile() && entry.name === 'wrangler.jsonc') {
      configPaths.push(entryPath);
    }
  }

  return configPaths.sort((left, right) => relativePath(left).localeCompare(relativePath(right)));
}

function parseWranglerConfig(filePath: string): WranglerConfig {
  const contents = fs.readFileSync(filePath, 'utf8');
  const result = ts.parseConfigFileTextToJson(filePath, contents);

  if (result.error !== undefined) {
    const message = ts.flattenDiagnosticMessageText(result.error.messageText, '\n');
    throw new Error(`${relativePath(filePath)} is not valid JSONC: ${message}`);
  }

  const parsedConfig: unknown = result.config;
  if (!isRecord(parsedConfig)) {
    throw new Error(`${relativePath(filePath)} must parse to an object`);
  }

  return parsedConfig;
}

function loadWranglerConfigs(): ParsedWranglerConfig[] {
  return wranglerConfigPaths(repoRoot).map((configPath) => ({
    config: parseWranglerConfig(configPath),
    relativePath: relativePath(configPath),
  }));
}

function formatWranglerBlockPath(segments: string[]): string {
  const formattedPath = segments.reduce((currentPath, segment) => {
    if (segment.startsWith('[')) {
      return `${currentPath}${segment}`;
    }

    return currentPath === '' ? segment : `${currentPath}.${segment}`;
  }, '');

  return `#${formattedPath}`;
}

function collectWranglerBlocks(
  config: WranglerConfig,
  blockName: WranglerBlockName,
): WranglerBlock[] {
  const blocks: WranglerBlock[] = [];

  function visit(value: unknown, pathSegments: string[]): void {
    if (Array.isArray(value)) {
      value.forEach((arrayItem, index) => {
        visit(arrayItem, [...pathSegments, `[${index}]`]);
      });
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const blockValue = value[blockName];
    if (blockValue !== undefined) {
      blocks.push({
        path: formatWranglerBlockPath([...pathSegments, blockName]),
        value: blockValue,
      });
    }

    for (const key of Object.keys(value).sort()) {
      if (key === blockName) {
        continue;
      }

      visit(value[key], [...pathSegments, key]);
    }
  }

  visit(config, []);
  return blocks.sort((left, right) => left.path.localeCompare(right.path));
}

function varLocations(config: WranglerConfig, varName: string): string[] {
  return collectWranglerBlocks(config, 'vars').flatMap(({ path: blockPath, value }) => {
    if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, varName)) {
      return [];
    }

    return [blockPath];
  });
}

function d1BindingLocations(config: WranglerConfig, bindingName: string): string[] {
  return collectWranglerBlocks(config, 'd1_databases').flatMap(({ path: blockPath, value }) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((databaseConfig, index) => {
      if (!isRecord(databaseConfig) || databaseConfig.binding !== bindingName) {
        return [];
      }

      return [`${blockPath}[${index}]`];
    });
  });
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

describe('wrangler binding allowlist', () => {
  const configs = loadWranglerConfigs();

  it('does not declare anchor wallet or operator secrets in unauthorized vars blocks', () => {
    const anchorSecretLocations = configs.flatMap(({ config, relativePath: configPath }) => {
      if (configPath === ANCHOR_CRON_CONFIG) {
        return [];
      }

      return varLocations(config, 'ANCHOR_WALLET_SECRET').map(
        (blockPath) => `${configPath}${blockPath}`,
      );
    });

    const operatorTokenLocations = configs.flatMap(({ config, relativePath: configPath }) => {
      if (configPath === OPERATOR_CONFIG) {
        return [];
      }

      return varLocations(config, 'OPERATOR_TOKEN').map((blockPath) => `${configPath}${blockPath}`);
    });

    expect(anchorSecretLocations).toEqual([]);
    expect(operatorTokenLocations).toEqual([]);
  });

  it('keeps the bot database binding exclusive to tg-bot', () => {
    const botDbConfigPaths = uniqueSorted(
      configs.flatMap(({ config, relativePath: configPath }) =>
        d1BindingLocations(config, 'bot_db').length > 0 ? [configPath] : [],
      ),
    );

    const unauthorizedBotDbLocations = configs.flatMap(({ config, relativePath: configPath }) => {
      if (configPath === TG_BOT_CONFIG) {
        return [];
      }

      return d1BindingLocations(config, 'bot_db').map((blockPath) => `${configPath}${blockPath}`);
    });

    expect(botDbConfigPaths).toEqual([TG_BOT_CONFIG]);
    expect(unauthorizedBotDbLocations).toEqual([]);
  });
});
