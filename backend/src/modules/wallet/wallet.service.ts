// src/modules/wallet/wallet.service.ts
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { razorpayClient, verifyRazorpayPayment } from '../../lib/razorpay.js';
import { writeAuditLog } from '../../lib/audit.js';
import { AppError, InsufficientBalanceError, NotFoundError } from '../../lib/errors.js';
import type { Paise } from '../../lib/money.js';
import type { TopupInitiateInput, TopupVerifyInput } from '../../schemas/wallet.schema.js';

export async function getWalletBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new NotFoundError('Wallet');

  const summary = await prisma.transaction.groupBy({
    by: ['type'],
    where: { walletId: wallet.id, status: 'COMPLETED' },
    _sum: { amount: true },
  });

  return {
    balance: wallet.balance,
    walletId: wallet.id,
    summary: summary.map((s) => ({ type: s.type, total: s._sum.amount ?? 0 })),
  };
}

export async function initiateTopup(userId: string, input: TopupInitiateInput) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new NotFoundError('Wallet');

  // Create Razorpay order
  const order = await razorpayClient.orders.create({
    amount: input.amount_paise,
    currency: 'INR',
    receipt: `topup_${wallet.id}_${Date.now()}`,
  });

  // Create pending transaction
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: 'WALLET_TOPUP',
      amount: input.amount_paise,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance, // updated on confirmation
      status: 'PENDING',
      referenceId: order.id,
      description: 'Wallet top-up via Razorpay',
    },
  });

  void writeAuditLog({
    type: 'WALLET_TOPUP_INITIATED',
    actorId: userId,
    actorRole: null,
    targetType: 'wallet',
    targetId: wallet.id,
    ipAddress: null,
    userAgentHash: null,
    payload: { amount: input.amount_paise, orderId: order.id },
    result: 'SUCCESS',
  });

  return {
    orderId: order.id,
    amount_paise: input.amount_paise,
    razorpay_key_id: env.RAZORPAY_KEY_ID,
  };
}

export async function verifyTopup(userId: string, input: TopupVerifyInput) {
  // Verify payment signature
  const valid = verifyRazorpayPayment(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature,
  );
  if (!valid) throw new AppError('INVALID_SIGNATURE', 422, 'Payment verification failed');

  return prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findFirst({
      where: { referenceId: input.razorpay_order_id, status: 'PENDING' },
    });
    if (!txn) throw new NotFoundError('Transaction');

    // Lock wallet
    const wallets = await tx.$queryRaw<Array<{ id: string; user_id: string; balance: number }>>`
      SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
    `;
    const wallet = wallets[0];
    if (!wallet) throw new NotFoundError('Wallet');

    const newBalance = wallet.balance + txn.amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.transaction.update({
      where: { id: txn.id },
      data: {
        status: 'COMPLETED',
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        metadata: { paymentId: input.razorpay_payment_id },
      },
    });

    void writeAuditLog({
      type: 'WALLET_TOPUP_COMPLETED',
      actorId: userId,
      actorRole: null,
      targetType: 'wallet',
      targetId: wallet.id,
      ipAddress: null,
      userAgentHash: null,
      payload: { amount: txn.amount, newBalance },
      result: 'SUCCESS',
    });

    return { balance: newBalance, amount_credited: txn.amount };
  });
}

export async function getTransactions(userId: string, cursor?: string, limit = 20) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new NotFoundError('Wallet');

  const transactions = await prisma.transaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = transactions.length > limit;
  const data = hasMore ? transactions.slice(0, limit) : transactions;

  return {
    transactions: data,
    meta: {
      hasMore,
      cursor: data.length > 0 ? data[data.length - 1]?.id : undefined,
    },
  };
}
