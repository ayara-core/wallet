import React from "react";
import RPC from "../web3RPC"; // for using web3.js
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";
import { WALLET_ADAPTERS } from "@web3auth/base";


const Login: React.FC<{ web3auth: any; provider: any, setProvider: any }> = ({
    web3auth,
    provider,
    setProvider
  }) => {
  const login = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
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
  };

  return (
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
}

export default Login;
