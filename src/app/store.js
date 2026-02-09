// Import hàm configureStore từ Redux Toolkit để cấu hình Redux store
import { configureStore } from "@reduxjs/toolkit";

// Import các reducer từ các slice khác nhau
import counterReducer from "../features/counter/counterSlice"; // Reducer cho tính năng đếm
import userAuthReducer from "../features/auth/userAuthSlice"; // Reducer quản lý xác thực người dùng
import manageRoomsReducer from "../features/manageRooms/manageRoomsSlice"; // Reducer quản lý các phòng chat
import manageFriendsReducer from "../features/manageFriends/manageFriendsSlice"; // Reducer quản lý bạn bè
// import { useState } from "react";

 

// Tạo Redux store cho ứng dụng - đây là kho lưu trữ trạng thái toàn cục
export const store = configureStore({
    // Khai báo các reducer cho từng phần của state tree
    reducer: {
        counter: counterReducer, // State quản lý counter
        userAuth: userAuthReducer, // State quản lý thông tin xác thực người dùng
        manageRooms: manageRoomsReducer, // State quản lý danh sách và thông tin các phòng chat
        manageFriends: manageFriendsReducer, // State quản lý danh sách bạn bè
        notifications: manageFriendsReducer,
    },
});


