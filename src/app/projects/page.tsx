'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Scale,
  FileCheck2,
  Search,
  Loader2,
  Trash2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import Modal from '@/components/Modal';
import FileUploadInput from '@/components/FileUploadInput';
import PdfPreviewModal from '@/components/PdfPreviewModal';
import { formatCurrencyVN, formatDateVN, formatNumberWithDots } from '@/lib/formatters';

interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  approvalDecision: string;
  legalDriveUrl: string | null;
  legalFileUrl: string | null;
  createdAt: string;
  biddingPackages: Array<{
    id: string;
    packageName: string;
    packagePrice: number;
    status: string;
    contract: any | null;
  }>;
  contracts: Array<{
    id: string;
    contractorName: string;
    contractPrice: number;
    status: string;
  }>;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  // Modal Thêm Dự án mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    projectCode: '',
    projectName: '',
    approvalDecision: '',
    legalDriveUrl: '',
    legalFileUrl: '',
  });

  // Modal Xem trước PDF
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Modal Xác nhận Xóa Dự án / Gói thầu
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'PROJECT' | 'PACKAGE';
    id: string;
    name: string;
    code?: string;
  } | null>(null);
  // Modal Chỉnh Sửa Dự Án
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    projectCode: '',
    projectName: '',
    approvalDecision: '',
    legalDriveUrl: '',
    legalFileUrl: '',
  });

  // Modal Chỉnh Sửa Nhanh Gói Thầu Con
  const [editingChildPkg, setEditingChildPkg] = useState<{
    id: string;
    packageName: string;
    packagePrice: string;
    status: string;
  } | null>(null);

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectForm({
      projectCode: project.projectCode,
      projectName: project.projectName,
      approvalDecision: project.approvalDecision,
      legalDriveUrl: project.legalDriveUrl || '',
      legalFileUrl: project.legalFileUrl || '',
    });
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProjectForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingProject(null);
        fetchProjects();
      } else {
        alert(data.error || 'Lỗi khi cập nhật dự án');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditChildPkg = (pkg: any) => {
    setEditingChildPkg({
      id: pkg.id,
      packageName: pkg.packageName,
      packagePrice: String(pkg.packagePrice),
      status: pkg.status,
    });
  };

  const handleEditChildPkgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChildPkg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bidding/${editingChildPkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: editingChildPkg.packageName,
          packagePrice: Number(editingChildPkg.packagePrice),
          status: editingChildPkg.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingChildPkg(null);
        fetchProjects();
      } else {
        alert(data.error || 'Lỗi khi cập nhật gói thầu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url =
        deleteTarget.type === 'PROJECT'
          ? `/api/projects/${deleteTarget.id}`
          : `/api/bidding/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteTarget(null);
        fetchProjects();
      } else {
        alert(data.error || 'Lỗi khi xóa dữ liệu');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setDeleting(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(data.data);
        // Tự động mở rộng dự án đầu tiên
        if (data.data.length > 0) {
          setExpandedProjects({ [data.data[0].id]: true });
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dự án:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateModalOpen(false);
        setFormData({
          projectCode: '',
          projectName: '',
          approvalDecision: '',
          legalDriveUrl: '',
          legalFileUrl: '',
        });
        fetchProjects();
      } else {
        alert(data.error || 'Lỗi tạo dự án');
      }
    } catch {
      alert('Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(search.toLowerCase()) ||
      p.approvalDecision.toLowerCase().includes(search.toLowerCase())
  );

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
            <FolderGit2 className="w-6 h-6 text-indigo-600" />
            <span>Danh Mục Dự Án Đầu Tư Xây Dựng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu trúc phân cấp Cây (Hierarchical Tree): Dự án &rarr; Gói thầu &rarr; Hợp đồng &rarr; Phụ lục
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Dự Án Mới</span>
        </button>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo Mã dự án, Tên dự án, Quyết định phê duyệt..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
        />
      </div>

      {/* Danh sách Cây Dự Án (Tree View) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 mt-2">Đang tải danh mục dự án...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          Không tìm thấy dự án nào phù hợp.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const isExpanded = !!expandedProjects[project.id];
            const pkgCount = project.biddingPackages?.length || 0;
            const contractCount = project.contracts?.length || 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Thanh Tiêu Đề Dự Án */}
                <div
                  onClick={() => toggleExpand(project.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                          {project.projectCode}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          QĐ: <strong>{project.approvalDecision}</strong>
                        </span>
                      </div>
                      <h3 className="font-bold text-sm md:text-base text-slate-900 truncate">
                        {project.projectName}
                      </h3>
                    </div>
                  </div>

                  {/* Badges số lượng gói & link hồ sơ */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      <Scale className="w-3.5 h-3.5 text-slate-500" />
                      <span>{pkgCount} gói thầu</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{contractCount} hợp đồng</span>
                    </span>

                    {(project.legalDriveUrl || project.legalFileUrl) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile({
                            url: project.legalDriveUrl || project.legalFileUrl!,
                            name: `Hồ sơ pháp lý: ${project.projectName}`,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Hồ sơ pháp lý</span>
                      </button>
                    )}

                    {/* Nút Chỉnh Sửa Dự Án */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditProject(project);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Chỉnh sửa dự án này"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Nút Xóa Dự Án */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          type: 'PROJECT',
                          id: project.id,
                          name: project.projectName,
                          code: project.projectCode,
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa dự án này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nội dung danh mục Gói thầu theo Cây (Tree Child) */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/50 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-indigo-600" />
                        <span>Các Gói Thầu Thuộc Dự Án ({pkgCount})</span>
                      </h4>
                    </div>

                    {pkgCount === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Chưa có gói thầu nào được tạo cho dự án này.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {project.biddingPackages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {pkg.status === 'AWARDED' ? 'ĐÃ CÓ KQLCNT' : pkg.status}
                                </span>
                                <span className="text-xs font-mono font-bold text-indigo-600">
                                  {formatCurrencyVN(pkg.packagePrice)}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800 line-clamp-2">
                                {pkg.packageName}
                              </h5>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              {pkg.contract ? (
                                <div className="flex items-center justify-between w-full pr-2 text-slate-600">
                                  <div className="truncate max-w-[180px]">
                                    HĐ: <strong className="text-slate-800">{pkg.contract.contractorName}</strong>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                                    {formatCurrencyVN(pkg.contract.contractPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                                  Chưa chuyển HĐ
                                </span>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditChildPkg(pkg)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Chỉnh sửa thông tin gói thầu"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'PACKAGE',
                                      id: pkg.id,
                                      name: pkg.packageName,
                                    })
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Xóa gói thầu này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm Dự án mới */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm Dự Án Đầu Tư Giao Thông Mới"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mã Dự Án (Unique) *
            </label>
            <input
              type="text"
              required
              placeholder="VD: DA-GT-2026-05"
              value={formData.projectCode}
              onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên Dự Án Giao Thông *
            </label>
            <textarea
              required
              rows={2}
              placeholder="VD: Dự án Nâng cấp, Mở rộng Tuyến Đường tỉnh 390 kết nối Cảng sông..."
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Số, Ngày Quyết Định Phê Duyệt Dự Án *
            </label>
            <input
              type="text"
              required
              placeholder="VD: 1234/QĐ-UBND ngày 15/01/2026 của UBND Tỉnh"
              value={formData.approvalDecision}
              onChange={(e) => setFormData({ ...formData, approvalDecision: e.target.value })}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <FileUploadInput
            label="Hồ Sơ Pháp Lý Dự Án (Link Drive hoặc Tải Tệp)"
            value={formData.legalDriveUrl || formData.legalFileUrl}
            onChange={(url) => {
              if (url.includes('drive.google.com')) {
                setFormData({ ...formData, legalDriveUrl: url, legalFileUrl: '' });
              } else {
                setFormData({ ...formData, legalFileUrl: url, legalDriveUrl: '' });
              }
            }}
          />

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
              <span>Lưu Dự Án</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xem trước tệp PDF / Google Drive */}
      {previewFile && (
        <PdfPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
        />
      )}

      {/* Modal Xác nhận Xóa Dự Án / Gói Thầu */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={`Xác Nhận Xóa ${deleteTarget.type === 'PROJECT' ? 'Dự Án' : 'Gói Thầu'}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed space-y-1">
                <p className="font-bold">Hành động này không thể hoàn tác!</p>
                <p>
                  Bạn có chắc chắn muốn xóa {deleteTarget.type === 'PROJECT' ? 'dự án' : 'gói thầu'}:
                </p>
                <p className="font-semibold text-rose-950 bg-rose-100/70 p-2 rounded">
                  {deleteTarget.code ? `[${deleteTarget.code}] ` : ''}
                  {deleteTarget.name}
                </p>
                {deleteTarget.type === 'PROJECT' && (
                  <p className="text-[11px] text-rose-700 italic">
                    * Lưu ý: Toàn bộ các gói thầu, hợp đồng và phụ lục thuộc dự án này cũng sẽ bị xóa khỏi hệ thống.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Chỉnh Sửa Dự Án */}
      {editingProject && (
        <Modal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          title="Chỉnh Sửa Thông Tin Dự Án"
          maxWidth="xl"
        >
          <form onSubmit={handleEditProjectSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mã Dự Án *
              </label>
              <input
                type="text"
                required
                value={editProjectForm.projectCode}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, projectCode: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Dự Án Giao Thông *
              </label>
              <textarea
                required
                rows={2}
                value={editProjectForm.projectName}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, projectName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số, Ngày Quyết Định Phê Duyệt Dự Án *
              </label>
              <input
                type="text"
                required
                value={editProjectForm.approvalDecision}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, approvalDecision: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <FileUploadInput
              label="Hồ Sơ Pháp Lý Dự Án (Link Drive hoặc Tải Tệp)"
              value={editProjectForm.legalDriveUrl || editProjectForm.legalFileUrl}
              onChange={(url) => {
                if (url.includes('drive.google.com')) {
                  setEditProjectForm({ ...editProjectForm, legalDriveUrl: url, legalFileUrl: '' });
                } else {
                  setEditProjectForm({ ...editProjectForm, legalFileUrl: url, legalDriveUrl: '' });
                }
              }}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
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
                <span>Cập Nhật Dự Án</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Chỉnh Sửa Nhanh Gói Thầu Con */}
      {editingChildPkg && (
        <Modal
          isOpen={!!editingChildPkg}
          onClose={() => setEditingChildPkg(null)}
          title="Chỉnh Sửa Gói Thầu"
          maxWidth="lg"
        >
          <form onSubmit={handleEditChildPkgSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tên Gói Thầu *
              </label>
              <textarea
                required
                rows={2}
                value={editingChildPkg.packageName}
                onChange={(e) => setEditingChildPkg({ ...editingChildPkg, packageName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Giá Dự Toán Gói Thầu Được Duyệt (VNĐ) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="VD: 180.365.295.321"
                  value={formatNumberWithDots(editingChildPkg.packagePrice)}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/[^\d]/g, '');
                    setEditingChildPkg({ ...editingChildPkg, packagePrice: rawDigits });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                />
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {editingChildPkg.packagePrice ? formatCurrencyVN(Number(editingChildPkg.packagePrice)) : 'Nhập chính xác từng đồng lẻ (VD: 180.365.295.321 đ)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Trạng Thái *
                </label>
                <select
                  value={editingChildPkg.status}
                  onChange={(e) => setEditingChildPkg({ ...editingChildPkg, status: e.target.value })}
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingChildPkg(null)}
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
