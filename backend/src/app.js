const express = require("express");
const cors = require("cors");
const swaggerui =require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const authRoutes=require("./routes/authRoutes")
require("dotenv").config();
const app = express();

const userRoutes=require("./routes/userRoutes")

app.use(cors());
app.use(express.json());

// app.get("/", (req, res) => {
//   res.json({
//     message: "Backend Running"
//   });
// });
app.use("/api/auth", authRoutes); 
app.use("/api-docs",swaggerui.serve,swaggerui.setup(swaggerSpec));
app.use("/api/users",userRoutes);
app.listen(5000, () => {
  console.log("Server running on port 5000");
});