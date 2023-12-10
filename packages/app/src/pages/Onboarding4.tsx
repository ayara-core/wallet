import React, { useEffect } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';


const Onboarding4: React.FC = () => {
  const navigate = useNavigate();

  // Check if already onboarded
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("hasOnboarded");
    if (!hasOnboarded) {
      localStorage.setItem("hasOnboarded", "true");
    }
  }, []);

  return (
    <div className="container">
      <Header />
      <div className="px-5">
        <p className="text-secondary text-xl">Time to fill up gas</p>
        <p className="text-primary text-xl">
        We will lock your LINK, so you can free to use any dapp on L2 
        </p>
      </div>
      <div className='flex justify-center mt-12'>
        <button
              onClick={() => navigate('/')}
              className="btn btn-accent px-5 my-3"
            >
              Transact
        </button>
      </div>
    </div>
  );
};

export default Onboarding4;
