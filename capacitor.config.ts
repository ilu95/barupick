import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.co.barusa.barupick',
  appName: '바루픽',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  server: {
    iosScheme: 'capacitor'
  }
};

export default config;