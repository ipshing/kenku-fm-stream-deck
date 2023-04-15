/// <reference path="sdk/js/action.js" />
/// <reference path="sdk/js/stream-deck.js" />
/// <reference path="js/kenku.js" />
/// <reference path="js/constants.js" />
/// <reference path="js/utils.js" />

const $Kenku = new KenkuFM();

/**
 * A mapping of contexts to the action UUID and any settings
 * @type Record<string, {uuid: string, settings: {}}>
 */
const visibleActions = {};

// Define actions
const playlistAction = new Action(Actions.playlist);
const soundboardAction = new Action(Actions.soundboard);
const playbackAction = new Action(Actions.playback);
const previousAction = new Action(Actions.previous);
const nextAction = new Action(Actions.next);
const shuffleAction = new Action(Actions.shuffle);
const repeatAction = new Action(Actions.repeat);
const volumeDownAction = new Action(Actions.volumeDown);
const volumeUpAction = new Action(Actions.volumeUp);
const volumeSetAction = new Action(Actions.volumeSet);
const volumeFadeAction = new Action(Actions.volumeFade);
const muteAction = new Action(Actions.mute);

/**
 * The first event fired when Stream Deck starts
 */
$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
    $SD.logMessage("Stream Deck connected!");
    // Request global settings
    $SD.logMessage("Requesting global settings");
    $SD.getGlobalSettings();

    $Kenku.startPlaybackPolling();

    // Actions with multiple states need to be tracked so their
    // states can be updated when the player states change.
    // Also track volume up/down actions to display current level.
    for (const action of [soundboardAction, playbackAction, shuffleAction, repeatAction, muteAction, volumeUpAction, volumeDownAction]) {
        action.onDidReceiveSettings(({ action, context, device, event, payload }) => {
            const { settings, isInMultiAction } = payload;
            // Only track the action if it's not in a multi-action
            if (!isInMultiAction) {
                visibleActions[context] = { uuid: action, settings: settings };
                // Update the action state to match the current state of the player
                if ([Actions.soundboard, Actions.playback, Actions.shuffle, Actions.repeat, Actions.mute].includes(action)) {
                    setActionState(context, action, settings);
                }
                // Update title for volume up/down actions
                if ([Actions.volumeUp, Actions.volumeDown].includes(action)) {
                    let title = "";
                    if (settings.setTitle !== undefined) {
                        title = `${Math.round($Kenku.volume * 100)}%`;
                    }
                    $SD.setTitle(context, title);
                }
            }
        });
        action.onWillAppear(({ action, context, device, event, payload }) => {
            const { settings, isInMultiAction } = payload;
            // Only track the action if it's not in a multi-action
            if (!isInMultiAction) {
                visibleActions[context] = { uuid: action, settings: settings };
                // Update the action state to match the current state of the player
                if ([Actions.soundboard, Actions.playback, Actions.shuffle, Actions.repeat, Actions.mute].includes(action)) {
                    setActionState(context, action, settings);
                }
                // Update title for volume up/down actions
                if ([Actions.volumeUp, Actions.volumeDown].includes(action)) {
                    let title = "";
                    if (settings.setTitle !== undefined) {
                        title = `${Math.round($Kenku.volume * 100)}%`;
                    }
                    $SD.setTitle(context, title);
                }
            }
        });
        action.onWillDisappear(({ action, context, device, event, payload }) => {
            // Stop tracking if the action is no longer visible
            delete visibleActions[context];
        });
    }
});
$SD.onDidReceiveGlobalSettings(({ payload }) => {
    const { settings } = payload;

    let logMsg = "Global Settings for plugin received;";
    // Check for existing values
    if (Object.keys(settings).length === 0) {
        // Set using default values
        $SD.setGlobalSettings({
            address: $Kenku.remoteAddress,
            port: $Kenku.remotePort,
        });
        $SD.logMessage(`${logMsg} using default values`);
    }
    // Load received values into $Kenku properties
    else {
        $Kenku.remoteAddress = settings.address;
        $Kenku.remotePort = settings.port;
        $SD.logMessage(`${logMsg} loading saved values`);
    }
});

