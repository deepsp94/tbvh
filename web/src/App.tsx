import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Header } from "./Header";
import HomePage from "./pages/HomePage";
import CreateInstancePage from "./pages/CreateInstancePage";

function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/create", element: <CreateInstancePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
