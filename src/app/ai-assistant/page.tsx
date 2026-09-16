'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Loader2,
  Key,
  CheckCircle2,
  Trash2,
  HelpCircle,
  ExternalLink,
  Smartphone,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: any;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-page-msg',
      role: 'assistant',
      content:
        'Xin kính chào Quý khách! Tôi là **Trợ lý AI - UBND Thành phố Đồng Nai - Ban QLDA ĐTXD Công trình Giao thông**.\n\nTôi sẵn sàng hỗ trợ Quý khách 24/7 bằng **Tin nhắn văn bản** hoặc **Nói trực tiếp qua Micro**:\n1. 📅 **Tự động lên Lịch làm việc cá nhân**: *"Sáng mai 8h30 anh họp giao ban UBND Thành phố"* $\\rightarrow$ Hệ thống tự động phân tích và tạo lịch chuẩn xác.\n2. 📊 **Tra cứu tiến độ & cảnh báo**: *"Có gói thầu nào sắp đóng thầu không?"*, *"Hôm nay anh có lịch gì?"*.\n3. 📲 **Đồng bộ cảnh báo về điện thoại**: Rung chuông cảnh báo đẩy khi có sự kiện khẩn cấp.\n\nQuý khách muốn bắt đầu việc gì ạ?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Micro giọng nói
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Cấu hình Gemini Key
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keySaveMsg, setKeySaveMsg] = useState<string | null>(null);

  // Test push notification
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Kiểm tra cấu hình Gemini API Key
  const fetchKeyStatus = async () => {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      setHasGeminiKey(data.hasKey);
      setMaskedKey(data.maskedKey || '');
    } catch {}
  };

  useEffect(() => {
    fetchKeyStatus();

    // Khởi tạo Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Trình duyệt của Quý khách không hỗ trợ micro nhận diện giọng nói. Quý khách vui lòng dùng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn(e);
      }
    }
  };

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

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setKeySaveMsg(null);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setKeySaveMsg('✓ Đã cập nhật khóa Google Gemini API thành công!');
        setApiKeyInput('');
        fetchKeyStatus();
      } else {
        setKeySaveMsg(data.error || 'Lỗi khi lưu khóa API');
      }
    } catch {
      setKeySaveMsg('Không thể kết nối máy chủ');
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Quý khách có chắc chắn muốn làm mới cuộc trò chuyện không?')) {
      setMessages([
        {
          id: 'welcome-reset-msg',
          role: 'assistant',
          content: 'Đã làm mới cuộc trò chuyện. Tôi có thể hỗ trợ Quý khách điều gì tiếp theo?',
        },
      ]);
    }
  };

  const handleTestPushNotification = async () => {
    setTestingPush(true);
    setPushStatusMsg(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      setPushStatusMsg(data.message || 'Đã gửi lệnh thông báo thử nghiệm');
    } catch {
      setPushStatusMsg('Không thể kết nối máy chủ gửi thông báo đẩy');
    } finally {
      setTestingPush(false);
    }
  };

  const sampleCommands = [
    'Hôm nay anh có lịch làm việc gì không?',
    'Sáng mai 9h anh họp giao ban Sở GTVT ở phòng họp số 2',
    'Chiều thứ 5 đi kiểm tra thảm bê tông nhựa gói 06',
    'Kiểm tra giúp anh có gói thầu nào sắp đóng thầu',
    'Hợp đồng nào cần làm phụ lục gia hạn trong 15 ngày tới?',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <BrandLogo size="lg" className="hidden sm:flex shrink-0 ring-2 ring-white/20" />
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/20 text-amber-300 rounded-lg text-[11px] font-extrabold border border-amber-400/30 tracking-wider uppercase">
                🏛️ UBND THÀNH PHỐ ĐỒNG NAI
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-[11px] font-bold border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Trợ Lý Trí Tuệ Nhân Tạo</span>
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase">
              BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Giao tiếp bằng tin nhắn hoặc giọng nói tiếng Việt để ghi lịch cá nhân, tra cứu số liệu và đồng bộ cảnh báo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl backdrop-blur-sm transition-colors border border-white/10"
          >
            <Calendar className="w-4 h-4" />
            <span>Xem Kế Hoạch Làm Việc</span>
          </Link>
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors"
            title="Làm mới cuộc trò chuyện"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Grid 2 Cột: Bên Trái là Khung Chat Toàn Diện, Bên Phải là Cài Đặt & Mẫu Câu Lệnh */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT CHÁT CHÍNH (8 CỘT) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Header nhỏ khung chat */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">Kênh Trò Chuyện Trực Tuyến</span>
              <span className="text-[11px] text-slate-400 font-medium ml-1">
                ({hasGeminiKey ? 'Google Gemini 1.5 Flash' : 'Bộ Xử Lý Thông Minh Nội Bộ'})
              </span>
            </div>
            {speechSupported && (
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                <Mic className="w-3 h-3 text-indigo-600" />
                <span>Hỗ trợ giọng nói Tiếng Việt</span>
              </span>
            )}
          </div>

          {/* Vùng Tin Nhắn */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40 scrollbar-thin text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-3xl shadow-sm leading-relaxed whitespace-pre-line text-xs ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 text-slate-500 text-xs py-2 italic">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Trợ lý AI đang xử lý câu nói của Quý khách...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Khung Nhập & Micro */}
          <div className="p-4 bg-white border-t border-slate-200">
            {isListening && (
              <div className="flex items-center justify-between text-xs text-rose-600 bg-rose-50 px-4 py-2 rounded-2xl border border-rose-200 mb-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-bold">Đang lắng nghe Quý khách nói tiếng Việt...</span>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
                >
                  Dừng nói
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Đang lắng nghe giọng nói...' : 'Nhập tin nhắn hoặc bấm Micro để nói bằng tiếng Việt...'}
                className="flex-1 px-4 py-3 text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
              />

              {/* Nút Micro */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
                title={isListening ? 'Bấm để dừng thu âm' : 'Bấm để nói tiếng Việt'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Nút Gửi */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors shadow-md shadow-indigo-600/30 disabled:opacity-40 font-bold text-xs flex items-center gap-2"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHỤ BÊN PHẢI (4 CỘT): CẤU HÌNH & GỢI Ý */}
        <div className="lg:col-span-4 space-y-5">
          {/* KHỐI 1: CẤU HÌNH GOOGLE GEMINI API */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Cấu Hình Google Gemini API</span>
              </h3>
            </div>

            <div className="text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                {hasGeminiKey ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã kết nối ({maskedKey})
                  </span>
                ) : (
                  <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Sử dụng NLP Nội bộ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Hệ thống tự động hoạt động ngay cả khi chưa có Key. Nếu Quý khách muốn AI đối thoại tự nhiên như người thật, hãy nhập khóa Gemini API bên dưới.
              </p>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-2">
              <input
                type="password"
                placeholder={hasGeminiKey ? 'Nhập khóa mới để thay thế...' : 'Dán mã Gemini API Key tại đây...'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
              />

              {keySaveMsg && (
                <p className="text-[11px] text-indigo-700 font-medium">{keySaveMsg}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <span>Lấy key miễn phí</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="submit"
                  disabled={savingKey}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingKey ? 'Đang lưu...' : 'Lưu Khóa'}
                </button>
              </div>
            </form>
          </div>

          {/* KHỐI 2: ĐỒNG BỘ CẢNH BÁO ĐIỆN THOẠI (WEB PUSH) */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-3xl p-5 shadow-sm space-y-3 border border-indigo-800">
            <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-indigo-200">
                <Smartphone className="w-4 h-4 text-purple-300" />
                <span>Cảnh Báo Đẩy Điện Thoại</span>
              </h3>
            </div>

            <p className="text-xs text-indigo-100 leading-relaxed">
              Kiểm tra tính năng phát thông báo rung chuông trực tiếp lên màn hình điện thoại hoặc máy tính của Quý khách.
            </p>

            {pushStatusMsg && (
              <div className="text-[11px] p-2 bg-white/10 rounded-xl border border-white/20 text-white">
                {pushStatusMsg}
              </div>
            )}

            <button
              type="button"
              disabled={testingPush}
              onClick={handleTestPushNotification}
              className="w-full py-2.5 px-3 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>Bắn Thử Thông Báo Ra Điện Thoại</span>
            </button>
          </div>

          {/* KHỐI 3: CÁC CÂU LỆNH MẪU HAY DÙNG */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gợi Ý Mẫu Câu Lệnh Cho AI</span>
            </h3>

            <div className="space-y-2">
              {sampleCommands.map((cmd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(cmd)}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 font-medium transition-colors"
                >
                  &ldquo;{cmd}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
