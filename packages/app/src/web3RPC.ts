import type { IProvider } from "@web3auth/base"
import { ethers } from "ethers"
import Web3 from "web3"

export default class EthereumRpc {
  private provider: IProvider

  constructor(provider: IProvider) {
    this.provider = provider
  }

  async getChainId(): Promise<string> {
    try {
      const web3 = new Web3(this.provider as any)

      // Get the connected Chain's ID
      const chainId = await web3.eth.getChainId()

      return chainId.toString()
    } catch (error) {
      return error as string
    }
  }

  async getAccounts(): Promise<any> {
    try {
      const web3 = new Web3(this.provider as any)

      // Get user's Ethereum public address
      const address = await web3.eth.getAccounts()

      return address
    } catch (error) {
      return error
    }
  }

  async getBalance(): Promise<string> {
    try {
      const web3 = new Web3(this.provider as any)

      // Get user's Ethereum public address
      const address = (await web3.eth.getAccounts())[0]

      // Get user's balance in ether
      const balance = web3.utils.fromWei(
        await web3.eth.getBalance(address), // Balance is in wei
        "ether"
      )

      return balance
    } catch (error) {
      return error as string
    }
  }

  async sendTransaction(): Promise<any> {
    try {
      const web3 = new Web3(this.provider as any)

      // Get user's Ethereum public address
      const fromAddress = (await web3.eth.getAccounts())[0]

      const destination = fromAddress

      const amount = web3.utils.toWei("0.001", "ether") // Convert 1 ether to wei

      // Submit transaction to the blockchain and wait for it to be mined
      const receipt = await web3.eth.sendTransaction({
        from: fromAddress,
        to: destination,
        value: amount,
        maxPriorityFeePerGas: "5000000000", // Max priority fee per gas
        maxFeePerGas: "6000000000000", // Max fee per gas
      })

      return receipt
    } catch (error) {
      return error as string
    }
  }

  async sendTransactionWithABI(
    abi: any[],
    contractAddress: string,
    method: string,
    params: any,
    value: string
  ): Promise<any> {
    try {
      const web3 = new Web3(this.provider as any)

      // Get user's Ethereum public address
      const fromAddress = (await web3.eth.getAccounts())[0]

      // Create contract instance
      const contract = new web3.eth.Contract(abi, contractAddress)
      // @ts-ignore
      const receipt = await contract.methods[method](...params).send({
        from: fromAddress,
        value: web3.utils.toWei(value, "ether"),
      })

      return receipt
    } catch (error) {
      return error as string
    }
  }

  async readSmartContractWithABI(
    abi: any[],
    contractAddress: string,
    method: string,
    params: any
  ): Promise<any> {
    try {
      const web3 = new Web3(this.provider as any)

      // Create contract instance
      const contract = new web3.eth.Contract(abi, contractAddress)
      // @ts-ignore
      // Call the contract method and get the result
      const result = await contract.methods[method](...params).call()

      return result
    } catch (error) {
      return error as string
    }
  }

  async signMessage() {
    try {
      const web3 = new Web3(this.provider as any)

      // Get user's Ethereum public address
      const fromAddress = (await web3.eth.getAccounts())[0]

      const originalMessage = "YOUR_MESSAGE"

      // Sign the message
      const signedMessage = await web3.eth.personal.sign(
        originalMessage,
        fromAddress,
        "test password!" // configure your own password here.
      )

      return signedMessage
    } catch (error) {
      return error as string
    }
  }

  async signTypedData(
    ownerAddress: string,
    ayaraWalletChainId: number,
    ayaraWalletAddress: string,
    ayaraControllerAddress: string,
    walletNonce: number,
    data: string
  ) {
    try {
      const web3 = new Web3(this.provider as any)

      // Build Eip712TypedData
      const typedData = {
        types: {
          EIP712Domain: [
            {
              name: "name",
              type: "string",
            },
            {
              name: "version",
              type: "string",
            },
            {
              name: "chainId",
              type: "uint256",
            },
            {
              name: "verifyingContract",
              type: "address",
            },
          ],
          Transaction: [
            {
              name: "ownerAddress",
              type: "address",
            },
            {
              name: "controllerAddress",
              type: "address",
            },
            {
              name: "nonce",
              type: "uint256",
            },
            {
              name: "data",
              type: "bytes32",
            },
          ],
        },
        domain: {
          name: "Ayara",
          version: "1",
          chainId: ayaraWalletChainId,
          verifyingContract: ayaraWalletAddress,
        },
        primaryType: "Transaction",
        message: {
          ownerAddress,
          controllerAddress: ayaraControllerAddress,
          nonce: walletNonce,
          data: ethers.keccak256(data),
        },
      }

      // Sign message
      const signedMessage = await web3.eth.signTypedData(
        ownerAddress,
        typedData
      )

      return signedMessage
    } catch (error) {
      return error as string
    }
  }

  async getPrivateKey(): Promise<any> {
    try {
      const privateKey = await this.provider.request({
        method: "eth_private_key",
      })

      return privateKey
    } catch (error) {
      return error as string
    }
  }
}
