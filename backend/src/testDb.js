const pool=require("./config/db");
async function  testDb(){
try
{
    const result =await pool.query("SELECT * FROM users");
    console.log(result.rows);

}
catch(error)
{
    console.error("Database connection failed",error);  
}
}
testDb();
