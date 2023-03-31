/// <reference path="constants.js" />

/**
 * 
 * @param {string} context A string that identifies the specific instance of the action.
 * @param {string} action A string representing the UUID of the action (as defined in the manifest.json file).
 * @param {object} [settings] Optional. Any settings related to the action that will be used in setting the state.
 */
function setActionState(context, action, settings) {
    switch (action) {
        case Actions.soundboard:
            if (!settings || !settings.id) {
                throw Error("The soundboard id is required");
            }
            // Set the action state to the opposite of the soundboard state
            $SD.setState(context, $Kenku.sounds.has(settings.id) ? States.soundboardStop : States.soundboardPlay);
            break;
        case Actions.playback:
            // Set the action state to the opposite of the playback state
            $SD.setState(context, $Kenku.isPlaying ? States.playbackPause : States.playbackPlay);
            break;
        case Actions.shuffle:
            // Set the action state to match the player's shuffle state
            $SD.setState(context, $Kenku.isShuffled ? States.shuffleOn : States.shuffleOff);
            break;
        case Actions.repeat:
            // Set the action state to match the player's repeat mode
            switch ($Kenku.repeatMode) {
                case "off":
                    $SD.setState(context, States.repeatOff);
                    break;
                case "playlist":
                    $SD.setState(context, States.repeatPlaylist);
                    break;
                case "track":
                    $SD.setState(context, States.repeatTrack);
                    break;
            }
            break;
        case Actions.mute:
            // Set the action state to match the player's mute state
            $SD.setState(context, $Kenku.isMuted ? States.muteOn : States.muteOff);
            break;
        case Actions.playlist:
        case Actions.previous:
        case Actions.next:
        case Actions.volumeDown:
        case Actions.volumeUp:
            throw Error("This action does not have multiple states to manage");
        default:
            throw Error("Unrecognized action");
    }
}