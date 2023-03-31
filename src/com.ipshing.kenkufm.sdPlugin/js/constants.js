/**
 * Enum of events used by the KenkuFM class
 * @readonly
 * @enum {string}
 */
const KenkuEvents = Object.freeze({
    playlistPlaybackChanged: "playlistPlaybackChanged",
    soundboardPlaybackChanged: "soundboardPlaybackChanged",
    playbackPlayingChanged: "playbackPlayingChanged",
    playbackRepeatChanged: "playbackRepeatChanged",
    playbackShuffleChanged: "playbackShuffleChanged",
    playbackMuteChanged: "playbackMuteChanged",
    playbackVolumeChanged: "playbackVolumeChanged"
});

/**
 * An enum connecting playback states to KenkuEvents
 * @readonly
 * @enum {string}
 */
const StateEvents = Object.freeze({
    playing: KenkuEvents.playbackPlayingChanged,
    repeat: KenkuEvents.playbackRepeatChanged,
    shuffle: KenkuEvents.playbackShuffleChanged,
    muted: KenkuEvents.playbackMuteChanged,
    volume: KenkuEvents.playbackVolumeChanged
});

/**
 * An enum of commands paths to send to the Kenku player
 * @readonly
 * @enum {string}
 */
const KenkuCommands = Object.freeze({
    playlistPlay: "playlist/play",
    soundboardPlay: "soundboard/play",
    soundboardStop: "soundboard/stop",
    playlistState: "playlist/playback",
    soundboardState: "soundboard/playback",
    playbackPlay: "playlist/playback/play",
    playbackPause: "playlist/playback/pause",
    playbackNext: "playlist/playback/next",
    playbackPrevious: "playlist/playback/previous",
    playbackMute: "playlist/playback/mute",
    playbackVolume: "playlist/playback/volume",
    playbackShuffle: "playlist/playback/shuffle",
    playbackRepeat: "playlist/playback/repeat"
});

/**
 * An enum of action UUIDs for the plugin
 * @readonly
 * @enum {string}
 */
const Actions = Object.freeze({
    // This list should match the list of actions in manifest.json
    playlist: "com.ipshing.kenkufm.playlist",
    soundboard: "com.ipshing.kenkufm.soundboard",
    playback: "com.ipshing.kenkufm.playback",
    previous: "com.ipshing.kenkufm.previous",
    next: "com.ipshing.kenkufm.next",
    shuffle: "com.ipshing.kenkufm.shuffle",
    repeat: "com.ipshing.kenkufm.repeat",
    volumeDown: "com.ipshing.kenkufm.volume-down",
    volumeUp: "com.ipshing.kenkufm.volume-up",
    mute: "com.ipshing.kenkufm.mute",
});

/**
 * An enum representing the states used by various plugin actions
 * @readonly
 * @enum {number}
 */
const States = Object.freeze({
    // These should match the order of the states for the 
    // corresponding action in manifest.json
    soundboardPlay: 0,
    soundboardStop: 1,
    playbackPlay: 0,
    playbackPause: 1,
    muteOff: 0,
    muteOn: 1,
    shuffleOff: 0,
    shuffleOn: 1,
    repeatOff: 0,
    repeatPlaylist: 1,
    repeatTrack: 2,
});
