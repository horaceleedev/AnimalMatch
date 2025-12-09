import React from "react";
import { Layout } from "antd";
const { Content } = Layout;

const DashboardContent: React.FC<{children: React.ReactNode, style?: React.CSSProperties}> = ({children, style}) => {
  return (
    <Content style={{padding: "28px 36px 36px", overflow: "scroll", ...style}}>
      {children}
    </Content>
  )
}

export default DashboardContent;