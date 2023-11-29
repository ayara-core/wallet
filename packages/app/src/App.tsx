import { useEffect, useState } from "react";
// import './App.css';
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import RPC from "./web3RPC"; // for using web3.js

const clientId =
  "BFroo1J0Yx9-vnNmi1hlf7EiwgBWZx-YdCU0F1yBxzDmKpaQ7t-x34CioYb1oc-3lHM3LeH3mQTu-g0qYSacAHE";

function App() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [output, setOutput] = useState<string>("");

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
    <div className="flex flex-col">
      <button className="btn btn-primary" onClick={getAccounts}>
        Top up LINK token
      </button>
      <div className="join join-vertical py-8">
        <a
          className="btn btn-secondary join-item"
          href="https://www.moonpay.com/buy/link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy LINK with credit card
        </a>
        <button className="btn btn-secondary join-item" onClick={signMessage}>
          Sign Message
        </button>
        <button className="btn btn-secondary join-item" onClick={logout}>
          Log Out
        </button>
      </div>
    </div>
  );

  const unloggedInView = (
    <>
      <button className="btn btn-primary" onClick={login}>
        Create Wallet
      </button>
    </>
  );

  return (
    <div data-theme="forest">
      <div className="hero min-h-screen bg-base-200">
        <div className="flex flex-col hero-content text-center">
          <h1 className="text-5xl font-bold py-6">AYARA</h1>
          <div className="max-w-md">
            {web3auth && web3auth.connected ? loggedInView : unloggedInView}
          </div>
          <div className="card w-96 bg-primary text-primary-content">
            <div className="card-body">
            <h2 className="card-title">Result</h2>
              <p className="overflow-y-auto">{output}</p>
            </div>
          </div>
        </div>
      </div>
      {/* <h1 className="text-xl">Ayara Wallet</h1>

      <footer className="footer">
        <a
          href="https://github.com/ayara-core"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ayara Github
        </a>
      </footer> */}
    </div>
  );
}

export default App;
