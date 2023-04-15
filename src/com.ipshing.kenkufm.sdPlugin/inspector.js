/// <reference path="sdk/js/property-inspector.js" />
/// <reference path="sdk/js/utils.js" />
/// <reference path="js/constants.js" />

$PI.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
    const piSettings = document.querySelector("#pi-settings");
    const globalSettings = document.querySelector("#global-settings");
    const { action, payload, context } = actionInfo;
    const { settings } = payload;

    // Load property inspector settings
    Utils.setFormValue(settings, piSettings);
    // Update the range labels
    updateLabels();
    // Request global settings
    $PI.getGlobalSettings();
    // Show the appropriate settings for the action
    showHideSettings(action);

    // For the actions that use ranges, call $PI.setSettings
    // if this is the first time the action has been loaded
    // (indicated by an empty settings object).
    if ((action === Actions.volumeSet || action === Actions.volumeFade) && (!settings || !settings.volume || !settings.duration)) {
        const value = Utils.getFormValue(piSettings);
        $PI.setSettings(value);
    }

    // Set up listener for ranges
    const ranges = document.querySelectorAll("input[type='range']");
    ranges.forEach((el, i) => {
        el.addEventListener("input", updateLabels, false);
    });

    // Set up listeners for local/global settings
    piSettings.addEventListener(
        "input",
        Utils.debounce(150, () => {
            const value = Utils.getFormValue(piSettings);
            $PI.setSettings(value);
        })
    );
    globalSettings.addEventListener(
        "input",
        Utils.debounce(150, () => {
            const value = Utils.getFormValue(globalSettings);
            $PI.setGlobalSettings(value);
        })
    );
});

$PI.onDidReceiveGlobalSettings(({ payload }) => {
    const { settings } = payload;
    // Load global settings into property inspector
    const globalSettings = document.querySelector("#global-settings");
    Utils.setFormValue(settings, globalSettings);
});

function showHideSettings(action) {
    const idField = document.querySelector("#id");
    const volume = document.querySelector("#volume");
    const duration = document.querySelector("#duration");
    const title = document.querySelector("#title");

    // Hide all fields to start
    idField.classList.add("hidden");
    volume.classList.add("hidden");
    duration.classList.add("hidden");
    title.classList.add("hidden");

    // Show fields based on action
    switch (action) {
        case Actions.playlist:
        case Actions.soundboard:
            idField.classList.remove("hidden");
            break;
        case Actions.volumeSet:
            volume.classList.remove("hidden");
            break;
        case Actions.volumeFade:
            volume.classList.remove("hidden");
            duration.classList.remove("hidden");
            break;
        case Actions.volumeUp:
        case Actions.volumeDown:
            title.classList.remove("hidden");
            break;
    }
}

function updateLabels() {
    const volumeRange = document.querySelector("#volumeRange");
    const volumeLabel = document.querySelector("#volumeLabel");
    const durationRange = document.querySelector("#durationRange");
    const durationLabel = document.querySelector("#durationLabel");

    volumeLabel.textContent = `${volumeRange.value}%`;
    durationLabel.textContent = `${durationRange.value} ms`;
}
