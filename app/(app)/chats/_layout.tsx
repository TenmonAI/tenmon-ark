import React from "react";
import { Stack } from "expo-router/stack";

export default function ChatsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Chats",
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: "Chat",
        }}
      />
    </Stack>
  );
}

