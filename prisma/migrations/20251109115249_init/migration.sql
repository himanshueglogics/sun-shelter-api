-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'super_admin', 'user') NOT NULL DEFAULT 'admin',
    `name` VARCHAR(191) NOT NULL DEFAULT 'Admin User',
    `resetPasswordToken` VARCHAR(191) NULL,
    `resetPasswordExpire` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_mongoId_key`(`mongoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Beach` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `occupancyRate` INTEGER NOT NULL DEFAULT 0,
    `totalCapacity` INTEGER NOT NULL DEFAULT 100,
    `currentBookings` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
    `amenities` JSON NULL,
    `services` JSON NULL,
    `pricePerDay` DOUBLE NOT NULL,
    `images` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Beach_mongoId_key`(`mongoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Zone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `rows` INTEGER NOT NULL DEFAULT 0,
    `cols` INTEGER NOT NULL DEFAULT 0,
    `beachId` INTEGER NOT NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Zone_mongoId_key`(`mongoId`),
    INDEX `Zone_beachId_idx`(`beachId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sunbed` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `row` INTEGER NOT NULL,
    `col` INTEGER NOT NULL,
    `status` ENUM('available', 'selected', 'reserved', 'unavailable') NOT NULL DEFAULT 'available',
    `priceModifier` DOUBLE NOT NULL DEFAULT 0,
    `beachId` INTEGER NOT NULL,
    `zoneId` INTEGER NOT NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Sunbed_mongoId_key`(`mongoId`),
    INDEX `Sunbed_beachId_idx`(`beachId`),
    INDEX `Sunbed_zoneId_idx`(`zoneId`),
    UNIQUE INDEX `Sunbed_beachId_code_key`(`beachId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `checkInDate` DATETIME(3) NOT NULL,
    `checkOutDate` DATETIME(3) NOT NULL,
    `numberOfGuests` INTEGER NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    `paymentStatus` ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `beachId` INTEGER NOT NULL,
    `zoneId` INTEGER NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Booking_mongoId_key`(`mongoId`),
    INDEX `Booking_beachId_idx`(`beachId`),
    INDEX `Booking_zoneId_idx`(`zoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingSunbed` (
    `bookingId` INTEGER NOT NULL,
    `sunbedId` INTEGER NOT NULL,

    INDEX `BookingSunbed_sunbedId_idx`(`sunbedId`),
    PRIMARY KEY (`bookingId`, `sunbedId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Finance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('rental_income', 'service_fee', 'expense') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bookingId` INTEGER NULL,
    `beachId` INTEGER NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Finance_mongoId_key`(`mongoId`),
    INDEX `Finance_bookingId_idx`(`bookingId`),
    INDEX `Finance_beachId_idx`(`beachId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    `requestedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `beachId` INTEGER NOT NULL,
    `processedById` INTEGER NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Payout_mongoId_key`(`mongoId`),
    INDEX `Payout_beachId_idx`(`beachId`),
    INDEX `Payout_processedById_idx`(`processedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('info', 'warning', 'success', 'error') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `beachId` INTEGER NULL,
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Alert_mongoId_key`(`mongoId`),
    INDEX `Alert_beachId_idx`(`beachId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Integration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `settings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mongoId` VARCHAR(191) NULL,

    UNIQUE INDEX `Integration_mongoId_key`(`mongoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BeachAdmin` (
    `beachId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `BeachAdmin_userId_idx`(`userId`),
    PRIMARY KEY (`beachId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Zone` ADD CONSTRAINT `Zone_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sunbed` ADD CONSTRAINT `Sunbed_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sunbed` ADD CONSTRAINT `Sunbed_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSunbed` ADD CONSTRAINT `BookingSunbed_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSunbed` ADD CONSTRAINT `BookingSunbed_sunbedId_fkey` FOREIGN KEY (`sunbedId`) REFERENCES `Sunbed`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Finance` ADD CONSTRAINT `Finance_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Finance` ADD CONSTRAINT `Finance_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BeachAdmin` ADD CONSTRAINT `BeachAdmin_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BeachAdmin` ADD CONSTRAINT `BeachAdmin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
