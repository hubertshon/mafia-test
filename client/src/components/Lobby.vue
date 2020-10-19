<template>
  <div>
    <h1>Username</h1>
    <input type="text" v-model="userName" placeholder="Enter name" />
    <button id="Login_Register">Login</button>
  </div>
  <div>
      <button v-on:click="this.startGame()">START GAME</button>
  </div>
</template>

<script>
import io from "socket.io-client";
export default {
  name: "Lobby",
  data() {
    return {
      socket: {},
      message: "Welcome to Mafia",
      userName: "",
    };
  },
  created() {
    this.socket = io("http://localhost:3000");
  },
  mounted() {
    this.socket.on("message", (data) => {
      this.message = data;
    });
  },
  methods: {},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
