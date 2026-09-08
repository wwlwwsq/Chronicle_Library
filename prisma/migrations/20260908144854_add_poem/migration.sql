-- CreateTable
CREATE TABLE "Poem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "dynasty" TEXT NOT NULL DEFAULT '唐',
    "style" TEXT NOT NULL DEFAULT '未分类',
    "content" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "posterPath" TEXT,
    "comicPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
