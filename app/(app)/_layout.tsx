import React from "react";
import { Drawer } from "expo-router/drawer";

export default function AppLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
      }}
    >
      <Drawer.Screen
        name="chats"
        options={{
          title: "Chats",
        }}
      />
      <Drawer.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
      <Drawer.Screen
        name="diagnostics"
        options={{
          title: "Diagnostics",
        }}
      />
    </Drawer>
  );
}

