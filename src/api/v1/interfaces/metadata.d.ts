import "xrpl"

declare module "xrpl" {
    interface TransactionMetadata {
        offer_id?: string;
        nftoken_id?: string;
    }
}