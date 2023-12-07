import React from "react";
import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import RPC from "../web3RPC"; // for using web3.js
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";
import { Link } from "react-router-dom";

const clientId =
  "BFroo1J0Yx9-vnNmi1hlf7EiwgBWZx-YdCU0F1yBxzDmKpaQ7t-x34CioYb1oc-3lHM3LeH3mQTu-g0qYSacAHE";

function Dashboard() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [, setOutput] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0xa",
          rpcTarget: "https://mainnet.optimism.io",
          displayName: "Optimism Mainnet",
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
    uiConsole("transfer LINK to " + address);
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

  function uiConsole(...args: any[]): void {
    setOutput(JSON.stringify(args));
  }

  const loggedInView = (
    <div className="artboard w-extension h-extension flex flex-col items-center justify-start pt-4">
    {/* Dropdown */}
    <select className="select select-bordered select-xs rounded-full">
      <option selected>Optimism</option>
      <option>Sepolia</option>
    </select>
    {/* Address */}
    <button
      className="btn btn-link"
      onClick={() =>
        navigator.clipboard.writeText("0xYourEthereumAddressHere")
      }
    >
      <div className="badge badge-lg badge-secondary font-lg">
        0x6fCA2C4....062f
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
      <h2 className="text-5xl font-bold">5 LINK</h2>
      <h4 className="text-lg">~16$</h4>
    </div>
    {/* Buttons */}
    <div className="flex w-full max-w-sm justify-between my-8">
      <div className="flex flex-col items-center">
        <button className="btn btn-circle btn-outline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </button>
        <p>Add GAS</p>
      </div>
      <div className="flex flex-col items-center">
        <button className="btn btn-circle btn-outline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
            />
          </svg>
        </button>
        <p>Send</p>
      </div>
      <div className="flex flex-col items-center">
        <button className="btn btn-circle btn-outline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
            />
          </svg>
        </button>
        <p>Get LINK</p>
      </div>
    </div>
    {/* Gas Tank */}
    <div className="card w-full max-w-sm bg-gray-100 shadow-xl my-8">
      <div className="card-body">
        <h2 className="card-title text-black">Universal Gas Tank</h2>
        <div className="flex flex-col">
          <p className="text-gray-600 text-sm text-right">$10, ~5 txns</p>
          <progress
            className="progress progress-primary w-full"
            value={42}
            max="100"
          ></progress>
          <div className="flex w-full justify-between my-4">
            <p>🫙</p>
            <p className="text-right">⛽️</p>
          </div>
        </div>
      </div>
    </div>
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
      <div className="flex items-end justify-center">
        <div className="mx-auto text-center w-full">
        <button className="btn btn-accent" onClick={login}>
          Sign in with Google
        </button>
        </div>
      </div>
    </div>
    </>
  );

  return (
    <div>
      {web3auth && web3auth.connected ? loggedInView : unloggedInView}
    </div>
  );
}

export default Dashboard;