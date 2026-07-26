/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserAccount {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string; // Acts as Username
  contactNumber: string;
  department: Department;
  position: Position;
  passwordHash: string; // SHA-256 encrypted password
  registeredAt: string;
  role?: 'Adviser' | 'Non-Adviser' | 'Guidance' | 'Admin' | 'Department Head' | 'Principal';
  gradeLevel?: 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';
  section?: string;
}

export type Department =
  | 'English'
  | 'Mathematics'
  | 'Science'
  | 'Filipino'
  | 'ESP / Values Education'
  | 'Araling Panlipunan'
  | 'TLE'
  | 'MAPEH'
  | 'Admin (NTP)';

export type Position =
  | 'Teacher I'
  | 'Teacher II'
  | 'Teacher III'
  | 'Teacher IV'
  | 'Teacher V'
  | 'Teacher VI'
  | 'Teacher VII'
  | 'Master Teacher I'
  | 'Master Teacher II'
  | 'Master Teacher III'
  | 'Master Teacher IV'
  | 'Head Teacher I'
  | 'Head Teacher II'
  | 'Head Teacher III'
  | 'Head Teacher IV'
  | 'Head Teacher V'
  | 'Head Teacher VI'
  | 'Guidance Counselor'
  | 'Clinic Nurse/Teacher';

export interface Report {
  id?: number;
  studentLrn: string;
  dateOfIncident: string;
  timeOfIncident: string;
  issue: string; // This will now hold Types of Offenses Committed
  description: string;
  actionTaken: string;
  recommendation: string;
  individualFactors: string[];
  familyCommunityBehaviorFactors: string[];
  individualFactorsSpecify?: string;
  referralRecommendation: string;
  initialAssessmentMadeBy: string;
  designation: string;
  recordStatus: 'On Going' | 'Pending Approval' | 'RESOLVED';
  createdAt?: string;
  createdBy?: string;
  reportedBy: string;
  dateReported: string;
  lastUpdatedBy?: string;
}

export interface CriticalReport {
  id?: number;
  studentLrn: string;
  dateOfIncident: string;
  timeOfIncident: string;
  issue: string;
  description: string;
  actionTaken: string;
  recommendation: string;
  reportedBy: string;
  dateReported: string;
  lastUpdatedBy?: string;
  recordStatus: 'On Going' | 'Pending Approval' | 'RESOLVED';
}

export interface Student {
  lrn: string; // Learner Reference Number (unique identifier)
  lastName: string;
  firstName: string;
  middleName: string;
  profilePictureUrl?: string; // Optional Google Drive link for picture
  gradeLevel: 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';
  section: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  religion: string; // Catholic, Muslim, INC, Others
  religionSpecify?: string; // If 'Others', specify
  is4ps: 'Yes' | 'No';
  isIndigenous: 'Yes' | 'No';

  // Father details
  fatherName: string;
  fatherContact: string;
  fatherIncome: string;

  // Mother details
  motherName: string;
  motherContact: string;
  motherIncome: string;

  // Guardian details
  guardianName: string;
  guardianRelationship: string;
  guardianContact: string;
  guardianIncome: string;

  // Siblings
  siblingsCount: number;
  siblingsBelow18: number;
  ordinalOrder: string; // e.g. 1st, 2nd, etc.

  // Address
  houseNumber: string;
  street: string;
  barangay: string;
  city: string; // NCR Cities

  // Preferences
  learningModality: 'Face-to-Face' | 'Modular (print)' | 'Modular (digital)' | 'Online Distance Learning' | 'Blended Learning' | 'Radio/TV Based Instruction';
  internetConnectivity: 'None' | 'Mobile Data' | 'Fiber broadband internet (wifi)' | 'Community hotspot';
  
  registeredAt?: string;
  registeredBy?: string; // Teacher email who registered
}

export interface AppNotification {
  id: string | number;
  message: string;
  type: 'General' | 'Critical' | 'CICL';
  studentLrn?: string;
  studentName?: string;
  reportedBy?: string;
  targetRole: 'Guidance' | 'Admin' | 'All';
  isRead?: boolean;
  readBy?: string[]; // user emails who read it
  createdAt: string;
}

export interface SignatorySettings {
  id?: number;
  preparedByName: string;
  preparedByPosition: string;
  notedByName: string;
  notedByPosition: string;
  approvedByName: string;
  approvedByPosition: string;
  updatedAt?: string;
}



export interface AdminPasswords {
  clearReports: string;
  clearStudents: string;
  deleteTeacher: string;
}

export type AuditActionType =
  | 'UPDATE_TEACHER_PROFILE'
  | 'UPDATE_STUDENT_PROFILE'
  | 'REGISTER_STUDENT'
  | 'REGISTER_TEACHER'
  | 'ASSIGN_ADVISORY'
  | 'DELETE_TEACHER'
  | 'UPDATE_STUDENT_PHOTO'
  | 'BULK_REGISTER_STUDENTS'
  | 'USER_LOGIN'
  | 'CREATE_REPORT'
  | 'CREATE_CRITICAL_REPORT'
  | 'UPDATE_REPORT_STATUS'
  | 'UPDATE_RECOMMENDATION'
  | 'DELETE_REPORT'
  | 'DELETE_CRITICAL_REPORT'
  | 'RESET_PASSWORD'
  | 'UPDATE_SIGNATORY_SETTINGS'
  | 'UPDATE_ADMIN_PASSWORDS'
  | 'CONFIGURE_DATABASE'
  | 'CREATE_SECTION'
  | 'UPDATE_SECTION'
  | 'DELETE_SECTION'
  | 'CLEAR_ALL_REPORTS'
  | 'CLEAR_ALL_STUDENTS'
  | string;

export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditActionType;
  performedBy: string;
  targetId: string;
  targetName: string;
  details: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

