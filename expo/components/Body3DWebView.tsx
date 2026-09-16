import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { bodyViewerHtml } from '@/assets/images/body_viewer';

export interface UserBodyStats {
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiToWeightMorph(bmi: number): number {
  const MIN_BMI = 18;
  const MAX_BMI = 35;
  const clamped = Math.max(MIN_BMI, Math.min(MAX_BMI, bmi));
  return (clamped - MIN_BMI) / (MAX_BMI - MIN_BMI);
}

export function estimateMuscleMorph(stats: UserBodyStats): number {
  if (stats.bodyFatPercent == null) return 0.4;
  const fat = stats.bodyFatPercent;
  const inverted = 1 - Math.max(0, Math.min(1, (fat - 6) / 30));
  return inverted;
}

interface Body3DWebViewProps {
  stats: UserBodyStats;
  /** @deprecated modelUrl is no longer needed — procedural body is built-in */
  modelUrl?: string | number;
  width?: number | string;
  height?: number | string;
  onError?: (message: string) => void;
}

export const Body3DWebView: React.FC<Body3DWebViewProps> = ({
  stats,
  width = '100%',
  height = 420,
  onError,
}) => {
  const webviewRef = useRef<WebView>(null);

  const bmi = calculateBMI(stats.weightKg, stats.heightCm);
  const weight = bmiToWeightMorph(bmi);
  const muscle = estimateMuscleMorph(stats);

  const sendStats = useCallback(() => {
    webviewRef.current?.postMessage(JSON.stringify({ weight, muscle }));
  }, [weight, muscle]);

  // Re-send stats when they change
  useEffect(() => {
    sendStats();
  }, [sendStats]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready' || data.type === 'loaded') {
        sendStats();
      }
      if (data.type === 'error') {
        onError?.(data.message);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { width: width as any, height: height as any }]}>
      <WebView
        ref={webviewRef}
        source={{ html: bodyViewerHtml }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        onMessage={handleMessage}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default Body3DWebView;
