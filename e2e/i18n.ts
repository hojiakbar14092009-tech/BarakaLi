import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export type Language = 'uz' | 'ru';

type Dictionary = Record<string, unknown>;

const LOCALES_DIR = fileURLToPath(new URL('../apps/web/src/i18n/locales/', import.meta.url));

/** Same layout the app uses: `core.json` at the top level, every other file under its name. */
function load(language: Language): Dictionary {
  const dir = join(LOCALES_DIR, language);
  const result: Dictionary = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Dictionary;
    const name = file.replace(/\.json$/, '');
    if (name === 'core') Object.assign(result, content);
    else result[name] = content;
  }
  return result;
}

const BUNDLES: Record<Language, Dictionary> = { uz: load('uz'), ru: load('ru') };

/** Reads UI strings from the app's own translation files, so tests follow copy changes. */
export function translator(language: Language): (key: string) => string {
  return (key) => {
    let node: unknown = BUNDLES[language];
    for (const part of key.split('.')) {
      node = (node as Dictionary | undefined)?.[part];
    }
    if (typeof node !== 'string') throw new Error(`Missing translation ${language}:${key}`);
    return node;
  };
}
