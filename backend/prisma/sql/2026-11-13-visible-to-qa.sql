-- Una sola vez, despues del `prisma db push` que agrega work_items.visibleToQa:
-- los reportes que ya cargo el perfil QA quedan tildados "Visible para QA", como los nuevos.
-- npx prisma db execute --file prisma/sql/2026-11-13-visible-to-qa.sql --schema prisma/schema.prisma
UPDATE work_items
SET visibleToQa = 1
WHERE createdById IN (
  SELECT u.id FROM users u JOIN roles r ON r.id = u.roleId WHERE r.code = 'qa'
  UNION
  SELECT ar.userId FROM user_additional_roles ar JOIN roles r ON r.id = ar.roleId WHERE r.code = 'qa'
);
