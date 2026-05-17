CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED', 'CANCELED');
CREATE TYPE "ServiceOrderStopStatus" AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "employee_id" TEXT,
    "vehicle_id" TEXT,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "initial_odometer_km" DECIMAL(12,2),
    "final_odometer_km" DECIMAL(12,2),
    "initial_odometer_photo_path" TEXT,
    "final_odometer_photo_path" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_order_stops" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "visit_order" INTEGER NOT NULL,
    "status" "ServiceOrderStopStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_order_stops_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_orders_company_id_scheduled_date_idx" ON "service_orders"("company_id", "scheduled_date");
CREATE INDEX "service_orders_company_id_status_idx" ON "service_orders"("company_id", "status");
CREATE INDEX "service_orders_employee_id_scheduled_date_idx" ON "service_orders"("employee_id", "scheduled_date");
CREATE INDEX "service_orders_vehicle_id_scheduled_date_idx" ON "service_orders"("vehicle_id", "scheduled_date");
CREATE INDEX "service_order_stops_company_id_idx" ON "service_order_stops"("company_id");
CREATE INDEX "service_order_stops_order_id_visit_order_idx" ON "service_order_stops"("order_id", "visit_order");

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_order_stops"
ADD CONSTRAINT "service_order_stops_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_order_stops"
ADD CONSTRAINT "service_order_stops_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_order_stops" ENABLE ROW LEVEL SECURITY;
