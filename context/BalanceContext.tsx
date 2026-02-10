// "use client";

// import useAxios from "@/hooks/useAxios";
// import { BalanceApiResponseType, BalanceContextType } from "@/types/api-types";
// import { useQuery } from "@tanstack/react-query";
// import { createContext, useContext, useEffect, useState } from "react";

// // Create the context
// const BalanceContext = createContext<BalanceContextType | null>(null);

// export const useBalance = (): BalanceContextType => {
//   const context = useContext(BalanceContext);
//   if (context === null) {
//     throw new Error("useBalance must be used within a BalanceProvider");
//   }
//   return context;
// };

// // Provider component
// export const BalanceProvider = ({
//   children,
// }: {
//   children: React.ReactNode;
// }) => {
//   const [user, setUser] = useState<string | null>(null);

//   useEffect(() => {
//     setUser(localStorage.getItem("user"));
//   }, [user]);

//   const api = useAxios();
//   let getUserfromLocalStorage: BalanceApiResponseType | null = null;

//   if (user) {
//     getUserfromLocalStorage = JSON.parse(user);
//   }

//   const { isLoading, data, error } = useQuery({
//     queryKey: ["getUserBalance"],
//     queryFn: () =>
//       api
//         .get(`usdc/usdc-balance/${getUserfromLocalStorage?.data.arbitrumWallet}`)
//         .then((res) => {
//           return res?.data;
//         }),
//     enabled: !!getUserfromLocalStorage, // Only run query if getUserfromLocalStorage is not null
//   });

//   return (
//     <BalanceContext.Provider value={{ isLoading, data, error }}>
//       {children}
//     </BalanceContext.Provider>
//   );
// };



"use client";

import { BalanceContextType } from "@/types/api-types";
import { createContext, useContext, useEffect, useState } from "react";
import { useChain } from "@/context/ChainContext";
import { useAuthSession } from "@/context/AuthSessionContext";
import { createMockResponse, simulateDelay } from "@/lib/mock-data";

// Create the context
const BalanceContext = createContext<BalanceContextType | null>(null);

export const useBalance = (): BalanceContextType => {
  const context = useContext(BalanceContext);
  if (context === null) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
};

// Provider component
export const BalanceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { chain } = useChain();
  const { isLoggedIn, hasChecked } = useAuthSession();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!hasChecked || !isLoggedIn) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;

    const fetchBalance = async () => {
      setIsLoading(true);
      try {
        await simulateDelay(500);
        const mockData = createMockResponse({
          balance: '1000.00',
          usdValue: '1000.00',
          chain: chain || 'arbitrum',
        });
        if (active) {
          setData(mockData);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err);
          setData(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();
    return () => {
      active = false;
    };
  }, [chain, hasChecked, isLoggedIn]);

  return (
    <BalanceContext.Provider value={{ isLoading, data, error }}>
      {children}
    </BalanceContext.Provider>
  );
};
