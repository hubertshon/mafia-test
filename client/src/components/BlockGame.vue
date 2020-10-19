<template>
  <div class="blockgame">
    <h2>You are about to recieve a card. Do not show anyone!</h2>
    <button v-on:click="getCard()">Get Card</button>
    <div>
      <p>You are {{ userCard.role }}</p>
    </div>
    <h1>{{ message }}</h1>
    <h1> {{ userRole }}</h1>
    <p> {{ userInfo }} </p>
    <div>
      <button v-on:click="change('night')">Night Time</button>
      <button v-show="message==='Night Time'" v-on:click="change('day')">Day Time</button>
    </div>
      <h2>{{ promptMessage }}</h2>

      <!-- MAFIA NIGHT VOTE -->
      <div v-if="actionPrompt==='actionMafia'">
        <div class="mafia-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="killPlayer(user.name)">Kill</button>
        </div>
      </div>

      <!-- CIVILIAN DAY VOTE -->
      <div v-if="actionPrompt==='civAction'">
        <div class="civilian-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="killPlayer(user.name)">Vote</button>
        </div>
      </div>
      
      <button v-if="this.message === 'Day Time'">Begin Vote</button>

  </div>

</template>

<script>
import io from "socket.io-client";
export default {
  name: "BlockGame",
  props: ["user-role"],
  data() {
    return {
      socket: {},
      context: {},
      time: "Day",
      message: "Welcome to Mafia",
      promptMessage: "Instructions Here",
      actionPrompt: "",
      userList: [],
      userInfo: {},
    };
  },
  created() {
    this.socket = io("http://localhost:3000");
    this.socket.emit("pregame-loaded");
    this.socket.emit("pregame");
  },
  mounted() {
    this.socket.on("user-card", (card) => {
      console.log("got the card", card);
      this.userInfo = card;
      console.log(this.userCard);
    });
    this.socket.on("night-time", (message) => {
      this.message = message;
      setTimeout(this.mafiaRound, 3000);
      console.log("night!");
    });
    this.socket.on("day-time", (message) => {
      this.message = message;
      this.civRound();
    });
    this.socket.on("prompt", (prompt) => {
      this.promptMessage = prompt;
    });
    this.socket.on("action", (action) => {
      this.actionPrompt = action;
    });
    this.socket.on("users", (users) => {
      this.userList = users;
    });
    this.socket.on("death-announce", (victim) => {
      setTimeout(3000);
      this.promptMessage = `The victim is ${victim.name}`;
    });
    this.socket.on("update-users", (users) => {
      this.users = users;
    });
  },
  methods: {
    change(message) {
      this.socket.emit("time", message);
      // setTimeout(nextPrompt(), 4000);
    },
    mafiaRound() {
      if (this.userRole === "MAFIA") {
        this.socket.emit("round", "mafia");
        console.log("mafia sent!");
      }
    },
    killPlayer(name) {
      this.socket.emit("kill", name);
      this.actionPrompt = "";
    },
    civRound() {
      this.socket.emit("round", "civilian");
    },
    getCard() {
      this.socket.emit("get-card", this.userName);
      console.log(this.userName);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1 {
  text-align: center;
}

.blockgame {
  background-color: rgb(119, 181, 181);
}
</style>
