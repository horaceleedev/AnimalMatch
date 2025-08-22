import React, { useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { Layout, App as AntApp } from 'antd';
const { Content } = Layout;
import { useShallow } from 'zustand/react/shallow'

import { useIndividualsStore, useVideoStore } from "./DataStores.tsx";
import AppHeader from "./components/AppHeader.tsx";
import "./App.scss"

const App: React.FC = () => {
  const { message } = AntApp.useApp();

  const [fetchVideos, subscribeToVideos, unsubscribeFromVideos] = useVideoStore(
    useShallow((state) => [state.fetchVideos, state.subscribe, state.unsubscribe])
  );
  const [fetchIndividuals, subscribeToIndividuals, unsubscribeFromIndividuals] = useIndividualsStore(
    useShallow((state) => [state.fetchIndividuals, state.subscribe, state.unsubscribe])
  );

  // App initialization
  useEffect(() => {
    Promise.all([fetchVideos(), fetchIndividuals()]).catch((e) => {
      message.error('Unable to load data');
      console.error(e);
    });
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