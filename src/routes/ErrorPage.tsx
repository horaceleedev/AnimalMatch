import React from "react";
import { useRouteError } from "react-router-dom";

const ErrorPage: React.FC = () => {
  const error = useRouteError();
  console.error(error);
  const parsedError = error as {
    status?: number;
    statusText?: string;
    message?: string;
  };
  const statusLine = [parsedError.status, parsedError.statusText].filter(Boolean).join(" ");

  return (
    <div>
      <p>An unexpected error has occurred</p>
      {statusLine && <p>{statusLine}</p>}
      <p>{parsedError.message ?? "Unknown error"}</p>
    </div>
  );
}
export default ErrorPage;
