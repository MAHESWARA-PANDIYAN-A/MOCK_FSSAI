export type UserRole = 'APPLICANT' | 'OFFICER' | 'ADMIN';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DOCUMENT_QUERY'
  | 'INSPECTION_REQUIRED'
  | 'INSPECTION_SCHEDULED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type ApplicationType = 'NEW_LICENSE' | 'RENEWAL' | 'MODIFICATION';

export type OwnershipType = 'OWNED' | 'RENTED' | 'LEASED' | 'CONSENTED' | 'OTHER';

export type ApplicabilityType = 'MANDATORY' | 'CONDITIONAL' | 'OPTIONAL' | 'NOT_APPLICABLE';

export type DocumentReviewStatus = 'UPLOADED' | 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'NEEDS_CORRECTION';

export type QueryStatus = 'OPEN' | 'RESPONDED' | 'RESOLVED';

export type InspectionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ApplicantInfo {
  applicant_name: string;
  designation: string;
  mobile: string;
  email: string;
}

export interface BusinessInfo {
  business_name: string;
  legal_name?: string;
  organization_type: string;
  business_type: string;
  kind_of_food_business?: string;
  business_activity?: string;
  project_stage: string;
  state: string;
  district: string;
  pincode: string;
  address_line_1: string;
  address_line_2?: string;
  landmark?: string;
  investment_amount?: number;
  employee_count?: number;
  gst_number?: string;
  pan_number?: string;
  udyam_number?: string;
}

export interface PremisesInfo {
  ownership_type: OwnershipType;
  address_line_1: string;
  address_line_2?: string;
  state: string;
  district: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface FoodProductInfo {
  id?: string;
  product_name: string;
  product_category: string;
  description?: string;
  ingredients?: string;
  manufacturing_process_description?: string;
  expected_capacity?: number;
  unit_of_measure?: string;
}

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  applicable_activity?: string;
  applicability_type: ApplicabilityType;
  allowed_file_types: string;
  max_file_size_mb: number;
  source_reference?: string;
  is_active: boolean;
}

export interface DocumentItem {
  id: string;
  application_id: string;
  requirement_id: string;
  requirement_name?: string;
  original_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  upload_status: string;
  review_status: DocumentReviewStatus;
  officer_comment?: string;
  uploaded_at: string;
  reviewed_at?: string;
}

export interface ApplicationQuery {
  id: string;
  application_id: string;
  officer_id?: string;
  officer_name?: string;
  subject: string;
  message: string;
  applicant_response?: string;
  status: QueryStatus;
  deadline_date?: string;
  created_at: string;
  responded_at?: string;
}

export interface Inspection {
  id: string;
  application_id: string;
  officer_id?: string;
  officer_name?: string;
  inspection_type: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  instructions?: string;
  status: InspectionStatus;
  officer_notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  application_id: string;
  old_status?: ApplicationStatus;
  new_status: ApplicationStatus;
  changed_by: string;
  reason?: string;
  visible_to_applicant: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  application_number: string;
  external_reference_id?: string;
  source_system: string;
  application_type: ApplicationType;
  status: ApplicationStatus;
  submission_date?: string;
  last_status_updated_at: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  risk_level: RiskLevel;
  installed_capacity_details?: string;
  machinery_details?: string;
  created_at: string;
  updated_at: string;
  applicant?: ApplicantInfo;
  business?: BusinessInfo;
  premises?: PremisesInfo;
  activities: string[];
  products: FoodProductInfo[];
  documents: DocumentItem[];
  queries: ApplicationQuery[];
  inspections: Inspection[];
  status_history: StatusHistoryItem[];
  is_applicant_verified: boolean;
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  missing_mandatory_fields: string[];
  missing_mandatory_documents: string[];
}

export interface ApplicationListItem {
  id: string;
  application_number: string;
  external_reference_id?: string;
  business_name: string;
  applicant_name: string;
  application_type: ApplicationType;
  status: ApplicationStatus;
  state: string;
  district: string;
  submission_date?: string;
  last_status_updated_at: string;
  assigned_officer_name?: string;
  risk_level: RiskLevel;
  open_queries_count: number;
  inspection_status?: string;
  created_at: string;
}

export interface OfficerDashboardStats {
  total_applications: number;
  new_submissions: number;
  under_review: number;
  document_queries: number;
  inspection_required: number;
  inspection_scheduled: number;
  approved: number;
  rejected: number;
  withdrawn: number;
}

export interface ApplicantDashboardStats {
  draft_count: number;
  submitted_count: number;
  under_review_count: number;
  query_count: number;
  inspection_count: number;
  approved_count: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
