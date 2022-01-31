export interface UserPayload {
  firstName: string;
  lastName: string;
  gifts?: string[];
  assignedId: number | null;
}

export interface User extends UserPayload {
  id: number;
}

export interface Gift {
  id: number;
  userId: number;
  description: string;
}
