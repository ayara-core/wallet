import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";
import { Link } from "react-router-dom";

import RPC from "../web3RPC"; // for using web3.js

import { createWallet, getWallet } from '../utils/walletInstance';

const Onboarding1: React.FC<{ web3auth: any; provider: any }> = ({
  web3auth,
  provider,
}) => {
  const [loading, setLoading] = useState<boolean>(false);

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
    setLoading(true);
    const rpc = new RPC(provider);
    const ownerAddress = (await getAddress())[0];
    const smartWalletAddress = await getWallet(rpc, "0x82aC90cbE27D57313a36C51f4d70645B781eED97");
    try {
      // No smart wallet
      if (smartWalletAddress === "0x0000000000000000000000000000000000000000") {
        await createWallet(rpc, ownerAddress);
        const createdSmartWalletAddress = await getWallet(rpc, "0x82aC90cbE27D57313a36C51f4d70645B781eED97");
        console.log(createdSmartWalletAddress);
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
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
