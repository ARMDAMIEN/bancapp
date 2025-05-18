export interface AdminDashboardResponse {
  id: number;
  fullName: string;
  email: string;
  status: string;
  balance: number;
  joinDate: string; // ou Date si tu les parses
  lastLogin: string; // ou Date si tu les parses
}
