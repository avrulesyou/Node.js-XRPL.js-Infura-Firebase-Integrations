import * as xumm from "xumm"

// Xumm client instance
const client: xumm.Xumm = new xumm.Xumm(process.env.XUMM_API_KEY as string, process.env.XUMM_API_SECRET as string)

client.ping().then(res => console.log(res)).catch(err => console.log(err))

export default client