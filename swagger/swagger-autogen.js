const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'MySkinId API',
        description: 'API Documentation for MySkinId',
        version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Enter your bearer token in the format **Bearer &lt;token&gt;**',
        },
    },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['../src/server.js'];

/* NOTE: if you use the express Router, you must pass in the 
   'endpointsFiles' only the root file where the route starts,
   such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);
