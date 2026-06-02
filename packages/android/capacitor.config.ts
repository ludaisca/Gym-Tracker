import type { CapacitorConfig } from '@capacitor/cli'

const liveReloadIp = process.env.LIVE_RELOAD_IP

const config: CapacitorConfig = {
  appId: 'com.ludaisca.gymtracker',
  appName: 'Gym Tracker',
  webDir: '../web/dist',
  android: {
    backgroundColor: '#171614',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#171614',
    },
    StatusBar: {
      style: 'dark',      // dark = light/white icons; default theme is dark
      overlaysWebView: true,
    },
  },
  // Live reload: apunta el WebView al Vite dev server en lugar de los assets bundleados.
  // Activar con: LIVE_RELOAD_IP=<ip> npx cap sync android
  ...(liveReloadIp && {
    server: {
      url: `http://${liveReloadIp}:5173`,
      cleartext: true,
    },
  }),
}

export default config
