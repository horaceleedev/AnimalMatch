import React from 'react';
import { Link } from "react-router-dom";
import { Avatar, Button, Dropdown, Layout, Menu } from 'antd';
import { UserOutlined } from "@ant-design/icons";
const { Header } = Layout;

const headerMenuItems = [
  {
    key: 'videos',
    label: <Link to={`videos`}>Videos</Link>,
  },
  {
    key: 'individuals',
    label: <Link to={`individuals`}>Individuals</Link>,
  },
  {
    key: 'crops',
    label: <Link to={`crops`}>Crops</Link>,
  },
  {
    key: 'project-settings',
    label: 'Project Settings',
  },
];
const accountDropdownItems = [{
  key: '1',
  label: 'Sign out',
}];

interface AppHeaderProps {
  currentMenuPage: string;
}
const AppHeader: React.FC<AppHeaderProps> = ({currentMenuPage}: AppHeaderProps) => {
  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link to="/">
        <h3 style={{color: 'white'}}>AnimalMatch</h3>
      </Link>
      <Menu
        theme="dark"
        mode="horizontal"
        defaultSelectedKeys={['videos']}
        selectedKeys={[currentMenuPage]}
        items={headerMenuItems}
        style={{
          flex: "0 0 auto",
          minWidth: "calc(386px + 104px/2)" // 386px = width of 4 menu items, 104px = width of AnimalMatch text
        }}
      />

      {/* Remove span later (temporarily added) */}
      <span></span>
      
      {/* <Dropdown menu={{ items: accountDropdownItems }}>
        <Button type="text" style={{color: 'white'}}
                icon={<Avatar icon={<UserOutlined />} style={{background: 'rgba(255, 255, 255, 0.25)'}} />}
                iconPosition="end"
        >
          John Doe
        </Button>
      </Dropdown> */}
      {/*
      TODO add to header:
      - help button
        - also show "About" info (e.g. created by VGG)
      - account button
      */}
      {/* TODO add */}
    </Header>
  );
};

export default AppHeader;