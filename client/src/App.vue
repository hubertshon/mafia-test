<template>
  <div id="app">
    <router-view :user-name="userName" :socket="socket" />
    <div id="login" v-if="login > 0">
      <h1>Username</h1>
      <h5> {{serverMessage}}</h5>
        <input type="text" v-model="userName" placeholder="Enter name" />
        <button id="Login_Register" v-on:click="addUser(userName)">Login</button>
        <h3>Players</h3>

          <p v-for="user in userList" :key="user.id">
            {{ user.name }}
          </p>
        <div>
          <button v-on:click="joinRoom('VEGAS')">Join VEGAS</button>
          <button v-on:click="joinRoom('NYC')">Join NYC</button>
          <button v-on:click="startGame()" v-if="userList.length > 1">START GAME</button>
        </div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
export default {
  name: "App",
  components: {},
  data() {
    return {
      socket: {},
      userName: "",
      userList: [],
      login: 1,
      roomjoin: "",
      serverMessage: "",
    };
  },
  created: function () {
    this.socket = io("http://localhost:3000");
  },
  mounted: function () {
    this.socket.on("success", (data) => {
      this.serverMessage = data;
    });
    this.socket.on("user-connected", (name) => {
      this.message = `${name} has joined`;
    });
    // this.socket.on("message", (message) => {
    //   this.message = message;
    // });
    this.socket.on("users", (users) => {
      this.userList = users;
    });
    this.socket.on("pregame", () => {
      console.log("pregame!");
      this.$router.push("/game");
      this.login = 0;
    });
    this.socket.on("err", (err) => {
      console.log("Error:", err);
    });
    this.socket.on("success", (res) => {
      this.roomjoin = `You are in room ${res}`;
      console.log(res);
    });
  },
  methods: {
    addUser(name) {
      console.log("adding user", name);
      this.socket.emit("add-user", name);
    },
    startGame() {
      console.log("start");
      this.socket.emit("startgame");
      this.login -= 1;
    },
    joinRoom(room) {
      this.socket.emit("join-room", room);
    },
  },
};
</script>

<style>
body {
  background-color: #c2c2c2;
  color: rgb(53, 53, 53);
}
</style>
