var token, userId;

// so we don't have to write this out everytime #efficency
const twitch = window.Twitch.ext;

var socket = null;
var port = null;
var reconnectTimeout = null;
var retryTime = 5;

var nextUpdate = null;
var delayedPubSub = null;

var pools = [];
var waves = [];
var online = false;

function pushPubSub() {
  if (nextUpdate == null || nextUpdate < new Date()) {
    nextUpdate = new Date();
    nextUpdate.setSeconds(nextUpdate.getSeconds() + 5);
  } else {
    if (delayedPubSub) {
      return;
    }
    else {
      delayedPubSub = setTimeout(() => {
        delayedPubSub = null;
        pushPubSub();
      }, 5000);
    }
  }
  twitch.send("broadcast", "application/json", { "kitchenOpen": online, "pools": pools, "waves": waves });
}

function sendTestMessage() {
  pushPubSub();
}

function addPool(d) {
  let current = 0;
  if (d.current) {
    current = d.current;
  }
  pools.push({ "idx": d.idx, "name": d.name, "current": current, "target": d.target, "percentage": current / d.target * 100 });
}

function addWave(d) {
  let current = 0;
  if (d.current) {
    current = d.current;
  }
  waves.push({ "chatter": d.chatter, "current": current, "target": d.target, "percentage": current / d.target * 100 });
}

function handleKitchenMsg(data) {
  try {
    let d = JSON.parse(data);
    if (d.event) {
      switch (d.event) {
        case "disconnected":
          online = false;
          $("#statusMessage").text("Connected! Kitchen Closed!");
        case "reset":
          waves = [];
          pools = [];
          break;
        case "initialize":
          $("#statusMessage").text("Connected! Kitchen is open and monitoring!");
          online = true;
          waves = [];
          pools = [];
          if (data.pools && data.pools.length) {
            data.pools.forEach(addPool);
          }
          if (data.waves && data.waves.length) {
              data.waves.forEach(addWave);
          }
          break;
        case "poolStart":
          addPool(d);
          break;
        case "poolUpdate":
          pools.filter(w => w.idx === d.idx).forEach((v) => {
            v.current = d.current;
            v.percentage = v.current / v.target * 100;
          });
          break;
        case "poolEnd":
          pools = pools.filter(w => w.idx !== d.idx);
        case "waveStart":
          addWave(d);
          break;
        case "waveUpdate":
          waves.filter(w => w.chatter === d.chatter).forEach((v) => {
            v.current = d.current;
            v.percentage = v.current / v.target * 100;
          });
          break;
        case "waveEnd":
          waves = waves.filter(w => w.chatter !== d.chatter);
          break;
      }
      pushPubSub();
    }
  }
  catch {
    $("#lastMessage").text("Error parsing last message");
  }
}

function connectKitchen() {
  $("#statusMessage").text("Connecting...");
  if (reconnectTimeout != null) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
  }

  if (port === null) {
    return;
  }

  $("#reconnectBtn").hide();

  if (socket != null) {
    socket.close();
    socket= null;
  }

  socket = new WebSocket(`ws://localhost:${port}`);

  socket.addEventListener("open", () => {
    $("#noconfig").hide();
    $("#statusMessage").text("Connected!");
    retryTime = 5;
  });

  socket.addEventListener("message", (event) => {
      handleKitchenMsg(event.data);
  });

  socket.addEventListener("error", (e) => {
    console.log(e);
      e.target.close();
      socket = null;
      if (retryTime > 60) {
        $("#statusMessage").text(`Disconnected.`);
        $("#noconfig").show();
        return;
      }
      retryTime = retryTime * 2;
      $("#statusMessage").text(`Disconnected. Reconnecting in ${retryTime} seconds...`);
      if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(connectKitchen, retryTime * 1000);
      }
  });

  socket.addEventListener("close", () => {
      socket = null;
      if (retryTime > 60) {
        $("#statusMessage").text(`Disconnected. You need TerrariaKitchen running on the same PC and have the Overlay WS port set to the configured port.`);
        $("#noconfig").show();
        return;
      }
      retryTime = retryTime * 2;
      $("#statusMessage").text(`Disconnected. Reconnecting in ${retryTime} seconds...`);
      if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(connectKitchen, retryTime * 1000);
      }
  });
}

function applyAndConnect() {
  port = $("#portNumber").val();
  connectKitchen();
}

twitch.configuration.onChanged(function() {
  // Checks if configuration is defined
  if (twitch.configuration.broadcaster) {
    try {
      // Parsing the array saved in broadcaster content
      var config = JSON.parse(twitch.configuration.broadcaster.content);
      
      // Checking the content is an object
      if (typeof config === 'object' && config.port) {
        // Updating the value of the options array to be the content from config
        port = config.port;
        $("#noconfig").hide();
        connectKitchen();
      } else {
        console.log('Invalid config');
      }
    } catch (e) {
      console.log('Invalid config');
      console.log(e);
    }
  }
});

// callback called when context of an extension is fired 
twitch.onContext((context) => {
  if (context.theme === "light") {
    $("body").attr("data-bs-theme", "light");
  } else {
    $("body").attr("data-bs-theme", "dark");
  }
});


// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  token = auth.token; 
  userId = auth.userId; 

});

