/*
  Warnings:

  - Added the required column `apiKey` to the `Integration` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `booking` DROP FOREIGN KEY `Booking_beachId_fkey`;

-- DropForeignKey
ALTER TABLE `booking` DROP FOREIGN KEY `Booking_zoneId_fkey`;

-- AlterTable
ALTER TABLE `integration` ADD COLUMN `apiKey` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_beachId_fkey` FOREIGN KEY (`beachId`) REFERENCES `Beach`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `Booking_beachId_idx` TO `booking_beachId_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `Booking_mongoId_key` TO `booking_mongoId_key`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `Booking_zoneId_idx` TO `booking_zoneId_idx`;
