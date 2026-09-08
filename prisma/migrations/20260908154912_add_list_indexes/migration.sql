-- CreateIndex
CREATE INDEX "Book_createdAt_idx" ON "Book"("createdAt");

-- CreateIndex
CREATE INDEX "Book_category_createdAt_idx" ON "Book"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Comic_createdAt_idx" ON "Comic"("createdAt");

-- CreateIndex
CREATE INDEX "Comic_category_createdAt_idx" ON "Comic"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Poem_createdAt_idx" ON "Poem"("createdAt");

-- CreateIndex
CREATE INDEX "Post_published_createdAt_idx" ON "Post"("published", "createdAt");
