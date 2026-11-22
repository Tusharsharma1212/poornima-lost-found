import { Navigate } from "react-router-dom";
import { Show } from "@clerk/react";
import type { ReactNode } from "react";

// Signed-in-only content: signed-out visitors go to /sign-in with React Router.
export default function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to="/sign-in" replace />
      </Show>
    </>
  );
}
