export type County =
  | 'Montserrado'
  | 'Nimba'
  | 'Bong'
  | 'Grand Bassa'
  | 'Margibi'
  | 'Maryland'
  | 'Lofa'
  | 'Bomi'
  | 'Grand Cape Mount'
  | 'Sinoe'
  | 'Grand Gedeh'
  | 'River Gee'
  | 'Grand Kru'
  | 'Rivercess'
  | 'Gbarpolu';

export type OpportunityType =
  | 'job'
  | 'internship'
  | 'scholarship'
  | 'fellowship'
  | 'training'
  | 'contract'
  | 'tender'
  | 'consultancy'
  | 'grant'
  | 'partnership'
  | 'business_sale'
  | 'investment'
  | 'volunteer';

export type WorkplaceModel = 'on_site' | 'hybrid' | 'remote';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'temporary'
  | 'internship';

export type VerificationBadge =
  | 'verified_company'
  | 'verified_ngo'
  | 'verified_government'
  | 'verified_recruiter'
  | 'verified_business'
  | 'verified_enterprise';

export type ApplicationStage =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type UserRole =
  | 'job_seeker'
  | 'employer'
  | 'recruiter'
  | 'business_seller'
  | 'buyer'
  | 'service_provider'
  | 'organization_admin'
  | 'platform_admin'
  | 'investor_buyer'
  | 'verification_officer';

export type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'deactivated';

export type OrganizationType =
  | 'private_company'
  | 'ngo'
  | 'government'
  | 'government_institution'
  | 'recruitment_agency'
  | 'small_business'
  | 'education';

export type VerificationStatus = 'unverified' | 'pending' | 'pending_review' | 'verified' | 'rejected' | 'suspended';

export interface OrganizationSettings {
  defaultCurrency: 'USD' | 'LRD';
  candidateAlertEmail?: string;
  lowBandwidthDefault: boolean;
  isPubliclyListed: boolean;
  notifyOnApplications: boolean;
  requireCoverNote: boolean;
}

export type OrgPermission =
  | 'all'
  | 'opportunities.create'
  | 'opportunities.edit'
  | 'opportunities.delete'
  | 'applications.view'
  | 'applications.advance_stage'
  | 'members.invite'
  | 'members.manage'
  | 'settings.edit'
  | 'verification.request';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  industry: string;
  county: County;
  cityDistrict: string;
  address?: string;
  websiteUrl?: string;
  website?: string;
  logoUrl?: string;
  logoText: string;
  description: string;
  verificationStatus: VerificationStatus;
  verificationBadge?: VerificationBadge;
  isVerified: boolean;
  registrationNumber?: string;
  taxIdNumber?: string;
  establishedYear?: number;
  employeeCountRange?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: OrganizationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface Opportunity {
  id: string;
  organizationId: string;
  organization: Organization;
  title: string;
  slug: string;
  type: OpportunityType;
  employmentType?: EmploymentType;
  workplaceModel: WorkplaceModel;
  county: County;
  locationDetails: string;
  currency: 'USD' | 'LRD';
  salaryMin?: number;
  salaryMax?: number;
  isSalaryNegotiable?: boolean;
  isSalaryConfidential?: boolean;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  deadline: string; // ISO date string
  postedDate: string;
  openingsCount: number;
  screeningQuestions?: string[];
  isFeatured?: boolean;
  viewsCount: number;
  applicationsCount: number;
  status: 'published' | 'draft' | 'closed' | 'expired' | 'archived';
  moderationStatus?: 'published' | 'pending_review' | 'flagged' | 'quarantined' | 'rejected';
  reportCount?: number;
}

export interface BusinessListing {
  id: string;
  title: string;
  industry: string;
  county: County;
  cityDistrict?: string;
  locationSummary: string;
  isConfidential: boolean;
  publicTeaser: string;
  confidentialDescription?: string;
  askingPriceUSD: number;
  annualRevenueUSD?: number;
  annualProfitUSD?: number;
  establishedYear: number;
  employeeCount: number;
  assetsIncluded: string[];
  reasonForSale: string;
  isVerified: boolean;
  status: 'published' | 'under_offer' | 'sold';
  hasRequestedAccess?: boolean;
  accessGranted?: boolean;
  ownerUserId?: string;
  organizationId?: string;
  photos?: string[];
  financialRanges?: {
    revenueRange?: string;
    profitRange?: string;
    ebitdaRange?: string;
    cashFlowRange?: string;
  };
  moderationStatus?: 'pending_review' | 'published' | 'rejected' | 'suspended';
  moderationNote?: string;
  sellerContactEmail?: string;
  sellerContactPhone?: string;
  sellerName?: string;
  savedByUsers?: string[];
  inquiriesCount?: number;
  viewsCount?: number;
}

