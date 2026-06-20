const pool=require("../config/db");
const bcrypt =require("bcrypt")
const jwt =require("jsonwebtoken")


//login
const login = async (req,res)=>{
    const{email,password}=req.body;
    try{
        const result =await pool.query("SELECT * FROM users WHERE email=$1",[email]);
        if(result.rows.length===0)
        {
            return res.status(400).json({success:false,message:"user not found"});

        }
        const user=result.rows[0];
        const isValidPassword=await bcrypt.compare(password,user.password);
        if(!isValidPassword){
            return res.status(401).json({
                success:false,
                message:"Invalid Password"
            });
        }
const token=jwt.sign({
id:user.id,
email:user.email,
role:user.role,
},
process.env.JWT_SECRET,
{
    expiresIn:"1h"
}
    
)
        return res.status(200).json({
            success:true,
            message:"Login successful",
            token,
            user:{
                id:user.id,
                username:user.username,
                email:user.email,
                role:user.role
            }
        });

        }catch (error)

        {
          return  res.status(500).json({
                success:false,
                message:error.message
            });

    }
}
    //register
     const register= async (req,res)=>{
        const{username,email,password}=req.body;
        try{
         const existingUser=await pool.query("SELECT * FROM users WHERE email=$1",[email]);

     
     if(existingUser.rows.length>0)

     {
return res.status(400).json({
    success:false,
    message:"Email Already Exists"   
});
     }
     const  hashedPassword= await bcrypt.hash(password,10);
     await pool.query(
        "INSERT INTO users(username,email,password)VALUES($1,$2,$3)",[username,email,hashedPassword]);
                   
        return res.status(201).json({
            success:true,
            message:"User Registeration Sucessfully"});
        }
        catch(error)
        {
            return res.status(500).json({
                success:false,
                message:error.message,
            })
            }        
        }

module.exports = { login,register};