//
// PLAYLIST EVENTS
//
playlistAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings } = payload;
    try {
        await $Kenku.startPlaylist(settings.id);
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing playlist ${settings.id}: ${e}`);
    }
});

//
// SOUNDBOARD EVENTS
//
soundboardAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings, state, userDesiredState, isInMultiAction } = payload;
    try {
        let currentState = state;
        // If this is in a multi-action, use the desired state instead
        if (isInMultiAction) {
            currentState = userDesiredState;
        }

        // Send the appropriate command based on the state
        if (currentState === States.soundboardPlay) {
            // Start the playback
            await $Kenku.startSoundboard(settings.id);
        } else if (currentState === States.soundboardStop) {
            // Stop the playback
            await $Kenku.stopSoundboard(settings.id);
        } else {
            // Shouldn't happen, but throw an error
            throw new Error("Unknown state");
        }
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing/stopping sound: ${e}`);
    }
});
$Kenku.onSoundboardPlaybackChanged((sounds) => {
    // Get all soundboard actions and update their states
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.soundboard) {
            setActionState(context, action.uuid, action.settings);
        }
    }
});

//
// PLAY/PAUSE EVENTS
//
playbackAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings, state, userDesiredState, isInMultiAction } = payload;
    try {
        let currentState = state;
        // If this is in a multi-action, use the desired state instead
        if (isInMultiAction) {
            currentState = userDesiredState;
        }

        // Send the appropriate command based on the state
        if (currentState === States.playbackPlay) {
            // Start the playback
            await $Kenku.play();
        } else if (currentState === States.playbackPause) {
            // Stop the playback
            await $Kenku.pause();
        } else {
            // Shouldn't happen, but throw an error
            throw new Error("Unknown state");
        }
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing/pausing playback: ${e}`);
    }
});
$Kenku.onPlaybackPlayingChanged(() => {
    // Get all playback actions and update their states
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.playback) {
            setActionState(context, action.uuid);
        }
    }
});

//
// PREVIOUS/NEXT EVENTS
//
previousAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    try {
        await $Kenku.playPrevious();
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing previous track: ${e}`);
    }
});
nextAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    try {
        await $Kenku.playNext();
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing next track: ${e}`);
    }
});

//
// SHUFFLE EVENTS
//
shuffleAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings, state, userDesiredState, isInMultiAction } = payload;
    try {
        // Since this key should show the active state of the player,
        // the command sent needs to be the *opposite* of the currentState
        // UNLESS this is in a multi-action, in which case the
        // desired state should be used without swapping.

        // Easy way to take the opposite state while still keeping the value 0 or 1
        let newState = Number(!state);
        // If this is in a multi-action, use the desired state instead
        if (isInMultiAction) {
            newState = userDesiredState;
        }

        // Send the appropriate command based on the state
        if (newState === States.shuffleOff) {
            // Turn off shuffle
            await $Kenku.shuffle(false);
        } else if (newState === States.shuffleOn) {
            // Turn on shuffle
            await $Kenku.shuffle(true);
        } else {
            // Shouldn't happen, but throw an error
            throw new Error("Unknown state");
        }
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error toggling shuffle: ${e}`);
    }
});
$Kenku.onPlaybackShuffleChanged(() => {
    // Get all shuffle actions and update their states
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.shuffle) {
            setActionState(context, action.uuid);
        }
    }
});

