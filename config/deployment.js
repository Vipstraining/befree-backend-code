// Deployment Configuration
const deployment = {
  // Environment-specific deployment settings
  environments: {
    development: {
      name: 'Development',
      description: 'Local development environment',
      features: {
        hotReload: true,
        debugMode: true,
        verboseLogging: true,
        mockExternalAPIs: false
      },
      monitoring: {
        enabled: false,
        level: 'debug'
      }
    },
    
    staging: {
      name: 'Staging',
      description: 'Pre-production testing environment',
      features: {
        hotReload: false,
        debugMode: false,
        verboseLogging: true,
        mockExternalAPIs: false
      },
      monitoring: {
        enabled: true,
        level: 'info',
        services: ['datadog', 'sentry']
      }
    },
    
    production: {
      name: 'Production',
      description: 'Live production environment',
      features: {
        hotReload: false,
        debugMode: false,
        verboseLogging: false,
        mockExternalAPIs: false
      },
      monitoring: {
        enabled: true,
        level: 'error',
        services: ['datadog', 'sentry', 'newrelic']
      }
    }
  },
  
  // Build configurations
  build: {
    development: {
      minify: false,
      sourceMaps: true,
      optimize: false
    },
    staging: {
      minify: true,
      sourceMaps: true,
      optimize: true
    },
    production: {
      minify: true,
      sourceMaps: false,
      optimize: true
    }
  },
  
  // Docker configurations
  docker: {
    development: {
      image: 'befree-api:dev',
      ports: ['3000:3000'],
      volumes: ['./:/app', '/app/node_modules'],
      environment: ['NODE_ENV=development']
    },
    staging: {
      image: 'befree-api:staging',
      ports: ['3001:3000'],
      volumes: [],
      environment: ['NODE_ENV=staging']
    },
    production: {
      image: 'befree-api:latest',
      ports: ['3000:3000'],
      volumes: [],
      environment: ['NODE_ENV=production']
    }
  }
};

// Get deployment configuration for environment
const getDeploymentConfig = (environment = process.env.NODE_ENV || 'development') => {
  return {
    environment: deployment.environments[environment] || deployment.environments.development,
    build: deployment.build[environment] || deployment.build.development,
    docker: deployment.docker[environment] || deployment.docker.development
  };
};

// Generate Docker commands
const getDockerCommands = (environment = process.env.NODE_ENV || 'development') => {
  const config = getDeploymentConfig(environment);
  const dockerConfig = config.docker;
  
  return {
    build: `docker build -t ${dockerConfig.image} .`,
    run: `docker run -d --name befree-api-${environment} -p ${dockerConfig.ports[0]} ${dockerConfig.volumes.map(v => `-v ${v}`).join(' ')} ${dockerConfig.environment.map(e => `-e ${e}`).join(' ')} ${dockerConfig.image}`,
    stop: `docker stop befree-api-${environment}`,
    remove: `docker rm befree-api-${environment}`,
    logs: `docker logs befree-api-${environment}`,
    exec: `docker exec -it befree-api-${environment} /bin/bash`
  };
};

module.exports = {
  deployment,
  getDeploymentConfig,
  getDockerCommands
};

