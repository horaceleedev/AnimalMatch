import React, { useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { Layout } from 'antd';
const { Content } = Layout;
import { useShallow } from 'zustand/react/shallow'

import { useIndividualsStore, useVideoStore } from "./DataStores.tsx";
import AppHeader from "./components/AppHeader.tsx";
import "./App.scss"

const App: React.FC = () => {
  const [fetchVideos, subscribeToVideos, unsubscribeFromVideos] = useVideoStore(
    useShallow((state) => [state.fetchVideos, state.subscribe, state.unsubscribe])
  );
  const [fetchIndividuals, subscribeToIndividuals, unsubscribeFromIndividuals] = useIndividualsStore(
    useShallow((state) => [state.fetchIndividuals, state.subscribe, state.unsubscribe])
  );

  // App initialization
  useEffect(() => {
    fetchVideos();
    fetchIndividuals();
    subscribeToVideos();
    subscribeToIndividuals();
    return () => {
      unsubscribeFromVideos();
      unsubscribeFromIndividuals();
    };
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