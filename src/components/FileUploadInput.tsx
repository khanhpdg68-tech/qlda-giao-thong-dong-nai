'use client';

import React, { useState, useRef } from 'react';
import { Upload, Link2, CheckCircle2, Loader2, X } from 'lucide-react';

interface FileUploadInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholderDrive?: string;
}

export default function FileUploadInput({
  label,
  value,
  onChange,
  placeholderDrive = 'https://drive.google.com/file/d/...',
}: FileUploadInputProps) {
  const [mode, setMode] = useState<'upload' | 'drive'>(value.includes('drive.google.com') ? 'drive' : 'upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onChange(data.fileUrl);
      } else {
        alert(data.error || 'Lỗi khi tải tệp');
      }
    } catch (err: any) {
      alert('Không thể kết nối máy chủ để tải tệp');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex rounded-md shadow-sm border border-slate-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-1 font-medium transition-colors ${
              mode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tải tệp lên
          </button>
          <button
            type="button"
            onClick={() => setMode('drive')}
            className={`px-2.5 py-1 font-medium transition-colors ${
              mode === 'drive' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Link Drive
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-3 text-center transition-colors bg-slate-50/50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            id={`file-input-${label.replace(/\s+/g, '-')}`}
          />
          {value ? (
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-md border border-emerald-300">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-emerald-900 truncate">
                  {uploadedFileName || value.split('/').pop()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={`file-input-${label.replace(/\s+/g, '-')}`}
              className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span>Đang tải tệp lên máy chủ...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span>
                    Bấm để chọn tệp <strong className="text-indigo-600">PDF, Word, Excel</strong>
                  </span>
                </>
              )}
            </label>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Link2 className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholderDrive}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
