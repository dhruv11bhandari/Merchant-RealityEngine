import { L7View } from '../layers/L7AuditLearning';

export function AuditPage() {
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Audit and learning</h1><p className="mt-1 text-sm text-mute">Labels, performance indicators and the feedback loop into detectors and profiles.</p></div>
      <L7View />
    </>
  );
}
