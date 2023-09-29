export default interface NFT{
    tokenId: string;
    name: string;
    description?: string;
    tokenURI: string;
    owner: string;
    mintedBy: string;
    mintedAt: EpochTimeStamp;
    collectionId?: string;
}