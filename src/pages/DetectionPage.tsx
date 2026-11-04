import { L3View } from '../layers/L3Detection';

export function DetectionPage() {
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Detection engine</h1><p className="mt-1 text-sm text-mute">Nine evidence families, each detector explained. Missing data stays UNKNOWN.</p></div>
      <L3View />
    </>
  );
}
