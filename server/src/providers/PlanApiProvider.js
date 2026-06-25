const BaseProvider = require('./BaseProvider');
const planApiClient = require('./planapi/client');

class PlanApiProvider extends BaseProvider {
  constructor(credentials = {}) {
    super('PLANAPI', 'planapi', credentials);
  }

  async execute(serviceKey, params) {
    return planApiClient.request(serviceKey, params);
  }
}

module.exports = PlanApiProvider;
