import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinflow.app',
  appName: 'Kinflow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#10b981',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#10b981',
    },
  },
};

export default config;
