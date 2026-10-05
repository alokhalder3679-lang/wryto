import React from "react";
import { WrytoLogo } from "./WrytoLogo";

interface NavbarProps {
  onSignUp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignUp }) => {
  return (
    <header className="relative z-10 w-full">
      <nav
        aria-label="Main Navigation"
        className="flex row justify-between items-center px-8 py-4 sm:py-5 max-w-7xl mx-auto"
      >
        {/* Brand Logo */}
        <a
          href="#home"
          className="inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none min-w-[120px]"
          aria-label="Wryto Home"
        >
          <WrytoLogo className="h-12 sm:h-14 w-auto drop-shadow-sm" />
        </a>

        {/* Sign Up Button */}
        <button
          type="button"
          onClick={onSignUp}
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200 cursor-pointer font-medium"
        >
          Sign Up
        </button>
      </nav>
    </header>
  );
};
