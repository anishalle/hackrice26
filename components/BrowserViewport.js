import { WebView } from 'react-native-webview';
export default function BrowserViewport({ url, onError }) {
  return <WebView source={{ uri: url }} style={{ flex: 1 }}
    onError={onError} onHttpError={onError} startInLoadingState
    contentMode="mobile" allowsFullscreenVideo mediaPlaybackRequiresUserAction={false}
    allowsInlineMediaPlayback setSupportMultipleWindows={false} />;
}
