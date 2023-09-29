import { Request } from 'express';
import { Server } from 'socket.io'

// Custom Request interface to add user, jwt and socket.io to the request object
export default interface ApiRequest extends Request {
    user?: any,
    token?: string,
    io?: Server
}