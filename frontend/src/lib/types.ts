export type Role = "owner" | "admin" | "editor" | "member";
export type Visibility = "private" | "team" | "workspace";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
  initials: string;
  kbCount: number;
  status: "active" | "invited";
}
