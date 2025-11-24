// import { getSocketIO, getConnectedUsers } from "../socket/socket.js";

import { getConnectedUsers, getSocketIO } from ".";

export const sendMessageToUser = (userId, event, payload) => {
  const io = getSocketIO();
  const connectedUsers = getConnectedUsers();
  const socketId = connectedUsers.get(userId);

  if (socketId) {
    io.to(socketId).emit(event, payload);
  } else {
    console.warn(`⚠️ Cannot send ${event}, user ${userId} not connected`);
  }
};

// Example specific emitters for convenience:
export const sendSearchProgress = (userId, message) => {
  sendMessageToUser(userId, "searchProgress", { message });
};

export const sendSearchComplete = (userId, payload) => {
  sendMessageToUser(userId, "searchComplete", payload);
};

export const sendJobAlertToWorker = (userId, jobDetails) => {
  sendMessageToUser(userId, "jobAlert", jobDetails);
};

export const sendBookingConfirmed = (userId, payload) => {
  sendMessageToUser(userId, "bookingConfirmed", payload);
};
