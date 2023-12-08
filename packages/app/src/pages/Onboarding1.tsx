import React, { useEffect } from "react";
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";
import { Link } from "react-router-dom";

import RPC from "../web3RPC"; // for using web3.js

const Onboarding1: React.FC<{ web3auth: any; provider: any }> = ({
  web3auth,
  provider,
}) => {
  const getAddress = async () => {
    if (!provider) {
      return;
    }
    const rpc = new RPC(provider);
    const address = await rpc.getAccounts();
    return address;
  };

  const sendTransactionWithABI = async () => {
    if (!provider) {
      alert("provider is not ready!");
      return;
    }
    const rpc = new RPC(provider);
    const ownerAddress = await getAddress();
    try {
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
        "0x315245Ca970555874e4dE9455E571D8A27f49320",
        "createWallet(address,bytes[])",
        [ownerAddress, []],
        "0"
      );
      console.log(receipt);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    sendTransactionWithABI();
  }, []);

  return (
    <div className="container">
      <Header />
      <div className="px-5">
        <img src={chainlinkLogo} alt="Chainlink Logo" className="mb-3" />
        <p className="text-secondary text-xl">First, get LINK</p>
        <p className="text-primary text-xl">
          LINK is a universal gas token. No more gas tokens on uncountable
          chains
        </p>
      </div>
      <div className="flex justify-center mt-12">
        <div className="">
          <button
            onClick={() => alert("copied!")}
            className="btn btn-accent my-3"
          >
            Copy wallet address
          </button>
          <p></p>
          <Link to={"/onboard/2"}>I already transferred -&gt;</Link>
        </div>
      </div>
    </div>
  );
};

export default Onboarding1;
