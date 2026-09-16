'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  ArrowRightCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  XCircle,
  RefreshCcw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import Modal from '@/components/Modal';
import FileUploadInput from '@/components/FileUploadInput';
import PdfPreviewModal from '@/components/PdfPreviewModal';
import { formatCurrencyVN, formatDateTimeVN, formatDateVN, toDateTimeLocalInput, formatNumberWithDots } from '@/lib/formatters';
import { getBiddingUrgency, calculateEndDateFromDuration, calculateDurationFromDates } from '@/lib/calculations';

interface BiddingPackageItem {
  id: string;
  projectId: string;
  packageName: string;
  packagePrice: number;
  procurementMethod: string;
  selectionMethod: string;
  khlcntDecision: string;
  khlcntFileUrl: string | null;
  hsmtPublishDate: string;
  bidCloseTime: string;
  originalBidCloseTime: string | null;
  extensionReason: string | null;
  kqlcntDecision: string | null;
  kqlcntFileUrl: string | null;
  status: string;
  isTransferredToContract: boolean;
  project: {
    id: string;
    projectCode: string;
    projectName: string;
  };
  contract?: any | null;
}

export default function BiddingPage() {
  const [packages, setPackages] = useState<BiddingPackageItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; projectCode: string; projectName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Thu gọn / mở rộng từng dự án
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const toggleProjectCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUpdateKqlcntModalOpen, setIsUpdateKqlcntModalOpen] = useState(false);

  const [selectedPkg, setSelectedPkg] = useState<BiddingPackageItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Chỉnh Sửa Toàn Diện Gói Thầu
  const [editingPkg, setEditingPkg] = useState<BiddingPackageItem | null>(null);
  const [editPkgForm, setEditPkgForm] = useState({
    packageName: '',
    packagePrice: '',
    procurementMethod: 'OPEN_BIDDING',
    selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
    khlcntDecision: '',
    khlcntFileUrl: '',
    hsmtPublishDate: '',
    bidCloseTime: '',
    status: 'DRAFT',
    kqlcntDecision: '',
    kqlcntFileUrl: '',
  });

  const handleOpenEditPkg = (pkg: BiddingPackageItem) => {
    setEditingPkg(pkg);
    setEditPkgForm({
      packageName: pkg.packageName,
      packagePrice: String(pkg.packagePrice),
      procurementMethod: pkg.procurementMethod,
      selectionMethod: pkg.selectionMethod,
      khlcntDecision: pkg.khlcntDecision,
      khlcntFileUrl: pkg.khlcntFileUrl || '',
      hsmtPublishDate: pkg.hsmtPublishDate ? new Date(pkg.hsmtPublishDate).toISOString().slice(0, 10) : '',
      bidCloseTime: pkg.bidCloseTime ? toDateTimeLocalInput(pkg.bidCloseTime) : '',
      status: pkg.status,
      kqlcntDecision: pkg.kqlcntDecision || '',
      kqlcntFileUrl: pkg.kqlcntFileUrl || '',
    });
  };

  const handleEditPkgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${editingPkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: editPkgForm.packageName,
          packagePrice: Number(editPkgForm.packagePrice),
          procurementMethod: editPkgForm.procurementMethod,
          selectionMethod: editPkgForm.selectionMethod,
          khlcntDecision: editPkgForm.khlcntDecision,
          khlcntFileUrl: editPkgForm.khlcntFileUrl || null,
          hsmtPublishDate: editPkgForm.hsmtPublishDate,
          bidCloseTime: editPkgForm.bidCloseTime,
          status: editPkgForm.status,
          kqlcntDecision: editPkgForm.kqlcntDecision || null,
          kqlcntFileUrl: editPkgForm.kqlcntFileUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingPkg(null);
        fetchData();
      } else {
        alert(data.error || 'Lỗi khi cập nhật gói thầu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Modal Xóa Gói Thầu
  const [deletePkg, setDeletePkg] = useState<BiddingPackageItem | null>(null);
  const [deletingPkg, setDeletingPkg] = useState(false);

  const handleConfirmDeletePackage = async () => {
    if (!deletePkg) return;
    setDeletingPkg(true);
    try {
      const res = await fetch(`/api/bidding/${deletePkg.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeletePkg(null);
        fetchData();
      } else {
        alert(data.error || 'Lỗi khi xóa gói thầu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setDeletingPkg(false);
    }
  };

  // Form states
  const [createForm, setCreateForm] = useState({
    projectId: '',
    packageName: '',
    packagePrice: '',
    procurementMethod: 'OPEN_BIDDING',
    selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
    khlcntDecision: '',
    khlcntFileUrl: '',
    hsmtPublishDate: '',
    bidCloseTime: '',
    kqlcntDecision: '',
    kqlcntFileUrl: '',
    status: 'PUBLISHED',
  });

  const [transferForm, setTransferForm] = useState({
    contractorName: '',
    contractType: 'LUMP_SUM',
    contractPrice: '',
    contractSigningDate: '',
    durationDays: '360',
    originalEndDate: '',
    guaranteeAmount: '',
    guaranteeType: 'BY_DATE',
    guaranteeEndDate: '',
    guaranteeBank: '',
  });

  const [extendForm, setExtendForm] = useState({
    newBidCloseTime: '',
    extensionReason: '',
  });

  const [cancelForm, setCancelForm] = useState({
    reason: '',
    actionType: 'CANCEL', // CANCEL hoặc RE_BID
  });

  const [kqlcntForm, setKqlcntForm] = useState({
    kqlcntDecision: '',
    kqlcntFileUrl: '',
  });

  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const fetchData = async () => {
    try {
      const [pkgRes, projRes] = await Promise.all([
        fetch('/api/bidding'),
        fetch('/api/projects'),
      ]);
      const pkgData = await pkgRes.json();
      const projData = await projRes.json();
      if (pkgRes.ok && pkgData.success) setPackages(pkgData.data);
      if (projRes.ok && projData.success) setProjects(projData.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đấu thầu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit tạo gói thầu
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/bidding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          packagePrice: Number(createForm.packagePrice),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Lỗi tạo gói thầu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit chuyển sang Quản lý Hợp đồng
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${selectedPkg.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorName: transferForm.contractorName,
          contractType: transferForm.contractType,
          contractPrice: Number(transferForm.contractPrice),
          contractSigningDate: transferForm.contractSigningDate,
          durationDays: Number(transferForm.durationDays),
          originalEndDate: transferForm.originalEndDate,
          guaranteeAmount: transferForm.guaranteeAmount ? Number(transferForm.guaranteeAmount) : null,
          guaranteeType: transferForm.guaranteeType,
          guaranteeEndDate: transferForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? null : (transferForm.guaranteeEndDate || null),
          guaranteeBank: transferForm.guaranteeBank || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsTransferModalOpen(false);
        alert('Đã chuyển thành công sang Quản lý Hợp đồng! Gói thầu vẫn được lưu giữ nguyên vẹn trong module Đấu thầu.');
        fetchData();
      } else {
        alert(data.error || 'Lỗi khi chuyển sang hợp đồng');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit gia hạn đóng thầu
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${selectedPkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXTEND_BID_CLOSE_TIME',
          newBidCloseTime: extendForm.newBidCloseTime,
          extensionReason: extendForm.extensionReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsExtendModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Lỗi gia hạn đóng thầu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit hủy thầu hoặc đấu thầu lại
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${selectedPkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: cancelForm.actionType,
          reason: cancelForm.reason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCancelModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Lỗi cập nhật');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit cập nhật QĐ KQLCNT
  const handleUpdateKqlcntSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${selectedPkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedPkg,
          kqlcntDecision: kqlcntForm.kqlcntDecision,
          kqlcntFileUrl: kqlcntForm.kqlcntFileUrl,
          status: 'AWARDED',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsUpdateKqlcntModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Lỗi cập nhật KQLCNT');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date();

  // Lọc danh sách gói thầu
  const filteredPackages = packages.filter((pkg) => {
    const urgency = getBiddingUrgency(pkg.bidCloseTime, pkg.status, now);

    if (filterStatus === 'URGENT_6H' && !urgency.isUrgent) return false;
    if (filterStatus === 'HAS_KQLCNT' && !pkg.kqlcntDecision) return false;
    if (filterStatus === 'PUBLISHED' && pkg.status !== 'PUBLISHED') return false;
    if (filterStatus === 'CANCELED' && pkg.status !== 'CANCELED' && pkg.status !== 'RE_BIDDING') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        pkg.packageName.toLowerCase().includes(q) ||
        pkg.project.projectName.toLowerCase().includes(q) ||
        pkg.project.projectCode.toLowerCase().includes(q) ||
        pkg.khlcntDecision.toLowerCase().includes(q) ||
        (pkg.kqlcntDecision && pkg.kqlcntDecision.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Nhóm các gói thầu theo từng dự án để quản lý tập trung và đánh STT phân cấp
  const groupedPackages = React.useMemo(() => {
    const map = new Map<
      string,
      {
        project: { id: string; projectCode: string; projectName: string };
        packages: BiddingPackageItem[];
        totalPrice: number;
      }
    >();

    filteredPackages.forEach((pkg) => {
      const pId = pkg.projectId || pkg.project?.id || 'other';
      let group = map.get(pId);
      if (!group) {
        group = {
          project: pkg.project || { id: pId, projectCode: 'DA', projectName: 'Dự án khác' },
          packages: [],
          totalPrice: 0,
        };
        map.set(pId, group);
      }
      group.packages.push(pkg);
      group.totalPrice += Number(pkg.packagePrice) || 0;
    });

    return Array.from(map.values());
  }, [filteredPackages]);

  return (
    <div className="space-y-6">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
              UBND THÀNH PHỐ ĐỒNG NAI
            </span>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
              BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-600" />
            <span>Quản Lý Công Tác Đấu Thầu Xây Dựng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi KHLCNT, HSMT, thời điểm đóng/mở thầu (&le; 6h) và quy trình chuyển giao sang Hợp đồng
          </p>
        </div>

        <button
          onClick={() => {
            if (projects.length > 0) {
              setCreateForm((prev) => ({ ...prev, projectId: projects[0].id }));
            }
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Gói Thầu Mới</span>
        </button>
      </div>

      {/* Thanh Bộ lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({packages.length})
          </button>
          <button
            onClick={() => setFilterStatus('URGENT_6H')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              filterStatus === 'URGENT_6H'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Gấp &le; 6h</span>
          </button>
          <button
            onClick={() => setFilterStatus('HAS_KQLCNT')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'HAS_KQLCNT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã có KQLCNT
          </button>
          <button
            onClick={() => setFilterStatus('PUBLISHED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'PUBLISHED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đang mời thầu
          </button>
          <button
            onClick={() => setFilterStatus('CANCELED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'CANCELED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hủy / Đấu thầu lại
          </button>
        </div>

        {/* Input Tìm kiếm */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên gói, số QĐ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bảng Danh sách Gói Thầu */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 mt-2">Đang tải danh sách gói thầu...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          Không có gói thầu nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedPackages.map((group, groupIdx) => {
            const projectOrderNumber = groupIdx + 1;
            const projectIdKey = group.project?.id || String(groupIdx);
            const isCollapsed = !!collapsedProjects[projectIdKey];

            return (
              <div
                key={projectIdKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* THANH TIÊU ĐỀ DỰ ÁN HÀNG TRÊN (Có thể bấm để Thu gọn / Mở rộng) */}
                <div
                  onClick={() => toggleProjectCollapse(projectIdKey)}
                  className="w-full bg-gradient-to-r from-indigo-50/90 via-slate-100/90 to-indigo-50/50 border-b border-indigo-200/80 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-indigo-700 text-white font-black text-xs tracking-wider shadow-xs">
                      DỰ ÁN {projectOrderNumber}
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white text-indigo-800 rounded-md border border-indigo-300 shadow-xs">
                      {group.project?.projectCode}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {group.project?.projectName}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-600 font-medium">
                        Số gói thầu: <strong className="text-indigo-700 font-bold">{group.packages.length}</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600 font-medium">
                        Tổng dự toán duyệt: <strong className="text-slate-900 font-mono font-bold">{formatCurrencyVN(group.totalPrice)}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-white/80 transition-colors"
                      title={isCollapsed ? "Mở rộng danh sách gói thầu" : "Thu gọn danh sách gói thầu"}
                    >
                      {isCollapsed ? <ChevronRight className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                {/* BẢNG GÓI THẦU CÓ CON LĂN NỘI BỘ & STICKY HEADER */}
                {!isCollapsed && (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead>
                        <tr className="sticky top-0 z-10 bg-slate-100 shadow-xs border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3 text-center w-14 bg-slate-100">STT</th>
                          <th className="py-3 px-3.5 bg-slate-100">Tên Gói Thầu & KHLCNT</th>
                          <th className="py-3 px-3 bg-slate-100">Hình Thức LCNT</th>
                          <th className="py-3 px-3 text-right bg-slate-100">Giá Dự Toán Gói Thầu Được Duyệt (VNĐ)</th>
                          <th className="py-3 px-3 text-center bg-slate-100">Thời Gian Đăng Tải HSMT</th>
                          <th className="py-3 px-3 bg-slate-100">Thời Điểm Đóng / Mở Thầu</th>
                          <th className="py-3 px-3 bg-slate-100">QĐ KQLCNT</th>
                          <th className="py-3 px-3.5 text-right bg-slate-100">Thao Tác Nghiệp Vụ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {group.packages.map((pkg, pkgIdx) => {
                          const packageSTT = `${projectOrderNumber}.${pkgIdx + 1}`;
                          const urgency = getBiddingUrgency(pkg.bidCloseTime, pkg.status, now);

                          let methodText = 'Đấu thầu rộng rãi qua mạng';
                          if (pkg.procurementMethod === 'DIRECT_AWARD') methodText = 'Chỉ định thầu';
                          else if (pkg.procurementMethod === 'COMPETITIVE_OFFER') methodText = 'Chào hàng cạnh tranh';
                          else if (pkg.procurementMethod === 'SELF_IMPLEMENTATION') methodText = 'Tự thực hiện';

                          return (
                            <tr
                            key={pkg.id}
                            className={`hover:bg-slate-50/90 transition-colors ${
                              urgency.isUrgent ? 'bg-rose-50/70 border-l-4 border-rose-600' : ''
                            }`}
                          >
                            {/* Cột 1: STT Phân Cấp */}
                            <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 text-xs bg-slate-50/40">
                              {packageSTT}
                            </td>

                            {/* Cột 2: Tên gói & KHLCNT (Hiện đầy đủ 100%, không rút gọn) */}
                            <td className="py-3.5 px-3.5 min-w-[300px] max-w-lg">
                              <div className="font-bold text-slate-900 text-xs leading-relaxed whitespace-normal break-words">
                                {pkg.packageName}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                                <span>QĐ KHLCNT: <strong className="text-slate-700">{pkg.khlcntDecision}</strong></span>
                                {pkg.khlcntFileUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile({ url: pkg.khlcntFileUrl!, name: `QĐ KHLCNT: ${pkg.packageName}` })}
                                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 font-medium"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Xem QĐ
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Cột 3: Hình thức & Phương thức */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-medium text-slate-700">{methodText}</div>
                              <div className="text-[10px] text-slate-400">
                                {pkg.selectionMethod === 'ONE_STAGE_TWO_ENVELOPES' ? '1 GĐ 2 túi hồ sơ' : '1 GĐ 1 túi hồ sơ'}
                              </div>
                              {pkg.status === 'CANCELED' && (
                                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                                  HỦY THẦU
                                </span>
                              )}
                              {pkg.status === 'RE_BIDDING' && (
                                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                  ĐẤU THẦU LẠI
                                </span>
                              )}
                            </td>

                            {/* Cột 4: Giá dự toán gói thầu được duyệt */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                              {formatCurrencyVN(pkg.packagePrice)}
                            </td>

                            {/* Cột 5: Thời gian đăng tải HSMT */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{formatDateVN(pkg.hsmtPublishDate)}</span>
                              </div>
                            </td>

                            {/* Cột 6: Thời điểm đóng / mở thầu & Cảnh báo thời gian nổi bật */}
                            <td className="py-3 px-3 min-w-[220px]">
                              <div className="font-mono font-bold text-slate-800 text-xs">
                                {formatDateTimeVN(pkg.bidCloseTime)}
                              </div>
                              <div className="mt-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] shadow-xs ${urgency.badgeClass}`}>
                                  {urgency.label}
                                </span>
                              </div>
                              {pkg.originalBidCloseTime && (
                                <div className="text-[10px] text-amber-700 mt-1 italic font-medium">
                                  (Đã gia hạn từ {formatDateTimeVN(pkg.originalBidCloseTime)})
                                </div>
                              )}
                            </td>

                            {/* Cột 7: QĐ KQLCNT */}
                            <td className="py-3 px-3">
                              {pkg.kqlcntDecision ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-800 text-xs">
                                    {pkg.kqlcntDecision}
                                  </div>
                                  {pkg.kqlcntFileUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFile({ url: pkg.kqlcntFileUrl!, name: `QĐ KQLCNT: ${pkg.packageName}` })}
                                      className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 text-[11px] font-medium"
                                    >
                                      <FileText className="w-3 h-3" />
                                      Xem tài liệu KQLCNT
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPkg(pkg);
                                    setKqlcntForm({ kqlcntDecision: '', kqlcntFileUrl: '' });
                                    setIsUpdateKqlcntModalOpen(true);
                                  }}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                                >
                                  + Nhập QĐ KQLCNT
                                </button>
                              )}
                            </td>

                            {/* Cột 8: Thao tác */}
                            <td className="py-3.5 px-3.5 text-right space-y-1.5">
                              {/* NÚT CHUYỂN SANG HỢP ĐỒNG NỔI BẬT NẾU ĐÃ CÓ KQLCNT VÀ CHƯA CHUYỂN */}
                              {pkg.kqlcntDecision && !pkg.isTransferredToContract && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const todayStr = new Date().toISOString().slice(0, 10);
                                    const initialEnd = calculateEndDateFromDuration(todayStr, 360);
                                    setSelectedPkg(pkg);
                                    setTransferForm({
                                      contractorName: '',
                                      contractType: 'LUMP_SUM',
                                      contractPrice: String(pkg.packagePrice * 0.96),
                                      contractSigningDate: todayStr,
                                      durationDays: '360',
                                      originalEndDate: initialEnd,
                                      guaranteeAmount: String(pkg.packagePrice * 0.96 * 0.05),
                                      guaranteeType: 'BY_DATE',
                                      guaranteeEndDate: new Date(Date.now() + 450 * 86400000).toISOString().slice(0, 10),
                                      guaranteeBank: '',
                                    });
                                    setIsTransferModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition-transform hover:scale-105"
                                >
                                  <ArrowRightCircle className="w-4 h-4" />
                                  <span>Chuyển sang Hợp đồng</span>
                                </button>
                              )}

                              {pkg.isTransferredToContract && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã chuyển sang HĐ</span>
                                </span>
                              )}

                              {/* Menu thao tác phụ: Gia hạn đóng thầu, Hủy thầu, Sửa, Xóa */}
                              <div className="flex items-center justify-end gap-1.5">
                                {!urgency.isClosed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPkg(pkg);
                                      setExtendForm({
                                        newBidCloseTime: toDateTimeLocalInput(
                                          new Date(new Date(pkg.bidCloseTime).getTime() + 7 * 86400000)
                                        ),
                                        extensionReason: 'Gia hạn đóng thầu để tăng tính cạnh tranh',
                                      });
                                      setIsExtendModalOpen(true);
                                    }}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                  >
                                    Gia hạn đóng thầu
                                  </button>
                                )}

                                {pkg.status !== 'CANCELED' && pkg.status !== 'AWARDED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPkg(pkg);
                                      setCancelForm({ reason: '', actionType: 'CANCEL' });
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="text-[11px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                                  >
                                    Hủy thầu
                                  </button>
                                )}

                                {/* Nút Chỉnh Sửa Gói Thầu */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPkg(pkg)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Chỉnh sửa gói thầu"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {/* Nút Xóa Gói Thầu */}
                                <button
                                  type="button"
                                  onClick={() => setDeletePkg(pkg)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Xóa gói thầu này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

      {/* MODAL 1: TẠO GÓI THẦU MỚI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Gói Thầu Mới (Quản Lý Đấu Thầu)"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Thuộc Dự Án *
            </label>
            <select
              required
              value={createForm.projectId}
              onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectCode}] {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên Gói Thầu *
            </label>
            <textarea
              required
              rows={2}
              placeholder="VD: Gói thầu số 10: Thi công xây dựng công trình giao thông..."
              value={createForm.packageName}
              onChange={(e) => setCreateForm({ ...createForm, packageName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Dự Toán Gói Thầu Được Duyệt (VNĐ) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="VD: 180.365.295.321"
                value={formatNumberWithDots(createForm.packagePrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setCreateForm({ ...createForm, packagePrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {createForm.packagePrice ? formatCurrencyVN(Number(createForm.packagePrice)) : 'Nhập chính xác từng đồng lẻ (VD: 180.365.295.321 đ)'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Hình Thức Lựa Chọn Nhà Thầu *
              </label>
              <select
                value={createForm.procurementMethod}
                onChange={(e) => setCreateForm({ ...createForm, procurementMethod: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="OPEN_BIDDING">Đấu thầu rộng rãi qua mạng</option>
                <option value="DIRECT_AWARD">Chỉ định thầu</option>
                <option value="COMPETITIVE_OFFER">Chào hàng cạnh tranh</option>
                <option value="SELF_IMPLEMENTATION">Tự thực hiện</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số, Ngày QĐ Phê Duyệt KHLCNT *
              </label>
              <input
                type="text"
                required
                placeholder="VD: 520/QĐ-BQL ngày 10/02/2026"
                value={createForm.khlcntDecision}
                onChange={(e) => setCreateForm({ ...createForm, khlcntDecision: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phương Thức Đấu Thầu
              </label>
              <select
                value={createForm.selectionMethod}
                onChange={(e) => setCreateForm({ ...createForm, selectionMethod: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ONE_STAGE_ONE_ENVELOPE">Một giai đoạn một túi hồ sơ</option>
                <option value="ONE_STAGE_TWO_ENVELOPES">Một giai đoạn hai túi hồ sơ</option>
              </select>
            </div>
          </div>

          <FileUploadInput
            label="Tài Liệu QĐ KHLCNT (Link Drive hoặc Tải Tệp)"
            value={createForm.khlcntFileUrl}
            onChange={(url) => setCreateForm({ ...createForm, khlcntFileUrl: url })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Đăng Tải HSMT *
              </label>
              <input
                type="date"
                required
                value={createForm.hsmtPublishDate}
                onChange={(e) => setCreateForm({ ...createForm, hsmtPublishDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Thời Điểm Đóng/Mở Thầu (Ngày + Giờ) *
              </label>
              <input
                type="datetime-local"
                required
                value={createForm.bidCloseTime}
                onChange={(e) => setCreateForm({ ...createForm, bidCloseTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu Gói Thầu</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CHUYỂN SANG QUẢN LÝ HỢP ĐỒNG */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={`Chuyển Sang Quản Lý Hợp Đồng: ${selectedPkg?.packageName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 space-y-1">
            <p className="font-semibold">
              Xác nhận lập Hợp đồng từ Kết quả lựa chọn nhà thầu:
            </p>
            <p>
              Giá gói thầu đã duyệt: <strong>{selectedPkg ? formatCurrencyVN(selectedPkg.packagePrice) : ''}</strong> | QĐ KQLCNT: <strong>{selectedPkg?.kqlcntDecision}</strong>
            </p>
            <p className="text-[11px] text-indigo-700">
              * Toàn bộ lịch sử dữ liệu tại module Đấu thầu sẽ được giữ nguyên vẹn để phục vụ thanh tra/kiểm toán.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên Nhà Thầu Trúng Thầu / Liên Danh *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Tổng Công ty Xây dựng Công trình Giao thông 1 (CIENCO 1)..."
              value={transferForm.contractorName}
              onChange={(e) => setTransferForm({ ...transferForm, contractorName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Hợp Đồng / Giá Trúng Thầu (VNĐ) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="VD: 180.365.295.321"
                value={formatNumberWithDots(transferForm.contractPrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setTransferForm({ ...transferForm, contractPrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {transferForm.contractPrice ? formatCurrencyVN(Number(transferForm.contractPrice)) : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loại Hợp Đồng *
              </label>
              <select
                value={transferForm.contractType}
                onChange={(e) => setTransferForm({ ...transferForm, contractType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="LUMP_SUM">Trọn gói</option>
                <option value="UNIT_PRICE_FIXED">Đơn giá cố định</option>
                <option value="UNIT_PRICE_ADJUSTABLE">Đơn giá điều chỉnh</option>
                <option value="COMBINED">Hợp đồng kết hợp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Ký Hợp Đồng *
              </label>
              <input
                type="date"
                required
                value={transferForm.contractSigningDate}
                onChange={(e) => {
                  const date = e.target.value;
                  let newEnd = transferForm.originalEndDate;
                  let days = Number(transferForm.durationDays) || 0;
                  if (days > 0 && date) {
                    newEnd = calculateEndDateFromDuration(date, days);
                  } else if (newEnd && date) {
                    days = calculateDurationFromDates(date, newEnd);
                  }
                  setTransferForm({
                    ...transferForm,
                    contractSigningDate: date,
                    durationDays: String(days),
                    originalEndDate: newEnd,
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Thời Gian Thực Hiện (Ngày) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={transferForm.durationDays}
                onChange={(e) => {
                  const days = Number(e.target.value) || 0;
                  const newEnd = (transferForm.contractSigningDate && days > 0)
                    ? calculateEndDateFromDuration(transferForm.contractSigningDate, days)
                    : transferForm.originalEndDate;
                  setTransferForm({
                    ...transferForm,
                    durationDays: e.target.value,
                    originalEndDate: newEnd,
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Kết Thúc HĐ Gốc *
              </label>
              <input
                type="date"
                required
                value={transferForm.originalEndDate}
                onChange={(e) => {
                  const end = e.target.value;
                  let days = transferForm.durationDays;
                  if (transferForm.contractSigningDate && end) {
                    days = String(calculateDurationFromDates(transferForm.contractSigningDate, end));
                  }
                  setTransferForm({
                    ...transferForm,
                    originalEndDate: end,
                    durationDays: days,
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Thông tin Bảo lãnh thực hiện Hợp đồng */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Thông Tin Bảo Lãnh Thực Hiện Hợp Đồng
            </h5>

            {/* Radio chọn loại thời hạn bảo lãnh */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Hình Thức / Thời Hạn Bảo Lãnh HĐ
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="transfer_guaranteeType"
                    value="BY_DATE"
                    checked={transferForm.guaranteeType === 'BY_DATE'}
                    onChange={() => setTransferForm({ ...transferForm, guaranteeType: 'BY_DATE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Theo ngày cụ thể</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="transfer_guaranteeType"
                    value="UNTIL_ACCEPTANCE"
                    checked={transferForm.guaranteeType === 'UNTIL_ACCEPTANCE'}
                    onChange={() => setTransferForm({ ...transferForm, guaranteeType: 'UNTIL_ACCEPTANCE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-teal-800">Kể từ ngày ký đến khi công trình nghiệm thu đưa vào sử dụng</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Giá Trị Bảo Lãnh (VNĐ)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 9.018.264.766"
                  value={formatNumberWithDots(transferForm.guaranteeAmount)}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/[^\d]/g, '');
                    setTransferForm({ ...transferForm, guaranteeAmount: rawDigits });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  {transferForm.guaranteeAmount ? formatCurrencyVN(Number(transferForm.guaranteeAmount)) : ''}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Hạn Bảo Lãnh Thực Hiện HĐ
                </label>
                {transferForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? (
                  <div className="px-3 py-2 text-xs bg-teal-50 border border-teal-200 text-teal-800 rounded-lg font-medium">
                    🛡️ Đến khi nghiệm thu đưa vào SD (Không cần gia hạn)
                  </div>
                ) : (
                  <input
                    type="date"
                    value={transferForm.guaranteeEndDate}
                    onChange={(e) => setTransferForm({ ...transferForm, guaranteeEndDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ngân Hàng Phát Hành
                </label>
                <input
                  type="text"
                  placeholder="VD: Vietcombank, BIDV..."
                  value={transferForm.guaranteeBank}
                  onChange={(e) => setTransferForm({ ...transferForm, guaranteeBank: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Khởi Tạo Hợp Đồng Ngay</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: GIA HẠN ĐÓNG THẦU */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title="Gia Hạn Thời Điểm Đóng/Mở Thầu"
        maxWidth="md"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Gói thầu: <strong>{selectedPkg?.packageName}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Thời Điểm Đóng Thầu Mới *
            </label>
            <input
              type="datetime-local"
              required
              value={extendForm.newBidCloseTime}
              onChange={(e) => setExtendForm({ ...extendForm, newBidCloseTime: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lý Do Gia Hạn Đóng Thầu *
            </label>
            <textarea
              required
              rows={3}
              placeholder="VD: Gia hạn thời điểm đóng thầu thêm 07 ngày do làm rõ HSMT theo yêu cầu của nhà thầu..."
              value={extendForm.extensionReason}
              onChange={(e) => setExtendForm({ ...extendForm, extensionReason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsExtendModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow disabled:opacity-50"
            >
              Xác Nhận Gia Hạn
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: HỦY THẦU / ĐẤU THẦU LẠI */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Hủy Thầu / Tổ Chức Đấu Thầu Lại"
        maxWidth="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Hình Thức Thao Tác *
            </label>
            <select
              value={cancelForm.actionType}
              onChange={(e) => setCancelForm({ ...cancelForm, actionType: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="CANCEL">Hủy thầu (CANCELED)</option>
              <option value="RE_BID">Tổ chức đấu thầu lại (RE_BIDDING)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lý Do & Căn Cứ Pháp Lý *
            </label>
            <textarea
              required
              rows={3}
              placeholder="VD: Hủy thầu theo Quyết định số... do tất cả HSDT không đáp ứng tiêu chuẩn kỹ thuật..."
              value={cancelForm.reason}
              onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow disabled:opacity-50"
            >
              Xác Nhận Hủy Thầu
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: CẬP NHẬT QĐ KQLCNT */}
      <Modal
        isOpen={isUpdateKqlcntModalOpen}
        onClose={() => setIsUpdateKqlcntModalOpen(false)}
        title={`Cập Nhật QĐ Phê Duyệt KQLCNT: ${selectedPkg?.packageName}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateKqlcntSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Số, Ngày QĐ Phê Duyệt KQLCNT *
            </label>
            <input
              type="text"
              required
              placeholder="VD: 789/QĐ-BQL ngày 15/03/2026"
              value={kqlcntForm.kqlcntDecision}
              onChange={(e) => setKqlcntForm({ ...kqlcntForm, kqlcntDecision: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <FileUploadInput
            label="Tài Liệu QĐ KQLCNT (Link Drive hoặc Tải Tệp)"
            value={kqlcntForm.kqlcntFileUrl}
            onChange={(url) => setKqlcntForm({ ...kqlcntForm, kqlcntFileUrl: url })}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsUpdateKqlcntModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow disabled:opacity-50"
            >
              Lưu Kết Quả
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL XEM TRƯỚC PDF */}
      {previewFile && (
        <PdfPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA GÓI THẦU */}
      {deletePkg && (
        <Modal
          isOpen={!!deletePkg}
          onClose={() => setDeletePkg(null)}
          title="Xác Nhận Xóa Gói Thầu"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed space-y-1">
                <p className="font-bold">Hành động này không thể hoàn tác!</p>
                <p>Bạn có chắc chắn muốn xóa gói thầu sau khỏi hệ thống:</p>
                <p className="font-semibold text-rose-950 bg-rose-100/70 p-2 rounded">
                  {deletePkg.packageName}
                </p>
                {deletePkg.isTransferredToContract && (
                  <p className="text-[11px] text-rose-700 italic">
                    * Gói thầu này đã có hợp đồng liên kết. Khi xóa gói thầu, hợp đồng liên quan cũng sẽ bị xóa.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletePkg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePackage}
                disabled={deletingPkg}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingPkg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL CHỈNH SỬA TOÀN DIỆN GÓI THẦU */}
      {editingPkg && (
        <Modal
          isOpen={!!editingPkg}
          onClose={() => setEditingPkg(null)}
          title={`Chỉnh Sửa Gói Thầu: ${editingPkg.packageName}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleEditPkgSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Gói Thầu *
              </label>
              <textarea
                required
                rows={2}
                value={editPkgForm.packageName}
                onChange={(e) => setEditPkgForm({ ...editPkgForm, packageName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Giá Dự Toán Gói Thầu Được Duyệt (VNĐ) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="VD: 180.365.295.321"
                  value={formatNumberWithDots(editPkgForm.packagePrice)}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/[^\d]/g, '');
                    setEditPkgForm({ ...editPkgForm, packagePrice: rawDigits });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {editPkgForm.packagePrice ? formatCurrencyVN(Number(editPkgForm.packagePrice)) : 'Nhập chính xác từng đồng lẻ (VD: 180.365.295.321 đ)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Trạng Thái Gói Thầu *
                </label>
                <select
                  value={editPkgForm.status}
                  onChange={(e) => setEditPkgForm({ ...editPkgForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="DRAFT">Chuẩn bị HSMT (DRAFT)</option>
                  <option value="PUBLISHED">Đang mời thầu (PUBLISHED)</option>
                  <option value="BIDDING_CLOSED">Đã đóng thầu (BIDDING_CLOSED)</option>
                  <option value="EVALUATING">Đang chấm thầu (EVALUATING)</option>
                  <option value="AWARDED">Đã trao thầu / KQLCNT (AWARDED)</option>
                  <option value="CANCELED">Hủy thầu (CANCELED)</option>
                  <option value="RE_BIDDING">Đấu thầu lại (RE_BIDDING)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Hình Thức Lựa Chọn Nhà Thầu *
                </label>
                <select
                  value={editPkgForm.procurementMethod}
                  onChange={(e) => setEditPkgForm({ ...editPkgForm, procurementMethod: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="OPEN_BIDDING">Đấu thầu rộng rãi qua mạng</option>
                  <option value="DIRECT_AWARD">Chỉ định thầu</option>
                  <option value="COMPETITIVE_OFFER">Chào hàng cạnh tranh</option>
                  <option value="SELF_IMPLEMENTATION">Tự thực hiện</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phương Thức Đấu Thầu
                </label>
                <select
                  value={editPkgForm.selectionMethod}
                  onChange={(e) => setEditPkgForm({ ...editPkgForm, selectionMethod: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="ONE_STAGE_ONE_ENVELOPE">Một giai đoạn một túi hồ sơ</option>
                  <option value="ONE_STAGE_TWO_ENVELOPES">Một giai đoạn hai túi hồ sơ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Số, Ngày QĐ Phê Duyệt KHLCNT *
                </label>
                <input
                  type="text"
                  required
                  value={editPkgForm.khlcntDecision}
                  onChange={(e) => setEditPkgForm({ ...editPkgForm, khlcntDecision: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày Đăng Tải HSMT *
                </label>
                <input
                  type="date"
                  required
                  value={editPkgForm.hsmtPublishDate}
                  onChange={(e) => setEditPkgForm({ ...editPkgForm, hsmtPublishDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <FileUploadInput
              label="Tài Liệu QĐ KHLCNT (Link Drive hoặc Tải Tệp)"
              value={editPkgForm.khlcntFileUrl}
              onChange={(url) => setEditPkgForm({ ...editPkgForm, khlcntFileUrl: url })}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Thời Điểm Đóng/Mở Thầu (Ngày + Giờ) *
              </label>
              <input
                type="datetime-local"
                required
                value={editPkgForm.bidCloseTime}
                onChange={(e) => setEditPkgForm({ ...editPkgForm, bidCloseTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số, Ngày QĐ Phê Duyệt KQLCNT (Nếu có)
              </label>
              <input
                type="text"
                placeholder="VD: 789/QĐ-BQL ngày 15/03/2026"
                value={editPkgForm.kqlcntDecision}
                onChange={(e) => setEditPkgForm({ ...editPkgForm, kqlcntDecision: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <FileUploadInput
              label="Tài Liệu QĐ KQLCNT (Link Drive hoặc Tải Tệp)"
              value={editPkgForm.kqlcntFileUrl}
              onChange={(url) => setEditPkgForm({ ...editPkgForm, kqlcntFileUrl: url })}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Cập Nhật Gói Thầu</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
