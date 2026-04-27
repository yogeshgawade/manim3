# Animation Track Migration Plan

## Goal

Migrate all animation tracks to the clarified lifecycle:

1. `prepare()`
   Reset transient state and helper resources for a fresh evaluation pass.
   Do not capture live start state here.
2. `captureStartState()`
   Read the live state the track should animate from at its resolved `startTime`.
3. `interpolate(alpha)`
   Apply animation using only captured state and static track configuration.

This makes playback and direct scrubbing use the same evaluation model.

## Migration Rules

- Keep `prepare()` idempotent.
- Move all first-call lazy reads out of `interpolate()` into `captureStartState()`.
- `interpolate()` should not branch on "have I captured yet?".
- Composite tracks should forward `prepare()` and `captureStartState()` to child tracks.
- Tracks that create helper objects must reset them in `prepare()` and only read live scene state in `captureStartState()`.
- If a track mutates scene topology, document whether that is intentional or whether it should later become a separate scheduler-managed artifact flow.

## Already Migrated

- `src/animation/MoveTrack.ts`
- `src/animation/FadeTrack.ts`
- `src/animation/MorphTrack.ts`
- `src/animation/CrossFadeTrack.ts`
- `src/animation/VGroupMorphTrack.ts`
- `src/animation/GroupTrack.ts`
- `src/animation/FadeGroupTrack.ts`
- `src/animation/CreateGroupTrack.ts`
- `src/animation/AnimationTrack.ts`
- `src/scheduler/Scheduler.ts`

## Remaining Tracks

### Phase 1: Tracks Likely Using Live Start-State Semantics

These should be migrated first because they are the most likely to depend on current object state at animation start.

- `src/animation/ValueTrack.ts`
  `prepare()` comment already says start value is captured on first `interpolate()`.
- `src/animation/GrowTrack.ts`
  Review all variants in this file for deferred reads of source transform or opacity.
- `src/animation/MoveAlongPathTrack.ts`
  Confirm whether path progress uses any live start transform.
- `src/animation/ScaleTrack.ts`
  Check whether start scale is captured in constructor or on use.
- `src/animation/RotateTrack.ts`
  Check whether start rotation is captured too early or too late.
- `src/animation/ColorTrack.ts`
  Check whether current color is captured at construction or during playback.

### Phase 2: Tracks With Internal Helper Geometry or Cached Originals

These may already be close, but they should be audited for hidden state capture or reset gaps.

- `src/animation/CreateTrack.ts`
- `src/animation/ApplyWaveTrack.ts`
- `src/animation/CircumscribeTrack.ts`
- `src/animation/FlashTrack.ts`
- `src/animation/FocusOnTrack.ts`
- `src/animation/GrowArrowTrack.ts`
- `src/animation/IndicateTrack.ts`
- `src/animation/PulseTrack.ts`
- `src/animation/ShowPassingFlashTrack.ts`
- `src/animation/ShrinkTrack.ts`
- `src/animation/SpinInTrack.ts`
- `src/animation/SpiralInTrack.ts`
- `src/animation/StreamLinesTrack.ts`
- `src/animation/TaperedFlashTrack.ts`
- `src/animation/WiggleOutThenInTrack.ts`
- `src/animation/WiggleTrack.ts`
- `src/animation/BlinkTrack.ts`

### Phase 3: Composite and Factory Consistency Pass

After individual tracks are migrated, do a consistency pass on:

- exported factory functions
- inline track objects created inside composite tracks
- remover track behavior after seek and replay
- `reset()` methods that may now be redundant or incomplete

## Per-Track Migration Checklist

For each remaining track:

1. Inspect constructor fields.
   Move any start-state capture out of constructor if it depends on runtime state.
2. Inspect `prepare()`.
   Leave only reset/setup/cache cleanup there.
3. Inspect `interpolate(alpha)`.
   Remove first-call capture logic.
4. Add `captureStartState()` when the track depends on live runtime state.
5. Verify seek behavior.
   Jump directly to:
   - before track start
   - mid-track
   - after track end
6. Verify replay behavior.
   Play, reset, seek, and replay the same track twice.

## Expected Patterns

### Pattern A: Simple property interpolation

Applies to tracks like move, fade, rotate, scale, color.

- `prepare()`: clear capture flags if needed
- `captureStartState()`: snapshot current property
- `interpolate(alpha)`: lerp from captured property to target property

### Pattern B: Geometry deformation with helper resources

Applies to tracks like morph and wave-based effects.

- `prepare()`: dispose old helper resources and clear caches
- `captureStartState()`: snapshot live geometry and transforms
- `interpolate(alpha)`: render from captured geometry only

### Pattern C: Composite track

Applies to group-style tracks.

- `prepare()`: build/rebuild child tracks if needed, then call child `prepare()`
- `captureStartState()`: forward to children
- `interpolate(alpha)`: only compute child alpha and delegate

## Specific Risks To Watch

- Tracks that still mutate helper state inside `interpolate()` in a way that depends on call order.
- Tracks whose `prepare()` currently runs only once and therefore skip reset on seek.
- Inline child tracks inside composites that satisfy runtime behavior but not the full interface contract.
- Tracks that permanently add helper mobjects or clones and therefore leak topology across repeated seeks.

## Suggested Work Order

1. Migrate `ValueTrack.ts`
2. Migrate `GrowTrack.ts`
3. Audit `ScaleTrack.ts`, `RotateTrack.ts`, `ColorTrack.ts`, `MoveAlongPathTrack.ts`
4. Audit helper-geometry tracks
5. Remove or simplify obsolete `reset()` methods
6. Add focused tests for direct scrub-to-middle reconstruction

## Definition of Done

The migration is complete when:

- no track relies on first-call lazy capture inside `interpolate()`
- `prepare()` is setup/reset only
- direct seek to any time reconstructs the same visual state as forward playback
- composite tracks forward lifecycle hooks consistently
- remaining `reset()` methods are either justified or removed
