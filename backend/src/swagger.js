const swaggerJsdoc = require("swagger-jsdoc");

const  options= {
    definition:{
        openapi:"3.0.0",

        info:{
            title:"Enterprise  API",
            version:"1.0.0",
            description:"Node.js+ PostgresSQl API",
},
servers:[
    {
        url:"http://localhost:5000"
    }
]
    },
    apis:["./src/routes/*.js"]
};
const swaggerSpec=swaggerJsdoc(options)
module.exports = swaggerSpec;
