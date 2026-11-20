-- Display names are unique case-insensitively: "Alice" and "alice" cannot both exist.
-- Prisma schema cannot express an expression index, so it lives only in this migration.
-- The register route maps a violation of this index to 409 DISPLAY_NAME_TAKEN.
CREATE UNIQUE INDEX "users_display_name_lower_key" ON "users" (lower("display_name"));
