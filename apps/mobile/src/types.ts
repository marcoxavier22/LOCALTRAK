export type Role = 'MASTER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  companyId?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type Session = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type RouteStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'SYNC_PENDING' | 'ERROR';

export type RouteVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
};

export type RouteSummary = {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  totalDistanceKm?: number | string | null;
  totalDurationMinutes?: number | null;
  status: RouteStatus;
  vehicle?: RouteVehicle | null;
  serviceOrder?: {
    id: string;
    title: string;
    status: ServiceOrderStatus;
  } | null;
};

export type ActiveRoute = {
  id: string;
  startedAt: string;
  serviceOrderId?: string | null;
  serviceOrderTitle?: string | null;
};

export type RoutePointPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  altitude?: number | null;
  recordedAt: string;
};

export type ServiceOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';

export type ServiceOrderStopStatus = 'PENDING' | 'COMPLETED';

export type ServiceOrderStop = {
  id: string;
  customerName?: string | null;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  visitOrder: number;
  status: ServiceOrderStopStatus;
  completedAt?: string | null;
};

export type ServiceOrder = {
  id: string;
  routeShiftId?: string | null;
  title: string;
  description?: string | null;
  status: ServiceOrderStatus;
  scheduledDate: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  initialOdometerKm?: number | string | null;
  finalOdometerKm?: number | string | null;
  initialOdometerPhotoPath?: string | null;
  finalOdometerPhotoPath?: string | null;
  odometerDistanceKm: number;
  routeShift?: {
    id: string;
    status: RouteStatus;
    startedAt: string;
    endedAt?: string | null;
    totalDistanceKm?: number | string | null;
    totalDurationMinutes?: number | null;
    _count?: {
      points?: number;
    };
  } | null;
  notes?: string | null;
  vehicle?: RouteVehicle | null;
  stops: ServiceOrderStop[];
};