export interface BusinessAccessRequest {
  id: string;
  businessId: string;
  buyerUserId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerOrganization?: string;
  ndaAccepted: boolean;
  ndaSignedAt?: string;
  proofOfFundsNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  sellerResponseNotes?: string;
  createdAt: string;
}

export interface BusinessInquiry {
  id: string;
  businessId: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
  inquiryType: 'general' | 'financials' | 'site_visit' | 'offer';
  status?: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export interface InterviewScheduleDetails {
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  scheduledAt?: string; // ISO datetime or YYYY-MM-DD
  type?: 'on_site' | 'video_call' | 'phone' | 'in_person' | 'video' | string;
  format?: 'on_site' | 'video_call' | 'phone' | string;
  mode?: 'on_site' | 'video_call' | 'phone' | 'video' | 'in_person' | string;
  locationOrLink: string;
  candidateInstructions?: string;
  interviewerName?: string;
  interviewerNames?: string[];
  notes?: string;
  completedAt?: string;
  feedbackNotes?: string;
  recommendation?: 'advance' | 'hold' | 'reject';
}

export interface ApplicationStatusLog {
  id: string;
  stage: ApplicationStage;
  changedAt: string;
  changedByUserId?: string;
  changedByName?: string;
  note?: string;
  interviewDetails?: InterviewScheduleDetails;
  rejectionReason?: string;
  hiringOfferDetails?: {
    salaryUSD?: number;
    salaryLRD?: number;
    startDate?: string;
    notes?: string;
  };
}

export interface Application {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  organizationId?: string;
  organizationName: string;
  applicantUserId?: string;
  candidateUserId?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  applicantLocation?: string;
  stage: ApplicationStage;
  appliedDate: string;
  coverNote?: string;
  resumeFileName?: string;
  resumeDataUrl?: string;
  resumeUrl?: string;
  screeningAnswers?: Record<string, string>;
  matchScore?: number;
  matchNotes?: string;
  rating?: number; // 1 to 5 stars
  employerNotes?: string;
  evaluations?: {
    rating?: number;
    matchScore?: number;
    employerNotes?: string;
    strengths?: string[];
    improvements?: string[];
    internalNotes?: string;
  };
  rejectionReason?: string;
  withdrawalReason?: string;
  withdrawnAt?: string;
  interviewDetails?: InterviewScheduleDetails;
  hiringOfferDetails?: {
    salaryUSD?: number;
    salaryLRD?: number;
    startDate?: string;
    notes?: string;
    offeredSalary?: number;
    currency?: string;
    contractType?: string;
    expiryDate?: string;
    offerLetterUrl?: string;
    terms?: string;
  };
  history?: ApplicationStatusLog[];
  updatedAt?: string;
}

export interface VerificationAudit {
  id: string;
  organizationName: string;
  organizationType: string;
  county: County;
  registryNumber: string; // e.g. LBR-2024-9912
  taxIdNumber: string;
  badgeRequested: VerificationBadge;
  submissionDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  documents: string[];
}

export type SystemRole =
  | 'user'
  | 'platform_admin'
  | 'verification_officer'
  | 'moderation_officer'
  | 'verifier'
  | 'moderator'
  | 'finance_admin';

export type PlatformRole = 'platform_admin' | 'verification_officer' | 'moderation_officer' | 'user';

export type OrgRole = 'owner' | 'admin' | 'recruiter' | 'hiring_manager' | 'member';

export type UserCapability =
  | 'job_seeker'
  | 'buyer'
  | 'seller'
  | 'service_provider'
  | 'find_opportunities'
  | 'hire_or_recruit'
  | 'sell_business'
  | 'find_business'
  | 'offer_services';

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingAlerts: boolean;
  profileVisibility: 'public' | 'registered_only' | 'private';
  showPhoneNumber: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  primaryRole?: UserRole;
  systemRole: SystemRole;
  accountStatus: AccountStatus;
  statusReason?: string;
  avatarUrl?: string;
  primaryCounty: County;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  capabilities: UserCapability[];
  onboardingCompleted: boolean;
  preferences: UserPreferences;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  userAgent: string;
  ipAddress: string;
  isValid: boolean;
}

