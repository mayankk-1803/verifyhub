const requireKycApproved = (req, res, next) => {
  // Allow Admin / Super Admin bypass
  if (req.user && (req.user.isAdmin || req.role === 'Super Admin' || req.role === 'Admin')) {
    return next();
  }

  const kycStatus = req.user?.kycStatus;
  if (kycStatus !== 'KYC_APPROVED' && kycStatus !== 'APPROVED') {
    return res.status(403).json({
      success: false,
      message: "Complete KYC verification first"
    });
  }

  next();
};

module.exports = requireKycApproved;
