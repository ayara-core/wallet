export const createWallet = async (rpc: any, ownerAddress: string) => {
  const receipt = await rpc.sendTransactionWithABI(
    [
      {
        type: "function",
        name: "createWallet",
        constant: false,
        payable: false,
        inputs: [
          {
            type: "address",
            name: "owner_",
          },
          {
            type: "bytes[]",
            name: "callbacks_",
          },
        ],
        outputs: [
          {
            type: "address",
            name: "",
          },
        ],
      },
    ],
    "0x47356fbDC7971b19ae3B0422c5e5A2042909FbB1",
    "createWallet(address,bytes[])",
    [ownerAddress, []],
    "0"
  )
  return receipt
}

export const getWallet = async (rpc: any, ownerAddress: string) => {
  const walletAddress = await rpc.readSmartContractWithABI(
    [
      {
        type: "function",
        name: "wallets",
        constant: true,
        stateMutability: "view",
        payable: false,
        inputs: [
          {
            type: "address",
            name: "",
          },
        ],
        outputs: [
          {
            type: "address",
            name: "",
          },
        ],
      },
    ],
    "0x47356fbDC7971b19ae3B0422c5e5A2042909FbB1",
    "wallets(address)",
    [ownerAddress]
  )
  return walletAddress
}
