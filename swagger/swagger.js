const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Backend",
      version: "1.0.0",
      description: "Dokumentasi API Backend",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJSDoc(options);
