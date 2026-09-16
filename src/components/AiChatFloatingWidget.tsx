'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  Maximize2,
  Bot,
  User,
  Loader2,
  Calendar,
  AlertTriangle,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: any;
}

export default function AiChatFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Xin chào Quý khách! Tôi là **Trợ lý AI - UBND Thành phố Đồng Nai - Ban QLDA ĐTXD Công trình Giao thông**.\n\nQuý khách có thể **nhắn tin** hoặc **bấm Micro nói chuyện trực tiếp** để:\n• Ghi lại lịch làm việc, lịch họp, kiểm tra hiện trường.\n• Tra cứu gói thầu sắp đóng thầu, hợp đồng cần gia hạn.\n• Kiểm tra lịch công tác hôm nay.\n\nTôi có thể hỗ trợ Quý khách điều gì?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cuộn xuống cuối tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Khởi tạo Speech Recognition (Nhận diện giọng nói tiếng Việt)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN'; // Tiếng Việt chuẩn

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Bật/tắt Micro thu âm
  const toggleListening = () => {
    if (!speechSupported) {
      alert('Trình duyệt của Quý khách không hỗ trợ micro nhận diện giọng nói. Quý khách vui lòng dùng trình duyệt Chrome/Edge hoặc nhập tin nhắn bằng chữ.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Gửi tin nhắn tới AI
  const handleSend = async (textToSend?: string) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const assistantMsg: MessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          action: data.action,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Dạ xin lỗi Quý khách, kết nối tới máy chủ AI đang bị gián đoạn. Quý khách vui lòng thử lại sau giây lát.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Không thể kết nối máy chủ AI. Quý khách vui lòng kiểm tra kết nối mạng.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Các gợi ý câu lệnh nhanh
  const quickChips = [
    'Hôm nay có lịch gì không?',
    'Kiểm tra gói thầu sắp đóng',
    'Hợp đồng nào sắp hết hạn?',
    'Sáng mai 9h anh họp Sở GTVT',
  ];

  return (
    <div className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-50">
      {/* 1. NÚT TRÒN NỔI (KHI THU GỌN) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-full shadow-2xl shadow-indigo-600/50 transition-all hover:scale-105 active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
          </span>
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
          <span className="text-xs font-bold tracking-wide pr-1">Trợ Lý AI</span>
        </button>
      )}

      {/* 2. CỬA SỔ CHATBOX TOÀN DIỆN (KHI MỞ) */}
      {isOpen && (
        <div className="w-[calc(100vw-28px)] max-w-sm sm:w-[410px] h-[520px] max-h-[75vh] sm:max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-wide uppercase flex items-center gap-1.5">
                  <span>Trợ Lý AI Ban QLDA Giao Thông</span>
                </h3>
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sẵn sàng trò chuyện & nhận giọng nói</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/ai-assistant"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Mở toàn màn hình"
                onClick={() => setIsOpen(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vùng Tin Nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 scrollbar-thin text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl shadow-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-1 italic">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Trợ lý AI đang suy nghĩ và xử lý...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi Ý Nhanh (Chips) */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Khung Nhập & Micro */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            {isListening && (
              <div className="flex items-center justify-between text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 mb-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-bold">Đang lắng nghe Quý khách nói tiếng Việt...</span>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  className="text-[11px] font-bold text-rose-700 underline"
                >
                  Dừng
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Đang thu âm...' : 'Nhập tin nhắn hoặc bấm Micro để nói...'}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
              />

              {/* Nút Micro */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all shadow-sm ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isListening ? 'Bấm để dừng thu âm' : 'Bấm để nói tiếng Việt'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-600" />}
              </button>

              {/* Nút Gửi */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm disabled:opacity-40"
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
