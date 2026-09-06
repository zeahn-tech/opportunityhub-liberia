import React, { useState } from 'react';
import { Opportunity, EmploymentType, WorkplaceModel, County } from '../../types';
import { OPPORTUNITY_TYPES } from '../../config/constants';
import {
  Briefcase,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Search,
  Filter,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';

interface JobManagementDashboardProps {
  opportunities: Opportunity[];
  onOpenCreateModal: () => void;
  onEditOpportunity: (opp: Opportunity) => void;
  onPublishOpportunity: (id: string) => Promise<void>;
  onUnpublishOpportunity: (id: string) => Promise<void>;
  onCloseOpportunity: (id: string) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
  onDuplicateOpportunity: (id: string) => Promise<void>;
  onViewOpportunity: (opp: Opportunity) => void;
}

export const JobManagementDashboard: React.FC<JobManagementDashboardProps> = ({
  opportunities,
  onOpenCreateModal,
  onEditOpportunity,
  onPublishOpportunity,
  onUnpublishOpportunity,
  onCloseOpportunity,
  onDeleteOpportunity,
  onDuplicateOpportunity,
  onViewOpportunity
}) => {
  const { session, activeRole } = useAuth();
  const { showToast } = useToast();
  const { currency } = useConfig();

  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'expired' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County | 'all'>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const activeOrg = session?.activeOrganization;
  const isPlatformAdmin = activeRole === 'platform_admin' || session?.user?.systemRole === 'platform_admin';

  // Strict Tenant Isolation: filter opportunities to only those belonging to user's authorized organization
  const tenantOpportunities = opportunities.filter((opp) => {
    if (isPlatformAdmin) return true;
    if (!activeOrg) return false;
    return opp.organizationId === activeOrg.id;
  });

  const filteredOpportunities = tenantOpportunities.filter((opp) => {
    if (activeTab !== 'all' && opp.status !== activeTab) return false;
    if (selectedCounty !== 'all' && opp.county !== selectedCounty) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchType = opp.type.toLowerCase().includes(q);
      const matchCounty = opp.county.toLowerCase().includes(q);
      return matchTitle || matchType || matchCounty;
    }
    return true;
  });

  const countByStatus = {
    all: tenantOpportunities.length,
    published: tenantOpportunities.filter((o) => o.status === 'published').length,
    draft: tenantOpportunities.filter((o) => o.status === 'draft').length,
    expired: tenantOpportunities.filter((o) => o.status === 'expired').length,
    closed: tenantOpportunities.filter((o) => o.status === 'closed').length
  };

  const handleAction = async (id: string, actionFn: (id: string) => Promise<void>, successMsg: string) => {
    try {
      setIsProcessing(id);
      await actionFn(id);
      showToast(successMsg, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showToast(msg, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#ECF3E9] p-6 sm:p-8 rounded-[32px] border border-[#D9E3D5] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D] mb-1.5">
            <Building2 className="w-4 h-4" />
            <span>
              {activeOrg ? `${activeOrg.name} • Employer Hub` : 'Institutional Opportunity Console'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#132A13]">
            Opportunity Management
          </h2>
          <p className="text-xs sm:text-sm text-[#606C38] mt-1 max-w-xl">
            Author, edit, publish, track deadlines, and govern all opportunity postings across Liberia with strict tenant authorization.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-6 py-3 bg-[#283618] hover:bg-[#132A13] text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Posting</span>
        </button>
      </div>

      {/* Metric Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#283618]/10 flex items-center justify-center text-[#283618]">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#132A13]">{countByStatus.all}</div>
            <div className="text-[11px] font-medium text-[#606C38]">Total Postings</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-800">{countByStatus.published}</div>
            <div className="text-[11px] font-medium text-[#606C38]">Live & Published</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-800">{countByStatus.draft}</div>
            <div className="text-[11px] font-medium text-[#606C38]">Drafts</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{countByStatus.expired + countByStatus.closed}</div>
            <div className="text-[11px] font-medium text-[#606C38]">Expired / Closed</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] shadow-2xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(
            [
              { id: 'all', label: 'All Postings', count: countByStatus.all },
              { id: 'published', label: 'Published', count: countByStatus.published },
              { id: 'draft', label: 'Drafts', count: countByStatus.draft },
              { id: 'expired', label: 'Expired', count: countByStatus.expired },
              { id: 'closed', label: 'Closed', count: countByStatus.closed }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#283618] text-white border-[#283618]'
                  : 'bg-[#F9F8F6] text-[#606C38] border-[#E8E4D9] hover:bg-[#EBE9E1]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#E8E4D9] text-[#283618]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & County Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#606C38] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs outline-none focus:border-[#4F772D]"
            />
          </div>
        </div>
      </div>

      {/* Opportunity Items Table / List */}
      <div className="space-y-3">
        {filteredOpportunities.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-[#E8E4D9] shadow-2xs space-y-3">
            <Briefcase className="w-10 h-10 text-[#A3B18A] mx-auto opacity-50" />
            <h3 className="text-base font-serif font-bold text-[#132A13]">No Opportunities Found</h3>
            <p className="text-xs text-[#606C38] max-w-md mx-auto">
              {activeTab === 'draft'
                ? 'You do not currently have any draft postings.'
                : activeTab === 'published'
                ? 'No published opportunities match your criteria.'
                : 'Get started by publishing a new job vacancy or procurement tender.'}
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-2 px-5 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Posting</span>
            </button>
          </div>
        ) : (
          filteredOpportunities.map((opp) => {
            const isTodayExpired = opp.deadline && new Date(opp.deadline) < new Date();
            const effectiveStatus = opp.status === 'published' && isTodayExpired ? 'expired' : opp.status;

            return (
              <div
                key={opp.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E4D9] hover:border-[#A3B18A] shadow-2xs transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        effectiveStatus === 'published'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : effectiveStatus === 'draft'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : effectiveStatus === 'expired'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {effectiveStatus}
                    </span>

                    <span className="px-2 py-0.5 bg-[#FEFAE0] text-[#BC6C25] rounded-full text-[10px] font-semibold border border-[#E8E4D9] uppercase">
                      {OPPORTUNITY_TYPES.find(t => t.id === opp.type)?.label || opp.type?.replace('_', ' ')}
                    </span>

                    {opp.employmentType && (
                      <span className="px-2 py-0.5 bg-[#F2F2EC] text-[#606C38] rounded-full text-[10px] capitalize">
                        {opp.employmentType?.replace('_', ' ')}
                      </span>
                    )}

                    <span className="text-xs text-[#606C38] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#A3B18A]" />
                      {opp.county} County
                    </span>
                  </div>

                  <h3
                    onClick={() => onViewOpportunity(opp)}
                    className="text-base sm:text-lg font-bold text-[#132A13] hover:text-[#4F772D] transition-colors cursor-pointer truncate"
                  >
                    {opp.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#606C38]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#A3B18A]" />
                      <span>Deadline: {opp.deadline || 'Rolling'}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#A3B18A]" />
                      <span>{opp.applicationsCount} Applicants</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#A3B18A]" />
                      <span>{opp.viewsCount} Views</span>
                    </span>

                    {opp.salaryMin ? (
                      <span className="text-[#BC6C25] font-semibold flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>
                          {opp.currency} {opp.salaryMin.toLocaleString()}
                          {opp.salaryMax ? ` - ${opp.salaryMax.toLocaleString()}` : '+'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#606C38] italic">Compensation Negotiable</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                  {/* View Details */}
                  <button
                    onClick={() => onViewOpportunity(opp)}
                    title="View public preview"
                    className="p-2 bg-[#F9F8F6] hover:bg-[#EBE9E1] text-[#283618] rounded-xl border border-[#E8E4D9] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEditOpportunity(opp)}
                    title="Edit vacancy parameters"
                    className="p-2 bg-[#F9F8F6] hover:bg-[#EBE9E1] text-[#283618] rounded-xl border border-[#E8E4D9] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#4F772D]" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  {/* Lifecycle status toggles */}
                  {effectiveStatus === 'draft' ? (
                    <button
                      disabled={isProcessing === opp.id}
                      onClick={() =>
                        handleAction(opp.id, onPublishOpportunity, `"${opp.title}" published!`)
                      }
                      className="px-3 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </button>
                  ) : effectiveStatus === 'published' ? (
                    <button
                      disabled={isProcessing === opp.id}
                      onClick={() =>
                        handleAction(opp.id, onUnpublishOpportunity, `"${opp.title}" saved to drafts.`)
                      }
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Unpublish</span>
                    </button>
                  ) : null}

                  {effectiveStatus !== 'closed' && (
                    <button
                      disabled={isProcessing === opp.id}
                      onClick={() =>
                        handleAction(opp.id, onCloseOpportunity, `"${opp.title}" marked as closed.`)
                      }
                      className="p-2 hover:bg-stone-100 text-stone-600 rounded-xl border border-stone-200 text-xs font-semibold"
                      title="Close vacancy"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Duplicate */}
                  <button
                    disabled={isProcessing === opp.id}
                    onClick={() =>
                      handleAction(opp.id, onDuplicateOpportunity, `Duplicated as draft!`)
                    }
                    title="Duplicate as new draft"
                    className="p-2 hover:bg-[#EBE9E1] text-[#606C38] rounded-xl border border-[#E8E4D9] text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    disabled={isProcessing === opp.id}
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete "${opp.title}"?`)) {
                        handleAction(opp.id, onDeleteOpportunity, `Posting deleted.`);
                      }
                    }}
                    title="Delete permanently"
                    className="p-2 hover:bg-red-50 text-red-600 rounded-xl border border-red-200 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
