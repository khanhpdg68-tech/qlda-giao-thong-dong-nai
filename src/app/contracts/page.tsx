'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  History,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingDown,
  ShieldAlert,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Download,
  TrendingUp,
  Building2,
} from 'lucide-react';
import Modal from '@/components/Modal';
import FileUploadInput from '@/components/FileUploadInput';
import PdfPreviewModal from '@/components/PdfPreviewModal';
import { formatCurrencyVN, formatDateVN, toDateInput, formatNumberWithDots } from '@/lib/formatters';
import {
  calculateEndDateFromDuration,
  calculateDurationFromDates,
  calculateContractTimeSummary,
  calculateContractPriceSummary,
} from '@/lib/calculations';

interface ContractItem {
  id: string;
  packageId: string;
  projectId: string;
  contractorName: string;
  contractType: string;
  contractPrice: number;
  adjustedContractPrice: number | null;
  totalExtendedDays?: number;
  totalDurationDays?: number;
  finalContractPrice?: number;
  totalPriceAdjustment?: number;
  timeSummary?: {
    originalDurationDays: number;
    totalExtendedDays: number;
    totalDurationDays: number;
    currentEndDate: string | Date;
    extensionCount: number;
  };
  priceSummary?: {
    originalContractPrice: number;
    totalPriceAdjustment: number;
    finalContractPrice: number;
    priceAdjustmentCount: number;
    hasPriceAdjustment: boolean;
  };
  contractSigningDate: string;
  durationDays: number;
  originalEndDate: string;
  currentEndDate: string;
  remainingDays: number;
  savingsRate: number;
  hasBudgetOverrun: boolean;
  guaranteeAmount: number | null;
  guaranteeType?: string;
  guaranteeEndDate: string | null;
  guaranteeBank: string | null;
  status: string;
  urgencyStatus: {
    code: string;
    label: string;
    badgeClass: string;
    rowHighlightClass: string;
  };
  guaranteeStatus: {
    isOverdue: boolean;
    isWarning: boolean;
    label: string;
    badgeClass: string;
  } | null;
  packageName?: string;
  packagePrice?: number;
  adjustedPackagePrice?: number | null;
  procurementMethod?: string;
  package: {
    packageName: string;
    packagePrice: number;
    procurementMethod?: string;
  };
  project: {
    projectCode: string;
    projectName: string;
  };
  addendums: Array<{
    id: string;
    addendumNumber: string;
    addendumType: string;
    signingDate: string;
    extendedDays: number;
    newEndDate: string | null;
    adjustedAmount: number | null;
    reason: string;
    fileUrl: string | null;
    createdAt: string;
  }>;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; projectCode: string; projectName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddendumModalOpen, setIsAddendumModalOpen] = useState(false);
  const [isEditAddendumModalOpen, setIsEditAddendumModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);
  const [isEditContractModalOpen, setIsEditContractModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Thu gọn / mở rộng từng dự án
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const toggleProjectCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [editingAddendum, setEditingAddendum] = useState<any | null>(null);
  const [contractToDelete, setContractToDelete] = useState<ContractItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Thêm Phụ Lục
  const [addendumForm, setAddendumForm] = useState({
    addendumNumber: '',
    addendumType: 'TIME_EXTENSION', // TIME_EXTENSION | PRICE_ADJUSTMENT | BOTH | CHANGE_LEGAL_ENTITY | CHANGE_REPRESENTATIVE | OTHER
    signingDate: '',
    extendedDays: 60,
    newEndDate: '',
    adjustedAmount: '',
    newContractPrice: '',
    newContractorName: '',
    updateContractorName: true,
    reason: '',
    fileUrl: '',
  });

  // Form Chỉnh Sửa Phụ Lục
  const [editAddendumForm, setEditAddendumForm] = useState({
    addendumNumber: '',
    addendumType: 'TIME_EXTENSION',
    signingDate: '',
    extendedDays: 0,
    newEndDate: '',
    adjustedAmount: '',
    newContractPrice: '',
    newContractorName: '',
    updateContractorName: true,
    reason: '',
    fileUrl: '',
  });

  // Form Thêm Mới Hợp Đồng Trực Tiếp
  const [createContractForm, setCreateContractForm] = useState({
    projectId: '',
    packageName: '',
    packagePrice: '',
    adjustedPackagePrice: '',
    procurementMethod: 'DIRECT_AWARD',
    contractorName: '',
    contractType: 'LUMP_SUM',
    contractPrice: '',
    contractSigningDate: '',
    durationDays: 360,
    originalEndDate: '',
    guaranteeAmount: '',
    guaranteeType: 'BY_DATE', // BY_DATE | UNTIL_ACCEPTANCE
    guaranteeEndDate: '',
    guaranteeBank: '',
    status: 'ACTIVE',
  });

  // Form Chỉnh Sửa Hợp Đồng
  const [editContractForm, setEditContractForm] = useState({
    packageName: '',
    packagePrice: '' as string | number,
    adjustedPackagePrice: '' as string | number,
    contractorName: '',
    contractType: 'LUMP_SUM',
    contractPrice: '' as string | number,
    adjustedContractPrice: '' as string | number,
    contractSigningDate: '',
    durationDays: 0,
    originalEndDate: '',
    guaranteeAmount: '' as string | number,
    guaranteeType: 'BY_DATE',
    guaranteeEndDate: '',
    guaranteeBank: '',
    status: 'ACTIVE',
  });

  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const calculateEndDate = (startDateStr: string, days: number) => {
    return calculateEndDateFromDuration(startDateStr, days);
  };

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (res.ok && data.success) {
        setContracts(data.data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách hợp đồng:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách dự án:', err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchProjects();
  }, []);

  // Mở modal thêm hợp đồng mới trực tiếp
  const handleOpenCreateModal = () => {
    const today = toDateInput(new Date());
    const defaultEnd = calculateEndDate(today, 360);
    setCreateContractForm({
      projectId: projects[0]?.id || '',
      packageName: '',
      packagePrice: '',
      adjustedPackagePrice: '',
      procurementMethod: 'DIRECT_AWARD',
      contractorName: '',
      contractType: 'LUMP_SUM',
      contractPrice: '',
      contractSigningDate: today,
      durationDays: 360,
      originalEndDate: defaultEnd,
      guaranteeAmount: '',
      guaranteeType: 'BY_DATE',
      guaranteeEndDate: '',
      guaranteeBank: '',
      status: 'ACTIVE',
    });
    setIsCreateContractModalOpen(true);
  };

  // Submit thêm hợp đồng mới
  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createContractForm.projectId) {
      alert('Vui lòng chọn Dự án');
      return;
    }
    if (!createContractForm.contractorName.trim()) {
      alert('Vui lòng nhập Tên nhà thầu');
      return;
    }
    if (!createContractForm.contractPrice || Number(createContractForm.contractPrice) <= 0) {
      alert('Giá hợp đồng phải lớn hơn 0');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: createContractForm.projectId,
          packageName: createContractForm.packageName || `Hợp đồng thi công - ${createContractForm.contractorName}`,
          packagePrice: createContractForm.packagePrice ? Number(createContractForm.packagePrice) : Number(createContractForm.contractPrice),
          adjustedPackagePrice: createContractForm.adjustedPackagePrice ? Number(createContractForm.adjustedPackagePrice) : null,
          procurementMethod: createContractForm.procurementMethod,
          contractorName: createContractForm.contractorName,
          contractType: createContractForm.contractType,
          contractPrice: Number(createContractForm.contractPrice),
          contractSigningDate: createContractForm.contractSigningDate,
          durationDays: Number(createContractForm.durationDays),
          originalEndDate: createContractForm.originalEndDate,
          guaranteeAmount: createContractForm.guaranteeAmount ? Number(createContractForm.guaranteeAmount) : null,
          guaranteeType: createContractForm.guaranteeType,
          guaranteeEndDate: createContractForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? null : (createContractForm.guaranteeEndDate || null),
          guaranteeBank: createContractForm.guaranteeBank || null,
          status: createContractForm.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateContractModalOpen(false);
        alert('Đã thêm mới Hợp đồng thành công! (Dữ liệu lưu trữ độc lập tại Quản lý Hợp đồng)');
        fetchContracts();
      } else {
        alert(data.error || 'Lỗi khi tạo hợp đồng');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal chỉnh sửa hợp đồng
  const handleOpenEditModal = (contract: ContractItem) => {
    setEditingContract(contract);
    setEditContractForm({
      packageName: contract.package?.packageName || contract.packageName || '',
      packagePrice: contract.package?.packagePrice || contract.packagePrice || '',
      adjustedPackagePrice: contract.adjustedPackagePrice !== null && contract.adjustedPackagePrice !== undefined ? String(contract.adjustedPackagePrice) : '',
      contractorName: contract.contractorName || '',
      contractType: contract.contractType || 'LUMP_SUM',
      contractPrice: contract.contractPrice || 0,
      adjustedContractPrice: contract.adjustedContractPrice !== null && contract.adjustedContractPrice !== undefined ? contract.adjustedContractPrice : '',
      contractSigningDate: toDateInput(contract.contractSigningDate),
      durationDays: contract.durationDays || 0,
      originalEndDate: toDateInput(contract.originalEndDate),
      guaranteeAmount: contract.guaranteeAmount !== null && contract.guaranteeAmount !== undefined ? contract.guaranteeAmount : '',
      guaranteeType: contract.guaranteeType || (contract.guaranteeEndDate ? 'BY_DATE' : 'UNTIL_ACCEPTANCE'),
      guaranteeEndDate: toDateInput(contract.guaranteeEndDate),
      guaranteeBank: contract.guaranteeBank || '',
      status: contract.status || 'ACTIVE',
    });
    setIsEditContractModalOpen(true);
  };

  // Mở modal lịch sử phụ lục
  const handleOpenHistory = (contract: ContractItem) => {
    setSelectedContract(contract);
    setIsHistoryModalOpen(true);
  };

  // Submit chỉnh sửa hợp đồng
  const handleEditContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: editContractForm.packageName,
          packagePrice: editContractForm.packagePrice ? Number(editContractForm.packagePrice) : null,
          adjustedPackagePrice: editContractForm.adjustedPackagePrice ? Number(editContractForm.adjustedPackagePrice) : null,
          contractorName: editContractForm.contractorName,
          contractType: editContractForm.contractType,
          contractPrice: Number(editContractForm.contractPrice),
          adjustedContractPrice: editContractForm.adjustedContractPrice ? Number(editContractForm.adjustedContractPrice) : null,
          contractSigningDate: editContractForm.contractSigningDate,
          durationDays: Number(editContractForm.durationDays),
          originalEndDate: editContractForm.originalEndDate,
          guaranteeAmount: editContractForm.guaranteeAmount ? Number(editContractForm.guaranteeAmount) : null,
          guaranteeType: editContractForm.guaranteeType,
          guaranteeEndDate: editContractForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? null : (editContractForm.guaranteeEndDate || null),
          guaranteeBank: editContractForm.guaranteeBank || null,
          status: editContractForm.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditContractModalOpen(false);
        alert('Đã cập nhật hợp đồng thành công!');
        fetchContracts();
      } else {
        alert(data.error || 'Lỗi cập nhật hợp đồng');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Xác định giá trị hợp đồng mốc trước một phụ lục cụ thể
  const getBasePriceForAddendum = (targetAddendumId?: string) => {
    if (!selectedContract) return 0;
    let total = selectedContract.contractPrice;
    for (const a of selectedContract.addendums || []) {
      if (a.id !== targetAddendumId && a.adjustedAmount !== null && a.adjustedAmount !== undefined) {
        total += a.adjustedAmount;
      }
    }
    return total;
  };

  // Mở modal sửa phụ lục hợp đồng
  const handleOpenEditAddendum = (addendum: any) => {
    setEditingAddendum(addendum);
    const basePrice = getBasePriceForAddendum(addendum.id);
    const currentAdjusted = addendum.adjustedAmount !== null && addendum.adjustedAmount !== undefined ? addendum.adjustedAmount : 0;
    const initialNewPrice = basePrice + currentAdjusted;

    setEditAddendumForm({
      addendumNumber: addendum.addendumNumber,
      addendumType: addendum.addendumType || 'TIME_EXTENSION',
      signingDate: addendum.signingDate ? toDateInput(addendum.signingDate) : '',
      extendedDays: addendum.extendedDays || 0,
      newEndDate: addendum.newEndDate ? toDateInput(addendum.newEndDate) : '',
      adjustedAmount: addendum.adjustedAmount !== null && addendum.adjustedAmount !== undefined ? String(addendum.adjustedAmount) : '',
      newContractPrice: addendum.adjustedAmount !== null && addendum.adjustedAmount !== undefined ? String(initialNewPrice) : String(basePrice),
      newContractorName: '',
      updateContractorName: true,
      reason: addendum.reason || '',
      fileUrl: addendum.fileUrl || '',
    });
    setIsEditAddendumModalOpen(true);
  };

  // Xác định ngày kết thúc mốc trước phụ lục đang sửa
  const getBaseEndDateForEditing = () => {
    if (!selectedContract || !editingAddendum) return '';
    const earlierAddendums = (selectedContract.addendums || [])
      .filter(
        (a: any) =>
          a.id !== editingAddendum.id &&
          a.newEndDate &&
          new Date(a.signingDate).getTime() <= new Date(editingAddendum.signingDate).getTime()
      )
      .sort((a: any, b: any) => {
        const timeDiff = new Date(b.signingDate).getTime() - new Date(a.signingDate).getTime();
        if (timeDiff !== 0) return timeDiff;
        return new Date(b.newEndDate).getTime() - new Date(a.newEndDate).getTime();
      });
    if (earlierAddendums.length > 0 && earlierAddendums[0].newEndDate) {
      return earlierAddendums[0].newEndDate.slice(0, 10);
    }
    return selectedContract.originalEndDate ? selectedContract.originalEndDate.slice(0, 10) : '';
  };

  // Xác định giá trị hợp đồng mốc trước phụ lục đang sửa
  const getBasePriceForEditing = () => {
    return getBasePriceForAddendum(editingAddendum?.id);
  };

  // Submit sửa phụ lục hợp đồng
  const handleEditAddendumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !editingAddendum) return;
    setSubmitting(true);
    const isTime = editAddendumForm.addendumType === 'TIME_EXTENSION' || editAddendumForm.addendumType === 'BOTH';
    const isPrice = editAddendumForm.addendumType === 'PRICE_ADJUSTMENT' || editAddendumForm.addendumType === 'BOTH';

    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/addendums/${editingAddendum.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addendumNumber: editAddendumForm.addendumNumber,
          addendumType: editAddendumForm.addendumType,
          signingDate: editAddendumForm.signingDate,
          extendedDays: isTime ? (Number(editAddendumForm.extendedDays) || 0) : 0,
          newEndDate: isTime ? (editAddendumForm.newEndDate || null) : null,
          adjustedAmount: isPrice && editAddendumForm.adjustedAmount ? Number(editAddendumForm.adjustedAmount) : null,
          reason: editAddendumForm.reason,
          fileUrl: editAddendumForm.fileUrl || null,
          newContractorName: editAddendumForm.addendumType === 'CHANGE_LEGAL_ENTITY' && editAddendumForm.updateContractorName && editAddendumForm.newContractorName ? editAddendumForm.newContractorName : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditAddendumModalOpen(false);
        setEditingAddendum(null);
        await fetchContracts();
        const refreshedRes = await fetch(`/api/contracts/${selectedContract.id}`);
        const refreshedData = await refreshedRes.json();
        if (refreshedRes.ok && refreshedData.success) {
          setSelectedContract(refreshedData.data);
        }
        alert('Đã cập nhật phụ lục hợp đồng thành công!');
      } else {
        alert(data.error || 'Lỗi cập nhật phụ lục');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa phụ lục hợp đồng
  const handleDeleteAddendum = async (addendumId: string) => {
    if (!selectedContract) return;
    if (!confirm('Bạn có chắc chắn muốn xóa phụ lục hợp đồng này? Hệ thống sẽ tự động hoàn nguyên thời hạn và giá trị hợp đồng.')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/addendums/${addendumId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchContracts();
        const refreshedRes = await fetch(`/api/contracts/${selectedContract.id}`);
        const refreshedData = await refreshedRes.json();
        if (refreshedRes.ok && refreshedData.success) {
          setSelectedContract(refreshedData.data);
        }
        alert('Đã xóa phụ lục hợp đồng thành công!');
      } else {
        alert(data.error || 'Lỗi xóa phụ lục');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa hợp đồng
  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contractToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsDeleteModalOpen(false);
        setContractToDelete(null);
        alert('Đã xóa hợp đồng thành công!');
        fetchContracts();
      } else {
        alert(data.error || 'Lỗi xóa hợp đồng');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal thêm phụ lục cho một hợp đồng
  const handleOpenAddendumModal = (contract: ContractItem) => {
    setSelectedContract(contract);
    const nextIndex = (contract.addendums?.length || 0) + 1;
    const formattedNum = `PLHĐ ${String(nextIndex).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const timeSum = contract.timeSummary || calculateContractTimeSummary(
      contract.durationDays,
      contract.originalEndDate,
      contract.addendums
    );
    const priceSum = contract.priceSummary || calculateContractPriceSummary(
      contract.contractPrice,
      contract.addendums
    );

    // Tính ngày mới mặc định: Ngày kết thúc hiện tại + 60 ngày
    const currentEndStr = timeSum.currentEndDate ? toDateInput(timeSum.currentEndDate) : todayStr;
    const defaultNewEnd = calculateEndDateFromDuration(currentEndStr, 61);

    const basePrice = priceSum.finalContractPrice;

    setAddendumForm({
      addendumNumber: formattedNum,
      addendumType: 'TIME_EXTENSION',
      signingDate: todayStr,
      extendedDays: 60,
      newEndDate: defaultNewEnd,
      adjustedAmount: '',
      newContractPrice: String(basePrice),
      newContractorName: '',
      updateContractorName: true,
      reason: 'Gia hạn thời gian thực hiện hợp đồng do vướng mắc giải phóng mặt bằng và điều kiện thời tiết',
      fileUrl: '',
    });
    setIsAddendumModalOpen(true);
  };

  // Submit Phụ lục hợp đồng
  const handleAddendumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setSubmitting(true);
    const isTime = addendumForm.addendumType === 'TIME_EXTENSION' || addendumForm.addendumType === 'BOTH';
    const isPrice = addendumForm.addendumType === 'PRICE_ADJUSTMENT' || addendumForm.addendumType === 'BOTH';

    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/addendums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addendumNumber: addendumForm.addendumNumber,
          addendumType: addendumForm.addendumType,
          signingDate: addendumForm.signingDate,
          extendedDays: isTime ? (Number(addendumForm.extendedDays) || 0) : 0,
          newEndDate: isTime ? (addendumForm.newEndDate || null) : null,
          adjustedAmount: isPrice && addendumForm.adjustedAmount ? Number(addendumForm.adjustedAmount) : null,
          reason: addendumForm.reason,
          fileUrl: addendumForm.fileUrl || null,
          newContractorName: addendumForm.addendumType === 'CHANGE_LEGAL_ENTITY' && addendumForm.updateContractorName && addendumForm.newContractorName ? addendumForm.newContractorName : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddendumModalOpen(false);
        alert('Đã thêm Phụ lục thành công! Hiệu lực hợp đồng và cảnh báo đỏ đã được cập nhật.');
        fetchContracts();
      } else {
        alert(data.error || 'Lỗi thêm phụ lục');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Chuyển sang thanh lý hợp đồng
  const handleLiquidate = async (contractId: string) => {
    if (!confirm('Bạn có chắc chắn muốn chuyển hợp đồng này sang trạng thái ĐÃ THANH LÝ?')) return;
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIQUIDATED' }),
      });
      if (res.ok) {
        fetchContracts();
      }
    } catch {
      alert('Lỗi cập nhật');
    }
  };

  // Lọc hợp đồng
  const filteredContracts = contracts.filter((c) => {
    if (filterUrgency === 'URGENT' && (c.remainingDays > 15 || c.status === 'LIQUIDATED')) return false;
    if (filterUrgency === 'ATTENTION' && (c.remainingDays <= 15 || c.remainingDays > 30 || c.status === 'LIQUIDATED')) return false;
    if (filterUrgency === 'OVERDUE' && (c.remainingDays >= 0 || c.status === 'LIQUIDATED')) return false;
    if (filterUrgency === 'GUARANTEE_WARNING' && !c.guaranteeStatus?.isWarning) return false;
    if (filterUrgency === 'LIQUIDATED' && c.status !== 'LIQUIDATED') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        c.package.packageName.toLowerCase().includes(q) ||
        c.contractorName.toLowerCase().includes(q) ||
        c.project.projectName.toLowerCase().includes(q) ||
        c.project.projectCode.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Nhóm các hợp đồng theo từng dự án để quản lý tập trung và đánh STT phân cấp
  const groupedContracts = React.useMemo(() => {
    const map = new Map<
      string,
      {
        project: { id?: string; projectCode: string; projectName: string };
        contracts: ContractItem[];
        totalContractPrice: number;
      }
    >();

    filteredContracts.forEach((c) => {
      const pId = c.projectId || (c.project as any)?.id || 'other';
      let group = map.get(pId);
      if (!group) {
        group = {
          project: c.project || { projectCode: 'DA', projectName: 'Dự án khác' },
          contracts: [],
          totalContractPrice: 0,
        };
        map.set(pId, group);
      }
      group.contracts.push(c);
      group.totalContractPrice += Number(c.finalContractPrice || c.adjustedContractPrice || c.contractPrice) || 0;
    });

    return Array.from(map.values());
  }, [filteredContracts]);

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
            <FileCheck2 className="w-6 h-6 text-indigo-600" />
            <span>Quản Lý Hợp Đồng & Phụ Lục Gia Hạn</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát thời gian thực hạn kết thúc, bảo lãnh thực hiện HĐ, và lưu vết kiểm toán các lần gia hạn
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Hợp Đồng Mới</span>
          </button>

          <a
            href="/api/export/excel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel</span>
          </a>
        </div>
      </div>

      {/* Thanh Bộ lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterUrgency('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({contracts.length})
          </button>
          <button
            onClick={() => setFilterUrgency('URGENT')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              filterUrgency === 'URGENT'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cần gia hạn gấp (&le; 15 ngày)</span>
          </button>
          <button
            onClick={() => setFilterUrgency('ATTENTION')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'ATTENTION'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Cần chú ý (16 - 30 ngày)
          </button>
          <button
            onClick={() => setFilterUrgency('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'OVERDUE'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            Đã quá hạn
          </button>
          <button
            onClick={() => setFilterUrgency('GUARANTEE_WARNING')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'GUARANTEE_WARNING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hạn bảo lãnh HĐ
          </button>
        </div>

        {/* Input Tìm kiếm */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo nhà thầu, tên gói, dự án..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Danh Sách Hợp Đồng Theo Từng Khối Dự Án (Có Con Lăn Cuộn Riêng & Sticky Header) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 mt-2">Đang tải danh sách hợp đồng...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          Không có hợp đồng nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedContracts.map((group, groupIdx) => {
            const projectOrderNumber = groupIdx + 1;
            const pKey = group.project?.projectCode || `proj-${groupIdx}`;
            const isCollapsed = collapsedProjects[pKey];

            return (
              <div key={pKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Thanh Tiêu Đề Dự Án Phía Trên */}
                <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleProjectCollapse(pKey)}
                      className="p-1 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                      title={isCollapsed ? "Mở rộng dự án" : "Thu gọn dự án"}
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-indigo-700 text-white font-black text-xs tracking-wider shadow-sm">
                      DỰ ÁN {projectOrderNumber}
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white text-indigo-800 rounded-md border border-indigo-300 shadow-xs">
                      {group.project?.projectCode}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {group.project?.projectName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-slate-600 font-medium">
                      Số hợp đồng: <strong className="text-indigo-700 font-bold">{group.contracts.length}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium">
                      Tổng giá trị HĐ: <strong className="text-slate-900 font-mono font-bold">{formatCurrencyVN(group.totalContractPrice)}</strong>
                    </span>
                  </div>
                </div>

                {/* Bảng Danh Sách Hợp Đồng Thuộc Dự Án Có Con Lăn Cuộn Riêng (max-h-[400px]) & Sticky Header */}
                {!isCollapsed && (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs border-b border-slate-300">
                        <tr className="text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 text-center w-14 bg-slate-100">STT</th>
                          <th className="py-2.5 px-3.5 bg-slate-100 min-w-[280px]">Gói Thầu & Nhà Thầu</th>
                          <th className="py-2.5 px-3 text-right bg-slate-100 min-w-[210px]">Giá Dự Toán Được Duyệt & Giá Ký Kết HĐ</th>
                          <th className="py-2.5 px-3 text-center bg-slate-100">% Tiết Kiệm</th>
                          <th className="py-2.5 px-3 text-center bg-slate-100 min-w-[160px]">Hạn Hiệu Lực Hiện Tại</th>
                          <th className="py-2.5 px-3 text-center bg-slate-100 min-w-[190px]">Tình Trạng Tiến Độ</th>
                          <th className="py-2.5 px-3 bg-slate-100 min-w-[190px]">Bảo Lãnh Thực Hiện HĐ</th>
                          <th className="py-2.5 px-3.5 text-right bg-slate-100 min-w-[160px]">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {group.contracts.map((contract, cIdx) => {
                          const contractSTT = `${projectOrderNumber}.${cIdx + 1}`;
                          const addendumCount = contract.addendums?.length || 0;
                          const timeSum = contract.timeSummary || calculateContractTimeSummary(
                            contract.durationDays,
                            contract.originalEndDate,
                            contract.addendums
                          );
                          const priceSum = contract.priceSummary || calculateContractPriceSummary(
                            contract.contractPrice,
                            contract.addendums
                          );

                          return (
                            <tr
                              key={contract.id}
                              className={`hover:bg-slate-50/90 transition-colors ${contract.urgencyStatus.rowHighlightClass}`}
                            >
                              {/* Cột 1: STT Phân Cấp */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 text-xs bg-slate-50/40">
                                {contractSTT}
                              </td>

                              {/* Cột 2: Gói thầu & Nhà thầu */}
                              <td className="py-3.5 px-3.5 min-w-[280px] max-w-lg">
                                <div className="font-bold text-slate-900 text-xs leading-relaxed whitespace-normal break-words">
                                  {contract.package?.packageName}
                                </div>
                                <div className="text-xs text-slate-700 mt-1 font-semibold">
                                  Nhà thầu: <strong className="text-indigo-900">{contract.contractorName}</strong>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                  <div>
                                    Ký ngày: <span className="font-medium text-slate-700">{formatDateVN(contract.contractSigningDate)}</span>
                                  </div>
                                  <div>
                                    Thời gian thực tế: <strong className="text-indigo-700 font-bold">{timeSum.totalDurationDays} ngày</strong>
                                    {timeSum.extensionCount > 0 ? (
                                      <span className="text-slate-500 ml-1">
                                        (Gốc {timeSum.originalDurationDays} ngày + Gia hạn {timeSum.totalExtendedDays} ngày qua {timeSum.extensionCount} PLHĐ)
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 ml-1">(Gốc {timeSum.originalDurationDays} ngày)</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Cột 3: Giá dự toán được duyệt & Giá ký kết HĐ */}
                              <td className="py-3 px-3 text-right">
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Giá dự toán: <span className="font-semibold text-slate-700">{formatCurrencyVN(contract.package?.packagePrice || 0)}</span>
                                </div>
                                {priceSum.hasPriceAdjustment ? (
                                  <div className="space-y-0.5 mt-0.5">
                                    <div className="text-[11px] text-slate-500">
                                      Giá ký HĐ gốc: <span className="font-mono font-medium text-slate-700">{formatCurrencyVN(priceSum.originalContractPrice)}</span>
                                    </div>
                                    <div className="font-mono font-bold text-indigo-900 text-xs">
                                      Giá cuối cùng: {formatCurrencyVN(priceSum.finalContractPrice)}
                                    </div>
                                    <div className={`text-[10px] font-semibold ${priceSum.totalPriceAdjustment >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      ({priceSum.totalPriceAdjustment >= 0 ? '+' : ''}{formatCurrencyVN(priceSum.totalPriceAdjustment)} qua {priceSum.priceAdjustmentCount} PLHĐ)
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                                    Giá ký kết HĐ: {formatCurrencyVN(priceSum.originalContractPrice)}
                                  </div>
                                )}
                                {(priceSum.finalContractPrice > (contract.package?.packagePrice || 0) || contract.hasBudgetOverrun) && (
                                  <div className="mt-1">
                                    <span className="inline-block px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold shadow-2xs">
                                      VƯỢT DỰ TOÁN
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Cột 4: % Tiết kiệm */}
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-xs border ${
                                    contract.savingsRate >= 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {contract.savingsRate.toFixed(2)}%
                                </span>
                              </td>

                              {/* Cột 5: Hạn hiệu lực hiện tại */}
                              <td className="py-3 px-3 text-center min-w-[160px]">
                                <div className="font-mono font-bold text-slate-800 text-xs">
                                  {formatDateVN(timeSum.currentEndDate || contract.currentEndDate)}
                                </div>
                                {timeSum.extensionCount > 0 && (
                                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                    Gốc: {formatDateVN(contract.originalEndDate)} (+{timeSum.totalExtendedDays} ngày qua {timeSum.extensionCount} PL)
                                  </div>
                                )}
                                {contract.status !== 'LIQUIDATED' && (
                                  <div className="mt-1">
                                    {contract.remainingDays < 0 ? (
                                      <span className="inline-block text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        Quá hạn {Math.abs(contract.remainingDays)} ngày
                                      </span>
                                    ) : contract.remainingDays <= 15 ? (
                                      <span className="inline-block text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse">
                                        Còn {contract.remainingDays} ngày
                                      </span>
                                    ) : contract.remainingDays <= 30 ? (
                                      <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Còn {contract.remainingDays} ngày
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[11px] font-medium text-slate-500">
                                        Còn {contract.remainingDays} ngày
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Cột 6: Tình trạng tiến độ (Nổi bật) */}
                              <td className="py-3 px-3 text-center min-w-[190px]">
                                <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-black shadow-xs ${contract.urgencyStatus.badgeClass}`}>
                                  {contract.urgencyStatus.label}
                                </span>
                              </td>

                              {/* Cột 7: Bảo lãnh thực hiện HĐ (Hỗ trợ cả theo ngày và đến khi nghiệm thu) */}
                              <td className="py-3 px-3 min-w-[190px]">
                                {contract.guaranteeType === 'UNTIL_ACCEPTANCE' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                      <span>Đến khi nghiệm thu đưa vào SD</span>
                                    </span>
                                    <div className="text-[10px] text-slate-500 italic">
                                      (Không cần gia hạn riêng)
                                    </div>
                                    {contract.guaranteeBank && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                        {contract.guaranteeBank}
                                      </div>
                                    )}
                                  </div>
                                ) : contract.guaranteeEndDate ? (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-medium text-slate-700">
                                      Hạn: <strong>{formatDateVN(contract.guaranteeEndDate)}</strong>
                                    </div>
                                    {contract.guaranteeStatus && (
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${contract.guaranteeStatus.badgeClass}`}>
                                        {contract.guaranteeStatus.label}
                                      </span>
                                    )}
                                    {contract.guaranteeBank && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                        {contract.guaranteeBank}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Chưa nhập bảo lãnh</span>
                                )}
                              </td>

                              {/* Cột 8: Thao tác */}
                              <td className="py-3.5 px-3.5 text-right space-y-1.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddendumModal(contract)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors"
                                    title="Thêm phụ lục gia hạn"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Phụ Lục</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(contract)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 hover:border-indigo-200"
                                    title="Chỉnh sửa hợp đồng"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setContractToDelete(contract);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
                                    title="Xóa hợp đồng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedContract(contract);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                  >
                                    <History className="w-3 h-3 text-slate-500" />
                                    <span>Lịch sử ({addendumCount})</span>
                                  </button>

                                  {contract.status !== 'LIQUIDATED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleLiquidate(contract.id)}
                                      className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      Thanh lý
                                    </button>
                                  )}
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

      {/* MODAL 1: THÊM PHỤ LỤC HỢP ĐỒNG GIA HẠN */}
      <Modal
        isOpen={isAddendumModalOpen}
        onClose={() => setIsAddendumModalOpen(false)}
        title={`Thêm Phụ Lục Hợp Đồng: ${selectedContract?.package.packageName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleAddendumSubmit} className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
            <p className="font-semibold">
              Hợp đồng hiện tại: <span className="text-slate-800 font-bold">{selectedContract?.contractorName}</span>
            </p>
            <p className="mt-0.5">
              Hạn hiện tại: <strong>{selectedContract ? formatDateVN(selectedContract.currentEndDate) : ''}</strong> (Còn {selectedContract?.remainingDays} ngày)
            </p>
            <p className="text-[11px] text-indigo-700 mt-1">
              * Khi lưu phụ lục gia hạn, hệ thống sẽ tự động cập nhật Ngày kết thúc hiệu lực mới và xóa trạng thái cảnh báo đỏ nếu số ngày còn lại &gt; 15 ngày.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số Hiệu Phụ Lục *
              </label>
              <input
                type="text"
                required
                placeholder="VD: PLHĐ 01/2026"
                value={addendumForm.addendumNumber}
                onChange={(e) => setAddendumForm({ ...addendumForm, addendumNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loại Phụ Lục Hợp Đồng *
              </label>
              <select
                value={addendumForm.addendumType}
                onChange={(e) => setAddendumForm({ ...addendumForm, addendumType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-indigo-900"
              >
                <option value="TIME_EXTENSION">⏱️ Gia hạn thời gian thực hiện HĐ</option>
                <option value="PRICE_ADJUSTMENT">💰 Điều chỉnh khối lượng / thay đổi giá HĐ</option>
                <option value="BOTH">⚡ Cả gia hạn thời gian và điều chỉnh giá</option>
                <option value="CHANGE_LEGAL_ENTITY">🏢 Thay đổi pháp nhân nhà thầu</option>
                <option value="CHANGE_REPRESENTATIVE">👤 Thay đổi người đại diện / nhân sự chủ chốt</option>
                <option value="OTHER">📝 Điều chỉnh khác (tài khoản, điều khoản...)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Ký Phụ Lục *
              </label>
              <input
                type="date"
                required
                value={addendumForm.signingDate}
                onChange={(e) => setAddendumForm({ ...addendumForm, signingDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* NHÓM 1: GIA HẠN THỜI GIAN THỰC HIỆN (Chỉ hiện khi chọn Gia hạn hoặc Cả hai) */}
          {(addendumForm.addendumType === 'TIME_EXTENSION' || addendumForm.addendumType === 'BOTH') && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
              <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️ Thông Tin Gia Hạn Thời Gian Thực Hiện</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hạn Hiệu Lực Hiện Tại
                  </label>
                  <div className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                    {selectedContract ? formatDateVN(selectedContract.currentEndDate) : ''}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số Ngày Gia Hạn Thêm (Ngày) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addendumForm.extendedDays}
                    onChange={(e) => {
                      const days = Number(e.target.value) || 0;
                      const currentEndStr = selectedContract ? selectedContract.currentEndDate.slice(0, 10) : '';
                      const newEnd = calculateEndDateFromDuration(currentEndStr, days + 1);
                      setAddendumForm({ ...addendumForm, extendedDays: days, newEndDate: newEnd });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ngày Kết Thúc Mới Sau Gia Hạn *
                  </label>
                  <input
                    type="date"
                    required
                    value={addendumForm.newEndDate}
                    onChange={(e) => {
                      const end = e.target.value;
                      const currentEndStr = selectedContract ? selectedContract.currentEndDate.slice(0, 10) : '';
                      const days = Math.max(0, calculateDurationFromDates(currentEndStr, end) - 1);
                      setAddendumForm({ ...addendumForm, newEndDate: end, extendedDays: days });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NHÓM 2: ĐIỀU CHỈNH KHỐI LƯỢNG / GIÁ HỢP ĐỒNG (Chỉ hiện khi chọn Điều chỉnh giá hoặc Cả hai) */}
          {(addendumForm.addendumType === 'PRICE_ADJUSTMENT' || addendumForm.addendumType === 'BOTH') && (() => {
            const basePrice = selectedContract ? (selectedContract.adjustedContractPrice || selectedContract.contractPrice) : 0;
            const diff = addendumForm.adjustedAmount !== '' ? Number(addendumForm.adjustedAmount) : 0;

            return (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💰 Thông Tin Điều Chỉnh Khối Lượng & Giá Hợp Đồng</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Giá HĐ trước khi điều chỉnh */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Giá HĐ Trước Khi Điều Chỉnh
                    </label>
                    <div className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>{formatCurrencyVN(basePrice)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Cố định)</span>
                    </div>
                  </div>

                  {/* Giá hợp đồng sau điều chỉnh */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Giá Hợp Đồng Sau Điều Chỉnh (VNĐ) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="VD: 185.365.295.321"
                      value={formatNumberWithDots(addendumForm.newContractPrice)}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^\d]/g, '');
                        const newPrice = Number(rawDigits) || 0;
                        const diffVal = rawDigits ? (newPrice - basePrice) : 0;
                        setAddendumForm({
                          ...addendumForm,
                          newContractPrice: rawDigits,
                          adjustedAmount: rawDigits ? String(diffVal) : '',
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
                    />
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      {addendumForm.newContractPrice ? formatCurrencyVN(Number(addendumForm.newContractPrice)) : ''}
                    </span>
                  </div>
                </div>

                {/* Con số tăng / giảm hệ thống tự tính */}
                <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Con Số Tăng / Giảm (Hệ Thống Tự Động Tính):
                    </span>
                    {diff > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ▲ TĂNG THÊM: +{formatCurrencyVN(diff)}
                      </span>
                    ) : diff < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        ▼ GIẢM TRỪ: -{formatCurrencyVN(Math.abs(diff))}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        = KHÔNG ĐỔI: 0 VNĐ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Giá trị chênh lệch = Giá HĐ sau điều chỉnh - Giá HĐ trước khi điều chỉnh.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* NHÓM 3: THAY ĐỔI PHÁP NHÂN NHÀ THẦU */}
          {addendumForm.addendumType === 'CHANGE_LEGAL_ENTITY' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏢 Thông Tin Thay Đổi Pháp Nhân Nhà Thầu</span>
              </h5>
              <div className="text-xs text-slate-600">
                Nhà thầu hiện tại: <strong className="text-slate-800">{selectedContract?.contractorName}</strong>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tên Nhà Thầu / Pháp Nhân Mới Kế Thừa HĐ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty Cổ phần Tập đoàn Xây dựng Thăng Long (Thay đổi theo ĐKKD số...)"
                  value={addendumForm.newContractorName}
                  onChange={(e) => setAddendumForm({ ...addendumForm, newContractorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-900 pt-1">
                <input
                  type="checkbox"
                  checked={addendumForm.updateContractorName}
                  onChange={(e) => setAddendumForm({ ...addendumForm, updateContractorName: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Tự động cập nhật tên nhà thầu mới này lên bảng Hợp đồng chính</span>
              </label>
            </div>
          )}

          {/* NHÓM 4: THAY ĐỔI NGƯỜI ĐẠI DIỆN / NHÂN SỰ CHỦ CHỐT */}
          {addendumForm.addendumType === 'CHANGE_REPRESENTATIVE' && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>👤 Thay Đổi Người Đại Diện / Nhân Sự Chủ Chốt</span>
              </h5>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Phụ lục này dùng để lưu vết pháp lý khi thay đổi Người đại diện theo pháp luật của nhà thầu, Chỉ huy trưởng công trường, Chủ nhiệm thiết kế... Vui lòng nhập chi tiết nội dung thay đổi vào ô <strong>Lý do / Nội dung phụ lục</strong> bên dưới.
              </p>
            </div>
          )}

          {/* NHÓM 5: ĐIỀU CHỈNH KHÁC */}
          {addendumForm.addendumType === 'OTHER' && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl space-y-1.5">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝 Điều Chỉnh Điều Khoản & Nội Dung Khác</span>
              </h5>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Áp dụng cho các phụ lục điều chỉnh số tài khoản ngân hàng, thay đổi tỷ lệ phân chia nội bộ liên danh, bổ sung điều khoản chung... Vui lòng nhập chi tiết nội dung vào ô <strong>Lý do / Nội dung phụ lục</strong> bên dưới.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lý Do Ban Hành / Nội Dung Chi Tiết Của Phụ Lục *
            </label>
            <textarea
              required
              rows={3}
              placeholder="VD: Căn cứ Quyết định phê duyệt điều chỉnh... hoặc Vướng mắc giải phóng mặt bằng..."
              value={addendumForm.reason}
              onChange={(e) => setAddendumForm({ ...addendumForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <FileUploadInput
            label="Bản Scan Phụ Lục HĐ Ký Đóng Dấu (Link Drive hoặc Tải Tệp)"
            value={addendumForm.fileUrl}
            onChange={(url) => setAddendumForm({ ...addendumForm, fileUrl: url })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddendumModalOpen(false)}
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
              <span>Lưu Phụ Lục Gia Hạn</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: XEM LỊCH SỬ CÁC LẦN GIA HẠN / PHỤ LỤC */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Lịch Sử Phụ Lục Hợp Đồng: ${selectedContract?.package?.packageName || ''}`}
        maxWidth="3xl"
      >
        {(() => {
          if (!selectedContract) return null;

          const modalTimeSum = calculateContractTimeSummary(
            selectedContract.durationDays,
            selectedContract.originalEndDate,
            selectedContract.addendums
          );
          const modalPriceSum = calculateContractPriceSummary(
            selectedContract.contractPrice,
            selectedContract.addendums
          );

          const sortedAddendums = [...(selectedContract.addendums || [])].sort((a, b) => {
            const dateA = new Date(a.signingDate).getTime();
            const dateB = new Date(b.signingDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          });

          return (
            <div className="space-y-4">
              {/* KHUNG THỐNG KÊ TỔNG HỢP LŨY KẾ SAU CÁC LẦN PHỤ LỤC */}
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Tổng Hợp Lũy Kế Hiệu Lực & Giá Trị Hợp Đồng
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Nhà thầu: <strong className="text-slate-800">{selectedContract.contractorName}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Tổng cộng {selectedContract.addendums?.length || 0} Phụ Lục
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Thẻ Thời Gian */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>⏱️ THỜI GIAN THỰC HIỆN</span>
                      <span className="text-indigo-600 font-bold">
                        {modalTimeSum.extensionCount > 0 ? `Đã gia hạn ${modalTimeSum.extensionCount} lần` : 'Chưa gia hạn'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-indigo-700 font-mono">
                        {modalTimeSum.totalDurationDays} ngày
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Gốc: {modalTimeSum.originalDurationDays} ngày {modalTimeSum.totalExtendedDays > 0 ? `+ Thêm: ${modalTimeSum.totalExtendedDays} ngày` : ''})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Hạn kết thúc cuối cùng: <strong className="text-indigo-950 font-bold">{formatDateVN(modalTimeSum.currentEndDate)}</strong>
                      <span className="text-[10px] text-slate-400 ml-1">(Gốc: {formatDateVN(selectedContract.originalEndDate)})</span>
                    </div>
                  </div>

                  {/* Thẻ Giá Trị HĐ */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>💰 GIÁ TRỊ HỢP ĐỒNG</span>
                      <span className="text-purple-600 font-bold">
                        {modalPriceSum.priceAdjustmentCount > 0 ? `Đã điều chỉnh ${modalPriceSum.priceAdjustmentCount} lần` : 'Giá gốc'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-purple-700 font-mono">
                        {formatCurrencyVN(modalPriceSum.finalContractPrice)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Giá ký HĐ gốc: <strong className="text-slate-800 font-mono">{formatCurrencyVN(modalPriceSum.originalContractPrice)}</strong>
                      {modalPriceSum.hasPriceAdjustment && (
                        <span className={`ml-1.5 font-bold ${modalPriceSum.totalPriceAdjustment >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ({modalPriceSum.totalPriceAdjustment >= 0 ? '+' : ''}{formatCurrencyVN(modalPriceSum.totalPriceAdjustment)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {sortedAddendums.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Hợp đồng này chưa có phụ lục nào.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedAddendums.map((addendum, aIdx) => {
                    // Phân loại huy hiệu theo loại phụ lục
                    let typeBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        📝 Điều chỉnh khác
                      </span>
                    );
                    if (addendum.addendumType === 'TIME_EXTENSION') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          ⏱️ Gia hạn thời gian
                        </span>
                      );
                    } else if (addendum.addendumType === 'PRICE_ADJUSTMENT') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          💰 Điều chỉnh giá
                        </span>
                      );
                    } else if (addendum.addendumType === 'BOTH') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          ⚡ Gia hạn & Điều chỉnh giá
                        </span>
                      );
                    } else if (addendum.addendumType === 'CHANGE_LEGAL_ENTITY') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          🏢 Thay đổi pháp nhân
                        </span>
                      );
                    } else if (addendum.addendumType === 'CHANGE_REPRESENTATIVE') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          👤 Thay đổi người đại diện
                        </span>
                      );
                    }

                    return (
                      <div
                        key={addendum.id}
                        className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 relative hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">
                              {addendum.addendumNumber} (Lần {aIdx + 1})
                            </span>
                            {typeBadge}
                            <span className="text-xs text-slate-500">
                              Ngày ký: <strong>{formatDateVN(addendum.signingDate)}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {addendum.fileUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewFile({
                                    url: addendum.fileUrl!,
                                    name: `Phụ lục ${addendum.addendumNumber}`,
                                  })
                                }
                                className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 font-medium mr-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Xem bản scan</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditAddendum(addendum)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Chỉnh sửa phụ lục này"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddendum(addendum.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Xóa phụ lục này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-700 space-y-1">
                          {addendum.extendedDays > 0 && (
                            <p className="text-slate-600">
                              Gia hạn thêm: <strong className="text-emerald-700">+{addendum.extendedDays} ngày</strong> &rarr; Hạn mốc: <strong className="text-indigo-900">{formatDateVN(addendum.newEndDate)}</strong>
                            </p>
                          )}
                          {addendum.adjustedAmount !== null && addendum.adjustedAmount !== undefined && addendum.adjustedAmount !== 0 && (
                            <p className="text-slate-600">
                              Giá trị điều chỉnh: <strong className="text-indigo-700 font-mono">{addendum.adjustedAmount >= 0 ? '+' : ''}{formatCurrencyVN(addendum.adjustedAmount)}</strong>
                            </p>
                          )}
                          <p>
                            <strong>Nội dung / Căn cứ:</strong> {addendum.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 2.1: CHỈNH SỬA PHỤ LỤC HỢP ĐỒNG */}
      <Modal
        isOpen={isEditAddendumModalOpen}
        onClose={() => {
          setIsEditAddendumModalOpen(false);
          setEditingAddendum(null);
        }}
        title={`Chỉnh Sửa Phụ Lục: ${editingAddendum?.addendumNumber || ''}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleEditAddendumSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số Hiệu Phụ Lục *
              </label>
              <input
                type="text"
                required
                value={editAddendumForm.addendumNumber}
                onChange={(e) => setEditAddendumForm({ ...editAddendumForm, addendumNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loại Phụ Lục Hợp Đồng *
              </label>
              <select
                value={editAddendumForm.addendumType}
                onChange={(e) => setEditAddendumForm({ ...editAddendumForm, addendumType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-indigo-900"
              >
                <option value="TIME_EXTENSION">⏱️ Gia hạn thời gian thực hiện HĐ</option>
                <option value="PRICE_ADJUSTMENT">💰 Điều chỉnh khối lượng / thay đổi giá HĐ</option>
                <option value="BOTH">⚡ Cả gia hạn thời gian và điều chỉnh giá</option>
                <option value="CHANGE_LEGAL_ENTITY">🏢 Thay đổi pháp nhân nhà thầu</option>
                <option value="CHANGE_REPRESENTATIVE">👤 Thay đổi người đại diện / nhân sự chủ chốt</option>
                <option value="OTHER">📝 Điều chỉnh khác (tài khoản, điều khoản...)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Ký Phụ Lục *
              </label>
              <input
                type="date"
                required
                value={editAddendumForm.signingDate}
                onChange={(e) => setEditAddendumForm({ ...editAddendumForm, signingDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* NHÓM 1: GIA HẠN THỜI GIAN THỰC HIỆN (Chỉ hiện khi chọn Gia hạn hoặc Cả hai) */}
          {(editAddendumForm.addendumType === 'TIME_EXTENSION' || editAddendumForm.addendumType === 'BOTH') && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
              <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️ Thông Tin Gia Hạn Thời Gian Thực Hiện</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hạn Hiệu Lực Mốc Trước Đó
                  </label>
                  <div className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                    {formatDateVN(getBaseEndDateForEditing())}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số Ngày Gia Hạn Thêm (Ngày) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editAddendumForm.extendedDays}
                    onChange={(e) => {
                      const days = Number(e.target.value) || 0;
                      const baseEnd = getBaseEndDateForEditing();
                      const newEnd = calculateEndDateFromDuration(baseEnd, days + 1);
                      setEditAddendumForm({ ...editAddendumForm, extendedDays: days, newEndDate: newEnd });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ngày Kết Thúc Mới Sau Gia Hạn *
                  </label>
                  <input
                    type="date"
                    required
                    value={editAddendumForm.newEndDate}
                    onChange={(e) => {
                      const end = e.target.value;
                      const baseEnd = getBaseEndDateForEditing();
                      const days = Math.max(0, calculateDurationFromDates(baseEnd, end) - 1);
                      setEditAddendumForm({ ...editAddendumForm, newEndDate: end, extendedDays: days });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NHÓM 2: ĐIỀU CHỈNH KHỐI LƯỢNG / GIÁ HỢP ĐỒNG (Chỉ hiện khi chọn Điều chỉnh giá hoặc Cả hai) */}
          {(editAddendumForm.addendumType === 'PRICE_ADJUSTMENT' || editAddendumForm.addendumType === 'BOTH') && (() => {
            const basePrice = getBasePriceForEditing();
            const diff = editAddendumForm.adjustedAmount !== '' ? Number(editAddendumForm.adjustedAmount) : 0;

            return (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💰 Thông Tin Điều Chỉnh Khối Lượng & Giá Hợp Đồng</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Giá HĐ trước khi điều chỉnh */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Giá HĐ Trước Khi Điều Chỉnh
                    </label>
                    <div className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span>{formatCurrencyVN(basePrice)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Cố định)</span>
                    </div>
                  </div>

                  {/* Giá hợp đồng sau điều chỉnh */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Giá Hợp Đồng Sau Điều Chỉnh (VNĐ) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="VD: 185.365.295.321"
                      value={formatNumberWithDots(editAddendumForm.newContractPrice)}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^\d]/g, '');
                        const newPrice = Number(rawDigits) || 0;
                        const diffVal = rawDigits ? (newPrice - basePrice) : 0;
                        setEditAddendumForm({
                          ...editAddendumForm,
                          newContractPrice: rawDigits,
                          adjustedAmount: rawDigits ? String(diffVal) : '',
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
                    />
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      {editAddendumForm.newContractPrice ? formatCurrencyVN(Number(editAddendumForm.newContractPrice)) : ''}
                    </span>
                  </div>
                </div>

                {/* Con số tăng / giảm hệ thống tự tính */}
                <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Con Số Tăng / Giảm (Hệ Thống Tự Động Tính):
                    </span>
                    {diff > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ▲ TĂNG THÊM: +{formatCurrencyVN(diff)}
                      </span>
                    ) : diff < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        ▼ GIẢM TRỪ: -{formatCurrencyVN(Math.abs(diff))}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        = KHÔNG ĐỔI: 0 VNĐ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Giá trị chênh lệch = Giá HĐ sau điều chỉnh - Giá HĐ trước khi điều chỉnh.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* NHÓM 3: THAY ĐỔI PHÁP NHÂN NHÀ THẦU */}
          {editAddendumForm.addendumType === 'CHANGE_LEGAL_ENTITY' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏢 Thông Tin Thay Đổi Pháp Nhân Nhà Thầu</span>
              </h5>
              <div className="text-xs text-slate-600">
                Nhà thầu hiện tại: <strong className="text-slate-800">{selectedContract?.contractorName}</strong>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tên Nhà Thầu / Pháp Nhân Mới Kế Thừa HĐ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty Cổ phần Tập đoàn Xây dựng Thăng Long (Thay đổi theo ĐKKD số...)"
                  value={editAddendumForm.newContractorName}
                  onChange={(e) => setEditAddendumForm({ ...editAddendumForm, newContractorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-900 pt-1">
                <input
                  type="checkbox"
                  checked={editAddendumForm.updateContractorName}
                  onChange={(e) => setEditAddendumForm({ ...editAddendumForm, updateContractorName: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Tự động cập nhật tên nhà thầu mới này lên bảng Hợp đồng chính</span>
              </label>
            </div>
          )}

          {/* NHÓM 4: THAY ĐỔI NGƯỜI ĐẠI DIỆN / NHÂN SỰ CHỦ CHỐT */}
          {editAddendumForm.addendumType === 'CHANGE_REPRESENTATIVE' && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>👤 Thay Đổi Người Đại Diện / Nhân Sự Chủ Chốt</span>
              </h5>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Phụ lục này dùng để lưu vết pháp lý khi thay đổi Người đại diện theo pháp luật của nhà thầu, Chỉ huy trưởng công trường, Chủ nhiệm thiết kế... Vui lòng nhập chi tiết nội dung thay đổi vào ô <strong>Lý do / Nội dung phụ lục</strong> bên dưới.
              </p>
            </div>
          )}

          {/* NHÓM 5: ĐIỀU CHỈNH KHÁC */}
          {editAddendumForm.addendumType === 'OTHER' && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl space-y-1.5">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝 Điều Chỉnh Điều Khoản & Nội Dung Khác</span>
              </h5>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Áp dụng cho các phụ lục điều chỉnh số tài khoản ngân hàng, thay đổi tỷ lệ phân chia nội bộ liên danh, bổ sung điều khoản chung... Vui lòng nhập chi tiết nội dung vào ô <strong>Lý do / Nội dung phụ lục</strong> bên dưới.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lý Do Ban Hành / Nội Dung Chi Tiết Của Phụ Lục *
            </label>
            <textarea
              required
              rows={3}
              placeholder="VD: Căn cứ Quyết định phê duyệt điều chỉnh... hoặc Vướng mắc giải phóng mặt bằng..."
              value={editAddendumForm.reason}
              onChange={(e) => setEditAddendumForm({ ...editAddendumForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <FileUploadInput
            label="Bản Scan Phụ Lục HĐ (Link Drive hoặc Tải Tệp)"
            value={editAddendumForm.fileUrl}
            onChange={(url) => setEditAddendumForm({ ...editAddendumForm, fileUrl: url })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsEditAddendumModalOpen(false);
                setEditingAddendum(null);
              }}
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
              <span>Lưu Cập Nhật Phụ Lục</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: THÊM MỚI HỢP ĐỒNG TRỰC TIẾP */}
      <Modal
        isOpen={isCreateContractModalOpen}
        onClose={() => setIsCreateContractModalOpen(false)}
        title="Thêm Mới Hợp Đồng (Ký trực tiếp / Chỉ định thầu)"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateContractSubmit} className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              <span>Thêm mới Hợp đồng trực tiếp (Chỉ định thầu / Ký trực tiếp):</span>
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-800">
              Hợp đồng tạo tại đây được lưu trữ và quản lý độc lập tại Quản lý Hợp đồng, không sinh gói thầu sang Quản lý Đấu thầu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Thuộc Dự Án *
              </label>
              <select
                required
                value={createContractForm.projectId}
                onChange={(e) => setCreateContractForm({ ...createContractForm, projectId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Chọn Dự Án --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.projectCode}] {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Hình Thức Lựa Chọn Nhà Thầu *
              </label>
              <select
                value={createContractForm.procurementMethod}
                onChange={(e) => setCreateContractForm({ ...createContractForm, procurementMethod: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="DIRECT_AWARD">Chỉ định thầu / Ký trực tiếp</option>
                <option value="OPEN_BIDDING">Đấu thầu rộng rãi</option>
                <option value="COMPETITIVE_OFFERING">Chào hàng cạnh tranh</option>
                <option value="SHOPPING">Mua sắm trực tiếp</option>
                <option value="OTHER">Hình thức khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên Gói Thầu / Hạng Mục Công Việc Hợp Đồng *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Gói thầu số 06: Thi công hệ thống thoát nước và mặt đường gom..."
              value={createContractForm.packageName}
              onChange={(e) => setCreateContractForm({ ...createContractForm, packageName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Nhà Thầu Thực Hiện *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Công ty CP Xây dựng & Thương mại Hải Long"
                value={createContractForm.contractorName}
                onChange={(e) => setCreateContractForm({ ...createContractForm, contractorName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loại Hợp Đồng *
              </label>
              <select
                value={createContractForm.contractType}
                onChange={(e) => setCreateContractForm({ ...createContractForm, contractType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="LUMP_SUM">Trọn gói</option>
                <option value="UNIT_PRICE">Theo đơn giá cố định</option>
                <option value="ADJUSTABLE_UNIT_PRICE">Theo đơn giá điều chỉnh</option>
                <option value="TIME_BASED">Theo thời gian</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Dự Toán Ban Đầu (VNĐ)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 180.365.295.321 (Để trống sẽ bằng Giá HĐ)"
                value={formatNumberWithDots(createContractForm.packagePrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setCreateContractForm({ ...createContractForm, packagePrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {createContractForm.packagePrice ? formatCurrencyVN(Number(createContractForm.packagePrice)) : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dự Toán Điều Chỉnh (VNĐ)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Nếu có điều chỉnh dự toán"
                value={formatNumberWithDots(createContractForm.adjustedPackagePrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setCreateContractForm({ ...createContractForm, adjustedPackagePrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {createContractForm.adjustedPackagePrice ? formatCurrencyVN(Number(createContractForm.adjustedPackagePrice)) : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Ký Hợp Đồng (VNĐ) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="VD: 180.365.295.321"
                value={formatNumberWithDots(createContractForm.contractPrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setCreateContractForm({ ...createContractForm, contractPrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {createContractForm.contractPrice ? formatCurrencyVN(Number(createContractForm.contractPrice)) : ''}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thời Hạn & Hiệu Lực Hợp Đồng
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày Ký Hợp Đồng *
                </label>
                <input
                  type="date"
                  required
                  value={createContractForm.contractSigningDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    let newEnd = createContractForm.originalEndDate;
                    let days = Number(createContractForm.durationDays) || 0;
                    if (days > 0 && date) {
                      newEnd = calculateEndDate(date, days);
                    } else if (newEnd && date) {
                      days = calculateDurationFromDates(date, newEnd);
                    }
                    setCreateContractForm({
                      ...createContractForm,
                      contractSigningDate: date,
                      durationDays: days,
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
                  value={createContractForm.durationDays}
                  onChange={(e) => {
                    const days = Number(e.target.value) || 0;
                    const newEnd = (createContractForm.contractSigningDate && days > 0)
                      ? calculateEndDate(createContractForm.contractSigningDate, days)
                      : createContractForm.originalEndDate;
                    setCreateContractForm({
                      ...createContractForm,
                      durationDays: days,
                      originalEndDate: newEnd,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày Kết Thúc Gốc *
                </label>
                <input
                  type="date"
                  required
                  value={createContractForm.originalEndDate}
                  onChange={(e) => {
                    const end = e.target.value;
                    let days = createContractForm.durationDays;
                    if (createContractForm.contractSigningDate && end) {
                      days = calculateDurationFromDates(createContractForm.contractSigningDate, end);
                    }
                    setCreateContractForm({
                      ...createContractForm,
                      originalEndDate: end,
                      durationDays: days,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Bảo Lãnh Thực Hiện Hợp Đồng (Tùy chọn)
            </h4>

            {/* Radio chọn loại thời hạn bảo lãnh */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Hình Thức / Thời Hạn Bảo Lãnh HĐ
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="create_guaranteeType"
                    value="BY_DATE"
                    checked={createContractForm.guaranteeType === 'BY_DATE'}
                    onChange={() => setCreateContractForm({ ...createContractForm, guaranteeType: 'BY_DATE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Theo ngày cụ thể</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="create_guaranteeType"
                    value="UNTIL_ACCEPTANCE"
                    checked={createContractForm.guaranteeType === 'UNTIL_ACCEPTANCE'}
                    onChange={() => setCreateContractForm({ ...createContractForm, guaranteeType: 'UNTIL_ACCEPTANCE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-teal-800">Kể từ ngày ký đến khi công trình nghiệm thu đưa vào sử dụng</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Giá Trị Bảo Lãnh (VNĐ)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 9.018.264.766"
                  value={formatNumberWithDots(createContractForm.guaranteeAmount)}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/[^\d]/g, '');
                    setCreateContractForm({ ...createContractForm, guaranteeAmount: rawDigits });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {createContractForm.guaranteeAmount ? formatCurrencyVN(Number(createContractForm.guaranteeAmount)) : ''}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Thời Hạn Bảo Lãnh HĐ
                </label>
                {createContractForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? (
                  <div className="px-3 py-2 text-xs bg-teal-50 border border-teal-200 text-teal-800 rounded-lg font-medium">
                    🛡️ Đến khi nghiệm thu đưa vào SD (Không cần gia hạn)
                  </div>
                ) : (
                  <input
                    type="date"
                    value={createContractForm.guaranteeEndDate}
                    onChange={(e) => setCreateContractForm({ ...createContractForm, guaranteeEndDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngân Hàng Phát Hành Bảo Lãnh
                </label>
                <input
                  type="text"
                  placeholder="VD: BIDV Chi nhánh Hà Nội"
                  value={createContractForm.guaranteeBank}
                  onChange={(e) => setCreateContractForm({ ...createContractForm, guaranteeBank: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateContractModalOpen(false)}
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
              <span>Lưu Hợp Đồng Mới</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: CHỈNH SỬA HỢP ĐỒNG */}
      <Modal
        isOpen={isEditContractModalOpen}
        onClose={() => setIsEditContractModalOpen(false)}
        title={`Chỉnh Sửa Hợp Đồng: ${editingContract?.package?.packageName || editingContract?.packageName || ''}`}
        maxWidth="3xl"
      >
        <form onSubmit={handleEditContractSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên Gói Thầu / Công Việc Hợp Đồng
            </label>
            <input
              type="text"
              required
              value={editContractForm.packageName}
              onChange={(e) => setEditContractForm({ ...editContractForm, packageName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Nhà Thầu Thực Hiện *
              </label>
              <input
                type="text"
                required
                value={editContractForm.contractorName}
                onChange={(e) => setEditContractForm({ ...editContractForm, contractorName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Loại Hợp Đồng *
              </label>
              <select
                value={editContractForm.contractType}
                onChange={(e) => setEditContractForm({ ...editContractForm, contractType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="LUMP_SUM">Trọn gói</option>
                <option value="UNIT_PRICE">Theo đơn giá cố định</option>
                <option value="ADJUSTABLE_UNIT_PRICE">Theo đơn giá điều chỉnh</option>
                <option value="TIME_BASED">Theo thời gian</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Dự Toán Ban Đầu (VNĐ)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 180.365.295.321"
                value={formatNumberWithDots(editContractForm.packagePrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setEditContractForm({ ...editContractForm, packagePrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {editContractForm.packagePrice ? formatCurrencyVN(Number(editContractForm.packagePrice)) : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dự Toán Duyệt Điều Chỉnh (VNĐ)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Để trống nếu không điều chỉnh dự toán"
                value={formatNumberWithDots(editContractForm.adjustedPackagePrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setEditContractForm({ ...editContractForm, adjustedPackagePrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {editContractForm.adjustedPackagePrice ? formatCurrencyVN(Number(editContractForm.adjustedPackagePrice)) : ''}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Trị Hợp Đồng Gốc (VNĐ) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="VD: 180.365.295.321"
                value={formatNumberWithDots(editContractForm.contractPrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setEditContractForm({ ...editContractForm, contractPrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {editContractForm.contractPrice ? formatCurrencyVN(Number(editContractForm.contractPrice)) : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Giá Sau Điều Chỉnh (VNĐ - nếu có)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Để trống nếu chưa điều chỉnh giá"
                value={formatNumberWithDots(editContractForm.adjustedContractPrice)}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^\d]/g, '');
                  setEditContractForm({ ...editContractForm, adjustedContractPrice: rawDigits });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                {editContractForm.adjustedContractPrice ? formatCurrencyVN(Number(editContractForm.adjustedContractPrice)) : ''}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thời Hạn & Hiệu Lực Hợp Đồng
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày Ký Hợp Đồng *
                </label>
                <input
                  type="date"
                  required
                  value={editContractForm.contractSigningDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    let newEnd = editContractForm.originalEndDate;
                    let days = Number(editContractForm.durationDays) || 0;
                    if (days > 0 && date) {
                      newEnd = calculateEndDate(date, days);
                    } else if (newEnd && date) {
                      days = calculateDurationFromDates(date, newEnd);
                    }
                    setEditContractForm({
                      ...editContractForm,
                      contractSigningDate: date,
                      durationDays: days,
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
                  value={editContractForm.durationDays}
                  onChange={(e) => {
                    const days = Number(e.target.value) || 0;
                    const newEnd = (editContractForm.contractSigningDate && days > 0)
                      ? calculateEndDate(editContractForm.contractSigningDate, days)
                      : editContractForm.originalEndDate;
                    setEditContractForm({
                      ...editContractForm,
                      durationDays: days,
                      originalEndDate: newEnd,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày Kết Thúc Gốc *
                </label>
                <input
                  type="date"
                  required
                  value={editContractForm.originalEndDate}
                  onChange={(e) => {
                    const end = e.target.value;
                    let days = editContractForm.durationDays;
                    if (editContractForm.contractSigningDate && end) {
                      days = calculateDurationFromDates(editContractForm.contractSigningDate, end);
                    }
                    setEditContractForm({
                      ...editContractForm,
                      originalEndDate: end,
                      durationDays: days,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Bảo Lãnh Thực Hiện Hợp Đồng
            </h4>

            {/* Radio chọn loại thời hạn bảo lãnh */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Hình Thức / Thời Hạn Bảo Lãnh HĐ
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="edit_guaranteeType"
                    value="BY_DATE"
                    checked={editContractForm.guaranteeType === 'BY_DATE'}
                    onChange={() => setEditContractForm({ ...editContractForm, guaranteeType: 'BY_DATE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Theo ngày cụ thể</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="edit_guaranteeType"
                    value="UNTIL_ACCEPTANCE"
                    checked={editContractForm.guaranteeType === 'UNTIL_ACCEPTANCE'}
                    onChange={() => setEditContractForm({ ...editContractForm, guaranteeType: 'UNTIL_ACCEPTANCE' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-teal-800">Kể từ ngày ký đến khi công trình nghiệm thu đưa vào sử dụng</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Giá Trị Bảo Lãnh (VNĐ)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 9.018.264.766"
                  value={formatNumberWithDots(editContractForm.guaranteeAmount)}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/[^\d]/g, '');
                    setEditContractForm({ ...editContractForm, guaranteeAmount: rawDigits });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {editContractForm.guaranteeAmount ? formatCurrencyVN(Number(editContractForm.guaranteeAmount)) : ''}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Thời Hạn Bảo Lãnh HĐ
                </label>
                {editContractForm.guaranteeType === 'UNTIL_ACCEPTANCE' ? (
                  <div className="px-3 py-2 text-xs bg-teal-50 border border-teal-200 text-teal-800 rounded-lg font-medium">
                    🛡️ Đến khi nghiệm thu đưa vào SD (Không cần gia hạn)
                  </div>
                ) : (
                  <input
                    type="date"
                    value={editContractForm.guaranteeEndDate}
                    onChange={(e) => setEditContractForm({ ...editContractForm, guaranteeEndDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ngân Hàng Phát Hành Bảo Lãnh
                </label>
                <input
                  type="text"
                  placeholder="VD: BIDV Chi nhánh Hà Nội"
                  value={editContractForm.guaranteeBank}
                  onChange={(e) => setEditContractForm({ ...editContractForm, guaranteeBank: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trạng Thái Hợp Đồng *
            </label>
            <select
              value={editContractForm.status}
              onChange={(e) => setEditContractForm({ ...editContractForm, status: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
            >
              <option value="ACTIVE">Đang thực hiện (ACTIVE)</option>
              <option value="COMPLETED">Đã hoàn thành công trình (COMPLETED)</option>
              <option value="LIQUIDATED">Đã thanh lý hợp đồng (LIQUIDATED)</option>
              <option value="SUSPENDED">Tạm dừng thực hiện (SUSPENDED)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditContractModalOpen(false)}
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
              <span>Lưu Cập Nhật Hợp Đồng</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: XÁC NHẬN XÓA HỢP ĐỒNG */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setContractToDelete(null);
        }}
        title="Xác Nhận Xóa Hợp Đồng"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-900">Cảnh báo: Hành động này không thể hoàn tác!</p>
              <p>
                Bạn đang chuẩn bị xóa Hợp đồng của nhà thầu <strong className="font-bold">{contractToDelete?.contractorName}</strong> thuộc gói thầu <strong className="font-bold">{contractToDelete?.package?.packageName}</strong>.
              </p>
              <p className="text-[11px] text-red-800">
                Toàn bộ lịch sử các phụ lục gia hạn đính kèm cũng sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setContractToDelete(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteContract}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận Xóa</span>
            </button>
          </div>
        </div>
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
    </div>
  );
}
