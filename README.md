<p align="center" width="100%">
    <img width="100%" src="https://raw.githubusercontent.com/ayara-core/wallet/main/ayara_logo.png"> 
</p>

# Ayara Wallet

> Developed for Chainlink Hackathon 2023

## Introduction

Ayara Wallet is a smart contract wallet designed to simplify the use of Layer 2 (L2) networks and other blockchain networks. It eliminates the need for users to acquire or bridge native gas tokens.

The wallet operates by using a relayer to pay gas fees with Link tokens. Users simply deposit Link tokens into the wallet, which are then used to cover gas fees. When a user initiates a transaction, the wallet sends a request to the relayer to process the transaction. The relayer executes the transaction.

A key feature of Ayara Wallet is its support for cross-chain transactions. It enables transactions across any L2 or other networks without the need for users to acquire or bridge native gas tokens. This is achieved through Chainlink's Cross Chain Interoperability Protocol (CCIP).

When a cross-chain transaction is initiated, it starts from the network where the user's Link tokens are staked. This action locks some of the Link tokens in the wallet and sends a message to the target network. A new smart contract wallet (Ayara Instance) is created on the target network, an allowance is set for the user to spend on subsequent transactions, and the execution of the smart contract call continues. All these steps occur within a single transaction.

The user can then execute transactions on the target network. To unlock the Link tokens, the user can send a transaction back to the original network.

## Features

- Chrome extension wallet
- Creates a new EOA wallet with Google sign-in (web3auth is used as a signer), which becomes the owner of the smart contract wallet.
- Facilitates the creation of a smart contract wallet account.
- Allows locking of LINK in the contract, referred to as the "universal gas tank".
- Utilizes CCIP to create a smart contract wallet account on a different chain and execute a transaction on that chain.

## Project Structure

The project is split into 2 packages:

- `contracts`: contains the smart contracts
- `app`: contains the frontend app including the Relayer

## Smart Contracts

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

More details about interactions and tests can be found in the [contracts README](./packages/contracts/README.md#the-key-contracts-are).
