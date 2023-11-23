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
```

The full details of how npm debug package works can be found [here](https://github.com/debug-js/debug)

### Start Dev environment single command

It starts a local hardhat node, deploy all mock dependencies, deploy all contracts, mint some ERC20 and ERC721, and send some ETH to all the ACCOUNT_N addresses configured on the .env file.

```bash
yarn start:dev
```
