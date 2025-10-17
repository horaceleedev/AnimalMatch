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
import CropsDashboardPage from './routes/CropsDashboardPage.tsx';
import VideoDetailModal from "./routes/VideoDetailModal.tsx";
import IndividualDetailModal from './routes/IndividualDetailModal.tsx';
import CropDetailModal from './routes/CropDetailModal.tsx';
import CompareModal from './routes/CompareModal.tsx';
import VideoAnnotatorModal from './routes/VideoAnnotatorModal.tsx';
import './index.css'

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
        path: "crops",
        element: <CropsDashboardPage />,
        children: [
          {
            path: ":cropId",
            element: <CropDetailModal />,
          },
        ]
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
            path: "compare/v/:videoId",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '/videos/compare/v/:videoId' to '/videos/compare/v/:videoId/v'
                index: true,
                loader: () => redirect("v"),
              },
              {
                path: "v/:compareId?",
              },
              {
                path: "i/:compareId?",
              },
            ],
          },
          {
            path: "compare/i/:individualId",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '/videos/compare/i/:individualId' to '/videos/compare/i/:individualId/i'
                index: true,
                loader: () => redirect("i"),
              },
              {
                path: "v/:compareId?",
              },
              {
                path: "i/:compareId?",
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
            path: "compare/i/:individualId",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '/individuals/compare/i/:individualId' to '/individuals/compare/i/:individualId/i'
                index: true,
                loader: () => redirect("i"),
              },
              {
                path: "v/:compareId?",
              },
              {
                path: "i/:compareId?",
              },
            ],
          },
          {
            path: "compare/v/:videoId",
            element: <CompareModal />,
            children: [
              {
                // Redirect from '/individuals/compare/v/:videoId' to '/individuals/compare/v/:videoId/v'
                index: true,
                loader: () => redirect("v"),
              },
              {
                path: "v/:compareId?",
              },
              {
                path: "i/:compareId?",
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
