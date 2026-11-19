import { chromiumOptions } from './chromium.mjs';

export async function openStudioWindow({ origin, password, headless = false, profileDirectory = '' }) {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
    throw new Error('制作室を開くにはローカルのアドレスが必要です。');
  }
  const { chromium } = await import('playwright');
  // An empty directory name gives this launch its own disposable browser profile.
  const context = await chromium.launchPersistentContext(profileDirectory, {
    ...await chromiumOptions(), headless, viewport: null,
    httpCredentials: { origin, username: 'developer', password },
  });
  const closed = new Promise(resolve => context.once('close', resolve));
  try {
    const page = context.pages()[0] ?? await context.newPage();
    const watchTab = tab => tab.once('close', () => {
      if (context.pages().length === 0) context.close().catch(() => {});
    });
    context.pages().forEach(watchTab);
    context.on('page', watchTab);
    const session = await context.newCDPSession(page);
    // Keep ordinary downloads in the browser's Downloads folder, outside the
    // temporary profile and Playwright's auto-removed download staging area.
    await session.send('Browser.setDownloadBehavior', { behavior: 'default' });
    await session.detach();
    const response = await page.goto(origin + '/studio/');
    if (!response?.ok()) throw new Error('制作室を開けませんでした。');
    return { context, page, closed, close: () => context.close() };
  } catch (error) {
    await context.close();
    throw error;
  }
}
