<template>
  <div class="game">
    <div v-show="deathmessage === 'YOU DIED'">
      <h1> {{ deathmessage }} </h1>
    </div>
    <div v-show="deathmessage === ''">
    <h2> {{ userName }}, you are about to recieve a card. Do not show anyone!</h2>
    <button v-on:click="getCard()">Get Card</button>
    <button v-on:click="test()">TEST</button>
    <div>
      <p>You are {{ userInfo.role }}</p>
      <p>userlist:{{ userList }} </p>
    </div>
    
    <!-- <h1 v-if="winMessage !== ''">{{ winMessage }}</h1> -->
    <h3>{{ message }}</h3>
    <p> {{ userInfo }} </p>
  

  <!-- Event Screen -->
    <div>
      <button v-if="message==='DAY TIME' || message === 'Welcome to Mafia'" v-on:click="change('night')">NIGHT TIME</button>
      <button v-show="message === 'NIGHT TIME'" v-on:click="change('day')">DAY TIME</button>
      
    </div>
      <!-- <h2 v-if="message === 'DAY TIME'">{{ promptMessage }}</h2> -->
      <h2>{{ promptMessage }}</h2>

      <h4 v-if="readyVote > 0">Ready to Vote:{{ readyVote }}</h4>
      <h4>{{ helpMessage }}</h4>
      <p v-if="showVoteResults === true">{{ voteResults }} </p>
      <!-- MAFIA NIGHT VOTE -->
      <div v-if="actionPrompt==='actionMafia'">
        <div class="mafia-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="killPlayer(user.name)">Kill</button>
        </div>
      </div>

      <div v-if="actionPrompt==='actionPolice'">
        <div class="police-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="checkPlayer(user.name)">Investigate</button>
        </div>
      </div>

      <div v-if="actionPrompt === 'actionDoctor'">
        <div class="doctor-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="savePlayer(user.name)">Save</button>
        </div>
      </div>

      <!-- CIVILIAN DAY VOTE -->
      <h3>{{ timer }} </h3>
      <button v-show="this.message === 'DAY TIME' && this.showReady === true" v-on:click="sendReady()">Begin Vote</button>
      <div v-if="actionPrompt==='civAction'">
        <div class="citizen-vote" v-for="user in userList" :key="user.id">
          <p> {{ user.name }} </p>
          <button v-on:click="votePlayer(user.name)">Vote</button>
          
        </div>
        <button v-on:click="voteSkip()">Skip</button>
      </div>
      <button v-on:click="voteDone()">Done Voting</button>
      
    
  </div>
  </div>

</template>

