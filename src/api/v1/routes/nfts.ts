import { Router } from 'express'
import { getAllNFTs, getAccountNFTs, getNFTDetails, mintNFT, transferNFT, receiveNFT, listNFT, cancelNFT, buyNFT } from '../controllers/nfts'
import multer, {Multer} from 'multer'
import {verifyCompleteAccount} from '../middlewares/verifyJWT'
const router: Router = Router()
const upload: Multer = multer()


// @route     GET /v1/nfts
// @desc      Get List of All NFTs
// @access    Public
router.get('/', getAllNFTs)

// @route     POST /v1/nfts/mint
// @desc      Mint a new NFT
// @access    Private
router.post('/mint', verifyCompleteAccount, upload.single('nftFile'), mintNFT)

// @route     GET /v1/nfts/:account
// @desc      Get NFTs of an Account (To be changed based on our platform username)
// @access    Public
router.get('/:account', getAccountNFTs)

// @route     GET /v1/nfts/nft/:nftid
// @desc      Get a specific NFT details and list of offers
// @access    Public
router.get('/nft/:nftId', getNFTDetails)

// @route     POST /v1/nfts/transfer
// @desc      Create a transfer offer for an NFT (transfer)
// @access    Private
router.post('/transfer', verifyCompleteAccount, transferNFT)

// @route     POST /v1/nfts/receive
// @desc      Accept a transfer offer for an NFT (transfer)
// @access    Private
router.post('/receive', verifyCompleteAccount, receiveNFT)

// @route     POST /v1/nfts/sell
// @desc      List an NFT (directSale/auction)
// @access    Private
router.post('/list', verifyCompleteAccount, listNFT)

// @route     POST /v1/nfts/buy
// @desc      Make a buy offer to an NFT for sale (directSale)
// @access    Private
router.post('/buy', verifyCompleteAccount, buyNFT)

// @route     POST /v1/nfts/cancel
// @desc      Cancel a transfer/sell/buy offer for an NFT (transfer, list)
// @access    Private
router.post('/cancel', verifyCompleteAccount, cancelNFT)


export default router