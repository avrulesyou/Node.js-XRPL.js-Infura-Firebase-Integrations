import { Response } from 'express'
import db from '../helpers/firebase'
import xumm from "../helpers/xumm"
import { acceptOffer, fetchNFTs, fetchTransaction, removeMinter, setMinter } from '../helpers/xrpl'
import uploadToIPFS from '../helpers/ipfs'
import ApiRequest from '../interfaces/ApiRequest'
import { PayloadAndSubscription, XummPostPayloadBodyJson } from 'xumm-sdk/dist/src/types'
import {NFTBuyOffersRequest, NFTSellOffersRequest, TransactionMetadata, convertStringToHex} from 'xrpl'
import NFT from '../interfaces/NFT'
import { XrplClient } from 'xrpl-client';


// Get list of all Listed/Minted NFTs
// TODO: Add pagination, sorting, filtering
export const getAllNFTs = (req: ApiRequest, res: Response) => {
    db.collection('nfts').onSnapshot(snapshot => {
        let resData = snapshot.docs.map(doc => {
            return {id:doc.id, ...doc.data()}
        })
        res.json(resData)
    })
}

export const getUserNfts = async (req: ApiRequest, res: Response) => {
    const nfts = await fetchNFTs(req.user.defaultWallet as string)
    res.json(nfts)
}
const xrplClient = new XrplClient('https://xrplapi.example.com');


