import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";
import { App as AntApp } from 'antd';

import App from './App.tsx';
import ErrorPage from "./routes/ErrorPage.tsx";
import VideosDashboardPage from "./routes/VideosDashboardPage.tsx";
import IndividualsDashboardPage from "./routes/IndividualsDashboardPage.tsx";
import VideoDetailModal from "./routes/VideoDetailModal.tsx";
import './index.css'
import IndividualDetailModal from './routes/IndividualDetailModal.tsx';
import CompareModal from './routes/CompareModal.tsx';
import VideoAnnotatorModal from './routes/VideoAnnotatorModal.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        // Redirect from '/' to '/videos'
        index: true,
        loader: () => redirect("/videos"),
        // loader: () => redirect("/timeline"), // (temporarily changed)
      },
      {
        path: "videos",
        element: <VideosDashboardPage />,
        children: [
          {
            path: ":videoId",
            // element: <VideoDetailModal />,
            element: <CompareModal />,
          },
          {
            path: ":videoId/annotate",
            element: <VideoAnnotatorModal />,
          },
          {
            path: ":videoId/compare",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '.../compare/' to '.../compare/individuals'
                index: true,
                loader: () => redirect("individuals"),
              },
              {
                path: "videos",
                // element: <div>videos</div>,
              },
              {
                path: "videos/:compareId",
                // element: <div>video detail</div>,
              },
              {
                path: "individuals",
                // element: <div>individuals</div>,
              },
              {
                path: "individuals/:compareId",
                // element: <div>individual detail</div>,
              },
            ],
          },
        ],
      },
      {
        path: "individuals",
        element: <IndividualsDashboardPage />,
        children: [
          {
            path: ":individualId",
            // element: <IndividualDetailModal />,
            element: <CompareModal />,
          },
          {
            path: ":individualId/compare",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '.../compare/' to '.../compare/individuals'
                index: true,
                loader: () => redirect("individuals"),
              },
              {
                path: "videos",
                // element: <div>videos</div>,
              },
              {
                path: "videos/:compareId",
                // element: <div>video detail</div>,
              },
              {
                path: "individuals",
                // element: <div>individuals</div>,
              },
              {
                path: "individuals/:compareId",
                // element: <div>individual detail</div>,
              },
            ],
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AntApp>
      <RouterProvider router={router} />
    </AntApp>
  </React.StrictMode>,
)
