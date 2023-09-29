import { NextFunction, Request, Response } from 'express';
import db from '../helpers/firebase'
import jwt from "jsonwebtoken";
import ApiRequest from '../interfaces/ApiRequest';

// Middleware to verify JWT token
export const verifyCompleteAccount = (req: ApiRequest, res: Response, next: NextFunction) => {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== "undefined") {
        const bearer = bearerHeader.split(" ");
        if(bearer[0] !== "Bearer") return res.status(401).json({    
            status: "failed",
            msg: "Invalid Token",
        });
        const bearerToken = bearer[1];
        req.token = bearerToken;
        try{
            const authData = jwt.verify(req.token, process.env.SECRET as string);
            db.collection('users').doc(authData as string).get().then((doc) => {
                if(doc.exists && doc.data()?.defaultWallet){
                    req.user = {id: doc.id, ...doc.data()}
                    next()
                }else if(doc.exists){
                    return res.status(422).json({
                        status: 'failed',
                        msg: 'Link a defaultWallet to your account first'
                    })
                }else{
                    return res.status(404).json({
                        status: "failed",
                        msg: "User does not exist",
                    });
                }
            })
        }catch{
            res.status(401).json({
                status: 'failed',
                msg: 'Invalid Token'
            })
        }
    } else {
        return res.status(403).json({
            status: "failed",
            msg: "No Access Token Provided",
        });
    }
};

export const verifyAccount = (req: ApiRequest, res: Response, next: NextFunction) => {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== "undefined") {
        const bearer = bearerHeader.split(" ");
        if(bearer[0] !== "Bearer") return res.status(401).json({    
            status: "failed",
            msg: "Invalid Token",
        });
        const bearerToken = bearer[1];
        req.token = bearerToken;
        try{
            const authData = jwt.verify(req.token, process.env.SECRET as string);
            db.collection('users').doc(authData as string).get().then((doc) => {
                if(doc.exists){
                    req.user = {id: doc.id, ...doc.data()}
                    next()
                }else{
                    return res.status(404).json({
                        status: "failed",
                        msg: "User does not exist",
                    });
                }
            })
        }catch{
            res.status(401).json({
                status: 'failed',
                msg: 'Invalid Token'
            })
        }
    } else {
        return res.status(403).json({
            status: "failed",
            msg: "No Access Token Provided",
        });
    }
};