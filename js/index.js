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
		hole: 1,
		players: [],
		name: ""
	},
	methods: {
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
					this.players.splice(i, 1);
				}
			}
		}
	}
});

var toggleImagesButton = document.getElementById("toggle-images-button");
var toggleMapButton = document.getElementById("toggle-map-button");
var imageView = document.getElementById("images");
var mapView = document.getElementById("map");

toggleImagesButton.onclick = function() {
	toggleImagesButton.className = "active";
	toggleMapButton.className = "";
	imageView.style.display = "block";
	mapView.style.display = "none";
};

toggleMapButton.onclick = function() {
	toggleMapButton.className = "active";
	toggleImagesButton.className = "";
	mapView.style.display = "block";
	imageView.style.display = "none";
};