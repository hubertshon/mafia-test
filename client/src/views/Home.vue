<template>
  <div id="home">
    <!-- <h1>Username</h1>
      <input type="text" v-model="userName" placeholder="Enter name" />
      <button id="Login_Register" v-on:click="addUser(userName)">Login</button>
      <h3> {{ message }}</h3>
      <h3>Players</h3>

        <p v-for="user in userList" :key="user.id">
          {{ user.name }}
        </p>
  <div>
      <button v-on:click="startGame()" v-if="userList.length > 1">START GAME</button>
  </div> -->
  </div>
</template>

<script>
import io from "socket.io-client";
export default {
  name: "Home",
  components: {},
  data() {
    return {
      socket: {},
      userName: "",
      message: "Hello World",
      userList: [],
    };
  },
  created: function () {
    this.socket = io("http://localhost:3000");
  },
  mounted: function () {
    this.socket.on("user-connected", (name) => {
      this.message = `${name} has joined`;
    });
    this.socket.on("message", (message) => {
      this.message = message;
    });
    this.socket.on("users", (users) => {
      this.userList = users;
    });
    this.socket.on("pregame", () => {
      console.log("pregame!");
      this.$router.push("/game");
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
