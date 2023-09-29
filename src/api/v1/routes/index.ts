import {Router} from 'express'
const router: Router = Router()
import authRouter from './auth'
import nftsRouter from './nfts'

router.use('/auth', authRouter)
router.use('/nfts', nftsRouter)

router.get('/', (req, res) => {
    res.json({status: 'success', message: 'Welcome to the NFT Marketplace API'})
})

export default router