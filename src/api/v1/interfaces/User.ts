import NFT from './NFT';

// TODO: Collections will be added later
export default interface User{
    username?: string;
    email?: string;
    bio?: string;
    defaultWallet?: string;
    xummToken?: string;
    profilePicture?: string;
    provider: string;
    createdAt: EpochTimeStamp;
    updatedAt: EpochTimeStamp;
    nfts?: NFT[];
}