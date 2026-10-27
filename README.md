# Cinemana plugin for Nuvio

This branch adds an Android local HTTP service intended for Android TV / Android 9 devices and routes the Nuvio provider through it.

## Local service (initial test build)

- Binds to `127.0.0.1:7001` only (not exposed to other devices on the LAN).
- Health check: `http://127.0.0.1:7001/health`
- Proxies Cinemana Android API GET requests under `/api/android/`.
- Starts after boot through a boot receiver. Start the service once after installing the APK before relying on boot auto-start.
- Uses a low-importance ongoing foreground notification to keep the service alive. A truly hidden, notification-free Android 9 service cannot be guaranteed to stay running.

## Build

GitHub Actions builds a debug APK and publishes it as an artifact named `cinemana-local-service-debug`. Download it from the Actions run's Artifacts section.

## Important

This is a first integration build, not yet a verified playback release. Test the service health endpoint on the CBOX, then test one movie and one TV episode in Nuvio. The Nuvio provider uses `127.0.0.1:7001`, so it must run on the same Android device as the service.