export interface UserAuthCredential {
  userId: string;
  passwordHash: string;
  salt: string;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: string | null;
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: string | null;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  headline?: string;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  county: County;
  city?: string;
  avatarUrl?: string;
  skills: string[];
  visibility: 'public' | 'registered_only' | 'private';
  updatedAt: string;
  capabilities: UserCapability[];
  verificationState: 'unverified' | 'pending' | 'verified';
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  orgRole: OrgRole;
  status: 'active' | 'invited' | 'suspended' | 'revoked';
  permissions: (OrgPermission | string)[];
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  invitedBy?: string;
  invitedAt?: string;
  invitationId?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeEmail: string;
  orgRole: OrgRole;
  permissions: (OrgPermission | string)[];
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  notes?: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
  startYear: number | string;
  endYear?: number | string;
  county?: County | string;
  isCurrent?: boolean;
  current?: boolean;
  gradeOrHonors?: string;
  description?: string;
}

export interface ExperienceItem {
  id: string;
  jobTitle?: string;
  title?: string;
  company?: string;
  companyName?: string;
  location?: string;
  county?: County;
  cityDistrict?: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM
  isCurrent?: boolean;
  current?: boolean;
  workplaceModel?: 'on_site' | 'hybrid' | 'remote' | string;
  responsibilities?: string[];
  accomplishments?: string[];
  description?: string;
}

