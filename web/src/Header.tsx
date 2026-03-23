import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { UsdcFaucet } from "./components/UsdcFaucet";

export function Header() {
  const { isConnected } = useAccount();
  const { isAuthenticated, signIn, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[--color-border] backdrop-blur-md bg-[--color-surface-0]/80">
      <Link to="/" className="font-mono font-semibold tracking-tight text-lg text-zinc-100 hover:text-teal-400 transition-colors">
        TBVH
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to="/docs"
          className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          Docs
        </Link>
        {isAuthenticated && (
          <Link
            to="/mine"
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            My Instances
          </Link>
        )}
        <UsdcFaucet />
        <ConnectButton />
        {isConnected && !isAuthenticated && (
          <button
            onClick={signIn}
            className="px-4 py-2 text-sm font-medium bg-teal-500 text-zinc-950 rounded-lg hover:bg-teal-400 transition-all duration-150"
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
