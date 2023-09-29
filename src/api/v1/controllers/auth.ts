import { Response } from "express"
import ApiRequest from "../interfaces/ApiRequest"
import { fetchBalance } from "../helpers/xrpl"
import xumm from "../helpers/xumm"
import db from "../helpers/firebase"
import generateToken from "../helpers/jwt"
import User from '../interfaces/User'
import {XummPostPayloadBodyJson} from 'xumm-sdk/dist/src/types/xumm-api/index'
import {PayloadAndSubscription} from 'xumm-sdk/dist/src/types/Payload/PayloadAndSubscription'
import {v4} from 'uuid'

const blockedWallets: string[] = ["r9V9dZQkCDSxRUkS647oBLmWZBfBz3BiQf", "another example", "yet another example"];
// Controller for creating/logging into account using Xumm (Anonymous User) 
export const createOrLoginXumm = async (req: ApiRequest, res: Response) => {
	const transaction: XummPostPayloadBodyJson = {
		txjson: {
			TransactionType: "SignIn",
		},
	}
	const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
		if(event.data.signed){
			const payload = await xumm.payload?.get(event.data.payload_uuidv4, true)
			const query = await db.collection('users').where('defaultWallet', '==', payload?.response.account as string).limit(1).get()
			const flag: number = blockedWallets.includes(payload?.response.account as string) ? 0 : 1;
			let userDoc = query.docs[0]
			if(userDoc && userDoc.data()?.provider === 'xumm' && flag){
				await userDoc.ref.update({
					updatedAt: Date.now(),
					xummToken: payload?.application.issued_user_token as string
				})
				const balance = await fetchBalance(payload?.response.account as string)
				const token = generateToken(userDoc.id)
				req.io?.emit('accountCreated', {
					status: 'success',
					provider: 'xumm',
					user: userDoc.data(),
					token,
					balance
				})
			}else if(userDoc){
				req.io?.emit('accountCreated', {
					status: 'failed',
					provider: userDoc.data()?.provider,
					message: 'Account already exists but not created with Xumm'
				})
			}else{
				let user: User = {
					username: `user_${v4()}`,
					defaultWallet: payload?.response.account as string,
					createdAt: Date.now(),
					updatedAt: Date.now(),
					provider: 'xumm',
					xummToken: payload?.application.issued_user_token as string
				}
				const userRef = await db.collection('users').add(user)
				const balance = await fetchBalance(payload?.response.account as string)
				const token = generateToken(userRef.id)
				req.io?.emit('accountCreated', {
					status: 'success',
					balance,
					user,
					token
				})
			}
		}
	})
	res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
}


// Returns state of the user (logged in or not)
export const getProfile = async (req: ApiRequest, res: Response) => {
	res.json({status: 'success', data: req.user})
}


// TODO: Update account after OAuth login to store user data (username, bio, etc.)
export const updateOAuthAccount = async (req: ApiRequest, res: Response) => {
	if(req.user.provider === 'xumm'){
		res.json({status: 'failed', message: 'Account already exists'})
	}else{
		const transaction: XummPostPayloadBodyJson = {
			txjson: {
				TransactionType: "SignIn",
			},
		}
		const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
			if(event.data.signed){
				const payload = await xumm.payload?.get(event.data.payload_uuidv4, true)
				const user = await db.collection('users').doc(req.user.id).get()
				db.collection('users').where('username', '==' , req.body.username).get().then(async (query) => {
					if(query.docs.length > 0){						
						await user.ref.update({
							updatedAt: Date.now(),
							defaultWallet: payload?.response.account as string,
							xummToken: payload?.application.issued_user_token as string,
							username: user.data()?.username ? user.data()?.username : `user_${v4()}`
						})
						const balance = await fetchBalance(payload?.response.account as string)
						user.ref.get().then((doc) => {
							req.io?.emit('accountCreated', {
								status: 'success',
								provider: doc.data()?.provider,
								user: {id: doc.id, ...doc.data()},
								balance,
							})
						})
					}else{
						await user.ref.update({
							updatedAt: Date.now(),
							defaultWallet: payload?.response.account as string,
							xummToken: payload?.application.issued_user_token as string,
							username: req.body.username ? req.body.username : user.data()?.username ? user.data()?.username : `user_${v4()}`
						})
						const balance = await fetchBalance(payload?.response.account as string)
						user.ref.get().then((doc) => {
							req.io?.emit('accountCreated', {
								status: 'success',
								provider: doc.data()?.provider,
								user: {id: doc.id, ...doc.data()},
								balance,
							})
						})
					}
				})
			}
		})
		res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
	}
}
