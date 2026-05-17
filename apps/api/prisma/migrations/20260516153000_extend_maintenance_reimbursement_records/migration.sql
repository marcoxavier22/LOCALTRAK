ALTER TABLE "vehicle_maintenances"
ADD COLUMN "type" "MaintenanceType" NOT NULL DEFAULT 'CUSTOM';

UPDATE "vehicle_maintenances" vm
SET "type" = mr."type"
FROM "maintenance_rules" mr
WHERE vm."maintenance_rule_id" = mr."id";

ALTER TABLE "reimbursement_payments"
ADD COLUMN "vehicle_id" TEXT,
ADD COLUMN "distance_km" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN "fuel_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX "reimbursement_payments_vehicle_id_paid_at_idx"
ON "reimbursement_payments"("vehicle_id", "paid_at");

ALTER TABLE "reimbursement_payments"
ADD CONSTRAINT "reimbursement_payments_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
