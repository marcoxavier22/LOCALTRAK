export type Role = 'MASTER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';

export type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'DELINQUENT' | 'BLOCKED' | 'ARCHIVED';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  companyId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Company = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  status: CompanyStatus;
  planId?: string | null;
  maxEmployees: number;
  maxVehicles: number;
  requireOdometerStartPhoto?: boolean;
  requireOdometerFinishPhoto?: boolean;
  requireOdometerStartKm?: boolean;
  requireOdometerFinishKm?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users?: number;
    vehicles?: number;
    routeShifts?: number;
  };
};

export type CompanyUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive'>;

export type CompanyDetail = Company & {
  users?: CompanyUser[];
};

export type Employee = User & {
  vehicles?: unknown[];
};

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'VAN' | 'TRUCK' | 'PICKUP' | 'OTHER';

export type VehicleOwnershipType = 'COMPANY' | 'EMPLOYEE';

export type VehicleFuelType = 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID' | 'OTHER';

export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export type Vehicle = {
  id: string;
  companyId: string;
  employeeId?: string | null;
  employee?: Pick<Employee, 'id' | 'name' | 'email' | 'phone' | 'isActive'> | null;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  type: VehicleType;
  ownershipType: VehicleOwnershipType;
  currentKm: number | string;
  fuelType?: VehicleFuelType | null;
  averageConsumption?: number | string | null;
  costPerKm?: number | string | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type CreateCompanyPayload = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  status?: CompanyStatus;
  maxEmployees?: number;
  maxVehicles?: number;
  adminUser?: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };
};

export type CreateEmployeePayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'EMPLOYEE';
};

export type UpdateEmployeePayload = {
  name?: string;
  phone?: string;
  isActive?: boolean;
};

export type CreateVehiclePayload = {
  plate: string;
  brand: string;
  model: string;
  year?: number;
  type: VehicleType;
  ownershipType: VehicleOwnershipType;
  employeeId?: string | null;
  currentKm?: number;
  fuelType?: VehicleFuelType;
  averageConsumption?: number;
  costPerKm?: number;
  status?: VehicleStatus;
};

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export type RouteShiftStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'SYNC_PENDING' | 'ERROR';

export type RouteVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  type: VehicleType;
  ownershipType: VehicleOwnershipType;
  currentKm: number | string;
  fuelType?: VehicleFuelType | null;
  averageConsumption?: number | string | null;
  costPerKm?: number | string | null;
  status: VehicleStatus;
};

export type RoutePoint = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  accuracy?: number | string | null;
  speed?: number | string | null;
  altitude?: number | string | null;
  batteryLevel?: number | string | null;
  recordedAt: string;
};

export type RouteMapPoint = {
  latitude: number | string;
  longitude: number | string;
  recordedAt?: string | null;
  type?: string;
};

export type RouteSummary = {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  startLatitude?: number | string | null;
  startLongitude?: number | string | null;
  endLatitude?: number | string | null;
  endLongitude?: number | string | null;
  totalDistanceKm: number | string;
  totalDurationMinutes: number;
  stoppedTimeMinutes?: number;
  estimatedFuelCost?: number | string;
  reimbursementValue?: number | string;
  status: RouteShiftStatus;
  employee: Pick<User, 'id' | 'name' | 'email'>;
  vehicle?: RouteVehicle | null;
  _count?: {
    points?: number;
  };
};

export type RouteDetail = RouteSummary & {
  points?: RoutePoint[];
  liveDistanceKm?: number | string;
  liveDurationMinutes?: number;
  pointsCount?: number;
  latestPoint?: RoutePoint | null;
  startPoint?: RouteMapPoint | null;
  currentPoint?: RouteMapPoint | RoutePoint | null;
  trackingStatus?: 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'ERROR';
  lastPointAt?: string | null;
};

export type MaintenanceType = 'OIL_CHANGE' | 'PREVENTIVE_REVIEW' | 'TIRES' | 'BRAKES' | 'CUSTOM';

export type MaintenanceStatus = 'DONE' | 'SCHEDULED' | 'OVERDUE' | 'CANCELED';

export type MaintenanceRule = {
  id: string;
  companyId: string;
  name: string;
  type: MaintenanceType;
  intervalKm?: number | null;
  intervalDays?: number | null;
  isActive: boolean;
};

export type VehicleMaintenanceRecord = {
  id: string;
  companyId: string;
  vehicleId: string;
  maintenanceRuleId?: string | null;
  maintenanceRule?: MaintenanceRule | null;
  vehicle?: Pick<Vehicle, 'id' | 'plate' | 'brand' | 'model' | 'currentKm' | 'status' | 'employeeId'> & {
    employee?: Pick<User, 'id' | 'name' | 'email'> | null;
  };
  type: MaintenanceType;
  description?: string | null;
  performedAt?: string | null;
  performedKm?: number | null;
  nextDueKm?: number | null;
  nextDueDate?: string | null;
  cost?: number | string | null;
  status: MaintenanceStatus;
};

