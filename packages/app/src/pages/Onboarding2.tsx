import React from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const Onboarding2: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="container">
      <Header />
      <div className="px-5">
        <p className="text-secondary text-xl">Lock LINK to use any L2</p>
          <p className="text-primary text-xl">
            Empowered by CCIP, making universal gas wallet comes true.
          </p>
      </div>
      <button
        onClick={() => navigate('/onboard/3')}
        className="btn btn-accent px-5 my-3"
      >
        Start Staking
      </button>
    </div>
  );
};

export default Onboarding2;
