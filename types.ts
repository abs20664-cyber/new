export type UserRole = 'teacher' | 'student' | 'admin' | 'economic';
export type AppLanguage = 'en' | 'fr' | 'ar';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  language?: AppLanguage;
  lastSeen?: any;
  avatar?: string;
  age?: number;
  bio?: string;
  fieldOfStudy?: string;
  subjectsTaught?:string;
  createdAt?: any;
  accountStatus?: 'active' | 'disabled' | 'suspended';
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
  monthlyFee?: number;
  subscriptionDuration?: number; // in months
  subscriptionStartDate?: any;
  nextPaymentDate?: any;
}

export interface StudentSubscription {
  id: string;
  studentId: string;
  studentName: string;
  status: 'active' | 'expired' | 'pending' | 'suspended';
  startDate: any;
  endDate: any;
  nextPaymentDate?: any;
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  monthlyFee?: number;
  duration?: number; // in months
}

export interface TeacherPayment {
  id: string;
  teacherId: string;
  teacherName: string;
  status: 'Paid' | 'Unpaid' | 'Pending';
  amountOwed: number;
  amountPaid: number;
  monthlySalary?: number;
  lastPaymentDate?: any;
  nextPaymentDate?: any;
  notes?: string;
}

export interface FinancialAuditLog {
  id: string;
  timestamp: any;
  userId: string;
  userName: string;
  action: string;
  details: string;
  targetId?: string;
  targetName?: string;
}

export interface FinancialSummary {
  totalExpectedRevenue: number;
  totalCollectedRevenue: number;
  outstandingPayments: number;
  teacherPayrollTotal: number;
  revenueHistory: { month: string; collected: number; expected: number }[];
}

export interface StudentPaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Late' | 'Missed';
  method: string;
}

export interface Attachment {
  name: string;
  data: string;
  teacherName: string;
  timestamp: any;
}

export interface ClassSession {
  id: string;
  name: string;
  date: string;
  time: string;
  endTime: string;
  room: string;
  type: 'Cours' | 'TD' | 'Exam';
  attachments?: Attachment[];
}

export interface Material {
  id: string;
  studentId: string;
  sessionId: string;
  fileName: string;
  fileData: string;
  teacherName: string;
  teacherId: string;
  timestamp: any;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadlineDate: string;
  deadlineTime: string;
  fileData?: string;
  fileName?: string;
  creatorId: string;
  timestamp: any;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileData?: string;
  fileName?: string;
  grade?: number;
  review?: string;
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: any;
  timestamp: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: any;
  seen?: boolean;
  seenAt?: any;
  editedAt?: any;
  isPinned?: boolean;
  reactions?: Record<string, string[]>; // emoji -> [userIds]
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  participantIds: string[];
  type: 'class' | 'custom';
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'task' | 'attendance' | 'system';
  read: boolean;
  timestamp: any;
  link?: string;
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const HOURS_OF_DAY = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
export const EMOJI_SET = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅', '🙏'];
