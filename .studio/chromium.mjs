import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function chromiumOptions() {
  const { chromium } = await import('playwright');
  const installed = [chromium.executablePath()];
  if (process.platform === 'win32') {
    for (const directory of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
      installed.push(join(directory, 'Google/Chrome/Application/chrome.exe'), join(directory, 'Microsoft/Edge/Application/msedge.exe'));
    }
  }
  return {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || installed.find(path => existsSync(path)),
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(OPENAI_API_KEY|STUDIO_PASSWORD)$/i.test(key))),
    timeout: 15_000,
  };
}
