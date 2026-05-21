import type { CapacitorConfig } from '@capacitor/cli'

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
      style: 'dark',
      backgroundColor: '#171614',
      overlaysWebView: false,
    },
  },
}

export default config
