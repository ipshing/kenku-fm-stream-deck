let websocket = null;
let uuid = null;

function connectElgatoStreamDeckSocket(
  inPort,
  inPropertyInspectorUUID,
  inRegisterEvent
) {
  uuid = inPropertyInspectorUUID;
  websocket = new WebSocket("ws://127.0.0.1:" + inPort);

  websocket.onopen = function () {
    // Register
    websocket.send(
      JSON.stringify({
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID,
      })
    );

    // Request settings
    websocket.send(
      JSON.stringify({
        event: "getSettings",
        context: uuid,
      })
    );
  };

  websocket.onmessage = function (evt) {
    const jsonObj = JSON.parse(evt.data);
    const { event, payload } = jsonObj;
    if (event === "didReceiveSettings") {
      const settings = payload.settings;

      if (settings.url) {
        document.getElementById("url").value = settings.url;
      }
      if (settings.address) {
        document.getElementById("address").value = settings.address;
      }
      if (settings.port) {
        document.getElementById("port").value = settings.port;
      }
    }
  };
}

function sendSettings() {
  if (websocket && websocket.readyState === 1) {
    websocket.send(
      JSON.stringify({
        event: "setSettings",
        context: uuid,
        payload: {
          url: document.getElementById("url").value,
          address: document.getElementById("address").value,
          port: document.getElementById("port").value,
        },
      })
    );
  }
}
