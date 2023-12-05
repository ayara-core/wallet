import React from 'react';
import logo from '../assets/logo-horizontal.png'

const Header: React.FC = () => {
  return (
    <div className="navbar bg-base-100 mx-3 my-5">
      <img src={logo} alt="Logo" />
    </div>
  );
};

export default Header;
