import { L5View } from '../layers/L5AnalystReview';

export function AnalystPage() {
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Analyst workbench</h1><p className="mt-1 text-sm text-mute">Compare the legitimate chain with the potential front chain, inspect source records and record your review.</p></div>
      <L5View />
    </>
  );
}
