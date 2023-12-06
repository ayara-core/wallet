import React from "react";
import Header from "../components/Header";
import chainlinkLogo from "../assets/chainlink-logo-white.png";

import { Link } from "react-router-dom";

const Onboarding1: React.FC = () => {
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
      <div className="flex items-end justify-center">
        <div className="mx-auto text-center w-full">
          <button
            onClick={() => alert("Copied!")}
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
