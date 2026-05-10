# Bentch

A React Native app for reading Birkat Hamazon with selectable nusach, occasion-based additions, adjustable text size, and saved on-device preferences.

## Author

Created by Moshe BenDavid.

## Company

AlenuMedia  
Website: https://alenumedia.com

## Development

Start Metro:

```sh
npm start
```

Run locally:

```sh
npm run android
npm run ios
```

Build locally:

```sh
npm run build:android:debug
npm run build:ios:simulator
```

## Notes

This project uses React Native CLI and does not use Expo. Birkat Hamazon text is stored locally in `src/data/birkatHamazon.json`.
