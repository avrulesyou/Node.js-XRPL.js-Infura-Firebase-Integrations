import { Buffer } from "buffer";
import {create, IPFSHTTPClient} from 'ipfs-http-client'

// Autherization header value for IPFS
const auth: string = 'Basic ' + Buffer.from(process.env.INFURA_API_KEY + ':' + process.env.INFURA_API_KEY_SECRET).toString('base64');

// IPFS client
const ipfs: IPFSHTTPClient = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth
  }
});

// Utility function to upload data to IPFS
const uploadToIPFS = async (data: any) => {
  const result = await ipfs.add(data)
  return result.path
}

export default uploadToIPFS;