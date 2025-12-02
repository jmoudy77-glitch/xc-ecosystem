// staff.ts
// Recreated staff module

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export const staff: StaffMember[] = [];

export function addStaffMember(member: StaffMember): void {
  staff.push(member);
}

export function getStaffMember(id: string): StaffMember | undefined {
  return staff.find(m => m.id === id);
}

export function listStaff(): StaffMember[] {
  return staff;
}
