-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MASTER_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'TRIAL', 'DELINQUENT', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'PICKUP', 'VAN', 'TRUCK');

-- CreateEnum
CREATE TYPE "VehicleOwnershipType" AS ENUM ('COMPANY', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GASOLINE', 'ETHANOL', 'DIESEL', 'FLEX', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "RouteShiftStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED', 'SYNC_PENDING', 'ERROR');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'PREVENTIVE_REVIEW', 'TIRES', 'BRAKES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('DONE', 'SCHEDULED', 'OVERDUE', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "role" "Role" NOT NULL,
    "company_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "terms_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'TRIAL',
    "plan_id" TEXT,
    "max_employees" INTEGER NOT NULL DEFAULT 5,
    "max_vehicles" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_employees" INTEGER NOT NULL,
    "max_vehicles" INTEGER NOT NULL,
    "max_routes_per_month" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "type" "VehicleType" NOT NULL,
    "ownership_type" "VehicleOwnershipType" NOT NULL,
    "current_km" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fuel_type" "FuelType",
    "average_consumption" DECIMAL(8,2),
    "cost_per_km" DECIMAL(8,2),
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_shifts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "start_latitude" DECIMAL(10,7),
    "start_longitude" DECIMAL(10,7),
    "end_latitude" DECIMAL(10,7),
    "end_longitude" DECIMAL(10,7),
    "total_distance_km" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "stopped_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "estimated_fuel_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reimbursement_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RouteShiftStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_points" (
    "id" TEXT NOT NULL,
    "route_shift_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "speed" DECIMAL(8,2),
    "altitude" DECIMAL(8,2),
    "battery_level" DECIMAL(5,2),
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "interval_km" INTEGER,
    "interval_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maintenance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "maintenance_rule_id" TEXT,
    "description" TEXT,
    "performed_at" TIMESTAMP(3),
    "performed_km" INTEGER,
    "next_due_km" INTEGER,
    "next_due_date" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "vehicle_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fuel_type" "FuelType" NOT NULL,
    "price_per_liter" DECIMAL(8,3) NOT NULL,
    "default_cost_per_km" DECIMAL(8,3),

    CONSTRAINT "fuel_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terms_version" TEXT NOT NULL,
    "ip_address" TEXT,

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "company_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_role_idx" ON "users"("company_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "companies_document_key" ON "companies"("document");

-- CreateIndex
CREATE INDEX "vehicles_company_id_idx" ON "vehicles"("company_id");

-- CreateIndex
CREATE INDEX "vehicles_employee_id_idx" ON "vehicles"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_company_id_plate_key" ON "vehicles"("company_id", "plate");

-- CreateIndex
CREATE INDEX "route_shifts_company_id_started_at_idx" ON "route_shifts"("company_id", "started_at");

-- CreateIndex
CREATE INDEX "route_shifts_company_id_status_idx" ON "route_shifts"("company_id", "status");

-- CreateIndex
CREATE INDEX "route_shifts_employee_id_started_at_idx" ON "route_shifts"("employee_id", "started_at");

-- CreateIndex
CREATE INDEX "route_shifts_vehicle_id_idx" ON "route_shifts"("vehicle_id");

-- CreateIndex
CREATE INDEX "route_points_route_shift_id_recorded_at_idx" ON "route_points"("route_shift_id", "recorded_at");

-- CreateIndex
CREATE INDEX "maintenance_rules_company_id_idx" ON "maintenance_rules"("company_id");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_company_id_idx" ON "vehicle_maintenances"("company_id");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_vehicle_id_idx" ON "vehicle_maintenances"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_settings_company_id_fuel_type_key" ON "fuel_settings"("company_id", "fuel_type");

-- CreateIndex
CREATE INDEX "consent_logs_user_id_idx" ON "consent_logs"("user_id");

-- CreateIndex
CREATE INDEX "consent_logs_company_id_idx" ON "consent_logs"("company_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_shifts" ADD CONSTRAINT "route_shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_shifts" ADD CONSTRAINT "route_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_shifts" ADD CONSTRAINT "route_shifts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_points" ADD CONSTRAINT "route_points_route_shift_id_fkey" FOREIGN KEY ("route_shift_id") REFERENCES "route_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_rules" ADD CONSTRAINT "maintenance_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_maintenance_rule_id_fkey" FOREIGN KEY ("maintenance_rule_id") REFERENCES "maintenance_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_settings" ADD CONSTRAINT "fuel_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
