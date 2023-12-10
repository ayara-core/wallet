# Ayara Wallet Contracts

The smart contracts are written in Solidity and tested using Hardhat. The contracts are deployed on Optimism Goerli, Base Goerli and Sepolia testnets.

The contracts are using Chainlink's CCIP to send messages across networks to other AyaraController contracts.
In one transaction it can:

- Lock some Link tokens in the wallet
- Send a message to another network
- Create a new smart contract wallet on the target network
- Set an allowance for the user to spend on the target network
- Execute the smart contract call on the target network

### Deployed contracts

AyaraController is deployed with the same address on all networks. This is important for the creation of Ayara Instances on other networks, since it will create the same address for the same user across all networks.

- Optimism Goerli: [0xb7b6d3b50Bb0256eF6eE484fe535d95A6b879176](https://goerli-optimism.etherscan.io/address/0xb7b6d3b50Bb0256eF6eE484fe535d95A6b879176)
- Base Goerli: [0xb7b6d3b50Bb0256eF6eE484fe535d95A6b879176](https://goerli.basescan.org/address/0xb7b6d3b50bb0256ef6ee484fe535d95a6b879176)
- Sepolia: [0xb7b6d3b50Bb0256eF6eE484fe535d95A6b879176](https://sepolia.etherscan.io/address/0xb7b6d3b50bb0256ef6ee484fe535d95a6b879176)

Example of a successful cross-chain transaction (including wallet creation):
https://ccip.chain.link/msg/0xc11b3b108475923f383708eeac65d2936aba52430e082ff15fc54275f81f6acf

![Inheritance diagram](./packages/contracts/docs/inheritance-simple.png)

## The key contracts are:

- `AyaraController.sol`: The main contract that manages the wallet. Entry point for all transactions.
  - `AyaraGasBank.sol`: Contract that manages the gas tokens and logic around allowances and gas usage.
  - `AyaraMessageHandler.sol`: Contract that manages the cross-chain transactions.
    - `AyaraReceiver.sol`: Decoding of the message sent from the source network.
    - `AyaraSender.sol`: Encoding and sending of the message to the target network.
  - `AyaraWalletManager.sol`: Contract that manages the creation of Ayara Instances.
- `AyaraInstance.sol`: The smart contract wallet account. It is created on the target network when a cross-chain transaction is initiated.

## Other contracts in lib/:

- `Create2Factory.sol`: Contract that creates a new smart contract wallet with a deterministic address.
- `PriceConver.sol`: Contract that converts Link tokens to ETH and vice versa. Relayer can use this to determine the amount of Link tokens to charge for a transaction.
- `SignatureValidator.sol`: Contract that validates the signature of the user.
- `Structs.sol`: Contract that defines the structs used in the contracts.

## Mocks used for testing:

- `CCIPRouterMock.sol`: Mock CCIP router used for testing, imitates the CCIP router and allows to test cross-chain transactions on a local network on the same chain.
- `MockERC20.sol`: Mock ERC20 token used for testing.

## Setup

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
