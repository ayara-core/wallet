import React from 'react';
import logo from '../../public/logo-horizontal.png';

const Header: React.FC = () => {
  return (
    <header>
      <img src={logo} alt="Logo" />
    </header>
  );
};

export default Header;
