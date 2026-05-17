CREATE TYPE "ReimbursementPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

CREATE TABLE "reimbursement_payments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "status" "ReimbursementPaymentStatus" NOT NULL DEFAULT 'PAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reimbursement_payments_company_id_paid_at_idx" ON "reimbursement_payments"("company_id", "paid_at");
CREATE INDEX "reimbursement_payments_employee_id_paid_at_idx" ON "reimbursement_payments"("employee_id", "paid_at");

ALTER TABLE "reimbursement_payments"
ADD CONSTRAINT "reimbursement_payments_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reimbursement_payments"
ADD CONSTRAINT "reimbursement_payments_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reimbursement_payments" ENABLE ROW LEVEL SECURITY;
