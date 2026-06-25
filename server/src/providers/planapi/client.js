const axios = require('axios');
const logger = require('../../config/logger');

const DEFAULT_BASE_URL = 'https://planapi.in';

const DEFAULT_PATHS = {
  GST_VERIFY: '/gst/verify',
  GST_RETURN: '/gst/return',
  RC_VERIFY: '/rc/verify',
  RC_LITE: '/rc/lite',
  RC_TO_MOBILE: '/rc/to-mobile',
  MOBILE_TO_RC: '/mobile/to-rc',
  VEHICLE_CHALLAN: '/vehicle/challan',
  DRIVING_LICENSE_VERIFY: '/driving-licence/verify',
  PASSPORT_VERIFY: '/passport/verify',
  VOTER_ID_VERIFY: '/voter/verify',
  MCA_COMPANY_SEARCH: '/mca/company-search',
  BANK_VERIFY: '/bank/verify',
  UPI_VERIFY: '/upi/verify'
};

function envKey(serviceKey) {
  return `PLANAPI_${serviceKey.toUpperCase()}_PATH`;
}

function getConfig(serviceKey) {
  const tokenId = process.env.PLANAPI_TOKEN_ID;
  const userId = process.env.PLANAPI_USER_ID;
  const password = process.env.PLANAPI_PASSWORD;

  if (!tokenId || !userId || !password) {
    throw new Error('PLANAPI credentials are not configured.');
  }

  const baseUrl = (process.env.PLANAPI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const mode = process.env.PLANAPI_MODE || '0';
  const endpointPath = process.env[envKey(serviceKey)] || DEFAULT_PATHS[serviceKey];

  if (!endpointPath) {
    throw new Error(`PLANAPI endpoint path is not configured for ${serviceKey}.`);
  }

  return {
    baseUrl,
    mode,
    endpointPath: endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`,
    tokenId,
    userId,
    password,
    timeout: Number(process.env.PLANAPI_TIMEOUT_MS || 30000)
  };
}

function toFormBody(params) {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      form.append(key, String(value).trim());
    }
  });
  return form;
}

function isSuccessPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const status = String(payload.status || payload.Status || payload.response_status || payload.responseStatus || '').toUpperCase();
  const code = String(payload.code || payload.response_code || payload.responseCode || '').toUpperCase();
  if (payload.success === true || payload.Success === true) return true;
  if (['SUCCESS', 'VERIFIED', 'VALID', 'ACTIVE', 'COMPLETED'].includes(status)) return true;
  if (['200', 'OK', 'SUCCESS'].includes(code)) return true;
  if (payload.data && typeof payload.data === 'object' && !payload.error) return true;
  return false;
}

function userMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  return payload.message || payload.Message || payload.msg || payload.error_message || fallback;
}

function normalizeData(serviceKey, payload) {
  const source = payload && typeof payload === 'object' ? payload : { value: payload };
  return {
    service: serviceKey,
    providerStatus: source.status || source.Status || source.response_status || source.responseStatus || null,
    providerCode: source.code || source.response_code || source.responseCode || null,
    message: userMessage(source, 'Verification completed.'),
    result: source.data || source.result || source.response || source
  };
}

async function request(serviceKey, params) {
  const config = getConfig(serviceKey);
  const startedAt = Date.now();
  const body = toFormBody({ ApiMode: config.mode, ...params });

  try {
    const response = await axios.post(`${config.baseUrl}${config.endpointPath}`, body.toString(), {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        TokenID: config.tokenId,
        ApiUserID: config.userId,
        ApiPassword: config.password
      },
      validateStatus: () => true
    });

    const latency = Date.now() - startedAt;
    const payload = response.data;
    const ok = response.status >= 200 && response.status < 300 && isSuccessPayload(payload);

    if (!ok) {
      logger.warn(`PLANAPI ${serviceKey} failed with HTTP ${response.status}`);
      return {
        success: false,
        latency,
        error: {
          code: 'PLANAPI_FAILURE',
          message: userMessage(payload, 'PLANAPI verification failed.')
        },
        data: normalizeData(serviceKey, payload)
      };
    }

    return {
      success: true,
      latency,
      data: normalizeData(serviceKey, payload)
    };
  } catch (error) {
    const latency = Date.now() - startedAt;
    logger.error(`PLANAPI ${serviceKey} request error: %O`, error);
    return {
      success: false,
      latency,
      error: {
        code: error.code === 'ECONNABORTED' ? 'PLANAPI_TIMEOUT' : 'PLANAPI_REQUEST_ERROR',
        message: error.code === 'ECONNABORTED' ? 'PLANAPI request timed out.' : 'PLANAPI provider is unavailable.'
      }
    };
  }
}

module.exports = {
  request,
  DEFAULT_PATHS
};
