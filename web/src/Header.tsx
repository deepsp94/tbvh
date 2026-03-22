import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { UsdcFaucet } from "./components/UsdcFaucet";

export function Header() {
  const { isConnected } = useAccount();
  const { isAuthenticated, signIn, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <Link to="/" className="text-xl font-bold hover:text-zinc-300 transition-colors">
        TBVH
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to="/docs"
          className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          Docs
        </Link>
        {isAuthenticated && (
          <Link
            to="/mine"
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            My Instances
          </Link>
        )}
        <UsdcFaucet />
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
