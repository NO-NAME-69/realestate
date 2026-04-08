// src/modules/webhooks/webhook.routes.ts
// Webhook endpoints — NO auth middleware, signature verification only
// Uses an encapsulated Fastify instance so the raw body parser doesn't leak globally

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyRazorpayWebhook } from '../../lib/razorpay.js';
import { writeAuditLog } from '../../lib/audit.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // Razorpay payment webhook
  fastify.post('/razorpay', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) {
      void writeAuditLog({
        type: 'WEBHOOK_SIGNATURE_FAILURE',
        actorId: null, actorRole: null, targetType: 'webhook', targetId: null,
        ipAddress: request.ip, userAgentHash: null,
        payload: { reason: 'Missing signature header' }, result: 'FAILURE',
      });
      return reply.code(401).send({ error: 'Missing signature' });
    }

    // Body is parsed JSON by Fastify — serialize back for signature verification
    const rawBody = Buffer.from(JSON.stringify(request.body));

    // Verify signature (constant-time comparison)
    if (!verifyRazorpayWebhook(rawBody, signature)) {
      void writeAuditLog({
        type: 'WEBHOOK_SIGNATURE_FAILURE',
        actorId: null, actorRole: null, targetType: 'webhook', targetId: null,
        ipAddress: request.ip, userAgentHash: null,
        payload: { reason: 'Invalid signature' }, result: 'FAILURE',
      });
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const payload = request.body as {
      event: string;
      payload: {
        payment: {
          entity: { id: string; order_id: string; amount: number; status: string };
        };
      };
    };

    // Idempotency check
    const paymentId = payload.payload.payment.entity.id;
    const idempotencyKey = `webhook:${paymentId}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const alreadyProcessed = await redis.get(idempotencyKey) as string | null;

    if (alreadyProcessed) {
      return reply.code(200).send({ status: 'already_processed' });
    }

    if (payload.event === 'payment.captured') {
      const { order_id, amount } = payload.payload.payment.entity;

      await prisma.$transaction(async (tx) => {
        // Find pending transaction by order ID
        const txn = await tx.transaction.findFirst({
          where: { referenceId: order_id, status: 'PENDING' },
        });
        if (!txn) return; // Orphaned webhook — ignore

        // Lock wallet and credit
        const wallets = await tx.$queryRaw<
          Array<{ id: string; user_id: string; balance: number }>
        >`SELECT * FROM wallets WHERE id = ${txn.walletId}::uuid FOR UPDATE`;
        const wallet = wallets[0];
        if (!wallet) return;

        const newBalance = wallet.balance + amount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        await tx.transaction.update({
          where: { id: txn.id },
          data: {
            status: 'COMPLETED',
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
            metadata: { paymentId, webhookEvent: payload.event },
          },
        });
      });

      // Mark processed in Redis (24h TTL)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await redis.setex(idempotencyKey, 86400, 'processed');

      void writeAuditLog({
        type: 'WALLET_TOPUP_COMPLETED',
        actorId: null, actorRole: null, targetType: 'wallet', targetId: null,
        ipAddress: request.ip, userAgentHash: null,
        payload: { paymentId, amount }, result: 'SUCCESS',
      });
    }

    return reply.code(200).send({ status: 'ok' });
  });
}
