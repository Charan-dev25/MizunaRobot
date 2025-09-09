# Mizuna App (Expo/React Native)

The Mizuna mobile app is a cross‑platform companion for the Mizuna robot. It provides live video, tele‑operation controls, a chat interface powered by the robot’s AI, and system statistics.

- Platform: React Native with Expo Router
- Targets: Android and iOS

## Features at a Glance

- Live camera preview (MJPEG) from the robot
- On‑screen tele‑operation controls (move/stop, speed)
- Chat with Mizuna (send prompts, receive responses)
- Robot and system stats (temperatures, CPU/memory/disk, connectivity)
- Light/dark theme with Themed components
- Haptic feedback and gradient UI accents


## App Structure

- `app/_layout.tsx` – overall app layout and theme setup
- `app/index.tsx` – landing/redirect (Expo Router)
- `app/(tabs)/_layout.tsx` – bottom tab bar configuration
- `app/(tabs)/index.tsx` – Control + Live Video screen
- `app/(tabs)/chat.tsx` – Chat screen
- `app/(tabs)/stats.tsx` – Stats screen
- `app/(tabs)/settings.tsx` – Settings screen
- `components/` – reusable UI components (ParallaxScrollView, HapticTab, etc.)
- `constants/` – theme and color utilities

The app references the robot’s HTTP API exposed by the Raspberry Pi (`mizuna/mizuna.py`).


## Configuration (Important)

Update the robot endpoints in these files. Prefer the robot’s LAN IP on Android (mDNS `.local` may not resolve in release builds):

- `app/(tabs)/index.tsx`
	- `ROBOT_BASE_URL` – base URL (e.g., `http://mizuna.local`)
	- `CAMERA_STREAM_URL` – MJPEG stream (e.g., `http://raspberrypi.local:5000/stream.mjpg`)
- `app/(tabs)/chat.tsx`
	- `ROBOT_BASE_URL`
- `app/(tabs)/stats.tsx`
	- `ROBOT_BASE_URL`

Android cleartext HTTP must be allowed for `http://` URLs:
- `app.json` → `android.usesCleartextTraffic: true`


## Screens

### 1) Control + Live Video (`app/(tabs)/index.tsx`)
![1](/mizuna-app/screenshots/1.png)
- Live MJPEG preview of the robot’s camera
- Movement controls (forward/back/left/right/stop)
- Speed slider (0–100)
- Uses:
	- `GET /stream.mjpg` for video
	- `POST /cmd` with `{ cmd: 'F|B|L|R|S' }`
	- `POST /speed` with `{ speed: number }`

Tips
- Use IP instead of `*.local` on Android
- Ensure the phone and robot are on the same Wi‑Fi


### 2) Chat (`app/(tabs)/chat.tsx`)
![3](/mizuna-app/screenshots/3.png)
- Send prompts to Mizuna and receive AI responses
- Optionally spoken replies via robot’s TTS
- Autoscroll to latest message
- Keyboard‑aware layout with safe padding
- Uses: `POST /ask` with `{ text: string }`

Android keyboard notes
- The app uses dynamic padding and/or `adjustResize` to keep the input visible
- If needed, set `android:windowSoftInputMode="adjustResize"` on the main activity (after `expo prebuild`)


### 3) Stats (`app/(tabs)/stats.tsx`)
![2](/mizuna-app/screenshots/2.png)
- Connectivity and response time to robot
- CPU, memory, disk usage
- CPU/GPU temperatures and app uptime
- Uses:
	- `GET /performance`
	- `GET /temperature`
	- `GET /uptime`

UI tip
- The `ScrollView` includes extra bottom padding so you can scroll past the last card (not hidden by the tab bar)


### 4) Settings (`app/(tabs)/settings.tsx`)
![4](/mizuna-app/screenshots/4.png)
- Theme preview and switches
- Helpful links and credits
- You can wire in an input for `ROBOT_BASE_URL` if you prefer runtime configuration


## Robot API used by the App

- `GET /stream.mjpg` – live MJPEG video
- `POST /cmd` – `{ cmd: 'F|B|L|R|S' }`
- `POST /speed` – `{ speed: 0..100 }`
- `POST /ask` – `{ text: string }` → `{ reply: string, voice: { spoken: boolean } }`
- `GET /performance` – system metrics + connectivity
- `GET /temperature` – CPU/GPU temps
- `GET /uptime` – app uptime

These endpoints are implemented in `mizuna/mizuna.py`.


## Development

Prerequisites
- Node.js LTS
- Expo CLI (`npx expo`)

Install and run
```bash
npm install
npx expo start
```

If you edit native modules or build locally, prebuild the native projects
```bash
npx expo prebuild
```


## Build APK Locally

```bash
# Prebuild native projects if not done
npx expo prebuild

# Assemble and install release build on a connected device
npx expo run:android --variant release

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

With EAS (cloud builds)
```bash
eas build -p android --profile production
```
Make sure `eas.json` exists with a `production` profile.

