import React from 'react';
import Header from '../components/Header';
import chainlinkLogo from '../assets/chainlink-logo-white.png'

const Onboarding1: React.FC = () => {
  return (
    <div>
      <Header />
      <div className='px-5'>
        <img src={chainlinkLogo} alt="Chainlink Logo" className='mb-3' />
        <p className='text-secondary text-xl'>First, get LINK</p>
        <p className='text-primary text-xl'>LINK is a universal gas token. No more gas tokens on uncountable chains</p>
      </div>
      <div className='flex items-end justify-center'>
        <div className='container mx-auto text-center w-full'>
          <button className='btn btn-accent my-3'>Copy wallet address</button>
          <p><a href="#" className='my-3'>I already transferred</a></p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding1;
