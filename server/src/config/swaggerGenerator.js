const fs = require('fs');
const path = require('path');
const services = require('./services');
const logger = require('./logger');

function generateOpenApiSpec() {
  try {
    const swaggerFilePath = path.join(__dirname, '../../../docs/openapi.json');
    
    const paths = {};
    
    services.forEach(service => {
      const pathKey = service.endpoint.replace('/api/v1', '');
      const method = service.method.toLowerCase();
      
      const parameters = [];
      let requestBody = undefined;
      
      if (method === 'get') {
        parameters.push({
          name: 'api_key',
          in: 'query',
          required: true,
          schema: { type: 'string', example: 'vh_live_xxxxxxxxxxxx' },
          description: 'API key for gateway authentication'
        });
        service.inputFields.forEach(field => {
          parameters.push({
            name: field.name,
            in: 'query',
            required: field.required,
            schema: { type: 'string', example: field.placeholder.replace('e.g. ', '') },
            description: field.label
          });
        });
      } else {
        // POST request
        const properties = {};
        const requiredFields = [];
        
        if (service.key === 'PAN_TRACK') {
          properties['api_key'] = { type: 'string', example: 'vh_live_xxxxxxxxxxxx', description: 'API Key string' };
          requiredFields.push('api_key');
        }
        
        service.inputFields.forEach(field => {
          properties[field.name] = {
            type: 'string',
            example: field.placeholder.replace('e.g. ', ''),
            description: field.label
          };
          if (field.required) {
            requiredFields.push(field.name);
          }
        });
        
        requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: requiredFields,
                properties
              }
            }
          }
        };
      }
      
      paths[pathKey] = {
        [method]: {
          summary: service.name,
          description: service.description,
          tags: [service.category === 'kyc' ? 'KYC Verification' : 'Verification APIs'],
          security: [
            {
              ApiKeyAuth: []
            }
          ],
          parameters,
          requestBody,
          responses: {
            '200': {
              description: 'Successful verification details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    example: service.sampleResponse
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized or invalid API Key'
            },
            '403': {
              description: 'Insufficient wallet balance or scope'
            },
            '429': {
              description: 'Too many requests - Rate limit exceeded'
            },
            '502': {
              description: 'Provider communication failure'
            }
          }
        }
      };
    });

    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'Dizipay API Marketplace',
        description: 'Production-ready Verification API Gateway endpoints for identity, taxes, and corporate registries.',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'https://authserver.dizipay.in/api/v1',
          description: 'Production API Gateway server'
        }
      ],
      paths,
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key'
          }
        }
      }
    };

    // Ensure directory exists
    const dir = path.dirname(swaggerFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(swaggerFilePath, JSON.stringify(openApiSpec, null, 2), 'utf8');
    logger.info('OpenAPI spec generated and written to docs/openapi.json successfully.');
  } catch (error) {
    logger.error('Failed to generate OpenAPI specification: %O', error);
  }
}

module.exports = generateOpenApiSpec;
