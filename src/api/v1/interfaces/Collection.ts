import User from "./User";
import NFT from "./NFT";

// TODO: Yet to complete
export default interface Collection {
    name: string;
    description: string;
    createdBy: User;
    nfts: NFT[];
    createdAt: EpochTimeStamp;
}