const pool=require("../config/db");
const login = async (req,res)=>{
    const{email,password}=req.body;
    try{
        const result =await pool.query("SELECT * FROM USERS WHERE email=$1",[email]);
        if(result.rows.length===0)
        {
            return res.status(400).json({success:false,message:"user not found"});

        }
        const user=result.rows[0];
        if(user.password !=password)
        {
            return res.status(401).json({
                success:false,
                message:"Invalid Password"
        });

        }

        return res.status(200).json({success:true,message:"Login successful"});

        }catch (error)

        {
            res.status(500).json({
                success:false,
                message:error.message
            });

    }
};
module.exports = { login };