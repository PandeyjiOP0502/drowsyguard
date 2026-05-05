# DrowsyGuard

Real-time browser-based drowsiness detection using **MediaPipe Face Mesh** and facial landmark metrics:

- **EAR (Eye Aspect Ratio)** to detect prolonged eye closure
- **MAR (Mouth Aspect Ratio)** to detect yawning
- Live HUD with alerts, event log, risk level, and sensitivity sliders
- **Offline Support** — runs locally with vendored MediaPipe assets

## Project Structure

```text
.
├── index.html
├── styles.css
├── fahhhhh.mp3
├── package.json                      npm config for offline setup
├── service-worker.js                 Service Worker for offline caching
├── js/
│   ├── app.js
│   ├── audio.js
│   ├── config.js                     Uses local vendor paths
│   ├── detector.js
│   ├── draw.js
│   ├── math.js
│   └── ui.js
└── vendor/                           Vendored MediaPipe assets
    └── mediapipe/
        ├── camera_utils/             (copied from npm package)
        └── face_mesh/                (copied from npm package)
```

## Setup for Offline Use

### 1. Install Dependencies

```bash
npm install
```

This downloads MediaPipe libraries into `node_modules/`.

### 2. Vendor MediaPipe Assets

Copy MediaPipe files to local `vendor/` directory:

```bash
mkdir -p vendor/mediapipe/face_mesh vendor/mediapipe/camera_utils
cp -r node_modules/@mediapipe/face_mesh/* vendor/mediapipe/face_mesh/
cp -r node_modules/@mediapipe/camera_utils/* vendor/mediapipe/camera_utils/
```

After this step, the app **does not require internet** and does not depend on `node_modules/` at runtime.

### 3. Run Locally

Choose one:

**Option A: Development server (auto-opens browser)**
```bash
npm run dev
```

**Option B: Simple HTTP server**
```bash
npm run serve
```
Then open `http://localhost:8080` in your browser.

### 4. Activate the System

1. Click **ACTIVATE SYSTEM**
2. Allow camera access when prompted
3. System begins real-time drowsiness detection

## How It Works Offline

- **MediaPipe Assets**: FaceMesh models (`.tflite`, WASM files) are loaded from `/vendor/mediapipe/face_mesh/` instead of CDN
- **Service Worker**: Caches all app assets on first load. Subsequent sessions work without internet
- **locateFile Configuration**: `config.js` redirects MediaPipe to vendored asset paths using `LOCATE_FILE`
- **No npm Runtime Dependency**: Once vendored, `node_modules/` is not needed at runtime

## Files Changed for Offline Support

| File | Change |
|------|--------|
| `index.html` | Load MediaPipe scripts from `/vendor/mediapipe/` instead of CDN |
| `js/config.js` | Updated `MEDIAPIPE.LOCATE_FILE` to point to `/vendor/mediapipe/face_mesh/` |
| `js/app.js` | Uses `MEDIAPIPE.LOCATE_FILE` callback for asset resolution |
| `package.json` | Defines npm dependencies & scripts |
| `service-worker.js` | Caches assets for offline use |
| `vendor/` | [NEW] Local vendored MediaPipe packages |

## Notes

- **First run**: Requires internet to download MediaPipe (~50 MB npm packages)
- **Subsequent runs**: Fully offline via Service Worker caching and vendored assets
- Camera access does **not** work from `file://` in most browsers. Start with `npm run serve` and open `http://localhost:8080`.
- Tune detection behavior with EAR/MAR/Delay sliders in the UI
- Alert audio uses `fahhhhh.mp3` from the project root
- Tested with Chrome, Firefox, Edge (all support Service Worker)

## Troubleshooting Camera API on Localhost

If you see a camera startup error while running on localhost:

1. Open the app in an external browser tab (Chrome/Edge/Firefox), not an embedded preview/webview.
2. Confirm you are on `http://localhost:8080` or `https://...` (not `file://`).
3. Check site permissions and allow camera access for localhost.
4. In DevTools console, verify:

```js
window.isSecureContext
navigator.mediaDevices
navigator.mediaDevices?.getUserMedia
```

Expected:
- `window.isSecureContext` should be `true`
- `navigator.mediaDevices` and `getUserMedia` should be available

If camera is still unavailable, close other apps that may be using the camera (Zoom/Teams/Meet) and reload.
