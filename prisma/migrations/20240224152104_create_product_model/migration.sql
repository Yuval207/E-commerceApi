/*
  Warnings:

  - Added the required column `address` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Products" (
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Products_name_key" ON "Products"("name");