//
// REPEAT EVENTS
//
repeatAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings, state, userDesiredState, isInMultiAction } = payload;
    try {
        // Since this key should show the active state of the player,
        // the command sent needs to be 1 ahead of the currentState
        // UNLESS this is in a multi-action, in which case the
        // desired state should be used without swapping.

        let newState = state + 1;
        if (newState > States.repeatTrack) {
            newState = States.repeatOff;
        }

        // If this is in a multi-action, use the desired state instead
        if (isInMultiAction) {
            newState = userDesiredState;
        }

        // Send the appropriate command based on the state
        if (newState === States.repeatOff) {
            // Turn off repeat
            await $Kenku.setRepeatMode("off");
        } else if (newState === States.repeatPlaylist) {
            // Set repeat to playlist
            await $Kenku.setRepeatMode("playlist");
        } else if (newState === States.repeatTrack) {
            // Set repeat to track
            await $Kenku.setRepeatMode("track");
        } else {
            // Shouldn't happen, but throw an error
            throw new Error("Unknown state");
        }
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error setting repeat mode: ${e}`);
    }
});
$Kenku.onPlaybackRepeatChanged((payload) => {
    // Get all repeat actions and update their states
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.repeat) {
            setActionState(context, action.uuid);
        }
    }
});

//
// VOLUME EVENTS
//
volumeDownAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    try {
        // Get current volume and decrease by 0.05 (minimum 0)
        let volume = $Kenku.volume - 0.05;
        if (volume < 0) {
            volume = 0;
        }
        await $Kenku.mute(false);
        await $Kenku.setVolume(volume);
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing previous track: ${e}`);
    }
});
volumeUpAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    try {
        // Get current volume and increase by 0.05 (maximum 1)
        let volume = $Kenku.volume + 0.05;
        if (volume > 1) {
            volume = 1;
        }
        await $Kenku.mute(false);
        await $Kenku.setVolume(volume);
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error playing next track: ${e}`);
    }
});
volumeSetAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings } = payload;
    try {
        await $Kenku.mute(false);
        // Convert volume to 0...1 range
        await $Kenku.setVolume(settings.volume / 100);
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error setting volume: ${e}`);
    }
});
let fadeTimer = undefined;
volumeFadeAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings } = payload;
    try {
        // If muted, set the volume to 0 and unmute so the fade starts from there
        if ($Kenku.isMuted) {
            await $Kenku.setVolume(0);
            await $Kenku.mute(false);
        }

        // Get starting volume
        const startingVol = $Kenku.volume;
        // Get fade settings
        const fadeTo = Number(settings.volume / 100);
        const duration = Number(settings.duration);
        const interval = 50; // milliseconds

        // Clear out any previous timers
        if (fadeTimer) {
            clearInterval(fadeTimer);
        }

        let currentVol = startingVol;
        let elapsedTime = 0;
        fadeTimer = setInterval(async () => {
            // Increment elapsedTime
            elapsedTime += interval;
            if (elapsedTime >= duration) {
                // Stop the timer
                clearInterval(fadeTimer);
                // Set the final volume
                currentVol = fadeTo;
            } else {
                // Calculate the next volume step
                currentVol = easeInOutQuad(startingVol, fadeTo, duration, elapsedTime);
                if (isNaN(currentVol)) {
                    clearInterval(fadeTimer);
                    throw Error("Unable to calculate the next volume step.");
                }
            }

            // Set the volume
            await $Kenku.setVolume(currentVol);
        }, interval);
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error fading volume: ${e}`);
    }
});
$Kenku.onPlaybackVolumeChanged(() => {
    // Get all volume up/down actions and update their titles
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.volumeUp || action.uuid === Actions.volumeDown) {
            let title = "";
            if (action.settings.setTitle !== undefined) {
                title = `${Math.round($Kenku.volume * 100)}%`;
            }
            $SD.setTitle(context, title);
        }
    }
});

//
// MUTE EVENTS
//
muteAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const { settings, state, userDesiredState, isInMultiAction } = payload;
    try {
        // Since this key should show the active state of the player,
        // the command sent needs to be the *opposite* of the currentState
        // UNLESS this is in a multi-action, in which case the
        // desired state should be used without swapping.

        // Easy way to take the opposite state while still keeping the value 0 or 1
        let newState = Number(!state);
        // If this is in a multi-action, use the desired state instead
        if (isInMultiAction) {
            newState = userDesiredState;
        }

        // Send the appropriate command based on the state
        if (newState === States.muteOff) {
            // Unmute the player
            await $Kenku.mute(false);
        } else if (newState === States.muteOn) {
            // Mute the player
            await $Kenku.mute(true);
        } else {
            // Shouldn't happen, but throw an error
            throw new Error("Unknown state");
        }
    } catch (e) {
        $SD.showAlert(context);
        $SD.logMessage(`Error muting/unmuting the player: ${e}`);
    }
});
$Kenku.onPlaybackMuteChanged(() => {
    // Get all mute actions and update their states
    for (const [context, action] of Object.entries(visibleActions)) {
        if (action.uuid === Actions.mute) {
            setActionState(context, action.uuid);
        }
    }
});
