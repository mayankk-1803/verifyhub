-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `user_agent` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `services` ADD COLUMN `activation_fee` DECIMAL(10, 4) NOT NULL DEFAULT 49.0000;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `aadhaar_address` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_dob` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_father_name` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_gender` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_name` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_number_masked` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_photo` LONGTEXT NULL,
    ADD COLUMN `aadhaar_photo_url` VARCHAR(191) NULL,
    ADD COLUMN `aadhaar_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aadhaar_verified_at` DATETIME(3) NULL,
    ADD COLUMN `date_of_birth` VARCHAR(191) NULL,
    ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `kyc_approved_at` DATETIME(3) NULL,
    ADD COLUMN `kyc_level` VARCHAR(191) NOT NULL DEFAULT 'PENDING_KYC',
    ADD COLUMN `kyc_rejected_at` DATETIME(3) NULL,
    ADD COLUMN `kyc_remarks` VARCHAR(191) NULL,
    ADD COLUMN `kyc_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_KYC',
    ADD COLUMN `last_ip` VARCHAR(191) NULL,
    ADD COLUMN `last_login` DATETIME(3) NULL,
    ADD COLUMN `name` VARCHAR(191) NULL,
    ADD COLUMN `pan_name` VARCHAR(191) NULL,
    ADD COLUMN `pan_number` VARCHAR(191) NULL,
    ADD COLUMN `pan_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pan_verified_at` DATETIME(3) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `phone_number` VARCHAR(191) NULL,
    ADD COLUMN `phone_verified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL,
    MODIFY `refresh_token` TEXT NULL;

-- AlterTable
ALTER TABLE `wallet_ledger` MODIFY `type` ENUM('CREDIT', 'DEBIT', 'ADJUSTMENT') NOT NULL,
    MODIFY `reference_type` ENUM('PAYMENT', 'VERIFICATION', 'REFUND', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'SERVICE_PURCHASE', 'SERVICE_ACTIVATION', 'MANUAL_ADMIN_ADJUSTMENT') NULL;

-- CreateTable
CREATE TABLE `otps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(191) NOT NULL,
    `otp_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `otps_phone_key`(`phone`),
    INDEX `otps_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kyc_verifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `pan_number` VARCHAR(191) NULL,
    `aadhaar_masked` VARCHAR(191) NULL,
    `application_number` VARCHAR(191) NULL,
    `pan_response` JSON NULL,
    `aadhaar_response` JSON NULL,
    `status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `kyc_verifications_user_id_idx`(`user_id`),
    INDEX `kyc_verifications_status_idx`(`status`),
    INDEX `kyc_verifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_service_subscriptions_user_id_idx` ON `user_service_subscriptions`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);

-- CreateIndex
CREATE INDEX `users_kyc_status_idx` ON `users`(`kyc_status`);

-- CreateIndex
CREATE INDEX `users_pan_number_idx` ON `users`(`pan_number`);

-- CreateIndex
CREATE INDEX `users_phone_number_idx` ON `users`(`phone_number`);

-- CreateIndex
CREATE INDEX `users_aadhaar_number_masked_idx` ON `users`(`aadhaar_number_masked`);

-- CreateIndex
CREATE INDEX `users_aadhaar_verified_at_idx` ON `users`(`aadhaar_verified_at`);

-- CreateIndex
CREATE INDEX `users_kyc_approved_at_idx` ON `users`(`kyc_approved_at`);

-- CreateIndex
CREATE INDEX `verification_requests_created_at_idx` ON `verification_requests`(`created_at`);

-- AddForeignKey
ALTER TABLE `kyc_verifications` ADD CONSTRAINT `kyc_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `user_service_subscriptions` RENAME INDEX `user_service_subscriptions_service_id_fkey` TO `user_service_subscriptions_service_id_idx`;
