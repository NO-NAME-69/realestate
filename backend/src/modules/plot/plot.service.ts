// src/modules/plot/plot.service.ts
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { writeAuditLog } from '../../lib/audit.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import type { PlotFilterInput } from '../../schemas/plot.schema.js';

const MAX_HOLDS_PER_USER = 5;
const HOLD_DURATION_DAYS = 30;

export async function listPlots(filters: PlotFilterInput) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.project_id) where['projectId'] = filters.project_id;
  if (filters.type) where['type'] = filters.type;
  if (filters.status) where['status'] = filters.status;
  if (filters.facing) where['facing'] = filters.facing;
  if (filters.min_price_paise || filters.max_price_paise) {
    where['price'] = {
      ...(filters.min_price_paise ? { gte: filters.min_price_paise } : {}),
      ...(filters.max_price_paise ? { lte: filters.max_price_paise } : {}),
    };
  }
  if (filters.min_size_sqft) {
    where['sizeSqft'] = { gte: filters.min_size_sqft };
  }

  const plots = await prisma.plot.findMany({
    where,
    include: { project: { select: { name: true, location: true } } },
    orderBy: { createdAt: 'desc' },
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasMore = plots.length > filters.limit;
  const data = hasMore ? plots.slice(0, filters.limit) : plots;
  return { plots: data, meta: { hasMore, cursor: data[data.length - 1]?.id } };
}

export async function getPlotDetail(plotId: string) {
  const plot = await prisma.plot.findUnique({
    where: { id: plotId },
    include: { project: true, holds: { where: { status: 'ACTIVE' } } },
  });
  if (!plot || plot.deletedAt) throw new NotFoundError('Plot');
  return plot;
}

export async function holdPlot(userId: string, plotId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify user is ACTIVE
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status !== 'ACTIVE') {
      throw new AppError('USER_NOT_ACTIVE', 422, 'Account must be active to hold plots');
    }

    // 2. Check active holds count
    const activeHolds = await tx.plotHold.count({
      where: { userId, status: 'ACTIVE' },
    });
    if (activeHolds >= MAX_HOLDS_PER_USER) {
      throw new AppError('MAX_HOLDS_REACHED', 422, `Maximum ${String(MAX_HOLDS_PER_USER)} active holds allowed`);
    }

    // 3. Lock plot row + check availability
    const plots = await tx.$queryRaw<Array<{ id: string; price: number; status: string }>>`
      SELECT id, price, status FROM plots WHERE id = ${plotId}::uuid FOR UPDATE
    `;
    const plot = plots[0];
    if (!plot || plot.status !== 'AVAILABLE') {
      throw new AppError('PLOT_NOT_AVAILABLE', 422, 'Plot is not available for holding');
    }

    // 4. Calculate eligibility (dual-path)
    const membership = await tx.teamMember.findFirst({
      where: { userId },
      include: { team: true },
    });

    let maxHoldValue: number;
    const MIN_HOLD_VALUE = 50_000_00; // ₹50,000 in paise – floor for new users
    if (membership) {
      const teamLimit = Math.floor(membership.team.teamValue * 0.5);
      const investmentLimit = user.totalInvestment * 10;
      maxHoldValue = Math.max(Math.min(teamLimit, investmentLimit), MIN_HOLD_VALUE);
    } else {
      maxHoldValue = Math.max(user.totalInvestment * 10, MIN_HOLD_VALUE);
    }

    // Sum current held plot values
    const currentHolds = await tx.plotHold.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { plot: { select: { price: true } } },
    });
    const totalHeld = currentHolds.reduce((s, h) => s + h.plot.price, 0);

    if (totalHeld + plot.price > maxHoldValue) {
      throw new AppError('HOLD_LIMIT_EXCEEDED', 422, 'Plot value exceeds your holding eligibility');
    }

    // 5. Create hold + update plot status
    await tx.plot.update({ where: { id: plotId }, data: { status: 'HELD' } });
    const expiresAt = new Date(Date.now() + HOLD_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const hold = await tx.plotHold.create({
      data: { userId, plotId, status: 'ACTIVE', expiresAt },
    });

    void writeAuditLog({
      type: 'PLOT_HELD',
      actorId: userId, actorRole: user.role, targetType: 'plot', targetId: plotId,
      ipAddress: null, userAgentHash: null,
      payload: { holdId: hold.id, expiresAt: expiresAt.toISOString() },
      result: 'SUCCESS',
    });

    return hold;
  });
}

export async function releasePlotHold(userId: string, plotId: string) {
  return prisma.$transaction(async (tx) => {
    const hold = await tx.plotHold.findFirst({
      where: { userId, plotId, status: 'ACTIVE' },
    });
    if (!hold) throw new NotFoundError('Active hold');

    await tx.plotHold.update({
      where: { id: hold.id },
      data: { status: 'RELEASED_MANUAL', releasedAt: new Date() },
    });
    await tx.plot.update({ where: { id: plotId }, data: { status: 'AVAILABLE' } });

    void writeAuditLog({
      type: 'PLOT_HOLD_RELEASED',
      actorId: userId, actorRole: null, targetType: 'plot', targetId: plotId,
      ipAddress: null, userAgentHash: null,
      payload: { holdId: hold.id, reason: 'manual' },
      result: 'SUCCESS',
    });
  });
}

export async function getUserHeldPlots(userId: string) {
  return prisma.plotHold.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { plot: { include: { project: { select: { name: true } } } } },
    orderBy: { heldAt: 'desc' },
  });
}
