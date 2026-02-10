"use client";


// ChainContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type ChainContextType = {
  chain: string;
  setChain: (chain: string) => void;
};

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const ChainProvider = ({ children }: { children: ReactNode }) => {
  const [chain, setChain] = useState<string>('arbitrum');

  return (
    <ChainContext.Provider value={{ chain, setChain }}>
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
};
