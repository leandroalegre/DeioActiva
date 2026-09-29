// Limpieza de registros huerfanos de Reuniones (y de comentarios/historial de tareas).
//
// Por que existe: las tablas del hosting son MyISAM, sin foreign keys, asi que hasta el fix
// de borrado explicito, eliminar una reunion o una tarea dejaba sus dependientes en la base.
//
// Uso (desde backend/, con el .env de produccion):
//   node scripts/cleanup-meeting-orphans.js           -> solo muestra cuantos hay (no borra)
//   node scripts/cleanup-meeting-orphans.js --apply   -> los borra
const { PrismaClient } = require('@prisma/client');

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

const QUERIES = {
  // Avances cuyo punto ya no existe, o cuyo punto es huerfano (su reunion ya no existe).
  meeting_point_notes: `SELECT n.id FROM meeting_point_notes n
    LEFT JOIN meeting_points p ON p.id = n.pointId
    LEFT JOIN meetings m ON m.id = p.meetingId
    WHERE p.id IS NULL OR m.id IS NULL`,
  meeting_points: `SELECT p.id FROM meeting_points p
    LEFT JOIN meetings m ON m.id = p.meetingId WHERE m.id IS NULL`,
  meeting_participants: `SELECT x.id FROM meeting_participants x
    LEFT JOIN meetings m ON m.id = x.meetingId WHERE m.id IS NULL`,
  work_item_comments: `SELECT c.id FROM work_item_comments c
    LEFT JOIN work_items w ON w.id = c.workItemId WHERE w.id IS NULL`,
  work_item_history: `SELECT h.id FROM work_item_history h
    LEFT JOIN work_items w ON w.id = h.workItemId WHERE w.id IS NULL`,
};

async function main() {
  const found = {};
  for (const [table, sql] of Object.entries(QUERIES)) {
    found[table] = (await prisma.$queryRawUnsafe(sql)).map((r) => r.id);
  }

  // Referencias colgadas (no se borran, se ponen en null).
  const danglingCarry = await prisma.$queryRawUnsafe(`SELECT p.id FROM meeting_points p
    LEFT JOIN meeting_points o ON o.id = p.carriedFromId
    WHERE p.carriedFromId IS NOT NULL AND o.id IS NULL`);
  const danglingWorkItem = await prisma.$queryRawUnsafe(`SELECT p.id FROM meeting_points p
    LEFT JOIN work_items w ON w.id = p.workItemId
    WHERE p.workItemId IS NOT NULL AND w.id IS NULL`);
  const danglingPrev = await prisma.$queryRawUnsafe(`SELECT m.id FROM meetings m
    LEFT JOIN meetings o ON o.id = m.previousMeetingId
    WHERE m.previousMeetingId IS NOT NULL AND o.id IS NULL`);

  for (const [t, ids] of Object.entries(found)) console.log(`${t}: ${ids.length} huerfanos`);
  console.log(`meeting_points con carriedFromId colgado: ${danglingCarry.length}`);
  console.log(`meeting_points con workItemId colgado: ${danglingWorkItem.length}`);
  console.log(`meetings con previousMeetingId colgado: ${danglingPrev.length}`);

  if (!apply) {
    console.log('\nModo lectura. Para limpiar, volve a correr con --apply.');
    return;
  }

  // Los puntos huerfanos se borran al final; antes se desvinculan los que venian de ellos.
  const orphanPointIds = found.meeting_points;
  await prisma.meetingPoint.updateMany({
    where: { carriedFromId: { in: [...orphanPointIds, ...danglingCarry.map((r) => r.id)] } },
    data: { carriedFromId: null },
  });
  await prisma.meetingPoint.updateMany({
    where: { id: { in: danglingWorkItem.map((r) => r.id) } },
    data: { workItemId: null },
  });
  await prisma.meeting.updateMany({
    where: { id: { in: danglingPrev.map((r) => r.id) } },
    data: { previousMeetingId: null },
  });
  await prisma.meetingPointNote.deleteMany({ where: { id: { in: found.meeting_point_notes } } });
  await prisma.meetingPoint.deleteMany({ where: { id: { in: orphanPointIds } } });
  await prisma.meetingParticipant.deleteMany({ where: { id: { in: found.meeting_participants } } });
  await prisma.workItemComment.deleteMany({ where: { id: { in: found.work_item_comments } } });
  await prisma.workItemHistory.deleteMany({ where: { id: { in: found.work_item_history } } });
  console.log('\nLimpieza aplicada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
