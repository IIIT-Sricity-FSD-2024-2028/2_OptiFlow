export class UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  department?: string | number;
  team?: string;
  role?: string | number;
  manager_id?: number | null;
  status?: string;
  is_active?: boolean;
}