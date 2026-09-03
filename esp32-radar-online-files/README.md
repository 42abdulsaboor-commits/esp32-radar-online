# ESP32 Radar Online

This is the first online-dashboard version for the ESP32 ultrasonic radar.

## Files

- `index.html` - dashboard page
- `style.css` - radar dashboard styling
- `app.js` - Firebase Realtime Database + browser controls
- `firebase-messaging-sw.js` - background push notification service worker

## Important

This version does NOT contain Wi-Fi passwords or Firebase private credentials.

Before deployment, put your Firebase Web App configuration in `app.js` and
`firebase-messaging-sw.js`.

The ESP32 will later be modified to:

1. Connect to the home Wi-Fi.
2. Send radar readings to `radar/latest`.
3. Read commands from `radar/command`.
4. Call the secure notification backend when an object is detected.

Do not put a Firebase service-account private key in this GitHub repository.
