import React, { useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { Layout } from 'antd';
const { Content } = Layout;

import { useIndividualsStore, useVideoStore } from "./DataStores.tsx";
import AppHeader from "./components/AppHeader.tsx";
import "./App.scss"

const App: React.FC = () => {
  const fetchVideos = useVideoStore((state) => state.fetchVideos);
  const fetchIndividuals = useIndividualsStore((state) => state.fetchIndividuals);

  // App initialization
  useEffect(() => {
    fetchVideos();
    fetchIndividuals();
  }, []);

  const routerLocation = useLocation();
  const currentMenuPage = routerLocation.pathname.split('/')[1]; // e.g. 'videos' or 'individuals'

  return (
    <Layout>
      <AppHeader currentMenuPage={currentMenuPage} />
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default App;