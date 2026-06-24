const prisma = require('../lib/prisma');

const requireActiveSubscription = (serviceCode) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User context not found. Log in first."
        });
      }

      // Bypass check for Admins and Super Admins
      const roleName = user.role?.name || req.role || user.role || '';
      const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
      const isUserAdmin = user.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
      if (isUserAdmin) {
        return next();
      }

      // Check if user status is ACTIVE
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: "User account is suspended or inactive."
        });
      }

      // Fetch the service definition
      const service = await prisma.service.findFirst({
        where: { key: serviceCode, deletedAt: null }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Verification service '${serviceCode}' is not available.`
        });
      }

      // Check active subscription
      const subscription = await prisma.userServiceSubscription.findUnique({
        where: {
          userId_serviceId: {
            userId: user.id,
            serviceId: service.id
          }
        }
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: `Active ${service.name} plan required.`
        });
      }

      // Check expiration if expiresAt is populated
      if (subscription.expiresAt && new Date() > new Date(subscription.expiresAt)) {
        return res.status(403).json({
          success: false,
          message: `Your subscription to ${service.name} has expired.`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requireActiveSubscription;
