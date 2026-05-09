export type WakeDevice = {
  id: number;
  name: string;
  mac_address: string;
  target_ip: string;
  broadcast_address: string;
  port: number;
  description: string;
  is_enabled: boolean;
  sort_order: number;
  last_wake_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WakeUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_admin: boolean;
};

export type WakeStatus = {
  authenticated: boolean;
  can_wake: boolean;
  can_manage: boolean;
  is_global_admin: boolean;
  user: WakeUser | null;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type WakeStatusResponse = ApiEnvelope<{
  status: WakeStatus;
}>;

export type WakeDevicesResponse = ApiEnvelope<{
  devices: WakeDevice[];
}>;
