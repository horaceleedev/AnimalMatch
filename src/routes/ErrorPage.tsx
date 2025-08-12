import React from "react";
import { useRouteError } from "react-router-dom";

const ErrorPage: React.FC = () => {
  const error = useRouteError();
  console.error(error);

  return (
    <div>
      <p>An unexpected error has occurred</p>
      <p>{error.status + ' ' + error.statusText}</p>
      <p>{error.message}</p>
    </div>
  );
}
export default ErrorPage;