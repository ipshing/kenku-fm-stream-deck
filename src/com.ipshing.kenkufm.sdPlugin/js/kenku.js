/// <reference path="circuit-breaker.js"/>
/// <reference path="constants.js"/>
/// <reference path="../sdk/js/events.js"/>

/**
 * @class KenkuFM
 * This class is used to communicate with the Kenku.FM player.
 */
class KenkuFM {
    #breaker = undefined;
    #intervalId = undefined;
    #intervalTimeout = 1000; // milliseconds
    #state = {
        playing: false,
        repeat: "off",
        shuffle: false,
        muted: false,
        volume: 0
    };
    #sounds = new Set();

    remoteAddress = "127.0.0.1";
    remotePort = "3333";

    // Piggyback off the ELGEvents functionality
    on = EventEmitter.on;
    emit = EventEmitter.emit;

    get isPlaying() {
        return this.#state.playing;
    }
    get repeatMode() {
        return this.#state.repeat;
    }
    get isShuffled() {
        return this.#state.shuffle;
    }
    get isMuted() {
        return this.#state.muted;
    }
    get volume() {
        return this.#state.volume;
    }
    get sounds() {
        return this.#sounds;
    }

    /**
     * Sends a request to the Kenku FM player.
     * @param {string} path
     * @param {("GET"|"POST"|"PUT")} method
     * @param {any} body
     * @param {string} version
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async send(path, method = "GET", body = {}, version = "v1") {
        const response = await fetch(
            `http://${this.remoteAddress}:${this.remotePort}/${version}/${path}`,
            {
                method: method,
                body: method === "GET" ? undefined : JSON.stringify(body),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        if (!response.ok) throw Error(response.statusText);
        const json = await response.json();
        return json;
    }

    /**
     * Starts polling the playback api for changes to playlist or soundboard playback
     */
    startPlaybackPolling() {
        // Initialize circuit breaker
        if (!this.#breaker) {
            this.#initializeBreaker();
        }
        // Stop any existing polling
        if (this.#intervalId) {
            this.stopPlaybackPolling();
        }
        // Start a new interval to poll the player
        this.#intervalId = setInterval(async () => {
            await this.#updateKenkuStates();
        }, this.#intervalTimeout);
    }

    /**
     * Stops polling the playback api for changes to playlist or soundboard playback
     */
    stopPlaybackPolling() {
        clearInterval(this.#intervalId);
    }

    #initializeBreaker() {
        // Define the request to be made when polling the player
        const request = async () => {
            // Gets the current playlist playback state
            const playlist = await this.send(KenkuCommands.playlistState);
            // Gets a list of all sounds currently playing
            const soundboard = await this.send(KenkuCommands.soundboardState);
            return {
                playlist,
                soundboard,
            };
        };
        // Initialize the circuit breaker with the request
        this.#breaker = new CircuitBreaker(request);
    }

    async #updateKenkuStates() {
        try {
            // Initialize circuit breaker
            if (!this.#breaker) {
                this.#initializeBreaker();
            }

            // Poll the player to get the states
            const result = await this.#breaker.fire();
            if (result && result.playlist && result.soundboard) {
                // Go through each playback state and compare to cached,
                // triggering events as necessary
                for (let key of Object.keys(this.#state)) {
                    if (this.#state[key] !== result.playlist[key]) {
                        // Save old value
                        const oldValue = this.#state[key];
                        // Update #state
                        this.#state[key] = result.playlist[key];
                        // Trigger event handler
                        this.emit(StateEvents[key], {
                            oldValue: oldValue,
                            newValue: result.playlist[key]
                        });
                    }
                }

                // Get ID's from soundboard results
                const soundIds = new Set(result.soundboard.sounds.map((sound) => sound.id));
                let soundboardStateDirty = false;
                // Remove any sounds not in the results
                this.#sounds.forEach((id) => {
                    if (!soundIds.has(id)) {
                        soundboardStateDirty = true;
                        this.#sounds.delete(id);
                    }
                });
                // Add any sounds from the results not cached
                soundIds.forEach((id) => {
                    if (!this.#sounds.has(id)) {
                        soundboardStateDirty = true;
                        this.#sounds.add(id);
                    }
                });
                // Trigger soundboardPlaybackChanged event if changes were made
                if (soundboardStateDirty) {
                    this.emit(KenkuEvents.soundboardPlaybackChanged, this.#sounds)
                }
            }
        } catch { }
    }

    /**
     * Plays a playlist or track by its ID in the Kenku FM player.
     * @param {string} id 
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async startPlaylist(id) {
        const response = await this.send(KenkuCommands.playlistPlay, "PUT", {
            id: id
        });

        // Update playback state
        if (!this.#state.playing) {
            this.#state.playing = true;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackPlayingChanged, {
                oldValue: false,
                newValue: true
            });
        }

        return response;
    }

    /**
     * Plays a soundboard or sound by its ID in the Kenku FM player.
     * @param {string} id 
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async startSoundboard(id) {
        const response = await this.send(KenkuCommands.soundboardPlay, "PUT", {
            id: id,
        });

        // Add to the #sounds list
        if (!this.#sounds.has(id)) {
            this.#sounds.add(id)
            // Trigger event handlers
            this.emit(KenkuEvents.soundboardPlaybackChanged, this.#sounds);
        }

        return response;
    }

    /**
     * Stops a soundboard or sound by its ID in the Kenku FM player.
     * @param {string} id 
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async stopSoundboard(id) {
        const response = await this.send(KenkuCommands.soundboardStop, "PUT", {
            id: id,
        });

        // Remove from the #sounds list
        if (this.#sounds.has(id)) {
            this.#sounds.delete(id);
            // Trigger event handlers
            this.emit(KenkuEvents.soundboardPlaybackChanged, this.#sounds);
        }

        return response;
    }

    /**
     * Start or resume playback in the Kenku player.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async play() {
        const response = await this.send(KenkuCommands.playbackPlay, "PUT");

        // Update playback state
        if (!this.#state.playing) {
            this.#state.playing = true;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackPlayingChanged, {
                oldValue: false,
                newValue: true
            });
        }

        return response;
    }

    /**
     * Pause playback of any playing track in the Kenku player.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async pause() {
        const response = await this.send(KenkuCommands.playbackPause, "PUT");

        // Update playback state
        if (this.#state.playing) {
            this.#state.playing = false;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackPlayingChanged, {
                oldValue: true,
                newValue: false
            });
        }

        return response;
    }

    /**
     * Play the next track in the playlist in the Kenku player.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async playNext() {
        const response = await this.send(KenkuCommands.playbackNext, "POST");

        // Update playback state
        if (!this.#state.playing) {
            this.#state.playing = true;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackPlayingChanged, {
                oldValue: false,
                newValue: true
            });
        }

        return response;
    }

    /**
     * Play the previous track in the playlist in the Kenku player.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async playPrevious() {
        const response = await this.send(KenkuCommands.playbackPrevious, "POST");

        // Update playback state
        if (!this.#state.playing) {
            this.#state.playing = true;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackPlayingChanged, {
                oldValue: false,
                newValue: true
            });
        }

        return response;
    }

    /**
     * Mute/unmute playback in the Kenku player.
     * @param {Boolean} shouldMute True if the player should be muted; otherwise false.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async mute(shouldMute) {
        const response = await this.send(KenkuCommands.playbackMute, "PUT", {
            mute: shouldMute
        });

        // Update mute state
        if (this.#state.muted != shouldMute) {
            this.#state.muted = shouldMute;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackMuteChanged, {
                oldValue: !shouldMute,
                newValue: shouldMute
            });
        }

        return response;
    }

    /**
     * Set the volume in the Kenku player.
     * @param {Number} newVolume A value from 0 to 1 (inclusive) representing the desired volume.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async setVolume(newVolume) {
        // Validate
        if (newVolume < 0) {
            newVolume = 0;
        }
        else if (newVolume > 1) {
            newVolume = 1;
        }
        // Send command
        const response = await this.send(KenkuCommands.playbackVolume, "PUT", {
            volume: newVolume
        });

        // Update volume state
        if (this.#state.volume != newVolume) {
            const oldVolume = this.#state.volume;
            this.#state.volume = newVolume;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackVolumeChanged, {
                oldValue: oldVolume,
                newValue: newVolume
            });
        }

        return response;
    }

    /**
     * Shuffle the current playlist in the Kenku player.
     * @param {Boolean} shouldShuffle True if the current playlist should be shuffled; otherwise false.
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async shuffle(shouldShuffle) {
        const response = await this.send(KenkuCommands.playbackShuffle, "PUT", {
            shuffle: shouldShuffle
        });

        // Update shuffle state
        if (this.#state.shuffle != shouldShuffle) {
            this.#state.shuffle = shouldShuffle;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackShuffleChanged, {
                oldValue: !shouldShuffle,
                newValue: shouldShuffle
            });
        }

        return response;
    }

    /**
     * Set the repeat mode of the current playlist in the Kenku player.
     * @param {("off" | "playlist" | "track")} mode The mode to use; either "off", "playlist", or "track".
     * @returns {Promise<Response>} The api response
     * @throws {Error} Throws an error when the response is not ok
     */
    async setRepeatMode(mode) {
        // Save old mode
        const oldMode = this.#state.repeat;

        // Send command
        const response = await this.send(KenkuCommands.playbackRepeat, "PUT", {
            repeat: mode
        });

        // Update repeat state if successful
        if (oldMode != mode) {
            this.#state.repeat = mode;
            // Trigger event handlers
            this.emit(KenkuEvents.playbackRepeatChanged, {
                oldValue: oldMode,
                newValue: mode
            });
        }

        return response;
    }

    /**
     * Registers a callback function for when the playback state has been changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onPlaybackPlayingChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.playbackPlayingChanged} event is required for onPlaybackPlayingChanged.`
            );
        }

        this.on(KenkuEvents.playbackPlayingChanged, (jsn) => fn(jsn));
        return this;
    }

    /**
     * Registers a callback function for when the repeat state has been changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onPlaybackRepeatChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.playbackRepeatChanged} event is required for onPlaybackRepeatChanged.`
            );
        }

        this.on(KenkuEvents.playbackRepeatChanged, (jsn) => fn(jsn));
        return this;
    }

    /**
     * Registers a callback function for when the shuffle state has been changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onPlaybackShuffleChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.playbackShuffleChanged} event is required for onPlaybackShuffleChanged.`
            );
        }

        this.on(KenkuEvents.playbackShuffleChanged, (jsn) => fn(jsn));
        return this;
    }

    /**
     * Registers a callback function for when the mute state has been changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onPlaybackMuteChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.playbackMuteChanged} event is required for onPlaybackMuteChanged.`
            );
        }

        this.on(KenkuEvents.playbackMuteChanged, (jsn) => fn(jsn));
        return this;
    }

    /**
     * Registers a callback function for when the volume state has been changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onPlaybackVolumeChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.playbackVolumeChanged} event is required for onPlaybackVolumeChanged.`
            );
        }

        this.on(KenkuEvents.playbackVolumeChanged, (jsn) => fn(jsn));
        return this;
    }

    /**
     * Registers a callback function for when the list of currently playing sounds has changed.
     * @param {function} fn 
     * @returns KenkuFM
     */
    onSoundboardPlaybackChanged(fn) {
        if (!fn) {
            console.error(
                `A callback function for the ${KenkuEvents.soundboardPlaybackChanged} event is required for onSoundboardPlaybackChanged.`
            );
        }

        this.on(KenkuEvents.soundboardPlaybackChanged, (jsn) => fn(jsn));
        return this;
    }
}