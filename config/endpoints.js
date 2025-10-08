// API Endpoints Configuration
const endpoints = {
  // Internal API Routes
  internal: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      verifyEmail: '/api/auth/verify-email'
    },
    profile: {
      get: '/api/profile',
      update: '/api/profile',
      delete: '/api/profile',
      upload: '/api/profile/upload',
      preferences: '/api/profile/preferences'
    },
    search: {
      food: '/api/search/food',
      nutrition: '/api/search/nutrition',
      history: '/api/search/history',
      analyze: '/api/search/analyze'
    },
    health: {
      check: '/health',
      status: '/api/health/status',
      metrics: '/api/health/metrics'
    }
  },
  
  // External API Endpoints
  external: {
    claude: {
      base: 'https://api.anthropic.com',
      chat: '/v1/messages',
      models: '/v1/models'
    },
    nutrition: {
      usda: 'https://api.nal.usda.gov/fdc/v1',
      edamam: 'https://api.edamam.com/api/nutrition-data'
    }
  },
  
  // Frontend URLs
  frontend: {
    development: {
      base: 'http://localhost:3000',
      auth: 'http://localhost:3000/auth',
      profile: 'http://localhost:3000/profile',
      search: 'http://localhost:3000/search'
    },
    staging: {
      base: 'https://staging.befree.fit',
      auth: 'https://staging.befree.fit/auth',
      profile: 'https://staging.befree.fit/profile',
      search: 'https://staging.befree.fit/search'
    },
    production: {
      base: 'https://beta.befree.fit',
      auth: 'https://beta.befree.fit/auth',
      profile: 'https://beta.befree.fit/profile',
      search: 'https://beta.befree.fit/search'
    }
  },
  
  // Webhook Endpoints
  webhooks: {
    payment: '/webhooks/payment',
    email: '/webhooks/email',
    analytics: '/webhooks/analytics'
  }
};

// Get endpoints for current environment
const getEndpoints = (environment = process.env.NODE_ENV || 'development') => {
  const frontendUrls = endpoints.frontend[environment] || endpoints.frontend.development;
  
  return {
    ...endpoints,
    current: {
      frontend: frontendUrls,
      api: {
        base: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
        ...endpoints.internal
      }
    }
  };
};

// Generate API documentation URLs
const getApiDocs = (environment = process.env.NODE_ENV || 'development') => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  
  return {
    swagger: `${baseUrl}/api-docs`,
    postman: `${baseUrl}/api-docs/postman`,
    openapi: `${baseUrl}/api-docs/openapi.json`
  };
};

module.exports = {
  endpoints,
  getEndpoints,
  getApiDocs
};
