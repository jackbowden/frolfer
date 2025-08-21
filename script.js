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

// returns a data URL for a simple SVG map-pin colored with `color`
function pinSvgDataUrl(color) {
		const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 48">
	<path d="M12 4C7 4 3.4 7.6 3.4 12.6c0 6.9 8.6 20.8 8.6 20.8s8.6-13.9 8.6-20.8C20.6 7.6 17 4 12 4z" fill="${color}"/>
	<circle cx="12" cy="12.6" r="3.5" fill="#ffffff"/>
</svg>`;
		return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
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
		showImages: true,
		map: null,
		markers: [],
		coordinates: coordinates
	},
	methods: {
		startGame: function() {
			this.gameStarted = true;
			// initialize map once the game UI is visible
			this.$nextTick(() => {
				this.initMap();
			});
		},

		closeInstructions: function() {
			this.showInstructions = false;
		},

		toggleImages: function() {
			this.showImages = true;
		},

		toggleMap: function() {
			this.showImages = false;
			// after DOM updates, ensure the map is created and sized correctly
			this.$nextTick(() => {
				this.initMap();
				if (this.map) {
					// allow browser to paint then invalidate size so Leaflet draws tiles/controls
					setTimeout(() => {
						this.map.invalidateSize();
						this.updateMap();
					}, 150);
				}
			});
		},

		initMap: function() {
			// create map only once and reuse it
			if (!this.map) {
				this.map = L.map('map').setView([37.270, -76.712], 15);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				}).addTo(this.map);
				// prepare custom pin icons
				// Adjust iconAnchor so the visible pin tip (not the viewBox bottom) is used
				this.startIcon = L.icon({
					iconUrl: pinSvgDataUrl('#2ecc71'), // green
					iconSize: [24, 39],
					iconAnchor: [12, 24], // anchor near the pin tip within the SVG
					popupAnchor: [0, -22]
				});
				this.finishIcon = L.icon({
					iconUrl: pinSvgDataUrl('#e74c3c'), // red
					iconSize: [24, 39],
					iconAnchor: [12, 24],
					popupAnchor: [0, -22]
				});
			}
			// ensure correct sizing in case container was hidden
			setTimeout(() => {
				if (this.map) this.map.invalidateSize();
			}, 100);
			this.updateMap();
		},

		updateMap: function() {
			if (!this.map) return;

			// remove previous markers we created
			this.markers.forEach(m => {
				try { this.map.removeLayer(m); } catch (e) {}
			});
			this.markers = [];

			const holeCoordinates = this.coordinates.filter(c => c.name.startsWith('Hole ' + this.hole + ' '));

			if (holeCoordinates.length > 0) {
				const bounds = [];
				holeCoordinates.forEach(coord => {
					let marker;
					const lname = (coord.name || '').toLowerCase();
					if (lname.includes('start')) {
						marker = L.marker([coord.lat, coord.lon], { icon: this.startIcon }).addTo(this.map);
					} else if (lname.includes('finish')) {
						marker = L.marker([coord.lat, coord.lon], { icon: this.finishIcon }).addTo(this.map);
					} else {
						marker = L.marker([coord.lat, coord.lon]).addTo(this.map);
					}
					marker.bindPopup('<b>' + coord.name + '</b><br>' + (coord.description || '') );
					this.markers.push(marker);
					bounds.push([coord.lat, coord.lon]);
				});
				try { this.map.fitBounds(bounds, { padding: [50, 50] }); } catch (e) {}
			}
		},

		incHole: function() {
			if (this.hole < 18) {
				this.hole++;
				if (!this.showImages && this.map) {
					this.updateMap();
				}
			}
		},

		decHole: function() {
			if (this.hole > 1) {
				this.hole--;
				if (!this.showImages && this.map) {
					this.updateMap();
				}
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