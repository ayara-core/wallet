import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"

import RPC from "../web3RPC" // for using web3.js
import ChainConfigs from "../chainConfig.json"

import { createWallet, getWallet } from "../utils/walletInstance"
import { ethers } from "ethers"
import Web3 from "web3"

const Dashboard: React.FC<{
  web3auth: any
  provider: any
  setProvider: any
  updateChain: any
}> = ({ web3auth, provider, setProvider, updateChain }) => {
  const navigate = useNavigate()
  const transferModalRef = useRef<HTMLDialogElement>(null)
  const [, setShowModal] = useState(false)

  // Check if already onboarded
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("hasOnboarded")
    if (!hasOnboarded) {
      navigate("/onboard/1")
    }
  }, [])

  const displayAddress = (str: string): string => {
    if (str.length <= 10) {
      return str
    }
    const firstFive = str.slice(0, 5)
    const lastFive = str.slice(-5)
    return `${firstFive}...${lastFive}`
  }

  const logout = async () => {
    if (!web3auth) {
      return
    }
    await web3auth.logout()
    setProvider(null)
  }

  const getAccountAddress = async () => {
    if (!provider) {
      return
    }
    const rpc = new RPC(provider)
    const address = await rpc.getAccounts()
    navigator.clipboard.writeText(address)
  }

  const sendTransactionWithABI = async () => {
    if (!provider) {
      alert("provider not initialized yet")
      return
    }
    const web3 = new Web3(provider)
    const rpc = new RPC(provider)

    // TODO: Get ayara contract from ayara controller
    const ownerAddress = "0x00"
    const ayaraWalletChainId = 1
    const ayaraWalletAddress = "0x00"
    const ayaraControllerAddress = "0x00"
    const walletNonce = 0
    const mockERC20Address = "0x0"
    const CHAIN_ID = 11155111
    const receiverAddress = "0x00"
    const amount = 0

    try {
      // Prepare tx, send ERC20 to Bob
      const data = web3.eth.abi.encodeFunctionCall(
        {
          name: "myMethod",
          type: "function",
          inputs: [
            {
              type: "address",
              name: "myAddress",
            },
            {
              type: "uint256",
              name: "myUint",
            },
          ],
        },
        [receiverAddress, amount]
      )

      const signature = await rpc.signTypedData(
        ownerAddress,
        ayaraWalletChainId,
        ayaraWalletAddress,
        ayaraControllerAddress,
        walletNonce,
        data
      )

      const feeData = {
        token: mockERC20Address,
        maxFee: ethers.parseEther("1"),
        relayerFee: 1,
      }

      const transaction = {
        destinationChainId: CHAIN_ID,
        to: mockERC20Address,
        value: 0,
        data: data,
        signature: signature,
      }

      const receipt = await rpc.sendTransactionWithABI(
        [
          {
            inputs: [
              {
                internalType: "address",
                name: "owner_",
                type: "address",
              },
              {
                internalType: "address",
                name: "wallet_",
                type: "address",
              },
              {
                components: [
                  {
                    internalType: "address",
                    name: "token",
                    type: "address",
                  },
                  {
                    internalType: "uint256",
                    name: "maxFee",
                    type: "uint256",
                  },
                  {
                    internalType: "uint256",
                    name: "relayerFee",
                    type: "uint256",
                  },
                ],
                internalType: "struct FeeData",
                name: "feeData_",
                type: "tuple",
              },
              {
                components: [
                  {
                    internalType: "uint64",
                    name: "destinationChainId",
                    type: "uint64",
                  },
                  {
                    internalType: "address",
                    name: "to",
                    type: "address",
                  },
                  {
                    internalType: "uint256",
                    name: "value",
                    type: "uint256",
                  },
                  {
                    internalType: "bytes",
                    name: "data",
                    type: "bytes",
                  },
                  {
                    internalType: "bytes",
                    name: "signature",
                    type: "bytes",
                  },
                ],
                internalType: "struct Transaction",
                name: "transaction_",
                type: "tuple",
              },
            ],
            name: "executeUserOperation",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
        ayaraControllerAddress,
        "executeUserOperation()",
        [ownerAddress, ayaraWalletAddress, feeData, transaction],
        "0"
      )
      alert(receipt)
    } catch (error) {
      alert(error)
    }
  }

  const [selectedNetwork, setSelectedNetwork] = useState(() => {
    const chainId = provider.defaultConfig.chainConfig.chainId
    const selectedChain = ChainConfigs.find(
      (config: any) => config.chainId === chainId
    )
    return selectedChain?.displayName
  })

  const openTransferModal = () => {
    setShowModal(true)
    transferModalRef.current?.showModal()
  }

  const closeTransferModal = () => {
    setShowModal(false)
  }

  return (
    <>
      {/* Transfer Modal */}
      <dialog className="artboard modal" ref={transferModalRef}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Transfer Tokens</h3>
          <div className="py-4">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Token Name
            </label>
            <input
              type="text"
              placeholder="e.g., LINK"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
            />
          </div>
          <div className="py-4">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Amount
            </label>
            <input
              type="number"
              placeholder="e.g., 100"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
            />
          </div>
          <div className="py-4">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Chain
            </label>
            <input
              type="text"
              placeholder="e.g., Ethereum"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
            />
          </div>
          <div className="py-4">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Target Address
            </label>
            <input
              type="text"
              placeholder="e.g., 0x..."
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
            />
          </div>
          <div className="py-4">
            <button
              className="btn btn-primary"
              onClick={sendTransactionWithABI}
            >
              Send
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeTransferModal}>close</button>
        </form>
      </dialog>
      <div className="w-full h-extension flex flex-col items-center justify-center pt-4">
        {/* Dropdown */}
        <select
          className="select select-bordered select-xs rounded-full"
          value={selectedNetwork}
          onChange={(e) => {
            setSelectedNetwork(e.target.value)
            const selectedChain = ChainConfigs.find(
              (config: any) => config.displayName === e.target.value
            )
            if (selectedChain) {
              updateChain({ chainId: selectedChain?.chainId })
            } else {
              updateChain({ chainId: "0x7A69" })
            }
          }}
        >
          {ChainConfigs.map(({ displayName }) => (
            <option value={displayName}>{displayName}</option>
          ))}
        </select>
        {/* Address */}
        <button className="btn btn-link" onClick={getAccountAddress}>
          <div className="badge badge-lg badge-secondary font-lg">
            {displayAddress("0xC499D300d7a53Cb9d7946121E5982bdf8D4b0eA6")}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-3 h-3"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
          </div>
        </button>
        {/* Balance */}
        <div className="flex flex-col justify-center items-center my-8 ">
          <p className="text-5xl font-bold text-accent">5 LINK</p>
          <p className="text-lg text-accent">~ 90$</p>
        </div>
        {/* Buttons */}
        <div className="flex w-full max-w-sm justify-between my-8">
          <div className="flex flex-col items-center">
            <button className="btn btn-primary btn-circle btn-outline bg-gradient-to-r from-primary to-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-black"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <p className="text-accent font-bold my-2">Add GAS</p>
          </div>
          <div className="flex flex-col items-center">
            <button
              // onClick={sendTransactionWithABI}
              onClick={openTransferModal}
              className="btn btn-primary btn-circle btn-outline bg-gradient-to-r from-primary to-secondary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-black"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                />
              </svg>
            </button>
            <p className="text-accent font-bold my-2">Send</p>
          </div>
          <div className="flex flex-col items-center">
            <button className="btn btn-primary btn-circle btn-outline bg-gradient-to-r from-primary to-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-black"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                />
              </svg>
            </button>
            <p className="text-accent font-bold my-2">Get LINK</p>
          </div>
        </div>
        {/* Gas Tank */}
        <div className="card w-full max-w-sm card-bordered-primary shadow-xl my-8">
          <div className="card-body m-4 p-1 rounded-l bg-gradient-to-r from-primary to-secondary">
            <div className="px-4 py-6 bg-black">
              <p className="card-title text-accent">Universal Gas Tank</p>
              <div className="flex flex-col">
                <p className="text-gray-600 text-sm text-right mb-2">
                  $10, ~5 txns
                </p>
                <div className="w-full h-2 bg-gray-400 rounded-full">
                  <div className="h-full text-center bg-gradient-to-r from-secondary to-primary rounded-full w-10/12"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={logout} className="">
          Log Out
        </button>
      </div>
    </>
  )
}

export default Dashboard
