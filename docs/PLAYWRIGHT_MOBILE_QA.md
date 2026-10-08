# Speed, Distance, and Time: mobile browser QA

## Run

```sh
npm ci
npm run test:motion
npm run test:mobile-browser
```

The test prefers Playwright-managed Chromium, then falls back to an installed
Chrome or Edge on Windows. On a host without Chrome/Edge, install the managed
browser once with `npx playwright install chromium`. To select a browser
explicitly, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.

The browser test starts a temporary local HTTP server and opens the lesson at
`/learning/speed-distance-time/` in Playwright Chromium with mobile viewport and
touch emulation. It covers 320×568, 360×640, and 390×844, each at normal and
simulated 125% text size. It taps both sliders and the playback/reset buttons,
checks zero and 50m endpoints, and asserts the numeric, car, graph, and
explanation outputs stay synchronized.

The 125% case scales page text through injected CSS. This is a browser-level
approximation; it does not emulate Android's system font-scale setting. Mobile
emulation also does not replace Android Chrome testing for platform-specific
font rendering, browser chrome, or touch behavior.

## Emulator and shared ADB notes

Playwright mobile emulation does not require Android SDK, ADB, or an Android
emulator. Use an Android emulator only when Android OS/browser integration or
system text scaling must be verified.

A.I. TERMINAL has Android device E2E scripts that resolve the same local Android
SDK and `platform-tools/adb` path. They do not issue `adb kill-server` in the
inspected scripts. Separate projects normally share the host ADB server on port
5037, so concurrent Android device runs can contend for a device; different
ADB versions can also restart or conflict with that shared server. Playwright
tests avoid this shared-device path entirely.
