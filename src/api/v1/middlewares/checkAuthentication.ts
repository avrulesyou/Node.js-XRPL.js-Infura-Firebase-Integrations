// import { NextFunction, Response } from "express";
// import ApiRequest from "../interfaces/ApiRequest";


// // Middleware to check if user is authenticated
// const checkAuthentication = (req: ApiRequest, res: Response, next: NextFunction) => {
//     if(req.user){
//         next()
//     }else{
//         return res.status(401).json({ status: 'failed', message: 'Unauthorized' });
//     }
// }

// export default checkAuthentication