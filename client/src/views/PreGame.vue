<template>
  <div id="pregame">
    <h2> You are about to recieve a card. Do not show anyone!</h2>
    <button v-on:click="getCard()">Get Card</button>
    <div>
      <p>You are {{ userCard.role }}</p>
    </div>
    <BlockGame :user-role="userRole" v-if="userRole !== ''" />

 

  </div>
</template>

<script>
import io from "socket.io-client";
import BlockGame from "../components/BlockGame.vue";
export default {
  name: "PreGame",
  props: ["user-name"],
  components: {
    BlockGame,
  },
  data() {
    return {
      socket: {},
      counter: 10,
      // userRole: "",
      users: [],
      userCard: {
        role: "...",
      },
      data: "",
      userRole: "",
      victim: {},
    };
  },
  created: function () {
    this.socket = io("http://localhost:3000");
    this.socket.emit("pregame-loaded");
  },
  mounted: function () {
    this.socket.on("user-card", (card) => {
      this.userCard = card;
      console.log(this.userCard);
      this.userRole = card.role;
      console.log("userRole", this.userRole);
    });
    this.socket.on("get-card", (data) => {
      this.userCard = data;
      console.log(this.data);
    });
    this.socket.on("update-users", (users) => {
      this.users = users;
    });
  },
  methods: {
    getCard() {
      this.socket.emit("get-card", this.userName);
      console.log(this.userName);
    },
  },
};
</script>

<style>
#pregame {
  background-color: #b37474;
}
/* body {
  background-color: #c2c2c2;
  color: rgb(53, 53, 53);
} */
</style>
