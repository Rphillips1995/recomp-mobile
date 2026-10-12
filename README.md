# Recomp Mobile

A local-first workout journal for iPhone, built with Expo and React Native. No account required.

## Opening ritual

Each cold launch begins on near-black with an original Recomp quote, then fades through **RECOMP / THE WORK CONTINUES.** into The Record. Nine bundled quotes alternate responsibility, mortality, and stoicism and cycle before repeating. The approximately six-second sequence uses system fonts, native opacity animations, and faint static hairlines; it needs no images, downloads, or account. Tap anywhere at any point to enter immediately. Android's back button also skips.

The journal stays mounted underneath the overlay. Backgrounding during the introduction dismisses it; resuming the app never starts it again or resets a workout. Reduce Motion uses static transitions. The entire intro is an accessible skip button, with the quote in its label and the underlying journal hidden from accessibility until dismissal.

Quote selection is cached once per JavaScript runtime and the next-quote cursor lives in `expo-sqlite/kv-store`'s separate database. Skipped launches also advance the cycle. Failed preference access falls back gracefully; an unresponsive preference or accessibility API falls back after 800 ms. `recomp.db` and its schema are preserved.

Completed workouts remain saved locally. As before, an **unsaved** active workout lives in memory: background/resume preserves it, but force-quitting the process loses it. This change does not add draft recovery.

## The Record

The dashboard uses serif headings, thin rules, warm gold accents, and an open journal layout. Sessions Recorded counts saved sessions; Training Days counts distinct local calendar days with a saved session, not a streak. Last Recorded shows the most recent saved workout and opens The Archive. Empty and in-progress states have their own copy.

Returning to The Record during a workout offers Continue Training and preserves the current name, exercises, and sets. The opening sequence and SQLite schema are unchanged.

## Editing, sets, and personal records

The Archive starts with compact, tappable workout entries. Tap a workout to expand or collapse its sets and actions. Gold **\*\*\*** beside its date means it holds at least one current personal best; the stars are a marker, not a count. Expanding reveals the full gold record descriptions.

From an expanded workout in The Archive, choose **Edit Session** to change the session name, exercise names, or logged values, add exercises/sets, or remove individual sets and cardio intervals. **Save Changes** updates the original session without changing its ID or date. **Cancel Editing** leaves the saved session untouched and confirms before discarding changes. An archive edit is separate from any active training session; switching tabs keeps both drafts in memory.

The × beside each row removes that set or interval from the draft. **Undo Remove** restores the most recently removed row while the editor stays open. Saved rows change only when you save. Removing every completed row cannot silently erase a saved session: at least one completed entry is required, or you can cancel and use Delete Session instead.

Saving ignores wholly blank rows and exercises left without completed rows. Partially filled or invalid rows need correction. Strength accepts nonnegative pounds and positive whole reps; cardio requires positive minutes, with nonnegative miles optional. Decimal commas are supported. Failed saves keep the draft available for retry, and repeated taps cannot submit concurrent saves.

Personal records are calculated offline from saved history, comparing exercise names without case or extra whitespace, with strength and cardio kept separate:

- **Strength:** heaviest completed set and most reps at the same weight.
- **Cardio:** longest individual interval by duration and distance. These are not speed or pace records.
- A first result establishes a baseline. A later result must exceed it to trigger **PR if saved** in the logger and a PR message after a successful save. Ties do not trigger PRs, and unchanged edits do not reannounce them.
- **Personal Best** in The Archive identifies the set currently holding each record. On ties, the earliest session/set holds the badge. Corrections, set removal, exercise renaming, and session deletion automatically recalculate badges from the remaining saved data.

No record table, account, or network access is needed. Active sessions and unsaved edit drafts survive ordinary background/resume but remain in memory; force-quitting loses unsaved changes.

### Logger checks on a simulator

1. Edit a saved session, change a value, save, then relaunch and verify the correction and original date. Session count should not increase.
2. Edit again, change a value, and cancel/discard the draft. Verify the saved value stays unchanged.
3. Remove a strength set and a cardio interval; check Undo Remove, then save a deliberate correction and verify only the chosen rows changed.
4. Begin a new session, visit The Archive and edit a different saved session, then return to Train. The active session should remain intact.
5. Log a higher weight, more reps at an already logged weight, or a longer cardio interval. Check the PR preview, success message, and archive badge. An equal result should not earn another PR.
6. Correct a record downward or delete its session. Verify the next-best remaining set receives the badge. Empty and invalid drafts should be blocked from saving.

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

Tests cover the opening sequence, dashboard, saved-session edits and cancellation, set removal/undo, failed and duplicate saves, separate active/edit drafts, validation, and record baselines, ties, improvements, corrections, and deletions. Native modules are mocked in tests; the simulator checklist is still needed for visual timing, native accessibility, and actual on-device SQLite persistence.
