// web/src/pages/Verify.tsx
import React from 'react';
import { useParams } from 'react-router-dom';

export default function VerifyPage() {
  const { code } = useParams();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-serif text-amber-200">Certificate Verification</h1>
      <div className="rounded-lg border border-white/10 p-4 bg-black/30">
        <div className="text-sm text-amber-100/90">Verification Code:</div>
        <div className="font-mono text-amber-300">{code}</div>
        <div className="pt-3 text-sm text-amber-200/80">In Phase 1, this page displays mock verification info. In production, it will fetch from /api/verify/{code} and show COA metadata and hash timestamp.</div>
      </div>
    </div>
  );
}
