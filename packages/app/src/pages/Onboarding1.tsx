import React from 'react';
import Header from '../components/Header';

const Onboarding1: React.FC = () => {
  return (
    <div>
      <Header />
      

      <h1>First, get LINK</h1>
      <h3>LINK is a universal gas token. No more gas tokens on uncountable chains</h3>

      <button className='btn btn-primary'>Copy wallet address</button>

      <a href="#">I already transferred</a>
    </div>
  );
};

export default Onboarding1;
