// Firestore document types for the dormitory management system

export interface Dorm {
  id: string;
  name: 'Male' | 'Female';
  name_ar: 'ذكور' | 'إناث';
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  dorm_id: string;
  room_number: number;
  capacity: number; // Always 4
  current_occupancy: number;
  created_at: Date;
  updated_at: Date;
}

export interface Worker {
  id: string;
  full_name: string;
  cin: string; // National ID
  phone: string;
  birth_year: number; // Year of birth
  dorm_id: string;
  room_id: string;
  check_in_date: Date;
  check_out_date?: Date;
  exit_reason?: string;
  status: 'Active' | 'Inactive';
  stay_duration_days?: number; // Calculated field
  age?: number; // Calculated field
  created_at: Date;
  updated_at: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

// Common exit reasons (predefined)
export const EXIT_REASONS = [
  'انتهاء ا��عقد',
  'استقالة',
  'نقل إلى فرع آخر',
  'إنهاء خدمات',
  'ظروف شخصية',
  'أخرى'
] as const;

export type ExitReason = typeof EXIT_REASONS[number];

// Dashboard statistics interface
export interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  inactiveWorkers: number;
  remainingWorkers: number; // Available capacity
  averageStayDays: number;
  occupancyRate: number;
  maleWorkers: number;
  femaleWorkers: number;
  averageAgeMale: number;
  averageAgeFemale: number;
  totalRooms: number;
  occupiedRooms: number;
  exitPercentage: number;
}

// Recent activity interface
export interface RecentExit {
  worker_name: string;
  exit_reason: string;
  exit_date: Date;
  stay_duration_days: number;
}

// API response interfaces
export interface GetDashboardStatsResponse {
  stats: DashboardStats;
  recentExits: RecentExit[];
}

export interface GetWorkersResponse {
  workers: Worker[];
  total: number;
}

export interface GetRoomsResponse {
  rooms: (Room & { occupants: Worker[] })[];
  total: number;
}

// Form interfaces for creating/editing workers
export interface CreateWorkerRequest {
  full_name: string;
  cin: string;
  phone: string;
  birth_year: number;
  dorm_id: string;
  room_id: string;
  check_in_date: Date;
}

export interface UpdateWorkerRequest {
  full_name?: string;
  cin?: string;
  phone?: string;
  dorm_id?: string;
  room_id?: string;
  check_out_date?: Date;
  exit_reason?: string;
}

// Validation interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: ValidationError[];
}
