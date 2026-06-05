# FFmpeg Kit React Native — Historical Setup Notes

> **⚠️ STATUS: NOT IN USE**
>
> Video capture and upload is **not enabled** in the current build of Yoinks.
> The `ffmpeg-kit-react-native` library is excluded from Android autolinking.
> The iOS podspec, config plugin, and `android-libs/` folder described below
> **are not present** in this repository.
>
> Video posting is gated by `EXPO_PUBLIC_VIDEO_ENABLED=false` in `.env`.
> Do not set this to `true` until the full native pipeline is rebuilt and tested.
>
> The notes below are kept for historical reference — they describe the approach
> that was previously explored before the Arthenica binary outage.

---

## Background

The official `ffmpeg-kit-react-native` library relied on native binaries hosted on CocoaPods (iOS) and Maven Central (Android). On April 1, 2025, Arthenica deleted these packages, causing standard `npm install` and `pod install` to fail.

A workaround was investigated using:
- A custom iOS `.podspec` pointing to a community backup `.zip`
- An Expo Config Plugin (`with-ffmpeg-pod.js`) to inject the podspec into the `Podfile`
- Local `android-libs/` binaries configured as a Maven local repository via `patch-package`

**None of these files are in the current repository.**

---

## Re-enabling Video (Future Work)

To re-enable video posting you will need to:

1. Source a working build of `ffmpeg-kit-react-native` (or an alternative like `react-native-ffmpeg-kit`).
2. Rebuild the native Android/iOS pipeline with the library properly linked.
3. Verify the upload queue in `src/services/momentUploadQueue.ts` handles video correctly.
4. Set `EXPO_PUBLIC_VIDEO_ENABLED=true` in `.env` (and in the relevant EAS build profile).
5. Test full capture → crop → upload → feed display flow on both platforms.

Until these steps are completed, leave `EXPO_PUBLIC_VIDEO_ENABLED=false`.
