import React, { useState } from 'react';
import { Search, MapPin, ChevronDown, SlidersHorizontal, DollarSign, Briefcase, Globe, X } from 'lucide-react';
import { County, EmploymentType, OpportunityType, WorkplaceModel } from '../types';
import { LIBERIAN_COUNTIES } from '../data/seedData';
import { OPPORTUNITY_TYPES } from '../config/constants';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCounty: County | 'all';
  setSelectedCounty: (c: County | 'all') => void;
  selectedCategory: OpportunityType | 'all';
  setSelectedCategory: (cat: OpportunityType | 'all') => void;
  selectedEmploymentType: EmploymentType | 'all';
  setSelectedEmploymentType: (type: EmploymentType | 'all') => void;
  selectedWorkplaceModel: WorkplaceModel | 'all';
  setSelectedWorkplaceModel: (model: WorkplaceModel | 'all') => void;
  minSalary: string;
  setMinSalary: (val: string) => void;
  totalOpportunitiesCount: number;
  currency: 'USD' | 'LRD';
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCounty,
  setSelectedCounty,
  selectedCategory,
  setSelectedCategory,
  selectedEmploymentType,
  setSelectedEmploymentType,
  selectedWorkplaceModel,
  setSelectedWorkplaceModel,
  minSalary,
  setMinSalary,
  totalOpportunitiesCount,
  currency
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const categoryPills: { label: string; value: OpportunityType | 'all' }[] = [
    { label: 'All Opportunities', value: 'all' },
    ...OPPORTUNITY_TYPES.map(t => ({ label: t.label, value: t.id }))
  ];

  const hasActiveFilters =
    selectedCounty !== 'all' ||
    selectedCategory !== 'all' ||
    selectedEmploymentType !== 'all' ||
    selectedWorkplaceModel !== 'all' ||
    minSalary !== '' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCounty('all');
    setSelectedCategory('all');
    setSelectedEmploymentType('all');
    setSelectedWorkplaceModel('all');
    setMinSalary('');
  };

  return (
    <section className="bg-[#ECF3E9] rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 flex flex-col justify-center border border-[#D9E3D5] relative overflow-hidden shadow-xs mb-6">
      {/* Organic atmospheric blur elements */}
      <div className="absolute -right-10 -top-10 w-72 h-72 bg-[#A3B18A] opacity-25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#DDA15E] opacity-15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 backdrop-blur-xs rounded-full text-xs font-semibold text-[#4F772D] mb-3 border border-[#D9E3D5]">
          <span className="w-2 h-2 rounded-full bg-[#4F772D] animate-pulse"></span>
          Liberia's Verified Opportunity Marketplace • 15 Counties
        </div>

        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#132A13] mb-3 sm:mb-4 leading-tight">
          Discover verified careers & <br className="hidden sm:inline" />
          <span className="italic text-[#283618]">economic opportunities across Liberia.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#606C38] mb-6 max-w-xl">
          Browse {totalOpportunitiesCount}+ verified vacancies, institutional tenders, and consultancies with transparent compensation and localized county matching.
        </p>

        {/* Primary Integrated Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-white p-2 rounded-2xl shadow-sm border border-[#E8E4D9] w-full">
          <div className="flex-1 flex items-center px-3 gap-2.5">
            <Search className="w-5 h-5 text-[#A3B18A] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, organization, skill, or keyword..."
              className="w-full outline-none text-xs sm:text-sm bg-transparent text-[#2D2D2D] placeholder-[#A3B18A]"
            />
          </div>

          <div className="hidden sm:block w-px h-8 bg-[#E8E4D9] my-auto"></div>

          {/* County Selector */}
          <div className="flex-none flex items-center px-3 py-1 sm:py-0 gap-1.5 text-xs sm:text-sm text-[#606C38] border-t sm:border-t-0 border-[#E8E4D9]">
            <MapPin className="w-4 h-4 text-[#A3B18A] shrink-0" />
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value as County | 'all')}
              className="bg-transparent outline-none cursor-pointer font-medium text-[#283618]"
            >
              <option value="all">All 15 Counties</option>
              {LIBERIAN_COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county} County
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showAdvancedFilters || (selectedEmploymentType !== 'all' || selectedWorkplaceModel !== 'all' || minSalary !== '')
                  ? 'bg-[#283618] text-white border-[#283618]'
                  : 'bg-[#F9F8F6] text-[#606C38] border-[#E8E4D9] hover:bg-[#EBE9E1]'
              }`}
              title="Toggle filter controls"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden md:inline">Filters</span>
            </button>

            <button
              onClick={() => {}}
              className="bg-[#BC6C25] hover:bg-[#a65d1d] text-white px-5 sm:px-7 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="mt-3 p-4 bg-white/95 backdrop-blur-xs rounded-2xl border border-[#D9E3D5] shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Employment Type */}
            <div>
              <label className="block text-[11px] font-bold text-[#283618] mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#4F772D]" />
                <span>Employment Type</span>
              </label>
              <select
                value={selectedEmploymentType}
                onChange={(e) => setSelectedEmploymentType(e.target.value as EmploymentType | 'all')}
                className="w-full p-2 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] text-xs outline-none text-[#283618]"
              >
                <option value="all">All Employment Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract / Consultancy</option>
                <option value="temporary">Temporary / Seasonal</option>
                <option value="internship">Internship / Graduate</option>
              </select>
            </div>

            {/* Workplace Model */}
            <div>
              <label className="block text-[11px] font-bold text-[#283618] mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#4F772D]" />
                <span>Workplace Model</span>
              </label>
              <select
                value={selectedWorkplaceModel}
                onChange={(e) => setSelectedWorkplaceModel(e.target.value as WorkplaceModel | 'all')}
                className="w-full p-2 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] text-xs outline-none text-[#283618]"
              >
                <option value="all">All Workplace Models</option>
                <option value="on_site">On-Site Only</option>
                <option value="hybrid">Hybrid (Field / Remote)</option>
                <option value="remote">100% Fully Remote</option>
              </select>
            </div>

            {/* Min Salary */}
            <div>
              <label className="block text-[11px] font-bold text-[#283618] mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#BC6C25]" />
                <span>Min Compensation ({currency})</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 1000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="w-full p-2 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] text-xs outline-none"
              />
            </div>
          </div>
        )}

        {/* Quick Category Filtering Chips */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-4 no-scrollbar">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categoryPills.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setSelectedCategory(pill.value)}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === pill.value
                    ? 'bg-[#283618] text-white border-[#283618] font-semibold'
                    : 'bg-white/80 text-[#606C38] border-[#D9E3D5] hover:bg-white hover:text-[#283618]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#BC6C25] hover:underline font-semibold whitespace-nowrap flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
