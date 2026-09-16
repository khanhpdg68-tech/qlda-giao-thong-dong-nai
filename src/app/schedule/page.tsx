'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Send,
  Smartphone,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  BellRing,
  ExternalLink,
  Loader2,
  Sparkles,
  FileText,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import Modal from '@/components/Modal';
import Link from 'next/link';
import { formatDateVN, formatDateTimeVN, formatCurrencyVN } from '@/lib/formatters';

interface WorkPlanItem {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  category: string; // MEETING, INSPECTION, URGENT, REMINDER, BUSINESS_TRIP, OTHER
  location: string | null;
  notes: string | null;
  isCompleted: boolean;
  priority: string; // URGENT, IMPORTANT, NORMAL
  createdAt: string;
}

interface SystemAlertSummary {
  urgentBidding: Array<{
    id: string;
    packageName: string;
    bidCloseTime: string;
    projectCode: string;
    hoursLeftText: string;
  }>;
  urgentContracts: Array<{
    id: string;
    packageName: string;
    contractorName: string;
    currentEndDate: string;
    remainingDays: number;
  }>;
}

const CATEGORIES: Record<string, { label: string; badgeClass: string; dotColor: string }> = {
  MEETING: { label: 'Họp / Giao ban', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-600' },
  INSPECTION: { label: 'Kiểm tra hiện trường', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', dotColor: 'bg-amber-600' },
  URGENT: { label: 'Việc khẩn cấp', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200', dotColor: 'bg-rose-600' },
  REMINDER: { label: 'Nhắc nhở cá nhân', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-600' },
  BUSINESS_TRIP: { label: 'Công tác', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', dotColor: 'bg-purple-600' },
  OTHER: { label: 'Công việc khác', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200', dotColor: 'bg-slate-500' },
};

export default function SchedulePage() {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  const [workPlans, setWorkPlans] = useState<WorkPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterCompleted, setFilterCompleted] = useState<string>('ALL'); // ALL, PENDING, COMPLETED
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkPlanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: today.toISOString().slice(0, 10),
    startTime: '08:30',
    endTime: '11:00',
    isAllDay: false,
    category: 'MEETING',
    location: '',
    notes: '',
    priority: 'NORMAL',
  });

  // Cảnh báo hệ thống & Thông báo đẩy Điện thoại state
  const [systemAlerts, setSystemAlerts] = useState<SystemAlertSummary>({ urgentBidding: [], urgentContracts: [] });
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Tải danh sách kế hoạch làm việc
  const fetchWorkPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-plans?year=${currentYear}&month=${currentMonth}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkPlans(data.data || []);
      }
    } catch (e) {
      console.error('Lỗi tải kế hoạch làm việc:', e);
    } finally {
      setLoading(false);
    }
  };

  // Tải các mốc cảnh báo hệ thống
  const fetchSystemAlerts = async () => {
    try {
      const [bidRes, ctrRes] = await Promise.all([
        fetch('/api/bidding'),
        fetch('/api/contracts'),
      ]);
      const bidData = await bidRes.json();
      const ctrData = await ctrRes.json();

      const now = new Date();
      const urgentBidding: any[] = [];
      if (bidData.success && Array.isArray(bidData.data)) {
        bidData.data.forEach((p: any) => {
          if (p.status === 'PUBLISHED' && p.bidCloseTime) {
            const closeTime = new Date(p.bidCloseTime);
            const hoursLeft = (closeTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursLeft > 0 && hoursLeft <= 24) {
              urgentBidding.push({
                id: p.id,
                packageName: p.packageName,
                bidCloseTime: p.bidCloseTime,
                projectCode: p.project?.projectCode || '',
                hoursLeftText: hoursLeft <= 6 ? `Còn ${Math.ceil(hoursLeft)} giờ đóng thầu` : `Đóng thầu ${formatDateVN(p.bidCloseTime)}`,
              });
            }
          }
        });
      }

      const urgentContracts: any[] = [];
      if (ctrData.success && Array.isArray(ctrData.data)) {
        ctrData.data.forEach((c: any) => {
          if (c.status !== 'LIQUIDATED' && c.remainingDays !== undefined && c.remainingDays <= 15) {
            urgentContracts.push({
              id: c.id,
              packageName: c.package?.packageName || c.packageName || 'Hợp đồng',
              contractorName: c.contractorName,
              currentEndDate: c.currentEndDate,
              remainingDays: c.remainingDays,
            });
          }
        });
      }

      setSystemAlerts({ urgentBidding, urgentContracts });
    } catch (e) {
      console.error('Lỗi tải cảnh báo hệ thống:', e);
    }
  };

  useEffect(() => {
    fetchWorkPlans();
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchSystemAlerts();
  }, []);

  // Điều khiển tháng
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Mở modal thêm mới
  const handleOpenCreateModal = (prefilledDate?: string) => {
    setEditingItem(null);
    setFormData({
      title: '',
      date: prefilledDate || today.toISOString().slice(0, 10),
      startTime: '08:30',
      endTime: '11:00',
      isAllDay: false,
      category: 'MEETING',
      location: '',
      notes: '',
      priority: 'NORMAL',
    });
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (item: WorkPlanItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      date: item.date.slice(0, 10),
      startTime: item.startTime || '08:30',
      endTime: item.endTime || '11:00',
      isAllDay: item.isAllDay,
      category: item.category,
      location: item.location || '',
      notes: item.notes || '',
      priority: item.priority,
    });
    setIsModalOpen(true);
  };

  // Submit form thêm/sửa
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập Tiêu đề công việc');
      return;
    }
    setSubmitting(true);
    try {
      const url = editingItem ? `/api/work-plans/${editingItem.id}` : '/api/work-plans';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        fetchWorkPlans();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Chuyển đổi trạng thái hoàn thành nhanh
  const handleToggleComplete = async (item: WorkPlanItem) => {
    try {
      const newStatus = !item.isCompleted;
      setWorkPlans((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isCompleted: newStatus } : p))
      );
      await fetch(`/api/work-plans/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newStatus }),
      });
    } catch {
      fetchWorkPlans();
    }
  };

  // Xóa lịch làm việc
  const handleDelete = async (id: string) => {
    if (!confirm('Quý khách có chắc chắn muốn xóa lịch làm việc này không?')) return;
    try {
      const res = await fetch(`/api/work-plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkPlans((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('Lỗi khi xóa lịch làm việc');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    }
  };

  // Phát thử thông báo đẩy về điện thoại
  const handleSendTestPush = async () => {
    setTestingPush(true);
    setPushStatusMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPushStatusMessage({
          text: `✓ ${data.message || 'Đã phát cảnh báo đẩy thành công! Điện thoại của Quý khách sẽ rung chuông ngay bây giờ.'}`,
          success: true,
        });
      } else {
        setPushStatusMessage({
          text: data.message || data.error || 'Chưa có thiết bị nào kích hoạt nhận thông báo. Quý khách vui lòng bấm "Bật Thông Báo Ngay" trên điện thoại.',
          success: false,
        });
      }
    } catch {
      setPushStatusMessage({
        text: 'Không thể kết nối máy chủ thông báo',
        success: false,
      });
    } finally {
      setTestingPush(false);
    }
  };

  // Lọc danh sách theo các điều kiện
  const filteredPlans = useMemo(() => {
    return workPlans.filter((p) => {
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
      if (filterCompleted === 'PENDING' && p.isCompleted) return false;
      if (filterCompleted === 'COMPLETED' && !p.isCompleted) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchLocation = p.location?.toLowerCase().includes(query) || false;
        const matchNotes = p.notes?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchLocation && !matchNotes) return false;
      }
      return true;
    });
  }, [workPlans, filterCategory, filterCompleted, search]);

  // Xây dựng các ngày trong tháng cho Calendar Grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);

    // Thứ trong tuần của ngày 1 (0: CN, 1: T2, ..., 6: T7) -> chuẩn hóa Thứ 2 là ngày đầu tuần (0..6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: WorkPlanItem[];
    }> = [];

    // Ngày của tháng trước để lấp đầy tuần đầu
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    // Các ngày của tháng hiện tại
    const todayStr = today.toISOString().slice(0, 10);
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayItems = filteredPlans.filter((p) => p.date.slice(0, 10) === dateStr);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        items: dayItems,
      });
    }

    // Các ngày của tháng sau để lấp đầy tuần cuối (tổng số ô là bội số của 7)
    const remainingDays = 42 - days.length; // 6 hàng x 7 ngày = 42 ô
    if (remainingDays < 7) {
      for (let d = 1; d <= remainingDays; d++) {
        const m = currentMonth === 12 ? 1 : currentMonth + 1;
        const y = currentMonth === 12 ? currentYear + 1 : currentYear;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          dateStr,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: false,
          items: [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredPlans, today]);

  // Nhóm danh sách việc theo ngày (cho To-Do List View)
  const groupedListPlans = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const groups: {
      todayItems: WorkPlanItem[];
      tomorrowItems: WorkPlanItem[];
      upcomingItems: WorkPlanItem[];
      pastItems: WorkPlanItem[];
    } = {
      todayItems: [],
      tomorrowItems: [],
      upcomingItems: [],
      pastItems: [],
    };

    filteredPlans.forEach((p) => {
      const d = p.date.slice(0, 10);
      if (d === todayStr) groups.todayItems.push(p);
      else if (d === tomorrowStr) groups.tomorrowItems.push(p);
      else if (d > tomorrowStr) groups.upcomingItems.push(p);
      else groups.pastItems.push(p);
    });

    return groups;
  }, [filteredPlans, today]);

  // Render một dòng công việc trong List View
  const renderListItem = (item: WorkPlanItem) => {
    const cat = CATEGORIES[item.category] || CATEGORIES.OTHER;
    return (
      <div
        key={item.id}
        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
          item.isCompleted
            ? 'bg-slate-50/80 border-slate-200 opacity-60'
            : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox hoàn thành */}
          <button
            type="button"
            onClick={() => handleToggleComplete(item)}
            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
          >
            {item.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cat.badgeClass}`}>
                {cat.label}
              </span>
              {item.priority === 'URGENT' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                  Khẩn cấp
                </span>
              )}
              {item.priority === 'IMPORTANT' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                  Quan trọng
                </span>
              )}
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                {item.isAllDay ? 'Cả ngày' : `${item.startTime || ''} ${item.endTime ? `- ${item.endTime}` : ''}`}
              </span>
              <span className="text-xs text-slate-400">
                ({formatDateVN(item.date)})
              </span>
            </div>

            <h4
              className={`text-sm font-bold text-slate-900 ${
                item.isCompleted ? 'line-through text-slate-400' : ''
              }`}
            >
              {item.title}
            </h4>

            {item.location && (
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{item.location}</span>
              </p>
            )}

            {item.notes && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                {item.notes}
              </p>
            )}
          </div>
        </div>

        {/* Thao tác Sửa / Xóa */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenEditModal(item)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Xóa lịch này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. THANH TIÊU ĐỀ & ĐIỀU KHIỂN CHÍNH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
              UBND THÀNH PHỐ ĐỒNG NAI
            </span>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
              BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              Kế Hoạch Làm Việc Cá Nhân
            </h1>
          </div>
          <p className="text-xs text-slate-500 ml-11">
            Ghi chú lịch công tác, lịch họp và danh sách các việc cần thực hiện theo ngày/tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút chuyển chế độ xem */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CALENDAR'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Lịch Biểu</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Danh Sách Việc</span>
            </button>
          </div>

          {/* Nút thêm mới */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Lịch Mới</span>
          </button>
        </div>
      </div>

      {/* 2. THANH CHỌN THỜI GIAN & BỘ LỌC */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Bộ điều hướng tháng */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-sm text-slate-800 px-3 py-1 min-w-[150px] text-center">
              Tháng {currentMonth} / {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
          >
            Hôm Nay
          </button>
        </div>

        {/* Bộ lọc loại việc & Tìm kiếm */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="ALL">Tất cả loại việc</option>
            {Object.entries(CATEGORIES).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={filterCompleted}
            onChange={(e) => setFilterCompleted(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chưa hoàn thành</option>
            <option value="COMPLETED">Đã hoàn thành</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm lịch..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC NỘI DUNG CHÍNH (LƯỚI LỊCH + CỘT CẢNH BÁO THAY THẾ TRUNG TÂM CẢNH BÁO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT CHÍNH (8 CỘT HOẶC 9 CỘT): LỊCH BIỂU HOẶC TO-DO LIST */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải lịch làm việc...</p>
            </div>
          ) : viewMode === 'CALENDAR' ? (
            /* ===== CHẾ ĐỘ LỊCH BIỂU (CALENDAR VIEW) ===== */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Thứ trong tuần */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-700 py-2.5 uppercase tracking-wider">
                <div>Thứ 2</div>
                <div>Thứ 3</div>
                <div>Thứ 4</div>
                <div>Thứ 5</div>
                <div>Thứ 6</div>
                <div className="text-indigo-600">Thứ 7</div>
                <div className="text-rose-600">Chủ Nhật</div>
              </div>

              {/* Lưới các ô ngày */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
                {calendarDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[115px] p-2 bg-white flex flex-col justify-between transition-all group relative ${
                      !day.isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'text-slate-800'
                    } ${day.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : ''}`}
                  >
                    {/* Header của ô ngày */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          day.isToday
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isCurrentMonth && (
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(day.dateStr)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                          title="Thêm lịch cho ngày này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Danh sách các công việc trong ngày */}
                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                      {day.items.map((item) => {
                        const cat = CATEGORIES[item.category] || CATEGORIES.OTHER;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleOpenEditModal(item)}
                            className={`p-1 rounded text-[11px] border cursor-pointer hover:shadow-sm transition-all leading-tight ${
                              item.isCompleted
                                ? 'bg-slate-50 text-slate-400 line-through border-slate-200'
                                : `${cat.badgeClass}`
                            }`}
                            title={`${item.title} (${item.startTime || 'Cả ngày'})`}
                          >
                            <div className="flex items-center gap-1 truncate font-medium">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dotColor}`} />
                              {item.startTime && !item.isAllDay && (
                                <span className="font-bold opacity-80">{item.startTime}</span>
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ===== CHẾ ĐỘ DANH SÁCH VIỆC (TO-DO LIST VIEW) ===== */
            <div className="space-y-4">
              {filteredPlans.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                  Chưa có lịch làm việc nào trong tháng này. Quý khách có thể bấm <strong>"+ Thêm Lịch Mới"</strong> để ghi chú.
                </div>
              ) : (
                <>
                  {/* Khối Việc Hôm Nay */}
                  {groupedListPlans.todayItems.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>HÔM NAY ({formatDateVN(today.toISOString())})</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            {groupedListPlans.todayItems.length} việc
                          </span>
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {groupedListPlans.todayItems.map((item) => renderListItem(item))}
                      </div>
                    </div>
                  )}

                  {/* Khối Việc Ngày Mai */}
                  {groupedListPlans.tomorrowItems.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Ngày Mai ({groupedListPlans.tomorrowItems.length} việc)
                      </h3>
                      <div className="space-y-2">
                        {groupedListPlans.tomorrowItems.map((item) => renderListItem(item))}
                      </div>
                    </div>
                  )}

                  {/* Khối Việc Sắp Tới */}
                  {groupedListPlans.upcomingItems.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Các Ngày Tới Trong Tháng ({groupedListPlans.upcomingItems.length} việc)
                      </h3>
                      <div className="space-y-2">
                        {groupedListPlans.upcomingItems.map((item) => renderListItem(item))}
                      </div>
                    </div>
                  )}

                  {/* Khối Việc Các Ngày Trước */}
                  {groupedListPlans.pastItems.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 opacity-80">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Lịch Đã Qua ({groupedListPlans.pastItems.length} việc)
                      </h3>
                      <div className="space-y-2">
                        {groupedListPlans.pastItems.map((item) => renderListItem(item))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHỤ (4 CỘT HOẶC 3 CỘT): MỐC CẢNH BÁO HỆ THỐNG & DI ĐỘNG (THAY THẾ TRUNG TÂM CẢNH BÁO) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* KHỐI 1: TÌNH TRẠNG CẢNH BÁO ĐẨY DI ĐỘNG (PUSH NOTIFICATIONS) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3 border border-indigo-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cảnh Báo Đẩy Điện Thoại</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Check className="w-3 h-3" /> Trực Tuyến 24/7
              </span>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-300">
                Kênh nhận: <strong className="text-white">Thiết bị Di động (PWA Push)</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Cơ chế: Rung chuông cảnh báo Gói thầu ≤ 6h hoặc Hợp đồng ≤ 15 ngày
              </p>
            </div>

            {pushStatusMessage && (
              <div
                className={`p-2 rounded-lg text-xs font-medium ${
                  pushStatusMessage.success
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                }`}
              >
                {pushStatusMessage.text}
              </div>
            )}

            <button
              type="button"
              disabled={testingPush}
              onClick={handleSendTestPush}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {testingPush ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span>Phát Thử Thông Báo Đẩy Rung Chuông</span>
            </button>
          </div>

          {/* KHỐI 2: MỐC CẢNH BÁO ĐẤU THẦU & HỢP ĐỒNG (THAY THẾ TRUNG TÂM CẢNH BÁO) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-600" />
                <span>Mốc Hệ Thống Cần Lưu Ý</span>
              </h3>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {systemAlerts.urgentBidding.length + systemAlerts.urgentContracts.length} mục
              </span>
            </div>

            {systemAlerts.urgentBidding.length === 0 && systemAlerts.urgentContracts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Hiện không có gói thầu hay hợp đồng nào sắp đến hạn khẩn cấp.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {/* Gói thầu sắp đóng */}
                {systemAlerts.urgentBidding.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded">
                        ĐẤU THẦU
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{pkg.projectCode}</span>
                    </div>
                    <p className="font-bold text-slate-800 line-clamp-2">{pkg.packageName}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-amber-900 font-semibold">
                      <span>{pkg.hoursLeftText}</span>
                      <Link
                        href="/bidding"
                        className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 font-bold"
                      >
                        <span>Xem</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Hợp đồng cần gia hạn */}
                {systemAlerts.urgentContracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-600 text-white rounded">
                        HỢP ĐỒNG
                      </span>
                      <span className="text-[10px] font-bold text-rose-700">
                        {c.remainingDays < 0 ? `Quá hạn ${Math.abs(c.remainingDays)}d` : `Còn ${c.remainingDays} ngày`}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 line-clamp-2">{c.packageName}</p>
                    <p className="text-[11px] text-slate-600">Nhà thầu: {c.contractorName}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>Hạn: {formatDateVN(c.currentEndDate)}</span>
                      <Link
                        href="/contracts"
                        className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 font-bold"
                      >
                        <span>Xử lý</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. MODAL THÊM / SỬA LỊCH LÀM VIỆC CÁ NHÂN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh Sửa Lịch Làm Việc Cá Nhân' : 'Thêm Mới Lịch Làm Việc Cá Nhân'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tiêu Đề Công Việc / Sự Kiện *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần, Đi kiểm tra hiện trường gói 06..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phân Loại Công Việc *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {Object.entries(CATEGORIES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mức Độ Ưu Tiên
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="NORMAL">Bình thường</option>
                <option value="IMPORTANT">Quan trọng</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Thời Gian Thực Hiện
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.isAllDay}
                  onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Cả ngày</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ngày làm việc *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!formData.isAllDay && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Địa Điểm / Thành Phần Tham Dự
            </label>
            <input
              type="text"
              placeholder="VD: Phòng họp số 2 - Tầng 3, Hiện trường Km12 Tuyến đường tránh..."
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nội Dung Ghi Chú Chi Tiết
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chép nội dung cuộc họp, chỉ đạo của lãnh đạo, hồ sơ cần mang theo..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? 'Lưu Cập Nhật' : 'Tạo Lịch Làm Việc'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