export const getNFTBuyOffers = async (req: ApiRequest, res: Response) => {
    const nftBuyOfferRequest: NFTBuyOffersRequest = {
        command : 'nft_buy_offers',
        nft_id : 'nftId',
    };
    try {
        const response = await xrplClient.send(nftBuyOfferRequest);
        return response.data;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }

export const getNFTSellOffers = async (req: ApiRequest, res: Response) => {
    const nftSellOfferRequest: NFTSellOffersRequest = {
        command : 'nft_sell_offers',
        nft_id : 'nftId',
    };
    try {
        const response = await xrplClient.send(nftSellOfferRequest);
        return response.data;
        } catch (error) {
        console.error('Error:', error);
        throw error;
        }
    }


// Get list of NFTs of a particular account from XRPL
// TODO: Change to our platform username, and platform specific NFTs rather than XRPL NFTs
export const getAccountNFTs = async (req: ApiRequest, res: Response) => {
    await db.collection('nfts').where('owner', '==', req.params.account).get().then(async snapshot => {
        res.status(200).json({
            status: 'success',
            data: {
                count: snapshot.size,
                nfts: snapshot.docs.map(doc => ({id:doc.id, ...doc.data()}))
            }
        })
    }).catch(err => {
        res.status(500).json({status: 'failed', message: err.message})
    })
}


// TODO: Get details of a particular NFT
export const getNFTDetails = (req: ApiRequest, res: Response) => {
    if(req.params.nftId){
        db.collection('nfts').doc(req.params.nftId).get().then(async doc => {
            if(doc.exists){
                const offers = await db.collection('offers').where('nftId', '==', req.params.nftId).where('status', '==', 'active').get()
                res.json({
                    status: 'success',
                    data: {
                        id: doc.id,
                        ...doc.data(),
                        offers: {
                            count: offers.size,
                            data: offers.docs.map(doc => ({id:doc.id, ...doc.data()}))
                        }
                    }
                })
            }else{
                res.status(404).json({status: 'failed', message: 'NFT not found'})
            }
        })
    }else{
        res.status(400).json({status: 'failed', message: 'NFT ID is required'})
    }
}


// Mint a new NFT
export const mintNFT = async (req: ApiRequest, res: Response) => {
    if(req.body.name && req.file){
        const uri = await uploadToIPFS(req.file?.buffer)
        setMinter(req.user.defaultWallet as string).then(async () => {
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: "NFTokenMint",
                    URI: convertStringToHex(`ipfs://${uri}`),
                    Flags: 8,
                    NFTokenTaxon: 0,
                    Account: req.user.defaultWallet,
                    Issuer: process.env.PLATFORM_XRP_ACCOUNT as string,
                    TransferFee: 1500,
                    Fee: 15
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    await removeMinter()
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        const nft: NFT = {
                            name: req.body.name,
                            description: req.body.description || "",
                            tokenId: (tx.result.meta as TransactionMetadata).nftoken_id as string,
                            tokenURI: `ipfs://${uri}`,
                            owner: req.user.defaultWallet,
                            mintedBy: req.user.defaultWallet,
                            mintedAt: Date.now(),
                        }
                        const nftRef = await db.collection('nfts').add(nft)
                        req.io?.emit('nftMinted', {status: 'success', message: 'NFT minted successfully', data: {id: nftRef.id, ...nft}})
                    }else{
                        req.io?.emit('nftMinted', {status: 'failed', message: 'NFT minting failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }).catch(err => console.log(err))
    }else{
        res.status(400).json({status: 'failed', message: "A file and name for the NFT is required"})
    }
}


// Controller for Transferring NFT to a particular account (mode: transfer only)
export const transferNFT = async (req: ApiRequest, res: Response) => {
    if(req.body.to && req.body.nftId){
        const nftDoc = await db.collection('nfts').doc(req.body.nftId).get()
        if(nftDoc.exists && nftDoc.data()?.owner === req.user.defaultWallet && nftDoc.data()?.owner !== req.body.to){
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: req.user.defaultWallet,
                    Amount: "0",
                    Flags: 1,
                    NFTokenID: nftDoc.data()?.tokenId,
                    Destination: req.body.to,
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        await db.collection('offers').add({
                            nftId: req.body.nftId,
                            from: req.user.defaultWallet,
                            type: 'transfer',
                            to: req.body.to,
                            status: 'active',
                            offerId: (tx.result.meta as TransactionMetadata).offer_id as string,
                            createdAt: Date.now()
                        })
                        req.io?.emit('offerCreated', {status: 'success', message: 'Offer created successfully'})
                    }else{
                        req.io?.emit('offerCreated', {status: 'failed', message: 'Offer creation failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }else{
            res.status(404).json({status: 'failed', message: 'NFT not found or you are not the owner or you are trying to send to yourself'})
        }
    }else{
        res.status(400).json({status: 'failed', message: "Receiver's address and NFT ID is required"})
    }
}


// Controller for receiving an NFT sent by someone (mode: transfer only)
export const receiveNFT = async (req: ApiRequest, res: Response) => {
    if(req.body.offerId){
        const offerDoc = await db.collection('offers').doc(req.body.offerId).get()
        if(offerDoc.exists && offerDoc.data()?.to === req.user.defaultWallet && offerDoc.data()?.status === 'active' && offerDoc.data()?.type === 'transfer'){
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: 'NFTokenAcceptOffer',
                    Account: req.user.defaultWallet,
                    NFTokenSellOffer: offerDoc.data()?.offerId,
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        await db.collection('offers').doc(req.body.offerId).update({
                            status: 'inactive',
                            acceptedAt: Date.now(),
                            acceptedBy: req.user.defaultWallet
                        })
                        await db.collection('nfts').doc(offerDoc.data()?.nftId).update({
                            owner: req.user.defaultWallet
                        })
                        req.io?.emit('offerAccepted', {status: 'success', message: 'Offer accepted successfully'})
                    }else{
                        req.io?.emit('offerAccepted', {status: 'failed', message: 'Offer acceptance failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }else{
            res.status(404).json({status: 'failed', message: 'Offer not found'})
        }
    }else{
        res.status(400).json({status: 'failed', message: "Offer ID is required"})
    }
}


// Controller to list an NFT for sale (mode: direct sale and auction)
export const listNFT = async (req: ApiRequest, res: Response) => {
    if(req.body.nftId && req.body.price && req.body.type){
        const nftDoc = await db.collection('nfts').doc(req.body.nftId).get()
        if(nftDoc.exists && nftDoc.data()?.owner === req.user.defaultWallet){
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: req.user.defaultWallet,
                    Amount: req.body.price,
                    Flags: 1,
                    NFTokenID: nftDoc.data()?.tokenId,
                    Destination: process.env.PLATFORM_XRP_ACCOUNT as string,
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        await db.collection('offers').add({
                            offerId: (tx.result.meta as TransactionMetadata).offer_id,
                            nftId: req.body.nftId,
                            price: req.body.price,
                            type: req.body.type,
                            status: 'active',
                            from: req.user.defaultWallet,
                            createdAt: Date.now(),
                        })
                        req.io?.emit('nftListed', {status: 'success', message: 'NFT listed successfully'})
                    }else{
                        req.io?.emit('nftListed', {status: 'failed', message: 'NFT listing failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }else{
            res.status(404).json({status: 'failed', message: 'NFT not found or you are not the owner'})
        }
    }else{
        res.status(400).json({status: 'failed', message: "NFT ID and price is required"})
    }
}


// Controller to cancel a list/transfer NFT offer
export const cancelNFT = async (req: ApiRequest, res: Response) => {
    if(req.body.offerId){
        const offerDoc = await db.collection('offers').doc(req.body.offerId).get()
        if(offerDoc.exists && offerDoc.data()?.from === req.user.defaultWallet){
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: 'NFTokenCancelOffer',
                    Account: req.user.defaultWallet,
                    NFTokenOffers: [
                        offerDoc.data()?.offerId
                    ]
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        await db.collection('offers').doc(req.body.offerId).update({
                            status: 'inactive',
                            cancelledAt: Date.now()
                        })
                        req.io?.emit('offerCancelled', {status: 'success', message: 'NFT offer cancelled successfully'})
                    }else{
                        req.io?.emit('offerCancelled', {status: 'failed', message: 'NFT offer cancellation failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }else{
            res.status(404).json({status: 'failed', message: 'NFT not found or you are not the owner'})
        }
    }else{
        res.status(400).json({status: 'failed', message: "NFT ID is required"})
    }
}

// Controller to buy an NFT (mode: direct sale)
export const buyNFT =  async (req: ApiRequest, res: Response) => {
    if(req.body.offerId){
        const offerDoc = await db.collection('offers').doc(req.body.offerId).get()
        if(offerDoc.exists && offerDoc.data()?.from !== req.user.defaultWallet && offerDoc.data()?.status === 'active' && offerDoc.data()?.type === 'directSale'){
            const nftDoc = await db.collection('nfts').doc(offerDoc.data()?.nftId).get()
            const transaction: XummPostPayloadBodyJson = {
                txjson: {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: req.user.defaultWallet,
                    Amount: offerDoc.data()?.price as string,
                    Owner: nftDoc.data()?.owner as string,
                    NFTokenID: nftDoc.data()?.tokenId as string,
                    Destination: process.env.PLATFORM_XRP_ACCOUNT as string,
                    Flags: 0,
                },
                user_token: req.user.xummToken
            }
            const subscription: PayloadAndSubscription | undefined = await xumm.payload?.createAndSubscribe(transaction, async (event) => {
                if(event.data.signed){
                    const tx = await fetchTransaction(event.data.txid as string)
                    if((tx.result.meta as TransactionMetadata).TransactionResult === 'tesSUCCESS'){
                        const newOfferDoc = await db.collection('offers').add({
                            offerId: (tx.result.meta as TransactionMetadata).offer_id,
                            nftId: offerDoc.data()?.nftId,
                            price: offerDoc.data()?.price,
                            type: offerDoc.data()?.type,
                            status: 'active',
                            from: req.user.defaultWallet,
                            createdAt: Date.now(),
                        })
                        await acceptOffer((tx.result.meta as TransactionMetadata).offer_id as string, offerDoc.data()?.offerId as string)
                        await db.collection('offers').doc(req.body.offerId).update({
                            status: 'accepted',
                            boughtAt: Date.now(),
                            boughtBy: req.user.defaultWallet
                        })
                        await db.collection('offers').doc(newOfferDoc.id).update({
                            status: 'accepted',
                            boughtAt: Date.now(),
                            boughtBy: req.user.defaultWallet
                        })
                        await db.collection('nfts').doc(offerDoc.data()?.nftId).update({
                            owner: req.user.defaultWallet
                        })
                        await db.collection('offers')
                            .where('nftId', '==', offerDoc.data()?.nftId)
                            .where('status', '==', 'active').get()
                            .then((snapshot) => {
                                snapshot.forEach(async (doc) => {
                                    await db.collection('offers').doc(doc.id).update({status: 'inactive'})
                                })
                            })
                        req.io?.emit('nftBought', {status: 'success', message: 'NFT bought successfully'})
                    }else{
                        req.io?.emit('nftBought', {status: 'failed', message: 'NFT buying failed'})
                    }
                }
            })
            res.json({uuid: subscription?.created.uuid, url: `https://xumm.app/sign/${subscription?.created.uuid}`, wss: `wss://xumm.app/sign/${subscription?.created.uuid}`})
        }else{
            res.status(404).json({status: 'failed', message: 'Offer not found or you are the owner'})
        }
    }else{
        res.status(400).json({status: 'failed', message: "Offer ID is required"})
    }
}