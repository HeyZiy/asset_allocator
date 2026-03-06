-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "platform" TEXT,
    "marketType" TEXT NOT NULL DEFAULT 'exchange',
    "cash" REAL NOT NULL DEFAULT 0,
    "targetAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Account" ("cash", "createdAt", "id", "name", "platform", "targetAmount", "type", "updatedAt") SELECT "cash", "createdAt", "id", "name", "platform", "targetAmount", "type", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
