-- Non-destructive operational upgrade for TrakFlow:
-- customers, structured addresses, odometer photo audit records and company operation settings.

DO $$
BEGIN
  CREATE TYPE "GeocodingStatus" AS ENUM ('PENDING', 'RESOLVED', 'FAILED', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OdometerPhotoType" AS ENUM ('START', 'FINISH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "require_odometer_start_photo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "require_odometer_finish_photo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "require_odometer_start_km" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "require_odometer_finish_km" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT NOT NULL DEFAULT '',
  "cep" TEXT,
  "street" TEXT,
  "number" TEXT,
  "complement" TEXT,
  "neighborhood" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT DEFAULT 'Brasil',
  "notes" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "geocoding_status" "GeocodingStatus" NOT NULL DEFAULT 'PENDING',
  "geocoding_updated_at" TIMESTAMP(3),
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cep" TEXT,
  ADD COLUMN IF NOT EXISTS "street" TEXT,
  ADD COLUMN IF NOT EXISTS "number" TEXT,
  ADD COLUMN IF NOT EXISTS "complement" TEXT,
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "geocoding_status" "GeocodingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "geocoding_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "customers_company_id_idx" ON "customers"("company_id");
CREATE INDEX IF NOT EXISTS "customers_company_id_status_idx" ON "customers"("company_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_company_id_fkey'
  ) THEN
    ALTER TABLE "customers"
      ADD CONSTRAINT "customers_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "service_order_stops"
  ADD COLUMN IF NOT EXISTS "customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_email" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "cep" TEXT,
  ADD COLUMN IF NOT EXISTS "street" TEXT,
  ADD COLUMN IF NOT EXISTS "number" TEXT,
  ADD COLUMN IF NOT EXISTS "complement" TEXT,
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS "address_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "geocoding_status" "GeocodingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "geocoding_updated_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "service_order_stops_customer_id_idx" ON "service_order_stops"("customer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_order_stops_customer_id_fkey'
  ) THEN
    ALTER TABLE "service_order_stops"
      ADD CONSTRAINT "service_order_stops_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "odometer_photos" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT,
  "route_shift_id" TEXT,
  "employee_id" TEXT NOT NULL,
  "vehicle_id" TEXT,
  "type" "OdometerPhotoType" NOT NULL,
  "file_path" TEXT NOT NULL,
  "content_type" TEXT,
  "size_bytes" INTEGER,
  "odometer_km" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odometer_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "odometer_photos_company_id_created_at_idx" ON "odometer_photos"("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "odometer_photos_order_id_type_idx" ON "odometer_photos"("order_id", "type");
CREATE INDEX IF NOT EXISTS "odometer_photos_route_shift_id_idx" ON "odometer_photos"("route_shift_id");
CREATE INDEX IF NOT EXISTS "odometer_photos_employee_id_created_at_idx" ON "odometer_photos"("employee_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odometer_photos_company_id_fkey'
  ) THEN
    ALTER TABLE "odometer_photos"
      ADD CONSTRAINT "odometer_photos_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odometer_photos_order_id_fkey'
  ) THEN
    ALTER TABLE "odometer_photos"
      ADD CONSTRAINT "odometer_photos_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odometer_photos_route_shift_id_fkey'
  ) THEN
    ALTER TABLE "odometer_photos"
      ADD CONSTRAINT "odometer_photos_route_shift_id_fkey"
      FOREIGN KEY ("route_shift_id") REFERENCES "route_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odometer_photos_employee_id_fkey'
  ) THEN
    ALTER TABLE "odometer_photos"
      ADD CONSTRAINT "odometer_photos_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'odometer_photos_vehicle_id_fkey'
  ) THEN
    ALTER TABLE "odometer_photos"
      ADD CONSTRAINT "odometer_photos_vehicle_id_fkey"
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "odometer_photos" ENABLE ROW LEVEL SECURITY;
