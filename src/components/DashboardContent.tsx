import React from "react";
import { Layout } from "antd";
const { Content } = Layout;

const DashboardContent: React.FC<{children: React.ReactNode, style?: React.CSSProperties}> = ({children, style}) => {
  return (
    <Content style={{padding: "36px 48px 48px 48px", ...style}}>
      {children}
    </Content>
  )
}

export default DashboardContent;