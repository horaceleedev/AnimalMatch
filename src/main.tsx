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
import CompareModal from './routes/CompareModal.tsx';
// @ts-ignore
import VideoAnnotatorModal from './routes/VideoAnnotatorModal.tsx';
import { AuthProvider } from './DataStores.tsx';
import { ProtectedRoute } from './routes/ProtectedRoute.tsx';
import { LoginPage } from './routes/LoginPage.tsx';
import './index.css'

const comparisonSubroutes = [
  {
    path: "compare/v/:videoId",
    element: <CompareModal />,
    children: [
      {
        // Redirect from '/(videos|individuals|crops)/compare/v/:videoId' to '/(videos|individuals|crops)/compare/v/:videoId/v'
        index: true,
        loader: () => redirect("v"),
      },
      {
        path: "v/:compareId?",
      },
      {
        path: "i/:compareId?",
      },
      {
        path: "c/:compareId?",
      },
    ],
  },
  {
    path: "compare/i/:individualId",
    element: <CompareModal />,
    children: [
      {
        // Redirect from '/(videos|individuals|crops)/compare/i/:individualId' to '/(videos|individuals|crops)/compare/i/:individualId/i'
        index: true,
        loader: () => redirect("i"),
      },
      {
        path: "v/:compareId?",
      },
      {
        path: "i/:compareId?",
      },
      {
        path: "c/:compareId?",
      },
    ],
  },
  {
    path: "compare/c/:cropId",
    element: <CompareModal />,
    children: [
      {
        // Redirect from '/(videos|individuals|crops)/compare/c/:individualId' to '/(videos|individuals|crops)/compare/c/:individualId/c'
        index: true,
        loader: () => redirect("c"),
      },
      {
        path: "v/:compareId?",
      },
      {
        path: "i/:compareId?",
      },
      {
        path: "c/:compareId?",
      },
    ],
  }
];

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
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
            // element: <CropDetailModal />,
            element: <CompareModal />,
          },
          ...comparisonSubroutes,
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
          ...comparisonSubroutes,
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
          ...comparisonSubroutes,
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  }
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AntApp>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AntApp>
  </React.StrictMode>,
)
