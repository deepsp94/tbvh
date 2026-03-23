import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Header } from "./Header";
import HomePage from "./pages/HomePage";
import CreateInstancePage from "./pages/CreateInstancePage";
import InstanceDetailPage from "./pages/InstanceDetailPage";
import MyInstancesPage from "./pages/MyInstancesPage";
import VerifyPage from "./pages/VerifyPage";
import DocsPage from "./pages/DocsPage";

function Layout() {
  return (
    <div className="min-h-screen bg-[--color-surface-0] text-zinc-100">
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
      { path: "/instances/:id", element: <InstanceDetailPage /> },
      { path: "/mine", element: <MyInstancesPage /> },
      { path: "/verify/:negotiationId", element: <VerifyPage /> },
      { path: "/docs", element: <DocsPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
