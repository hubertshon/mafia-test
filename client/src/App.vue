<template>
  <div id="app">
    <router-view :user-name="userName" :socket="socket" :userCount="userCount" />
    <div id="login" v-if="login > 0">
      <h1>Username</h1>
      <h5> {{serverMessage}}</h5>
      <input type="text" v-model="userName" placeholder="Enter name" />
      
      <button id="Login_Register" v-on:click="addUser()">Login</button>
      <h3>Players</h3>

      <p v-for="user in playerList" :key="user.id">
        {{ user.name }}
      </p>

      <div>
        <button v-on:click="hostGame()">Host GAme</button>
        <input type="text" v-model="options.room">
        <button v-on:click="joinRoom(options.room)">Join ROOM</button>
        <button v-on:click="joinRoom('NYC')">Join NYC</button>
        <button v-on:click="startGame()" v-if="playerList.length > 1">START GAME</button>
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
      playerInfo: {},
      playerList: [],
      login: 1,
      roomInput: "",
      roomjoin: "",
      serverMessage: "",
      userCount: 0,
      options: {
        name: "",
        room: "",
        settings: {
          mafiaNum: 1,
          policeNum: 1,
          doctorNum: 1,
          timer: 30,
          announceSave: true,
        },
      },
    };
  },
  created: function () {
    this.socket = io("http://localhost:3000");
  },
  mounted: function () {
    this.socket.on("success", (data) => {
      this.serverMessage = data;
    });
    this.socket.on("setup-user", (userInfo) => {
      this.playerInfo = userInfo;
      console.log("Player", this.playerInfo);
    });
    this.socket.on("user-connected", (info) => {
      this.message = `${info.name} has joined`;
      this.playerList = info.userList;
      console.log("LIST:", this.playerList);
    });
    // this.socket.on("message", (message) => {
    //   this.message = message;
    // });
    this.socket.on("users", (users) => {
      this.playerList = users;
    });
    this.socket.on("pregame", (playerCount) => {
      console.log("pregame!");
      this.userCount = playerCount;
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
    addUser() {
      console.log("adding user", this.userName);
      this.socket.emit("add-user", this.userName);
    },
    startGame() {
      console.log("start");
      this.socket.emit("startgame", this.options);
      this.login -= 1;
    },
    joinRoom(room) {
      this.socket.emit("join-room", room);
    },
    hostGame() {
      this.socket.emit("host-game", this.options).then(this.addUser());
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
