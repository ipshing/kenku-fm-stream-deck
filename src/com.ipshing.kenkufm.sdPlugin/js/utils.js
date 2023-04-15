/// <reference path="constants.js" />

// Referenced from https://spicyyoghurt.com/tools/easing-functions
/**
 * Calculates the next value in a sequence using a quadratic easing formula.
 * @param {Number} initialValue The value at the start of the transition. This typically does not change.
 * @param {Number} finalValue The value to reach by the end of the transition. This typically does not change.
 * @param {Number} totalDuration The amount of time (in milliseconds) the transition should take. This typically does not change.
 * @param {Number} elapsedTime How much time (in milliseconds) has passed since the start of the transition.
 * @returns {Number} The next value in the sequence.
 */
function easeInOutQuad(initialValue, finalValue, totalDuration, elapsedTime) {
    const delta = finalValue - initialValue;
    if ((elapsedTime /= totalDuration / 2) < 1) return (delta / 2) * elapsedTime * elapsedTime + initialValue;
    return (-delta / 2) * (--elapsedTime * (elapsedTime - 2) - 1) + initialValue;
}
/**
 * Calculates the next value in a sequence using a cubic easing formula.
 * @param {Number} initialValue The value at the start of the transition. This typically does not change.
 * @param {Number} finalValue The value to reach by the end of the transition. This typically does not change.
 * @param {Number} totalDuration The amount of time (in milliseconds) the transition should take. This typically does not change.
 * @param {Number} elapsedTime How much time (in milliseconds) has passed since the start of the transition.
 * @returns {Number} The next value in the sequence.
 */
function easeInOutCubic(initialValue, finalValue, totalDuration, elapsedTime) {
    const delta = finalValue - initialValue;
    if ((elapsedTime /= totalDuration / 2) < 1) return (delta / 2) * elapsedTime * elapsedTime * elapsedTime + initialValue;
    return (delta / 2) * ((elapsedTime -= 2) * elapsedTime * elapsedTime + 2) + initialValue;
}

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
        case Actions.volumeSet:
        case Actions.volumeFade:
            throw Error("This action does not have multiple states to manage");
        default:
            throw Error("Unrecognized action");
    }
}
