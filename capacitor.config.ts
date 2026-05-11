import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'mx.copo.pos',
  appName: 'Copo POS',
  webDir: 'dist',
  // In production Capacitor serves files via its own local server (no file:// issues)
  server: {
    androidScheme: 'https',
    // iosScheme defaults to 'capacitor' — works with HashRouter
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#F7F9FC',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Default',      // auto light/dark based on app theme
      backgroundColor: '#F7F9FC',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