export interface CandidateSkill {
  id?: string;
  name: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'expert' | 'lead' | number;
  yearsOfExperience?: number;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string; // YYYY-MM
  expiryDate?: string; // YYYY-MM
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageSkill {
  id?: string;
  language: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'basic';
}

export interface ResumeCvData {
  id?: string;
  fileName: string;
  fileSize?: number;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  uploadedAt: string;
  fileDataUrl?: string;
  summaryExtract?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  projectUrl?: string;
  url?: string;
  githubUrl?: string;
  role?: string;
  tags?: string[];
  skills?: string[];
  completedYear?: number;
}

export interface CandidatePrivacySettings {
  profileVisibility: 'public' | 'verified_employers_only' | 'anonymous' | 'hidden' | 'private';
  contactVisibility?: 'public' | 'on_application_only' | 'hidden';
  cvDownloadPermission?: 'all_employers' | 'applied_jobs_only' | 'permission_required';
  showSalaryExpectations?: boolean;
  showEmailToEmployers?: boolean;
  showPhoneToEmployers?: boolean;
  showCvToEmployers?: boolean;
}

export interface CandidateProfile {
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  county: County;
  city?: string;
  cityDistrict?: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  yearsOfExperience: number;
  highestEducationLevel?: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: (string | CandidateSkill)[];
  certifications: CertificationItem[];
  languages: LanguageSkill[];
  cv?: ResumeCvData;
  cvFileName?: string;
  portfolio: PortfolioItem[];
  privacySettings: CandidatePrivacySettings;
  isSearchable?: boolean;
  updatedAt: string;
}

export interface BusinessAccessRequest {
  id: string;
  businessId: string;
  buyerUserId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  ndaAccepted: boolean;
  ndaSignedAt?: string;
  proofOfFundsNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  sellerResponseNotes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorName?: string;
  organizationId?: string;
  action: string;
  targetEntity: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export type RBACAction =
  | 'opportunity.browse'
  | 'opportunity.apply'
  | 'opportunity.create'
  | 'opportunity.edit'
  | 'opportunity.delete'
  | 'application.review'
  | 'application.advance_stage'
  | 'application.withdraw'
  | 'candidate.view_profile'
  | 'candidate.edit_profile'
  | 'business.browse'
  | 'business.request_nda'
  | 'business.approve_access'
  | 'business.list'
  | 'business.edit'
  | 'business.moderate'
  | 'proposal.submit'
  | 'organization.create'
  | 'organization.manage_members'
  | 'organization.edit_profile'
  | 'organization.edit_settings'
  | 'organization.invite_member'
  | 'organization.view_invitations'
  | 'verification.request'
  | 'verification.decide'
  | 'user.manage_status'
  | 'audit.view_global'
  | 'platform.admin_access';


export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'unpaid';

export interface FeatureEntitlement {
  maxActiveJobs: number | 'unlimited';
  maxCandidatesViewable: number | 'unlimited';
  canViewCandidateContact: boolean;
  canUseAI: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  entitlements: FeatureEntitlement;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  billingReason: string;
  date: string;
  invoicePdfUrl?: string;
}

// --- MESSAGING SYSTEM TYPES ---

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  urlOrBase64: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  recipientId: string;
  body: string;
  attachments?: MessageAttachment[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type ConversationCategory =
  | 'candidate_recruiter'
  | 'buyer_seller'
  | 'organization'
  | 'general'
  | 'support';

export interface ConversationParticipant {
  userId: string;
  name: string;
  email: string;
  role?: UserRole;
  organizationId?: string;
  organizationName?: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  category: ConversationCategory;
  title: string;
  participants: ConversationParticipant[];
  contextId?: string;
  contextType?: 'opportunity' | 'application' | 'business_listing' | 'general';
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  unreadCountByUserId: Record<string, number>;
  isBlocked?: boolean;
  blockedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReport {
  id: string;
  conversationId: string;
  messageId?: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: 'spam' | 'harassment' | 'fraud_scam' | 'inappropriate_content' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface UserBlock {
  id: string;
  blockingUserId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: string;
}

// --- NOTIFICATION SYSTEM TYPES ---

export type NotificationCategory =
  | 'new_message'
  | 'application_update'
  | 'interview_invitation'
  | 'job_recommendation'
  | 'business_inquiry'
  | 'subscription_event'
  | 'verification_event'
  | 'system_alert';

export type NotificationChannel = 'in_app' | 'email' | 'push_sms';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  contextId?: string;
  deliveryChannels: {
    inApp?: boolean;
    emailSent?: boolean;
    pushSmsSent?: boolean;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// --- PLATFORM TRUST AND SAFETY TYPES ---

export type VerificationEntityType = 'organization' | 'recruiter' | 'business';

export interface VerificationEvidenceDocument {
  id: string;
  fileName: string;
  fileType: string;
  documentType: 'lbr_certificate' | 'tax_clearance' | 'mofa_accreditation' | 'hr_license' | 'ownership_proof' | 'national_id' | 'other';
  fileSize: number;
  urlOrData: string;
  uploadedAt: string;
}

export interface VerificationRequest {
  id: string;
  entityType: VerificationEntityType;
  entityId: string;
  entityName: string;
  submitterUserId: string;
  submitterName: string;
  submitterEmail: string;
  status: VerificationStatus;
  badgeRequested: VerificationBadge;
  registrationNumber?: string; // LBR Statutory Registry No
  taxIdNumber?: string; // TIN
  licenseNumber?: string; // HR / Broker license
  county: County;
  evidenceDocuments: VerificationEvidenceDocument[];
  evidenceNotes?: string;
  reviewerUserId?: string;
  reviewerName?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface ContentModerationRecord {
  id: string;
  targetType: 'opportunity' | 'business_listing';
  targetId: string;
  title: string;
  organizationId?: string;
  organizationName?: string;
  ownerUserId?: string;
  ownerName?: string;
  moderationStatus: 'published' | 'pending_review' | 'flagged' | 'rejected' | 'quarantined';
  automatedFlags: Array<{ ruleId: string; ruleName: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  reportCount: number;
  moderatorNotes?: string;
  moderatedByUserId?: string;
  moderatedByName?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentReportReason =
  | 'scam_fee_charging'
  | 'misleading_salary'
  | 'fake_organization'
  | 'harassment'
  | 'impersonation'
  | 'spam'
  | 'discrimination'
  | 'inappropriate_content'
  | 'other';

export interface ContentReport {
  id: string;
  reportType: 'listing' | 'user' | 'message';
  targetId: string;
  targetTitleOrName: string;
  reporterUserId: string;
  reporterName: string;
  reporterEmail: string;
  reason: ContentReportReason;
  details: string;
  evidenceUrls?: string[];
  status: 'pending' | 'under_review' | 'actioned' | 'dismissed';
  actionTaken?: 'warning_issued' | 'listing_quarantined' | 'account_restricted' | 'account_suspended' | 'dismissed';
  adminNotes?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountRestrictionType =
  | 'posting_disabled'
  | 'messaging_disabled'
  | 'applications_disabled'
  | 'deal_room_disabled'
  | 'full_suspension';

export interface AccountRestriction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId?: string;
  restrictionType: AccountRestrictionType;
  reason: string;
  issuedByUserId: string;
  issuedByName: string;
  expiresAt?: string; // ISO string or undefined if permanent
  status: 'active' | 'appealed' | 'lifted' | 'expired';
  appealNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SuspiciousActivityEvent {
  id: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  ipAddress?: string;
  eventType: 'rapid_posting' | 'keyword_trigger' | 'multiple_reports' | 'rate_limit_exceeded' | 'suspicious_ip';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, unknown>;
  status: 'detected' | 'investigating' | 'resolved' | 'auto_quarantined';
  createdAt: string;
}
