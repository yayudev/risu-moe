import * as React from "react";
import { connect } from "react-redux";
import { User } from "../../../types/User";
import { AppState } from "../../../store";
import { ChatOnlineUser } from "./ChatOnlineUser";
import "./ChatOnlineUserList.css";

interface ChatOnlineUserListProps {
  users: Array<User>;
}

function ChatOnlineUserListComponent(props: ChatOnlineUserListProps) {
  return (
    <div className="chat-online">
      <h3 className="chat-online-title"> Online </h3>
      <ul className="chat-online-users">
        {props.users.map((user, index) =>
          <ChatOnlineUser key={index} name={user.name} color={user.color} />
        )}
      </ul>
    </div>
  );
}

function mapStateToProps({ chat }: AppState) {
  return {
    users: chat.onlineUsers
  };
}

export const ChatOnlineUserList: React.ComponentClass<{}> = connect(
  mapStateToProps
)(ChatOnlineUserListComponent);