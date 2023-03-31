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
    // Request global settings
    $PI.getGlobalSettings();

    // Show the appropriate settings for the action
    showHideSettings(action);

    // Set up listeners for local/global settings
    piSettings.addEventListener('input',
        Utils.debounce(150, () => {
            const value = Utils.getFormValue(piSettings);
            $PI.setSettings(value);
        })
    );
    globalSettings.addEventListener('input',
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

    if (action === Actions.playlist || action === Actions.soundboard) {
        idField.classList.remove("hidden");
    }
    else {
        idField.classList.add("hidden");
    }
}
