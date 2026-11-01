import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Layers,
  Clock,
  Archive,
  Search,
  ChevronDown,
  Eye,
  Download,
  MoreVertical,
  X,
  FileText,
  Calendar,
  User,
  Tag,
  Upload,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Guideline } from '../../../types';
import { api } from '@/services/api';

export const BrandGuidelinesView: React.FC = () => {
  const {
    guidelines,
    selectedGuideline,
    setSelectedGuideline,
    searchQuery,
    showToast,
    refresh,
  } = useApp();

  // Derived from the live guideline library — no hardcoded counts.
  const activeCount = guidelines.filter((g) => g.status === 'Active').length;
  const pendingCount = guidelines.filter((g) => g.status === 'Pending' || g.status === 'Draft').length;
  const archivedCount = guidelines.filter((g) => g.status === 'Archived').length;
  const categoryCount = (c: string) => guidelines.filter((g) => g.category === c).length;

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Archived'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Brand Identity');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGuide = selectedGuideline || guidelines[0];

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showToast('Please enter a guideline title.', 'error');
      return;
    }
    if (!uploadFile) {
      showToast('Please select a PDF or DOCX document to upload.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showToast('Uploading guideline document...', 'info');
      await api.uploadGuidelineFile(uploadFile, uploadTitle.trim(), uploadCategory, uploadDescription.trim());
      showToast(`Guideline "${uploadTitle}" uploaded and indexed successfully!`, 'success');
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      await refresh();
    } catch {
      showToast('Failed to upload guideline.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!activeGuide) return;
    const newStatus = activeGuide.status === 'Active' ? 'Archived' : 'Active';
    try {
      showToast(`Setting status to ${newStatus}...`, 'info');
      await api.setDocStatus(activeGuide.id, newStatus as any);
      showToast(`Guideline status updated to ${newStatus}.`, 'success');
      await refresh();
    } catch {
      showToast('Status update failed.', 'error');
    }
  };

  const handleDownloadDoc = async (guide: Guideline) => {
    try {
      showToast(`Downloading ${guide.title}...`, 'info');
      const blobUrl = await api.fetchGuidelineBlobUrl(guide.id);
      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${guide.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Document downloaded successfully!', 'success');
      } else {
        // Fallback text summary download
        const textBlob = new Blob([`# ${guide.title}\nCategory: ${guide.category}\nVersion: ${guide.version}\nStatus: ${guide.status}\nOwner: ${guide.owner}\n\n${guide.description}`], { type: 'text/markdown' });
        const url = URL.createObjectURL(textBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${guide.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_summary.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Guideline summary downloaded.', 'success');
      }
    } catch {
      showToast('Download failed.', 'error');
    }
  };

  const filtered = guidelines.filter((g) => {
    if (activeCategory !== 'All' && g.category !== activeCategory) return false;
    if (statusFilter !== 'All' && g.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Guidelines Grid Area */}
      <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-[#F7F3EA]">
        {/* Header with Title and Upload button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 leading-snug">Brand Guidelines</h2>
            <p className="text-xs text-muted mt-0.5">
              Browse and manage official brand guidelines, policies and standards.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>

        {/* Metric Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Guidelines */}
          <div className="bg-white rounded-2xl border border-line/80 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Total Guidelines</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{guidelines.length}</h3>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-14 h-4 text-emerald-500 stroke-current fill-none stroke-2 mt-1" viewBox="0 0 50 15">
                <path d="M0,12 Q15,14 25,6 T50,2" />
              </svg>
            </div>
          </div>

          {/* Active Versions */}
          <div className="bg-white rounded-2xl border border-line/80 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Active Versions</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{activeCount}</h3>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-14 h-4 text-emerald-500 stroke-current fill-none stroke-2 mt-1" viewBox="0 0 50 15">
                <path d="M0,10 Q20,12 35,4 T50,2" />
              </svg>
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white rounded-2xl border border-line/80 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Pending Review</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{pendingCount}</h3>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-14 h-4 text-rose-400 stroke-current fill-none stroke-2 mt-1" viewBox="0 0 50 15">
                <path d="M0,4 Q20,6 35,12 T50,14" />
              </svg>
            </div>
          </div>

          {/* Archived */}
          <div className="bg-white rounded-2xl border border-line/80 p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-grape-50 flex items-center justify-center text-grape-600 shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted">Archived</p>
                <h3 className="text-2xl font-bold text-ink-900 leading-tight">{archivedCount}</h3>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-medium text-muted-light">live</span>
              <svg className="w-14 h-4 text-grape-500 stroke-current fill-none stroke-2 mt-1" viewBox="0 0 50 15">
                <path d="M0,8 Q20,8 35,8 T50,8" />
              </svg>
            </div>
          </div>
        </section>

        {/* Category Pills Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'All', label: `All (${guidelines.length})` },
            { id: 'Brand Identity', label: `Brand Identity (${categoryCount('Brand Identity')})` },
            { id: 'Messaging & Tone', label: `Messaging & Tone (${categoryCount('Messaging & Tone')})` },
            { id: 'Visual Standards', label: `Visual Standards (${categoryCount('Visual Standards')})` },
            { id: 'Product Claims', label: `Product Claims (${categoryCount('Product Claims')})` },
            { id: 'Legal & Compliance', label: `Legal & Compliance (${categoryCount('Legal & Compliance')})` },
            { id: 'Marketing Assets', label: `Marketing Assets (${categoryCount('Marketing Assets')})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`font-medium text-xs px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-[#FAF7EF] text-ink-600 border border-line'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search and Dropdowns Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-line px-3 py-1.5 rounded-xl text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
              <span>All Versions</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
            <button className="flex items-center space-x-2 bg-white border border-line px-3 py-1.5 rounded-xl text-xs font-medium text-ink-700 hover:bg-[#FAF7EF]">
              <span>All Status</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-muted">
            <span>Sort by:</span>
            <button className="font-semibold text-ink-700 flex items-center space-x-1 hover:text-ink-900">
              <span>Last Updated</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-light" />
            </button>
          </div>
        </div>

        {/* Guidelines Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const isSelected = activeGuide?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedGuideline(item);
                  setIsDrawerOpen(true);
                }}
                className={`bg-white rounded-2xl border overflow-hidden shadow-2xs hover:shadow transition cursor-pointer flex flex-col ${
                  isSelected ? 'ring-2 ring-brand-500 border-transparent' : 'border-line'
                }`}
              >
                <div className="relative h-32 bg-[#F1ECE0] overflow-hidden">
                  <img
                    alt={item.title}
                    className="w-full h-full object-cover"
                    src={item.thumbnail}
                  />
                  <span
                    className={`absolute top-2.5 right-2.5 backdrop-blur-xs font-semibold text-[10px] px-2 py-0.5 rounded-full flex items-center border ${
                      item.status === 'Active'
                        ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/60'
                        : item.status === 'Pending'
                        ? 'bg-amber-50/90 text-amber-700 border-amber-200/60'
                        : 'bg-grape-50/90 text-grape-700 border-grape-100/60'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        item.status === 'Active'
                          ? 'bg-emerald-500'
                          : item.status === 'Pending'
                          ? 'bg-amber-500'
                          : 'bg-grape-500'
                      }`}
                    />
                    {item.status}
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-ink-900 text-xs">{item.title}</h4>
                    <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center space-x-3 text-[11px] text-muted-light pb-3 border-b border-[#F1ECE0]">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {item.version}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.lastUpdated}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGuideline(item);
                            setIsDrawerOpen(true);
                          }}
                          className="inline-flex items-center text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50/60 px-2 py-1 rounded-md"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDoc(item);
                          }}
                          className="inline-flex items-center text-[11px] font-semibold text-ink-600 hover:text-ink bg-[#FAF7EF] px-2 py-1 rounded-md cursor-pointer"
                        >
                          <Download className="w-3 h-3 mr-1" /> Download
                        </button>
                      </div>
                      <button className="text-muted-light hover:text-ink-600 p-1">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right Detail Drawer */}
      {isDrawerOpen && activeGuide && (
        <aside className="w-80 bg-white border-l border-line flex flex-col shrink-0 z-20 overflow-y-auto shadow-lg">
          {/* Header with Close Button */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#F1ECE0]">
            <h3 className="font-bold text-ink-900 text-sm">Guideline Details</h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-muted-light hover:text-ink-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-5 space-y-5">
            {/* Guideline Large Preview Image */}
            <div className="rounded-2xl overflow-hidden bg-[#F1ECE0] border border-[#F1ECE0] aspect-video relative">
              <img
                alt={activeGuide.title}
                className="w-full h-full object-cover"
                src={activeGuide.thumbnail}
              />
            </div>

            {/* Detail Title & Status */}
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-ink-900 text-base">{activeGuide.title}</h4>
                <span className="bg-emerald-50 text-emerald-700 font-semibold text-[11px] px-2 py-0.5 rounded-full border border-emerald-200/50">
                  {activeGuide.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">{activeGuide.description}</p>
            </div>

            {/* Specification Details List */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted">
                  <FileText className="w-4 h-4 mr-2.5 text-muted-light" />
                  <span>Version</span>
                </div>
                <span className="font-semibold text-ink">{activeGuide.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted">
                  <Calendar className="w-4 h-4 mr-2.5 text-muted-light" />
                  <span>Last Updated</span>
                </div>
                <span className="font-semibold text-ink">{activeGuide.lastUpdated}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted">
                  <User className="w-4 h-4 mr-2.5 text-muted-light" />
                  <span>Owner</span>
                </div>
                <span className="font-semibold text-ink">{activeGuide.owner}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted">
                  <Tag className="w-4 h-4 mr-2.5 text-muted-light" />
                  <span>Category</span>
                </div>
                <span className="font-semibold text-ink">{activeGuide.category}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleDownloadDoc(activeGuide)}
                className="w-full bg-white border border-brand-600 text-brand-600 hover:bg-brand-50/50 font-semibold py-2 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors text-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF / Text</span>
              </button>
              <button
                onClick={handleStatusToggle}
                className="w-full bg-white border border-line text-ink-700 hover:bg-[#FAF7EF] font-semibold py-2 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors text-xs cursor-pointer"
              >
                <Archive className="w-4 h-4 text-muted" />
                <span>{activeGuide.status === 'Active' ? 'Archive Guideline' : 'Activate Guideline'}</span>
              </button>
            </div>

            {/* Related Guidelines Section */}
            {activeGuide.relatedGuidelines && activeGuide.relatedGuidelines.length > 0 && (
              <div className="pt-3 border-t border-[#F1ECE0]">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-bold text-ink-900 text-xs">Related Guidelines</h5>
                  <button className="text-brand-600 font-semibold text-[11px] hover:underline flex items-center">
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {activeGuide.relatedGuidelines.map((rel) => (
                    <div
                      key={rel.title}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF7EF] transition-colors border border-transparent hover:border-[#F1ECE0] cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <img alt={rel.title} className="w-10 h-10 rounded-lg object-cover" src={rel.thumbnail} />
                        <div>
                          <div className="font-semibold text-ink text-xs">{rel.title}</div>
                          <div className="text-[10px] text-muted-light">{rel.version}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-light" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Upload Guideline Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-[#FAF7EF]">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-ink text-sm">Upload Guideline Document</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-muted-light hover:text-ink p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PureGlow Brand Identity Standards v3.0"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                >
                  <option value="Brand Identity">Brand Identity</option>
                  <option value="Messaging & Tone">Messaging & Tone</option>
                  <option value="Visual Standards">Visual Standards</option>
                  <option value="Product Claims">Product Claims</option>
                  <option value="Legal & Compliance">Legal & Compliance</option>
                  <option value="Marketing Assets">Marketing Assets</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Description / Scope Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of brand rules, typography constraints, or color specifications contained..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Document File (PDF or DOCX) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
                <p className="text-[10px] text-muted-light mt-1">
                  Supports PDF or DOCX files. Document text will be extracted and embedded into the Evidence vector store.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isUploading ? 'Uploading & Indexing...' : 'Upload & Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
