# Testing Jay AI with Expo Go (SDK 57)

This guide covers the exact commands and steps to run the app from an Ubuntu Terminal.

## 0. Check the installed SDK

The Expo SDK version is locked in `package.json` (`expo ~57.0.28`). Confirm it:

```bash
cd ~/AI
npx expo --version
node -p "require('./package.json').dependencies.expo"
```

## 1. Install dependencies (first time only)

```bash
cd ~/AI
npm install
```

## 2. Run sanity checks

```bash
cd ~/AI

npx tsc --noEmit        # TypeScript / build errors
npx expo-doctor         # SDK and dependency diagnostics
npx expo lint           # Lint (first run generates the default eslint config)
```

All three should finish with no errors.

Also check the backend TypeScript:

```bash
cd ~/AI/server && npx tsc --noEmit
```

## 2b. Run the backend (for live chat)

Skip this to stay in labelled mock mode. To use a real model:

```bash
cd ~/AI/server
cp .env.example .env
# edit .env and set OPENAI_API_KEY (and OPENAI_BASE_URL if not OpenAI)
npm install
npm run dev
```

The server listens on `http://0.0.0.0:8787`. Verify it responds:

```bash
curl http://localhost:8787/health    # or: wget -qO- http://localhost:8787/health
```

`configured: true` means a key is present. Then set the app's backend URL to your laptop's LAN IP
in `~/AI/.env` (use `hostname -I` to find it) and reload the app:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8787
```

The Chat header shows a connection dot: **green** = connected, **purple** = development/mock mode,
**red** = backend reachable but no provider key.

**Accounts:** the app now opens on the sign-in screen. Tap **Sign up**, create an account
(email + password, min 6 characters) and you will be signed in. Accounts are stored on the
backend in `server/data/users.json`. In mock mode (no backend) you get a labelled local device
account instead. To reset accounts, stop the server and delete `server/data/users.json`.

## 3. Start Expo in LAN mode

```bash
cd ~/AI
npm start
```

You will see a QR code plus several keys. Let the server finish starting before scanning.

Keystrokes while the server runs (in the terminal):

| Key | Action |
| --- | --- |
| `a` | Open on an Android device/emulator |
| `r` | Reload the app |
| `m` | Toggle the dev menu (Android) |
| `j` | Open developer tools |
| `shift+r` | Reload and clear the Metro cache |

## 4. Connect the phone and open the app

1. Put the Android phone and the laptop on the **same Wi-Fi network** (e.g. same router).
   If your Wi-Fi isolates clients ("AP isolation"), switching networks or using a hotspot
   will fix connection issues.
2. Install and open **Expo Go** on the phone (Play Store). Use the Expo Go release that
   supports **SDK 57**.
3. In Expo Go, tap **Scan QR code** (Android: use the in-app scanner, or the camera then
   "Open in Expo Go").
4. Point the camera at the QR code from the terminal.
5. Wait for "Bundling JavaScript" to finish, then the app opens at the splash/onboarding screen.

## 5. Verify SDK 57 / Expo Go compatibility

- `npx expo start` prints the **SDK version** and the expected Expo Go version at the bottom of
  the startup banner (e.g. `Expo Go 57.x.y`).
- Check Expo Go's installed version: Expo Go app → Settings/About → version.
- Ask npm for the Expo Go compatible client version if in doubt:

```bash
npm view expo-go dist-tags --json
```

If the installed Expo Go client is older than SDK 57, update Expo Go from the Play Store.
Expo Go always bundles exactly one SDK; if it cannot run SDK 57, the safe alternatives are:

- a **development build** (`npx eas-cli@latest build --profile development`), or
- an Android emulator on this machine with the matching SDK.

## 6. Common connection errors

| Symptom | Fix |
| --- | --- |
| QR scan says "could not connect" | Same Wi-Fi, disable AP isolation, check phone firewall |
| `exp://192.168.x.x:8081` unreachable | Allow port **8081**/TCP on the laptop firewall: `sudo ufw allow 8081` |
| Phone shows "Network response timed out" | Confirm the laptop IP (`hostname -I`) matches the URL; press `r` |
| Metro cache glitches | Clear cache and restart: `npx expo start -c` |
| Version mismatch banner | Update Expo Go, or use a dev build |

## 7. Alternative connection modes

- **Tunnel mode** (works when Wi-Fi blocks local connections):

  ```bash
  npx expo start --tunnel
  ```

  Requires `@expo/ngrok` (install on first run). Slower, but no LAN reachability needed.

- **Connection URI directly:** from Expo Go choose "Enter URL manually" and type
  `exp://<LAPTOP_IP>:8081`.

## 8. Clear the Metro cache and restart

```bash
cd ~/AI
npx expo start -c
```

`-c` clears the Metro cache; `--port 8081` forces the default port.

## 9. Typical launch command

```bash
cd ~/AI && npm start
```

For LAN mode explicitly, optionally:

```bash
cd ~/AI && npx expo start --lan
```