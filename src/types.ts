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
  role?: 'Adviser' | 'Non-Adviser' | 'Guidance' | 'Admin' | 'Department Head';
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
  recordStatus: 'On Going' | 'RESOLVED';
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
  recordStatus: 'On Going' | 'RESOLVED';
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


