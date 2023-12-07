import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import RPC from "../web3RPC"; // for using web3.js
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const clientId =
  "BFroo1J0Yx9-vnNmi1hlf7EiwgBWZx-YdCU0F1yBxzDmKpaQ7t-x34CioYb1oc-3lHM3LeH3mQTu-g0qYSacAHE";

function Dashboard() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [, setOutput] = useState<string>("");
  const navigate = useNavigate();

  const [smartWalletAddress, setSmartWalletAddress] = useState<string>("");

  useEffect(() => {
    const fetchSmartWalletAddress = async () => {
      if (!provider) {
        setSmartWalletAddress("");
        return;
      }
      const rpc = new RPC(provider);
      const address = await rpc.getAccounts();
      setSmartWalletAddress(address);
    };

    fetchSmartWalletAddress();
  }, [provider]);

  const displayAddress = (str: string): string => {
    if (str.length <= 10) {
      return str;
    }
    const firstFive = str.slice(0, 5);
    const lastFive = str.slice(-5);
    return `${firstFive}...${lastFive}`;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xaa36a7",
          rpcTarget: "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
          displayName: "Sepolia",
          blockExplorer: "https://optimistic.etherscan.io",
          ticker: "ETH",
          tickerName: "Ethereum",
        };
        const web3auth = new Web3AuthNoModal({
          clientId,
          chainConfig,
          web3AuthNetwork: "sapphire_devnet",
        });

        setWeb3auth(web3auth);

        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        const openloginAdapter = new OpenloginAdapter({
          privateKeyProvider,
        });
        web3auth.configureAdapter(openloginAdapter);
        setWeb3auth(web3auth);

        await web3auth.init();
        setProvider(web3auth.provider);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connectTo(
      WALLET_ADAPTERS.OPENLOGIN,
      {
        loginProvider: "google",
      }
    );
    setProvider(web3authProvider);

    if (!provider) {
      return;
    }
    const rpc = await new RPC(provider);
    const address = await rpc.getAccounts();
    navigate("/onboard/1", { state: { address: address[0] } }); // pass wallet address to onboarding page
  };

  const logout = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const address = await rpc.getAccounts();
    navigator.clipboard.writeText(address);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const signedMessage = await rpc.signMessage();
    uiConsole(signedMessage);
  };

  const sendTransactionWithABI = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    try {
      const receipt = await rpc.sendTransactionWithABI(
        [
          {
            type: "function",
            name: "increment",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ],
        "0xbB39Cb0a1B8B95cbB1Ae7681507e420CF7307396",
        "increment()",
        [],
        "0"
      );
      console.log(receipt);
    } catch (error) {
      console.log(error);
    }
  };

  function uiConsole(...args: any[]): void {
    setOutput(JSON.stringify(args));
  }

  const loggedInView = (
    <div className="artboard w-extension h-extension flex flex-col items-center justify-start pt-4">
      {/* Dropdown */}
      <select className="select select-bordered select-xs rounded-full">
        <option selected>Optimism</option>
        <option>Base</option>
      </select>
      {/* Address */}
      <button className="btn btn-link" onClick={getAccounts}>
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
            onClick={sendTransactionWithABI}
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
  );

  const unloggedInView = (
    <>
      <div className="container">
        <Header />
        <div className="px-5">
          <img src={chainlinkLogo} alt="Chainlink Logo" className="mb-3" />
          <p className="text-secondary text-xl">Universal Gas Wallet</p>
          <p className="text-primary text-xl">
            Use any dapp on L2 without gas bridging
          </p>
        </div>
        <div className="flex mt-12 items-end justify-center">
          <div className="mx-auto text-center w-full">
            <button className="btn btn-accent" onClick={login}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                className="bi bi-google"
                viewBox="0 0 16 16"
              >
                <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div>{web3auth && web3auth.connected ? loggedInView : unloggedInView}</div>
  );
}

export default Dashboard;
