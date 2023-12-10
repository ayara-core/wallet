## Local Hardhat Node Setup

### Setup

Change directory to the contracts folder:

```bash
cd packages/contracts
```

Install dependencies if not already installed:

```bash
yarn install
```

Make a .env file , take as example `packages/contracts/.env.example`
Set up within the file the accounts used on development mode ACCOUNT_N

Configure the level of logs verbosity with either of the following commands

```bash
export DEBUG=Ayara:log*
export DEBUG=Ayara:info*
export DEBUG=Ayara:debug*
```

The full details of how npm debug package works can be found [here](https://github.com/debug-js/debug)

### Start Dev environment single command

It starts a local hardhat node, deploy all mock dependencies, deploy all contracts, mint some ERC20 and ERC721, and send some ETH to all the ACCOUNT_N addresses configured on the .env file.

```bash
yarn start:dev
```

### Testing

Unit tests are in the `test` folder.

To run unit tests:

```bash
yarn test
```

### Fork-testing

Fork-tests are in the `test-fork` folder.

To run fork-tests:

```bash
test:fork:optimism
```

### Deploying

Make sure you set up the .env file a private key for the account you want to deploy from.

For Optimism Goerli:

```bash
yarn deploy --network optimismGoerli
```

For Base Goerli:

```bash
yarn deploy --network baseGoerli
```

For Sepolia:

```bash
yarn deploy --network sepolia
```

### Sending transactions with hardhat tasks

To create a new smart contract wallet account and lock some Link tokens.

I.e. this will stake 5 Link:

```bash
yarn hardhat initiate:ayara --amount 5 --network optimismGoerli
```

To send a transaction to another network:

```bash
yarn hardhat send:crosschain:erc20approve --destinationid 84531 --destinationaddress 0x6D0F8D488B669aa9BA2D0f0b7B75a88bf5051CD3 --network optimismGoerli
```

This will send a transaction on the optimismGoerli network to approve the token with address 0x6D0F8D488B669aa9BA2D0f0b7B75a88bf5051CD3 on the Sepolia network.
(This is used for testing, use the chrome extension to send transactions)
