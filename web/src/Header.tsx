import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useAuth } from "./auth/AuthProvider";

export function Header() {
  const { isConnected } = useAccount();
  const { isAuthenticated, signIn, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <h1 className="text-xl font-bold">TBVH</h1>
      <div className="flex items-center gap-3">
        <ConnectButton />
        {isConnected && !isAuthenticated && (
          <button
            onClick={signIn}
            className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </button>
        )}
        {isAuthenticated && (
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
