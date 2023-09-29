# backend

## Description

This is the backend repository for the NFT Marketplace.

## API Documentation

### Authentication

- Get Current User Data: `GET /v1/auth/profile` [Session cookie need to be present on the client set by OAuth]

- Create or Log into Account With Xumm (Anonymous User): `GET /v1/auth/xumm` [Socket IO Channel `accountCreated`]
<!-- - Login Account With Xumm (Anonymous User): `GET /v1/auth/loginAccountWithXumm` [Socket IO Channel `accountLoggedIn`] -->

- Google OAuth Screen: `GET /v1/auth/google`
- Google OAuth Callback: `GET /v1/auth/google/callback`
- Twitter OAuth Screen: `GET /v1/auth/twitter`
- Twitter OAuth Callback: `GET /v1/auth/twitter/callback`
- Discord OAuth Screen: `GET /v1/auth/discord`
- Discord OAuth Callback: `GET /v1/auth/discord/callback`

- Update Account After OAuth (Authenticated User): `PUT /v1/auth/oauth/` [Socket IO Channel `accountCreated`]

- Create Account With Passkey (Authenticated User): `POST /v1/auth/createAccountWithPasskey`
- Login Account With Passkey (Authenticated User): `POST /v1/auth/loginAccountWithPasskey`

### NFTs/Collections

- Get List of All NFTs: `GET /v1/nfts`
- Mint an NFT: `POST /v1/nfts/mint` [Socket IO Channel `nftMint`]
- Get NFTs of a User: `GET /v1/nfts/:username` [Returns NFTs of the user based on account address, to be changed to username]

### User

- Get Account: `GET /v1/:username` [Returns public data of the user] (TODO)


## Installation

### Project setup
```
npm install
```

### Setup .env file
```
# Copy .env.example to .env and edit the values
cp .env.example .env
```

### Get Firebase Service Account Key
```
# Place this in the config directory
touch ./src/config/serviceAccountKey.json
```

### Run in dev mode
```
npm run dev

# If there is an error, create build and run again
npm run build
npm run dev
```