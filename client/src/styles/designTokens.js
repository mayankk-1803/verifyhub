export const dizipayTokens = {
  brand: { name: 'Dizipay', promise: 'Enterprise Identity Infrastructure' },
  colors: {
    emerald: '#16A34A', emeraldSoft: '#22C55E', charcoal: '#0F172A', surfaceDark: '#1E293B',
    background: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', muted: '#64748B',
    success: '#10B981', danger: '#EF4444', warning: '#F59E0B', border: '#E2E8F0'
  },
  radius: { sm: '12px', md: '16px', lg: '24px', xl: '32px' },
  shadow: {
    card: '0 20px 45px rgba(15, 23, 42, 0.07)',
    hover: '0 28px 70px rgba(22, 163, 74, 0.16)',
    button: '0 16px 32px rgba(22, 163, 74, 0.24)'
  }
};

export const statusTone = (status = '') => {
  const key = String(status).toUpperCase();
  if (['ACTIVE', 'SUCCESS', 'COMPLETED', 'APPROVED', 'KYC_APPROVED'].includes(key)) return 'success';
  if (['FAILED', 'ERROR', 'REVOKED', 'REJECTED', 'KYC_REJECTED', 'SUSPENDED'].includes(key)) return 'danger';
  if (['PENDING', 'PROCESSING', 'PENDING_KYC', 'AADHAAR_OTP_SENT'].includes(key)) return 'warning';
  return 'neutral';
};
