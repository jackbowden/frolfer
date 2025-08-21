var nextId = 0;

function Player(name) {
	this.name = name;

	this.points = new Array(18);
	for (var i = 0; i < this.points.length; i++) {
		this.points[i] = 0;
	}

	this.id = nextId;
	nextId++;
}

const app = new Vue({
	el: "#app",
	data: {
		holeInfo: holeInfo,
		hole: 1,
		players: [],
		name: "",
		gameStarted: false,
		showInstructions: false,
		showImages: true
	},
	methods: {
		startGame: function() {
			this.gameStarted = true;
		},

		closeInstructions: function() {
			this.showInstructions = false;
		},

		toggleImages: function() {
			this.showImages = true;
		},

		toggleMap: function() {
			this.showImages = false;
		},

		incHole: function() {
			if (this.hole < 18) {
				this.hole++;
			}
		},

		decHole: function() {
			if (this.hole > 1) {
				this.hole--;
			}
		},

		total: function(player) {
			var sum = 0;
			for (var i = 0; i < player.points.length; i++) {
				sum += player.points[i];
			}
			return sum;
		},

		addPlayer: function(name) {
			if (name != "") {
				this.players.push(new Player(name));
			}
			this.name = "";
		},

		removePlayer: function(player) {
			for (var i = 0; i < this.players.length; i++) {
				if (this.players[i].id == player.id) {
					this.$delete(this.players, i);
					return;
				}
			}
		},
		
		incPoints: function(player, hole) {
			this.$set(player.points, hole - 1, player.points[hole - 1] + 1)
		},
		
		decPoints: function(player, hole) {
			this.$set(player.points, hole - 1, player.points[hole - 1] - 1)
		}
	}
});