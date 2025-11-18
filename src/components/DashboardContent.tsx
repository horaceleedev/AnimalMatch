import { Layout } from "antd";
const { Content } = Layout;

const DashboardContent: React.FC<{children: React.ReactNode}> = ({children}) => {
  return (
    <Content style={{padding: "36px 48px 48px 48px"}}>
      {children}
    </Content>
  )
}

export default DashboardContent;