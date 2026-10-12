# Recomp Mobile

A local-first workout journal for iPhone, built with Expo and React Native. No account required.

## Opening ritual

Each cold launch begins on near-black with an original Recomp quote, then fades through **RECOMP / THE WORK CONTINUES.** into The Record. Nine bundled quotes alternate responsibility, mortality, and stoicism and cycle before repeating. The approximately six-second sequence uses system fonts, native opacity animations, and faint static hairlines; it needs no images, downloads, or account. Tap anywhere at any point to enter immediately. Android's back button also skips.

The journal stays mounted underneath the overlay. Backgrounding during the introduction dismisses it; resuming the app never starts it again or resets a workout. Reduce Motion uses static transitions. The entire intro is an accessible skip button, with the quote in its label and the underlying journal hidden from accessibility until dismissal.

Quote selection is cached once per JavaScript runtime and the next-quote cursor lives in `expo-sqlite/kv-store`'s separate database. Skipped launches also advance the cycle. Failed preference access falls back gracefully; an unresponsive preference or accessibility API falls back after 800 ms. `recomp.db`, its schema, and workout operations are unchanged.

Completed workouts remain saved locally. As before, an **unsaved** active workout lives in memory: background/resume preserves it, but force-quitting the process loses it. This change does not add draft recovery.

## The Record

The dashboard uses serif headings, thin rules, warm gold accents, and an open journal layout. Sessions Recorded counts saved sessions; Training Days counts distinct local calendar days with a saved session, not a streak. Last Recorded shows the most recent saved workout and opens The Archive. Empty and in-progress states have their own copy.

Returning to The Record during a workout offers Continue Training and preserves the current name, exercises, and sets. The opening sequence and SQLite schema are unchanged.

## Run on an iPhone Simulator

Use Node 20.19.4 or newer, Xcode, and an installed iOS Simulator runtime.

```sh
npm ci
npm run ios
```

Run from your existing checkout after `git pull --ff-only`. Expo Go must support SDK 54; Expo CLI can install the matching simulator version. Keep the same installed app and project when checking old archive entries. Do not uninstall the app or erase the simulator, which removes its local data.

For a standalone native build and the actual native launch-screen appearance:

```sh
npx expo run:ios --configuration Release
```

This requires Xcode/CocoaPods, generates native project files, and builds the app. Its data sandbox is separate from Expo Go. Expo Go may display its own native launch screen before the Recomp JavaScript introduction. The near-black native background in `app.json` takes effect in rebuilt native apps.

## Simulator acceptance checklist

1. With no unsaved workout, terminate the app in the app switcher and reopen it. Watch the quote fade in, give way to the wordmark, and reveal The Record. Repeat to confirm the quote changes. After nine selections, the collection repeats.
2. Repeat a launch and tap during darkness, the quote, and the wordmark. Each should immediately reveal the journal without a later flash or replay. Confirm one tap does not also activate Begin Training underneath.
3. Start a workout, add strength and cardio values, background the app, and return. The same session and values should remain; no intro should appear. Also background midway through the intro and confirm it stays dismissed on return.
4. Save a completed workout. Relaunch and verify its sets in The Archive, along with any sessions recorded before this update. Check Use Previous Values with a matching exercise.
5. Enable **Settings → Accessibility → Motion → Reduce Motion**, then cold-launch again. Quotes and branding should transition without fading. Check VoiceOver skip access and large text on a smaller iPhone.
6. In a Release build, disable networking and repeat launch, quote rotation, and workout save/archive checks. Development Expo Go still needs access to Metro to load the JavaScript bundle.

Fast Refresh preserves development state; a full JavaScript reload acts like a cold launch. Use process termination/reopening in a Release build for the definitive cold-launch versus resume check.

## Automated validation

```sh
npm run typecheck
npm test
npx expo install --check
npx expo export --platform ios --platform android
```

Tests cover persistent rotation, invalid/unavailable preferences, skip during loading and both text phases, normal completion, Reduce Motion, background/resume, remount behavior, and the existing workout-save path. Native modules are mocked in tests; the simulator checklist is still needed for visual timing, native accessibility, and actual on-device SQLite persistence.
