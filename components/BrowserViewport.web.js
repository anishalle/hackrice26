export default function BrowserViewport({ url, onError }) {
  return <iframe src={url} title="Axl live browser" onError={onError}
    allow="clipboard-read; clipboard-write" style={{ border: 0, width: '100%', height: '100%' }} />;
}
