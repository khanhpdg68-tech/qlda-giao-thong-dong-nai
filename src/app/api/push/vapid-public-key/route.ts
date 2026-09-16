import { NextResponse } from 'next/server';

const FALLBACK_VAPID_PUBLIC_KEY =
  'BGq1NzmsGLTtXFenUIlSKBtyph2xyVabYBiSHDLfSnr6deM-_jUWF_84KTyGcFnCbs7cDbHqCBSVQcI2LE0gTas';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;
  return NextResponse.json({ publicKey });
}
