import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClientResponseError } from "pocketbase";
import { Alert, Button, Card, Flex, Form, Input } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

import { useAuth } from "../DataStores";

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogin = () => {
    // navigate to the location passed from ProtectedRoute
    // (i.e. the address the user was trying to access before being redirected to /login)
    // or default to "/"
    navigate(location.state ?? "/");
  };

  useEffect(() => {
    if (user) onLogin();
  }, [user]);

  const [errorMessage, setErrorMessage] = useState("");
  const handleFinish = async ({usernameOrEmail, password}: {usernameOrEmail: string, password: string}) => {
    try {
      await login(usernameOrEmail, password);
    } catch (e) {
      console.error(e);
      if (e instanceof ClientResponseError) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage("An unexpected error occurred")
      }
      return;
    }
    onLogin();
  };

  return (
    <Flex justify="center" align="center" style={{height: 600}}>
      <Card style={{width: 350}}>
        <p style={{marginTop: 0, marginBottom: 24, textAlign: 'center'}}><b>Log in to AnimalMatch</b></p>
        {
          errorMessage &&
          <Alert message={errorMessage} type="error" showIcon style={{marginBottom: 20}} />
        }
        <Form
          // name="login"
          onFinish={handleFinish}
          layout="vertical"
          // requiredMark="optional"
        >
          <Form.Item
            name="usernameOrEmail"
            rules={[
              {
                required: true,
                message: "Please enter your username or email",
              },
            ]}
            validateTrigger="onBlur"
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username or email address"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: "Please enter your password",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: "0px" }}>
            <Button block={true} type="primary" htmlType="submit">
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
};
