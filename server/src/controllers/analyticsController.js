const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class AnalyticsController {
  static async getUsageStats(req, res) {
    try {
      const userId = req.user.id;

      // 1. Calculate overall volumes (Total, Success, Failed)
      const stats = await prisma.verificationRequest.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          id: true
        }
      });

      let totalRequests = 0;
      let successCount = 0;
      let failedCount = 0;

      stats.forEach(s => {
        const count = s._count.id || 0;
        totalRequests += count;
        if (s.status === 'SUCCESS') successCount = count;
        if (s.status === 'FAILED') failedCount = count;
      });

      let trends = [];
      let distribution = [];
      let successRateVal = 0;
      let errorRateVal = 0;
      let avgLatencyVal = 0;

      if (totalRequests > 0) {
        successRateVal = parseFloat(((successCount / totalRequests) * 100).toFixed(2));
        errorRateVal = parseFloat(((failedCount / totalRequests) * 100).toFixed(2));

        const latencyStats = await prisma.verificationResponse.aggregate({
          where: {
            verificationRequest: {
              userId,
              status: 'SUCCESS'
            }
          },
          _avg: {
            providerLatencyMs: true
          }
        });
        avgLatencyVal = Math.round(parseFloat(latencyStats._avg.providerLatencyMs) || 0);

        const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyStats = await prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(id) as calls, SUM(cost) as billing
          FROM verification_requests
          WHERE user_id = ${userId} AND created_at >= ${cutoffDate}
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC
        `;

        trends = dailyStats.map(d => {
          const dateStr = d.date instanceof Date 
            ? d.date.toISOString().split('T')[0] 
            : String(d.date);
          return {
            date: dateStr,
            calls: Number(d.calls) || 0,
            billing: Number(d.billing) || 0
          };
        });

        const apiDistribution = await prisma.verificationRequest.groupBy({
          by: ['serviceType'],
          where: { userId },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        });

        distribution = apiDistribution.map(a => ({
          name: a.serviceType,
          value: a._count.id || 0
        }));
      }

      // 5. Fetch wallet balance and total spend for root response properties
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });
      const walletBalance = wallet ? parseFloat(wallet.balance) : 0;

      const spendStats = await prisma.verificationRequest.aggregate({
        where: { userId },
        _sum: {
          cost: true
        }
      });
      const totalSpend = parseFloat(spendStats._sum.cost) || 0;

      return res.status(200).json({
        success: true,
        walletBalance,
        totalRequests,
        successRate: successRateVal,
        avgLatency: avgLatencyVal,
        totalSpend,
        summary: {
          totalRequests,
          successCount,
          failedCount,
          successRate: successRateVal,
          errorRate: errorRateVal,
          avgLatencyMs: avgLatencyVal
        },
        trends,
        distribution,
        apiDistribution: distribution,
        trafficHistory: trends
      });
    } catch (error) {
      logger.error('Analytics retrieve error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve analytics dashboard statistics.' });
    }
  }

  static async getSystemUsageStatsAdmin(req, res) {
    try {
      // Super admin overview stats
      const stats = await prisma.verificationRequest.groupBy({
        by: ['serviceType'],
        _count: {
          id: true
        },
        _sum: {
          cost: true
        }
      });

      let adminStats = stats.map(s => ({
        service: s.serviceType,
        requestsCount: s._count.id || 0,
        revenue: parseFloat(s._sum.cost) || 0
      }));

      return res.status(200).json({ success: true, stats: adminStats });
    } catch (error) {
      logger.error('Admin system stats retrieve error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve system overview analytics.' });
    }
  }
}

module.exports = AnalyticsController;
