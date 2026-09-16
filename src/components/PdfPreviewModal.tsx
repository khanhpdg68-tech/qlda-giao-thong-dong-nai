'use client';

import React from 'react';
import Modal from './Modal';
import { ExternalLink, Download, FileText } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = 'Xem trước tài liệu',
}: PdfPreviewModalProps) {
  if (!fileUrl) return null;

  // Xử lý link Google Drive để nhúng preview
  let embedUrl = fileUrl;
  const isDrive = fileUrl.includes('drive.google.com');
  if (isDrive) {
    if (fileUrl.includes('/view')) {
      embedUrl = fileUrl.replace('/view', '/preview');
    } else if (fileUrl.includes('/edit')) {
      embedUrl = fileUrl.replace('/edit', '/preview');
    }
  }

  const isLocalPdf = fileUrl.endsWith('.pdf') || fileUrl.includes('/uploads/');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={fileName} maxWidth="4xl">
      <div className="flex flex-col h-[75vh]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="font-medium truncate max-w-md">{fileUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở trong tab mới
            </a>
            <a
              href={fileUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải xuống
            </a>
          </div>
        </div>

        {/* Khung nhúng tài liệu */}
        <div className="flex-1 w-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title="Trình xem tài liệu"
            allow="autoplay"
          />
        </div>
      </div>
    </Modal>
  );
}
