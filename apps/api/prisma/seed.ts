import {
  FuelType,
  MaintenanceStatus,
  MaintenanceType,
  PrismaClient,
  ReimbursementPaymentStatus,
  Role,
  RouteShiftStatus,
  ServiceOrderStatus,
  ServiceOrderStopStatus,
  VehicleOwnershipType,
  VehicleStatus,
  VehicleType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getRequiredSeedSecret(name: string, developmentFallback?: string) {
  const value = process.env[name] ?? developmentFallback;
  if (!value) {
    throw new Error(`Environment variable ${name} is required to run the seed safely.`);
  }
  return value;
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const password = getRequiredSeedSecret(
    'MASTER_ADMIN_PASSWORD',
    isProduction ? undefined : 'LocalDevMaster123!',
  );
  const email = process.env.MASTER_ADMIN_EMAIL ?? 'admin@localtrak.test';
  const name = process.env.MASTER_ADMIN_NAME ?? 'Admin Master';

  await prisma.plan.upsert({
    where: { id: 'basic-plan' },
    update: {},
    create: {
      id: 'basic-plan',
      name: 'Plano Basico',
      price: 149,
      maxEmployees: 10,
      maxVehicles: 10,
      maxRoutesPerMonth: 1000,
      features: {
        liveMap: true,
        routeHistory: true,
        maintenanceAlerts: false,
        reimbursements: false,
      },
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.MASTER_ADMIN,
      isActive: true,
    },
  });

  const enableDemoSeed = process.env.ENABLE_DEMO_SEED === 'true';
  if (!enableDemoSeed) {
    return;
  }

  const demoPassword = getRequiredSeedSecret(
    'SEED_DEMO_PASSWORD',
    isProduction ? undefined : 'LocalDev123!',
  );
  const companyAdminEmail = process.env.SEED_COMPANY_ADMIN_EMAIL ?? 'admin@empresateste.local';
  const companyAdminPassword = await bcrypt.hash(demoPassword, 12);
  const employeeEmail = process.env.SEED_EMPLOYEE_EMAIL ?? 'funcionario@empresateste.local';
  const employeePassword = await bcrypt.hash(demoPassword, 12);
  const resetTestData = process.env.RESET_TEST_DATA === 'true';

  const testCompany = await prisma.company.upsert({
    where: { document: '00000000000100' },
    update: {
      name: 'Empresa Teste',
      status: 'ACTIVE',
      maxEmployees: 50,
      maxVehicles: 50,
    },
    create: {
      name: 'Empresa Teste',
      document: '00000000000100',
      status: 'ACTIVE',
      maxEmployees: 50,
      maxVehicles: 50,
    },
  });

  if (resetTestData) {
    await prisma.$transaction([
      prisma.routePoint.deleteMany({ where: { routeShift: { companyId: testCompany.id } } }),
      prisma.routeShift.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.serviceOrderStop.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.serviceOrder.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.vehicleMaintenance.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.maintenanceRule.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.fuelSetting.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.reimbursementPayment.deleteMany({ where: { companyId: testCompany.id } }),
      prisma.vehicle.deleteMany({ where: { companyId: testCompany.id } }),
    ]);
  }

  await prisma.user.upsert({
    where: { email: companyAdminEmail },
    update: {
      name: 'Admin Empresa Teste',
      role: Role.COMPANY_ADMIN,
      companyId: testCompany.id,
      isActive: true,
    },
    create: {
      name: 'Admin Empresa Teste',
      email: companyAdminEmail,
      passwordHash: companyAdminPassword,
      role: Role.COMPANY_ADMIN,
      companyId: testCompany.id,
      isActive: true,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: employeeEmail },
    update: {
      name: 'Funcionario Teste',
      role: Role.EMPLOYEE,
      companyId: testCompany.id,
      isActive: true,
    },
    create: {
      name: 'Funcionario Teste',
      email: employeeEmail,
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      companyId: testCompany.id,
      isActive: true,
    },
  });

  const employeeVehicle = await prisma.vehicle.upsert({
    where: { companyId_plate: { companyId: testCompany.id, plate: 'EMP1A23' } },
    update: {
      employeeId: employee.id,
      brand: 'Honda',
      model: 'CG 160',
      year: 2023,
      type: VehicleType.MOTORCYCLE,
      ownershipType: VehicleOwnershipType.EMPLOYEE,
      currentKm: 18420,
      fuelType: FuelType.GASOLINE,
      averageConsumption: 32,
      costPerKm: 0.72,
      status: VehicleStatus.ACTIVE,
    },
    create: {
      companyId: testCompany.id,
      employeeId: employee.id,
      plate: 'EMP1A23',
      brand: 'Honda',
      model: 'CG 160',
      year: 2023,
      type: VehicleType.MOTORCYCLE,
      ownershipType: VehicleOwnershipType.EMPLOYEE,
      currentKm: 18420,
      fuelType: FuelType.GASOLINE,
      averageConsumption: 32,
      costPerKm: 0.72,
      status: VehicleStatus.ACTIVE,
    },
  });

  const companyVehicle = await prisma.vehicle.upsert({
    where: { companyId_plate: { companyId: testCompany.id, plate: 'FRO2B34' } },
    update: {
      brand: 'Fiat',
      model: 'Strada',
      year: 2022,
      type: VehicleType.PICKUP,
      ownershipType: VehicleOwnershipType.COMPANY,
      currentKm: 49650,
      fuelType: FuelType.FLEX,
      averageConsumption: 10.5,
      costPerKm: 1.2,
      status: VehicleStatus.ACTIVE,
    },
    create: {
      companyId: testCompany.id,
      plate: 'FRO2B34',
      brand: 'Fiat',
      model: 'Strada',
      year: 2022,
      type: VehicleType.PICKUP,
      ownershipType: VehicleOwnershipType.COMPANY,
      currentKm: 49650,
      fuelType: FuelType.FLEX,
      averageConsumption: 10.5,
      costPerKm: 1.2,
      status: VehicleStatus.ACTIVE,
    },
  });

  await prisma.fuelSetting.upsert({
    where: { companyId_fuelType: { companyId: testCompany.id, fuelType: FuelType.GASOLINE } },
    update: { pricePerLiter: 5.89, defaultCostPerKm: 0.72 },
    create: {
      companyId: testCompany.id,
      fuelType: FuelType.GASOLINE,
      pricePerLiter: 5.89,
      defaultCostPerKm: 0.72,
    },
  });

  await prisma.fuelSetting.upsert({
    where: { companyId_fuelType: { companyId: testCompany.id, fuelType: FuelType.FLEX } },
    update: { pricePerLiter: 5.69, defaultCostPerKm: 1.2 },
    create: {
      companyId: testCompany.id,
      fuelType: FuelType.FLEX,
      pricePerLiter: 5.69,
      defaultCostPerKm: 1.2,
    },
  });

  const oilRule = await prisma.maintenanceRule.upsert({
    where: { id: 'test-maintenance-oil-rule' },
    update: {
      companyId: testCompany.id,
      name: 'Troca de oleo',
      type: MaintenanceType.OIL_CHANGE,
      intervalKm: 5000,
      intervalDays: 180,
      isActive: true,
    },
    create: {
      id: 'test-maintenance-oil-rule',
      companyId: testCompany.id,
      name: 'Troca de oleo',
      type: MaintenanceType.OIL_CHANGE,
      intervalKm: 5000,
      intervalDays: 180,
      isActive: true,
    },
  });

  await prisma.maintenanceRule.upsert({
    where: { id: 'test-maintenance-review-rule' },
    update: {
      companyId: testCompany.id,
      name: 'Revisao geral',
      type: MaintenanceType.PREVENTIVE_REVIEW,
      intervalKm: 10000,
      intervalDays: 365,
      isActive: true,
    },
    create: {
      id: 'test-maintenance-review-rule',
      companyId: testCompany.id,
      name: 'Revisao geral',
      type: MaintenanceType.PREVENTIVE_REVIEW,
      intervalKm: 10000,
      intervalDays: 365,
      isActive: true,
    },
  });

  await prisma.vehicleMaintenance.upsert({
    where: { id: 'test-maintenance-company-vehicle-oil' },
    update: {
      companyId: testCompany.id,
      vehicleId: companyVehicle.id,
      maintenanceRuleId: oilRule.id,
      type: MaintenanceType.OIL_CHANGE,
      description: 'Troca de oleo e filtro para dados de teste.',
      performedAt: new Date('2026-05-10T12:00:00.000Z'),
      performedKm: 45000,
      nextDueKm: 50000,
      nextDueDate: new Date('2026-11-06T12:00:00.000Z'),
      cost: 280,
      status: MaintenanceStatus.DONE,
    },
    create: {
      id: 'test-maintenance-company-vehicle-oil',
      companyId: testCompany.id,
      vehicleId: companyVehicle.id,
      maintenanceRuleId: oilRule.id,
      type: MaintenanceType.OIL_CHANGE,
      description: 'Troca de oleo e filtro para dados de teste.',
      performedAt: new Date('2026-05-10T12:00:00.000Z'),
      performedKm: 45000,
      nextDueKm: 50000,
      nextDueDate: new Date('2026-11-06T12:00:00.000Z'),
      cost: 280,
      status: MaintenanceStatus.DONE,
    },
  });

  await prisma.routeShift.upsert({
    where: { id: 'test-route-employee-reimbursement' },
    update: {
      companyId: testCompany.id,
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      startedAt: new Date('2026-05-15T11:00:00.000Z'),
      endedAt: new Date('2026-05-15T13:00:00.000Z'),
      startLatitude: -23.55052,
      startLongitude: -46.633308,
      endLatitude: -23.566,
      endLongitude: -46.66,
      totalDistanceKm: 38.4,
      totalDurationMinutes: 120,
      estimatedFuelCost: 0,
      reimbursementValue: 27.65,
      status: RouteShiftStatus.FINISHED,
    },
    create: {
      id: 'test-route-employee-reimbursement',
      companyId: testCompany.id,
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      startedAt: new Date('2026-05-15T11:00:00.000Z'),
      endedAt: new Date('2026-05-15T13:00:00.000Z'),
      startLatitude: -23.55052,
      startLongitude: -46.633308,
      endLatitude: -23.566,
      endLongitude: -46.66,
      totalDistanceKm: 38.4,
      totalDurationMinutes: 120,
      estimatedFuelCost: 0,
      reimbursementValue: 27.65,
      status: RouteShiftStatus.FINISHED,
    },
  });

  await prisma.routePoint.createMany({
    data: [
      {
        id: 'test-route-point-1',
        routeShiftId: 'test-route-employee-reimbursement',
        latitude: -23.55052,
        longitude: -46.633308,
        accuracy: 12,
        speed: 8,
        recordedAt: new Date('2026-05-15T11:00:00.000Z'),
      },
      {
        id: 'test-route-point-2',
        routeShiftId: 'test-route-employee-reimbursement',
        latitude: -23.558,
        longitude: -46.645,
        accuracy: 14,
        speed: 10,
        recordedAt: new Date('2026-05-15T12:00:00.000Z'),
      },
      {
        id: 'test-route-point-3',
        routeShiftId: 'test-route-employee-reimbursement',
        latitude: -23.566,
        longitude: -46.66,
        accuracy: 10,
        speed: 0,
        recordedAt: new Date('2026-05-15T13:00:00.000Z'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reimbursementPayment.upsert({
    where: { id: 'test-reimbursement-payment-1' },
    update: {
      companyId: testCompany.id,
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      distanceKm: 38.4,
      fuelCost: 22.61,
      amount: 27.65,
      description: 'Reembolso de rota teste com veiculo particular.',
      paidAt: new Date('2026-05-16T12:00:00.000Z'),
      status: ReimbursementPaymentStatus.PAID,
    },
    create: {
      id: 'test-reimbursement-payment-1',
      companyId: testCompany.id,
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      distanceKm: 38.4,
      fuelCost: 22.61,
      amount: 27.65,
      description: 'Reembolso de rota teste com veiculo particular.',
      paidAt: new Date('2026-05-16T12:00:00.000Z'),
      status: ReimbursementPaymentStatus.PAID,
    },
  });

  await prisma.serviceOrder.upsert({
    where: { id: 'test-service-order-1' },
    update: {
      companyId: testCompany.id,
      title: 'Instalacao cliente Zona Norte',
      description: 'OS de teste com rota predefinida e veiculo particular.',
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      status: ServiceOrderStatus.PENDING,
      scheduledDate: new Date('2026-05-16T09:00:00.000Z'),
      notes: 'Levar roteador e testar sinal no local.',
    },
    create: {
      id: 'test-service-order-1',
      companyId: testCompany.id,
      title: 'Instalacao cliente Zona Norte',
      description: 'OS de teste com rota predefinida e veiculo particular.',
      employeeId: employee.id,
      vehicleId: employeeVehicle.id,
      status: ServiceOrderStatus.PENDING,
      scheduledDate: new Date('2026-05-16T09:00:00.000Z'),
      notes: 'Levar roteador e testar sinal no local.',
    },
  });

  await prisma.serviceOrderStop.createMany({
    data: [
      {
        id: 'test-service-order-stop-1',
        companyId: testCompany.id,
        orderId: 'test-service-order-1',
        customerName: 'Cliente Ana Silva',
        address: 'Av. Paulista, 1000 - Sao Paulo, SP',
        latitude: -23.563099,
        longitude: -46.654312,
        visitOrder: 1,
        status: ServiceOrderStopStatus.PENDING,
      },
      {
        id: 'test-service-order-stop-2',
        companyId: testCompany.id,
        orderId: 'test-service-order-1',
        customerName: 'Cliente Marco Lima',
        address: 'Rua Augusta, 900 - Sao Paulo, SP',
        latitude: -23.555236,
        longitude: -46.657261,
        visitOrder: 2,
        status: ServiceOrderStopStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
