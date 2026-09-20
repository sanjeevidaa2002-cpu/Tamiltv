'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Section, Video } from '@/lib/types';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  toggleSectionStatus,
  reorderSections,
} from '@/lib/videoService';
import { SectionIcon, SECTION_ICONS_LIST } from '@/components/SectionIcon';
import { generateSlug } from '@/lib/formatters';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Film,
  X,
  ExternalLink,
} from 'lucide-react';

interface AdminSectionManagerProps {
  videos: Video[];
  onRefreshNeeded?: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const COLOR_PRESETS = [
  '#E50914', // Red
  '#00C49F', // Teal
  '#8884D8', // Purple
  '#FFBB28', // Gold
  '#FF8042', // Orange
  '#0088FE', // Blue
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
];

export function AdminSectionManager({
  videos,
  onRefreshNeeded,
  showToast,
}: AdminSectionManagerProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('Film');
  const [formColor, setFormColor] = useState('#E50914');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch sections
  const loadSections = useCallback(async () => {
    try {
      const data = await getSections(true);
      setSections(data);
    } catch (err) {
      console.error('Failed to load sections:', err);
      showToast('Could not load sections', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    getSections(true)
      .then((data) => {
        if (isMounted) {
          setSections(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load sections:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormIcon('Film');
    setFormColor('#E50914');
    setFormDisplayOrder(sections.length + 1);
    setFormStatus('enabled');
    setSlugManuallyEdited(false);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (sec: Section) => {
    setEditingSection(sec);
    setFormName(sec.name);
    setFormSlug(sec.slug);
    setFormDesc(sec.description || '');
    setFormIcon(sec.icon || 'Film');
    setFormColor(sec.color || '#E50914');
    setFormDisplayOrder(sec.display_order ?? 1);
    setFormStatus(sec.status);
    setSlugManuallyEdited(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!slugManuallyEdited) {
      setFormSlug(generateSlug(val));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Section name is required', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await createSection({
        name: formName.trim(),
        slug: formSlug ? generateSlug(formSlug) : generateSlug(formName),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        display_order: Number(formDisplayOrder) || sections.length + 1,
        status: formStatus,
      });

      showToast(`Section "${formName}" created successfully`);
      setIsCreateModalOpen(false);
      await loadSections();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create section', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    if (!formName.trim()) {
      showToast('Section name is required', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await updateSection(editingSection.id, {
        name: formName.trim(),
        slug: formSlug ? generateSlug(formSlug) : generateSlug(formName),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        display_order: Number(formDisplayOrder),
        status: formStatus,
      });

      showToast(`Section "${formName}" updated successfully`);
      setEditingSection(null);
      await loadSections();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update section', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingSection) return;
    setIsProcessing(true);
    try {
      await deleteSection(deletingSection.id);
      showToast(`Section "${deletingSection.name}" deleted. Videos remain preserved.`);
      setDeletingSection(null);
      await loadSections();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete section', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (sec: Section) => {
    const newStatus = sec.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await toggleSectionStatus(sec.id, newStatus);
      showToast(`Section "${sec.name}" ${newStatus}`);
      await loadSections();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic update
    setSections(reordered);

    try {
      await reorderSections(reordered.map((s) => s.id));
      showToast('Section display order updated');
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      showToast('Failed to save display order', 'error');
      loadSections();
    }
  };

  // Section analytics
  const getSectionStats = (sec: Section) => {
    const assigned = videos.filter(
      (v) => (v.sectionIds || []).includes(sec.id) || (v.sectionIds || []).includes(sec.slug)
    );
    const views = assigned.reduce((acc, curr) => acc + (curr.views || 0), 0);
    return { count: assigned.length, views };
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Section Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-red-500" />
            <span>Dynamic Section Management</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Create, order, and customize categories and sections. Active sections automatically populate the user navigation and homepage rows.
          </p>
        </div>

        <button
          type="button"
          id="btn-create-section"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Section</span>
        </button>
      </div>

      {/* Sections List Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">Order</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4">Slug & URL</th>
                <th className="py-3.5 px-4 text-center">Videos</th>
                <th className="py-3.5 px-4 text-center">Total Views</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Loading video sections...
                  </td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No sections created yet. Click &quot;Add New Section&quot; to create one.
                  </td>
                </tr>
              ) : (
                sections.map((sec, idx) => {
                  const stats = getSectionStats(sec);
                  const isFirst = idx === 0;
                  const isLast = idx === sections.length - 1;

                  return (
                    <tr
                      key={sec.id}
                      id={`section-row-${sec.id}`}
                      className="transition hover:bg-zinc-800/40"
                    >
                      {/* Order Controls */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-zinc-400 w-5">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveOrder(idx, 'up')}
                              title="Move Up"
                              className="text-zinc-500 hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveOrder(idx, 'down')}
                              title="Move Down"
                              className="text-zinc-500 hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow"
                            style={{ backgroundColor: sec.color || '#E50914' }}
                          >
                            <SectionIcon name={sec.icon} className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{sec.name}</p>
                            {sec.description && (
                              <p className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">
                                {sec.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-400 text-xs">
                          <span>/section/{sec.slug}</span>
                          <a
                            href={`/section/${sec.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white"
                            title="Preview Section Page"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>

                      {/* Video Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                          {stats.count}
                        </span>
                      </td>

                      {/* Total Views */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-zinc-300">
                        {stats.views.toLocaleString()}
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          id={`toggle-status-${sec.id}`}
                          onClick={() => handleToggleStatus(sec)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                            sec.status === 'enabled'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              sec.status === 'enabled' ? 'bg-emerald-400' : 'bg-zinc-500'
                            }`}
                          />
                          <span>{sec.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            id={`edit-section-${sec.id}`}
                            onClick={() => openEditModal(sec)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                            title="Edit Section"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            id={`delete-section-${sec.id}`}
                            onClick={() => setDeletingSection(sec)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                            title="Delete Section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SECTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-red-500" />
                <span>Create New Video Section</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Movies, Sports, Tech, Anime"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Slug (URL path)
                </label>
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3">
                  <span className="text-xs text-zinc-500 font-mono">/section/</span>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setFormSlug(generateSlug(e.target.value));
                    }}
                    placeholder="movies"
                    className="w-full bg-transparent py-2.5 text-sm font-mono text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Brief description displayed on the section header page..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Section Icon
                </label>
                <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-zinc-800 bg-zinc-950">
                  {SECTION_ICONS_LIST.map(({ name, label, Icon }) => {
                    const isSelected = formIcon.toLowerCase() === name.toLowerCase();
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormIcon(name)}
                        title={label}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] mt-1 truncate max-w-full">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition ${
                          formColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-zinc-800 bg-transparent p-0.5"
                  />
                </div>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                  >
                    <option value="enabled">Enabled (Visible)</option>
                    <option value="disabled">Disabled (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:bg-red-500 transition disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SECTION MODAL */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-red-500" />
                <span>Edit Section: {editingSection.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Slug (URL path)
                </label>
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3">
                  <span className="text-xs text-zinc-500 font-mono">/section/</span>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(generateSlug(e.target.value))}
                    className="w-full bg-transparent py-2.5 text-sm font-mono text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Section Icon
                </label>
                <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-zinc-800 bg-zinc-950">
                  {SECTION_ICONS_LIST.map(({ name, label, Icon }) => {
                    const isSelected = formIcon.toLowerCase() === name.toLowerCase();
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormIcon(name)}
                        title={label}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] mt-1 truncate max-w-full">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition ${
                          formColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-zinc-800 bg-transparent p-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 focus:border-red-500 focus:outline-none"
                  >
                    <option value="enabled">Enabled (Visible)</option>
                    <option value="disabled">Disabled (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:bg-red-500 transition disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SECTION CONFIRMATION MODAL */}
      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Delete Section &quot;{deletingSection.name}&quot;?
                </h3>
                <p className="text-xs text-zinc-400">This action removes the section and its navigation tab.</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 mb-5 text-xs text-zinc-300 space-y-1.5">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Videos will NOT be deleted</span>
              </p>
              <p className="text-zinc-400 text-[11px]">
                All videos assigned to this section will remain safely in the system, catalog, and any other sections they belong to.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSection(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDeleteSubmit}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 shadow-md shadow-red-600/30 transition disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