<script>
// import io from "socket.io-client";
export default {
  name: "Game",
  props: {
    socket: {
      type: Object,
      required: true,
    },
    userName: String,
    userCount: Number,
  },

  data() {
    return {
      // socket: {},
      // time: "day",
      message: "Welcome to Mafia",
      deathmessage: "",
      promptMessage: "Instructions Here",
      helpMessage: "",
      actionPrompt: "",
      victimMessage: "",
      userList: [],
      userInfo: {
        role: "...",
      },
      victim: "",
      readyVote: 0,
      voteResults: {},
      voteCount: 0,
      showVoteResults: false,
      showReady: true,
      cardReady: 0,
      winMessage: "",
      settings: null,
      timer: 30,
    };
  },
  created() {
    // this.socket = io("http://localhost:3000");
    this.socket.emit("pregame-loaded");
  },
  mounted() {
    this.socket.on("user-card", (cards) => {
      console.log("got the card", cards);
      this.userInfo = cards.find((x) => x.name === this.userName);
      this.userList = cards;
      console.log(this.userInfo);
    });
    this.socket.on("settings", (settings) => {
      this.settings = settings;
    });
    this.socket.on("card-dealt", () => {
      console.log("RDY", this.cardReady);
      console.log("COUNT", this.userCount);
      this.cardReady += 1;
      if (this.cardReady === this.userCount) {
        setTimeout(this.changeToNight, 2000);
      }
    });
    this.socket.on("night-time", (time) => {
      this.message = time;
      this.voteResults = {};
      this.showVoteResults = false;
      setTimeout(this.mafiaRound, 4000);
      console.log("night!");
    });
    this.socket.on("day-time", (time) => {
      this.message = time;
      this.promptMessage = this.victimMessage;
      this.actionPrompt = "";
    });
    this.socket.on("prompt", (prompt) => {
      this.promptMessage = prompt;
    });
    this.socket.on("prompt-search", (prompt) => {
      if (this.userInfo.role === "POLICE") {
        this.promptMessage = prompt;
        setTimeout(this.clearPrompt, 3000);
      } else {
        // setTimeout(this.doctorRound, 3000);
        this.socket.emit("doctor-ready");
      }
    });
    this.socket.on("begin-doctor", () => {
      setTimeout(this.doctorRound, 3000);
    });
    this.socket.on("prompt-save", (data) => {
      if (this.victim === data) {
        this.victimMessage = `${data} almost died, but was miraculously saved!`;
      } else {
        this.victimMessage = `${this.victim} was found dead.`;
      }
    });
    this.socket.on("action", (action) => {
      this.actionPrompt = action;
      if (action === "civAction") {
        this.readyVote = 0;
        this.showReady = true;
        this.startTimer();
      }
    });
    this.socket.on("users", (users) => {
      this.userList = users;
    });
    this.socket.on("death-announce", (victim) => {
      console.log("victim found", victim);
      this.victim = victim.name;
      this.victimMessage = `${this.victim} was found dead.`;
      this.promptMessage = "Instructions Here";
      setTimeout(this.policeRound, 3000);
    });
    this.socket.on("update-users", (users) => {
      console.log("update-users");
      this.userList = users;
      this.checkHealth();
      this.clearHelp();
    });
    this.socket.on("addReady", () => {
      this.readyVote++;
    });
    this.socket.on("voteCount", (info) => {
      var leftAlive = this.userList.filter((obj) => obj.life === true).length;
      this.voteCount += 1;
      if (this.voteResults[info.votee] === undefined) {
        this.voteResults[info.votee] = [info.voter];
      } else {
        this.voteResults[info.votee].push(info.voter);
      }
      console.log(this.voteResults);
      if (this.voteCount === leftAlive) {
        this.voteDone();
      }
    });
    this.socket.on("exiled", (exiled) => {
      this.promptMessage = `${exiled} was exiled!`;
      // setTimeout(this.clearPrompt, 3000);
      this.voteCount = 0;
      this.checkHealth();
      // setTimeout(this.changeToNight, 4000);
    });
    this.socket.on("vote-none", () => {
      this.promptMessage = "No one was voted off";
      this.voteCount = 0;
      // this.voteResults = votes;
      this.showVoteResults = true;
      // setTimeout(this.changeToNight, 4000);
    });
    this.socket.on("test-receiver", () => {
      console.log("received");
    });
    this.socket.on("endgame", (winner) => {
      console.log("win:", winner);
      if (winner === "citizens") {
        // clearTimeout(this.autoChangeNight);
        this.message = "CITIZENS WIN"; //maybe there is competition for this variable?
      } else if (winner === "mafia") {
        // clearTimeout(this.autoChangeNight);
        //but that would not makese sense, tested this empty.
        this.message = "MAFIA WINS";
      } else if (winner === "NONE" && this.showVoteResults === true) {
        setTimeout(this.changeToNight, 4000);
      }
    });
  },
  methods: {
    test() {
      this.socket.emit("test");
    },
    getCard() {
      this.socket.emit("get-card", {
        name: this.userName,
        totalPlayers: this.userList.length,
      });
      console.log(this.userName);
    },
    change(message) {
      this.socket.emit("time", message);
      // if (this.message === "day") {
      //   this.time = "night";
      // } else {
      //   this.time = "day";
      // }
    },
    mafiaRound() {
      if (this.userInfo.role === "MAFIA") {
        this.socket.emit("round", "mafia");
        console.log("mafia sent!");
      }
    },
    killPlayer(name) {
      this.socket.emit("kill", name);
      this.actionPrompt = "";
    },
    //POLICE ROUND
    policeRound() {
      if (this.userInfo.role === "POLICE" && this.deathmessage === "") {
        this.socket.emit("round", "police");
        console.log("police sent!");
      } else if (
        this.userInfo.role === "POLICE" &&
        this.deathmessage === "YOU DIED"
      ) {
        setTimeout(this.skipPoliceSearch, 1500);
      }
    },
    checkPlayer(name) {
      this.socket.emit("search", name);
      this.actionPrompt = "";
    },
    //DOCTOR ROUND
    doctorRound() {
      if (this.userInfo.role === "DOCTOR" && this.deathmessage === "") {
        this.socket.emit("round", "doctor");
        console.log("doctor sent!");
      } else if (
        this.userInfo.role === "DOCTOR" &&
        this.deathmessage === "YOU DIED"
      ) {
        setTimeout(this.savePlayer("SkipVote"), 1500);
      }
    },
    savePlayer(name) {
      this.socket.emit("save", { name: name, victim: this.victim });
      this.actionPrompt = "";
      setTimeout(this.changeToDay, 2000);
    },
    //VOTING
    sendReady() {
      var leftAlive = this.userList.filter((obj) => obj.life === true).length;
      console.log(leftAlive);
      this.socket.emit("readyToVote", {
        living: leftAlive,
        readyVotes: this.readyVote,
      });
      this.showReady = false;
    },
    voteBegin() {
      this.socket.emit("vote-begin");
    },
    votePlayer(name) {
      this.socket.emit("vote", { votee: name, voter: this.userInfo.name });
      this.actionPrompt = "";
      this.helpMessage = `You voted for ${name}`;
      console.log("vote cast");
    },
    voteSkip() {
      this.socket.emit("vote-skip", {
        votee: "SkipVote",
        voter: this.userInfo.name,
      });
      this.helpMessage = "";
      this.actionPrompt = "You skipped vote";
    },
    voteDone() {
      var leftAlive = this.userList.filter((obj) => obj.life === true).length;
      console.log(this.voteResults);
      this.socket.emit("vote-complete", {
        living: leftAlive,
        votes: this.voteResults,
      });
    },
    // civRound() {
    //   this.socket.emit("round", "citizen");
    // },
    skipPoliceSearch() {
      this.socket.emit("search", "SkipVote");
    },
    checkHealth() {
      var health = this.userList.find((x) => x.name === this.userName);
      if (health.life !== true) {
        this.deathmessage = "YOU DIED";
      }
    },
    clearPrompt() {
      this.promptMessage = "Instructions Here";
    },
    clearHelp() {
      this.helpMessage = "";
    },
    changeToNight() {
      this.change("night");
    },
    changeToDay() {
      this.change("day");
      console.log("day");
    },
    startTimer() {
      this.timer = this.settings.timer;
      this.countdown();
    },
    countdown() {
      if (this.timer > -1) {
        this.timerVar = setTimeout(() => {
          this.timer -= 1;
          this.countdown();
        }, 1000);
      } else if (this.timer === -1) {
        this.timer = this.settings.timer;
        this.voteSkip();
      }
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