export type MaintenanceAlert = {
  id: string;
  vehicle: Pick<Vehicle, 'id' | 'plate' | 'brand' | 'model' | 'currentKm' | 'status'>;
  rule: MaintenanceRule;
  record: Pick<
    VehicleMaintenanceRecord,
    'id' | 'performedAt' | 'performedKm' | 'nextDueKm' | 'nextDueDate' | 'status'
  >;
  currentKm: number;
  nextDueKm?: number | null;
  nextDueDate?: string | null;
  dueByKm: boolean;
  dueByDate: boolean;
  overdueKm: number;
  daysOverdue: number;
};

export type FuelSetting = {
  id: string;
  companyId: string;
  fuelType: VehicleFuelType;
  pricePerLiter?: number | string | null;
  defaultCostPerKm?: number | string | null;
};

export type ReimbursementReportTotals = {
  routesCount: number;
  totalDistanceKm: number;
  companyVehicleDistanceKm: number;
  employeeVehicleDistanceKm: number;
  totalFuelCost: number;
  totalReimbursement: number;
};

export type ReimbursementEmployeeRow = {
  employee: Pick<User, 'id' | 'name' | 'email'>;
  routesCount: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalReimbursement: number;
};

export type ReimbursementVehicleRow = {
  vehicle: Pick<RouteVehicle, 'id' | 'plate' | 'brand' | 'model' | 'ownershipType' | 'fuelType'>;
  routesCount: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalReimbursement: number;
};

export type ReimbursementRouteRow = {
  id: string;
  employee: Pick<User, 'id' | 'name' | 'email'>;
  vehicle?: Pick<RouteVehicle, 'id' | 'plate' | 'brand' | 'model' | 'ownershipType' | 'fuelType'> | null;
  startedAt: string;
  endedAt?: string | null;
  totalDistanceKm: number | string;
  estimatedFuelCost: number | string;
  reimbursementValue: number | string;
};

export type ReimbursementReport = {
  period: {
    startDate?: string | null;
    endDate?: string | null;
  };
  totals: ReimbursementReportTotals;
  byEmployee: ReimbursementEmployeeRow[];
  byVehicle: ReimbursementVehicleRow[];
  routes: ReimbursementRouteRow[];
};

export type ReimbursementPaymentStatus = 'PENDING' | 'PAID' | 'CANCELED';

export type ReimbursementPayment = {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Pick<User, 'id' | 'name' | 'email'>;
  vehicleId?: string | null;
  vehicle?: Pick<RouteVehicle, 'id' | 'plate' | 'brand' | 'model' | 'ownershipType' | 'fuelType'> | null;
  distanceKm: number | string;
  fuelCost: number | string;
  amount: number | string;
  description?: string | null;
  paidAt: string;
  status: ReimbursementPaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';

export type ServiceOrderStopStatus = 'PENDING' | 'COMPLETED';

export type ServiceOrderStop = {
  id: string;
  companyId: string;
  orderId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address: string;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  addressReference?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geocodingStatus?: GeocodingStatus;
  geocodingUpdatedAt?: string | null;
  visitOrder: number;
  status: ServiceOrderStopStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceOrder = {
  id: string;
  companyId: string;
  routeShiftId?: string | null;
  title: string;
  description?: string | null;
  employeeId?: string | null;
  employee?: Pick<User, 'id' | 'name' | 'email' | 'phone'> | null;
  vehicleId?: string | null;
  vehicle?: Pick<Vehicle, 'id' | 'plate' | 'brand' | 'model' | 'currentKm' | 'employeeId'> | null;
  status: ServiceOrderStatus;
  scheduledDate: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  initialOdometerKm?: number | string | null;
  finalOdometerKm?: number | string | null;
  initialOdometerPhotoPath?: string | null;
  finalOdometerPhotoPath?: string | null;
  initialOdometerPhotoUrl?: string | null;
  finalOdometerPhotoUrl?: string | null;
  odometerDistanceKm: number;
  routeShift?: {
    id: string;
    status: RouteShiftStatus;
    startedAt: string;
    endedAt?: string | null;
    totalDistanceKm?: number | string | null;
    totalDurationMinutes?: number | null;
    _count?: {
      points?: number;
    };
  } | null;
  notes?: string | null;
  stops: ServiceOrderStop[];
  createdAt: string;
  updatedAt: string;
};

export type ServiceOrderTracking = {
  orderId: string;
  routeShift?: (RouteSummary & { points?: RoutePoint[] }) | null;
  points: RoutePoint[];
  pointsCount: number;
  latestPoint?: RoutePoint | null;
  startPoint?: RouteMapPoint | null;
  currentPoint?: RouteMapPoint | RoutePoint | null;
  liveDistanceKm?: number | string;
  liveDurationMinutes?: number;
  trackingStatus?: RouteShiftStatus | ServiceOrderStatus;
  lastPointAt?: string | null;
};

export type GeocodingStatus = 'PENDING' | 'RESOLVED' | 'FAILED' | 'MANUAL';

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address: string;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geocodingStatus: GeocodingStatus;
  geocodingUpdatedAt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanySettings = {
  id: string;
  name: string;
  requireOdometerStartPhoto: boolean;
  requireOdometerFinishPhoto: boolean;
  requireOdometerStartKm: boolean;
  requireOdometerFinishKm: boolean;
};
