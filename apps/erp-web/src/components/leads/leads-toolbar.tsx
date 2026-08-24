"use client";

import type {
  DateRangeFilter,
  LeadSourceFilter,
  PipelineColumnId,
} from "./types";

export function LeadsToolbar({
  search,
  status,
  dateRange,
  source,
  onSearchChange,
  onStatusChange,
  onDateRangeChange,
  onSourceChange,
}: {
  search: string;
  status: PipelineColumnId | "all";
  dateRange: DateRangeFilter;
  source: LeadSourceFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PipelineColumnId | "all") => void;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onSourceChange: (value: LeadSourceFilter) => void;
}) {
  return (
    <div className="leads-toolbar">
      <label className="leads-search">
        <span className="visually-hidden">Search leads</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by customer, event type, or enquiry…"
          type="search"
          value={search}
        />
      </label>
      <div className="leads-filters">
        <label className="leads-filter">
          <span className="visually-hidden">Status</span>
          <select
            onChange={(event) =>
              onStatusChange(event.target.value as PipelineColumnId | "all")
            }
            value={status}
          >
            <option value="all">All Statuses</option>
            <option value="new_enquiry">New Enquiry</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="lost">Lost</option>
          </select>
        </label>
        <label className="leads-filter">
          <span className="visually-hidden">Date range</span>
          <select
            onChange={(event) =>
              onDateRangeChange(event.target.value as DateRangeFilter)
            }
            value={dateRange}
          >
            <option value="all">Date Range</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>
        <label className="leads-filter">
          <span className="visually-hidden">Lead source</span>
          <select
            onChange={(event) =>
              onSourceChange(event.target.value as LeadSourceFilter)
            }
            value={source}
          >
            <option value="all">Lead Source</option>
            <option value="mobile_app">Mobile App</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="referral">Referral</option>
            <option value="campaign">Campaign</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
    </div>
  );
}
