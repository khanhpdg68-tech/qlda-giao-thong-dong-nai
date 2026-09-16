'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AlertsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/schedule');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-xs text-slate-500 mt-3 font-medium">
        Đang chuyển hướng sang Kế Hoạch Làm Việc...
      </p>
    </div>
  );
}
