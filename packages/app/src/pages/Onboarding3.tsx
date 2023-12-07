import React from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';


const Onboarding3: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container">
      <Header />
      <div className="px-5">
        <p className="text-secondary text-xl">We need your approval</p>
        <p className="text-primary text-xl">
            Set a cap spending for your LINK 
        </p>
      </div>
      <div className='flex justify-center mt-12'>
        <button
              onClick={() => navigate('/onboard/4')}
              className="btn btn-accent px-5 my-3"
            >
              Approve Token
          </button>
      </div>
    </div>
  );
};

export default Onboarding3;
