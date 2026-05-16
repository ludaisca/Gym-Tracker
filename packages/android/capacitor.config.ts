import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ludaisca.gymtracker',
  appName: 'Gym Tracker',
  webDir: '../web/dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#171614',
    },
  },
}

export default config
