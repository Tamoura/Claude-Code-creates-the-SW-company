import { PrismaClient, PaymentStatus } from '@prisma/client';

export interface OverviewStats {
  total_payments: number;
  total_volume: number;
  successful_payments: number;
  success_rate: number;
  average_payment: number;
  total_refunds: number;
  refund_rate: number;
}

export interface VolumeDataPoint {
  date: string;
  volume: number;
  count: number;
}

export interface PaymentBreakdownItem {
  label: string;
  count: number;
  volume: number;
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getOverview(userId: string): Promise<OverviewStats> {
    const [paymentAgg, completedAgg, refundCount] = await Promise.all([
      this.prisma.paymentSession.aggregate({
        where: { userId },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.paymentSession.aggregate({
        where: { userId, status: PaymentStatus.COMPLETED },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.refund.count({
        where: { paymentSession: { userId } },
      }),
    ]);

    const totalPayments = paymentAgg._count;
    const totalVolume = Number(paymentAgg._sum.amount ?? 0);
    const successfulPayments = completedAgg._count;
    const successRate = totalPayments > 0 ? successfulPayments / totalPayments : 0;
    const averagePayment = totalPayments > 0 ? totalVolume / totalPayments : 0;
    const refundRate = totalPayments > 0 ? refundCount / totalPayments : 0;

    return {
      total_payments: totalPayments,
      total_volume: Math.round(totalVolume * 100) / 100,
      successful_payments: successfulPayments,
      success_rate: Math.round(successRate * 10000) / 10000,
      average_payment: Math.round(averagePayment * 100) / 100,
      total_refunds: refundCount,
      refund_rate: Math.round(refundRate * 10000) / 10000,
    };
  }

  async getVolume(
    userId: string,
    period: 'day' | 'week' | 'month',
    days: number,
  ): Promise<VolumeDataPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await this.prisma.paymentSession.findMany({
      where: {
        userId,
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: since },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { volume: number; count: number }>();

    for (const p of payments) {
      const key = this.bucketKey(p.createdAt, period);
      const existing = buckets.get(key) || { volume: 0, count: 0 };
      existing.volume += Number(p.amount);
      existing.count += 1;
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries()).map(([date, data]) => ({
      date,
      volume: Math.round(data.volume * 100) / 100,
      count: data.count,
    }));
  }

  async getPaymentBreakdown(
    userId: string,
    groupBy: 'status' | 'network' | 'token',
  ): Promise<PaymentBreakdownItem[]> {
    const field = groupBy === 'status' ? 'status' : groupBy;

    const groups = await this.prisma.paymentSession.groupBy({
      by: [field],
      where: { userId },
      _count: true,
      _sum: { amount: true },
    });

    return groups.map((g) => ({
      label: String(g[field]),
      count: g._count,
      volume: Math.round(Number(g._sum.amount ?? 0) * 100) / 100,
    }));
  }

  private bucketKey(date: Date, period: 'day' | 'week' | 'month'): string {
    if (period === 'day') {
      return date.toISOString().substring(0, 10);
    }
    if (period === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().substring(0, 10);
    }
    return date.toISOString().substring(0, 7);
  }
}
