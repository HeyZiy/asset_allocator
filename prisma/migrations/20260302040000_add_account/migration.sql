-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "targetAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create default account for existing data
INSERT INTO "Account" ("name", "platform", "targetAmount", "createdAt", "updatedAt")
VALUES ('默认账户', NULL, NULL, datetime('now'), datetime('now'));

-- AlterTable AssetAllocation: add accountId
CREATE TABLE "AssetAllocation_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "targetPct" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetAllocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AssetAllocation_new" ("id", "accountId", "assetId", "targetPct", "createdAt", "updatedAt")
SELECT "id", 1, "assetId", "targetPct", "createdAt", "updatedAt" FROM "AssetAllocation";
DROP TABLE "AssetAllocation";
ALTER TABLE "AssetAllocation_new" RENAME TO "AssetAllocation";

-- AlterTable Transaction: add accountId
CREATE TABLE "Transaction_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "price" REAL NOT NULL,
    "shares" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Transaction_new" ("id", "accountId", "assetId", "type", "amount", "price", "shares", "date", "createdAt")
SELECT "id", 1, "assetId", "type", "amount", "price", "shares", "date", "createdAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "Transaction_new" RENAME TO "Transaction";
