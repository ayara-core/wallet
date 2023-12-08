import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, IProvider } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Onboarding1 from "./pages/Onboarding1";
import Onboarding2 from "./pages/Onboarding2";
import Dashboard from "./pages/Dashboard";
import Onboarding3 from "./pages/Onboarding3";
import Onboarding4 from "./pages/Onboarding4";
import Login from "./pages/Login";

import ChainConfigs from "./chainConfig.json";

const clientId =
  "BFroo1J0Yx9-vnNmi1hlf7EiwgBWZx-YdCU0F1yBxzDmKpaQ7t-x34CioYb1oc-3lHM3LeH3mQTu-g0qYSacAHE";

function App() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0x7A69",
          rpcTarget: "http://127.0.0.1:8545",
          displayName: "Local Hardhat",
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

  const updateChain = async ({ chainId }: { chainId: string }) => {
    try {
      console.log(chainId, ChainConfigs);
      const selectedChain = ChainConfigs.find((config: any) => config.chainId === chainId);
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0x7A69",
        rpcTarget: "http://127.0.0.1:8545",
        displayName: "Local Hardhat",
        blockExplorer: "https://optimistic.etherscan.io",
        ticker: "ETH",
        tickerName: "Ethereum",
        ...selectedChain
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

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            web3auth && web3auth.connected ? (
              <Dashboard
                web3auth={web3auth}
                provider={provider}
                setProvider={setProvider}
                updateChain={updateChain}
              />
            ) : (
              <Login
                web3auth={web3auth}
                provider={provider}
                setProvider={setProvider}
              />
            )
          }
        />
        <Route
          path="/onboard/1"
          element={<Onboarding1 web3auth={web3auth} provider={provider} />}
        />
        <Route path="/onboard/2" element={<Onboarding2 />} />
        <Route path="/onboard/3" element={<Onboarding3 />} />
        <Route path="/onboard/4" element={<Onboarding4 />} />
      </Routes>
    </Router>
  );
}

export default App;
