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
	<!-- white outline for contrast -->
	<path d="M12 4C7 4 3.4 7.6 3.4 12.6c0 6.9 8.6 20.8 8.6 20.8s8.6-13.9 8.6-20.8C20.6 7.6 17 4 12 4z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
	<!-- inner white circle with subtle dark ring -->
	<circle cx="12" cy="12.6" r="4" fill="#ffffff" stroke="#444" stroke-width="1"/>
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
		coordinates: coordinates,
		showLeaderboard: false,
		leaderboard: {
			holeRecords: [], // best score for each hole
			courseRecords: [], // best total scores
			holeInOnes: [] // hole-in-one achievements
		},
		newRecords: [] // track new records this session
	},
	methods: {
		startGame: function() {
			this.gameStarted = true;
			this.loadLeaderboard();
			// initialize map once the game UI is visible
			this.$nextTick(() => {
				this.initMap();
			});
		},

		loadLeaderboard: function() {
			try {
				const saved = localStorage.getItem('frolfer-leaderboard');
				if (saved) {
					this.leaderboard = JSON.parse(saved);
				}
				// Initialize if empty
				if (!this.leaderboard.holeRecords.length) {
					this.leaderboard.holeRecords = new Array(18).fill(null).map(() => null);
				}
			} catch (e) {
				console.warn('Could not load leaderboard:', e);
			}
		},

		saveLeaderboard: function() {
			try {
				localStorage.setItem('frolfer-leaderboard', JSON.stringify(this.leaderboard));
			} catch (e) {
				console.warn('Could not save leaderboard:', e);
			}
		},

		toggleLeaderboard: function() {
			this.showLeaderboard = !this.showLeaderboard;
		},

		checkForRecords: function(player, specificHole = null) {
			const newRecords = [];
			
			// If specificHole is provided, only check that hole
			// Otherwise check all holes (for course completion)
			if (specificHole) {
				const holeIndex = specificHole - 1;
				const score = player.points[holeIndex];
				
				if (score > 0) {
					const currentRecord = this.leaderboard.holeRecords[holeIndex];
					if (!currentRecord || score < currentRecord.score) {
						this.leaderboard.holeRecords[holeIndex] = {
							player: player.name,
							score: score,
							date: new Date().toLocaleDateString()
						};
						newRecords.push(`Hole ${specificHole} record: ${score} throws!`);
						
						// Check for hole-in-one
						if (score === 1) {
							this.leaderboard.holeInOnes.push({
								player: player.name,
								hole: specificHole,
								date: new Date().toLocaleDateString()
							});
							newRecords.push(`🎯 HOLE-IN-ONE on Hole ${specificHole}!`);
						}
					}
				}
			} else {
				// Check hole records for all holes
				for (let i = 0; i < 18; i++) {
					const score = player.points[i];
					if (score > 0) {
						const currentRecord = this.leaderboard.holeRecords[i];
						if (!currentRecord || score < currentRecord.score) {
							this.leaderboard.holeRecords[i] = {
								player: player.name,
								score: score,
								date: new Date().toLocaleDateString()
							};
							newRecords.push(`Hole ${i + 1} record: ${score} throws!`);
							
							// Check for hole-in-one
							if (score === 1) {
								this.leaderboard.holeInOnes.push({
									player: player.name,
									hole: i + 1,
									date: new Date().toLocaleDateString()
								});
								newRecords.push(`🎯 HOLE-IN-ONE on Hole ${i + 1}!`);
							}
						}
					}
				}
			}
			
			// Check course record (if all holes played)
			const totalScore = this.total(player);
			const holesPlayed = player.points.filter(p => p > 0).length;
			if (holesPlayed === 18 && !specificHole) {
				const currentCourseRecord = this.leaderboard.courseRecords.length > 0 ? 
					Math.min(...this.leaderboard.courseRecords.map(r => r.score)) : Infinity;
				
				if (totalScore < currentCourseRecord) {
					this.leaderboard.courseRecords.unshift({
						player: player.name,
						score: totalScore,
						date: new Date().toLocaleDateString()
					});
					// Keep only top 10 course records
					this.leaderboard.courseRecords = this.leaderboard.courseRecords.slice(0, 10);
					newRecords.push(`🏆 NEW COURSE RECORD: ${totalScore} total throws!`);
				}
			}
			
			if (newRecords.length > 0) {
				this.newRecords = this.newRecords.concat(newRecords);
				this.saveLeaderboard();
				// Clear new records after 10 seconds
				setTimeout(() => {
					this.newRecords = [];
				}, 10000);
			}
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
					iconSize: [32, 52],
					iconAnchor: [16, 36], // anchor near the pin tip within the SVG
					popupAnchor: [0, -30]
				});
				this.finishIcon = L.icon({
					iconUrl: pinSvgDataUrl('#e74c3c'), // red
					iconSize: [32, 52],
					iconAnchor: [16, 36],
					popupAnchor: [0, -30]
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
					// add a permanent label above the pin
					try {
						marker.bindTooltip(coord.name, {
							permanent: true,
							direction: 'top',
							offset: [0, -34],
							className: 'marker-label'
						}).openTooltip();
					} catch (e) {}
					this.markers.push(marker);
					bounds.push([coord.lat, coord.lon]);
				});
				try { this.map.fitBounds(bounds, { padding: [50, 50] }); } catch (e) {}
			}
		},

		incHole: function() {
			if (this.hole < 18) {
				// Check for records on the hole we're leaving
				this.players.forEach(player => {
					this.checkForRecords(player, this.hole);
				});
				
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