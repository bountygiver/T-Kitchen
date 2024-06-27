var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;
const pool = $($("#pool-template").html());
const wave = $($("#wave-template").html());

function processMessage(target, contentType, message) {
  if (typeof message !== "object") {
    if (contentType === "application/json") {
      message = JSON.parse(message);
    } else {
      return;
    }
  }
  $("#waitKitchen").text("Waiting for kitchen to open...");
  if (message.kitchenOpen) {
    $("#waitKitchen").hide();
  } else {
    $("#waitKitchen").show();
    $("#pool-list").empty();
    $("#wave-list").empty();
  }

  if (message.pools) {
    let poolIds = message.pools.map(p => p.idx);
    $("#pool-list").children().each((i, v) => {
      if (!poolIds.includes($(v).attr("data-id"))) {
        $(v).remove();
      }
    });
    message.pools.forEach(v => {
      let newPool = $("#pool-list").find('[data-id="' + v.idx + '"]');
      if (newPool.length === 0) {
        newPool = pool.clone();
        newPool.attr("data-id", v.idx);
        $("#pool-list").append(newPool);
      }
      newPool.find(".repl-name").text(v.name);
      newPool.find(".repl-idx").text(v.idx);
      newPool.find(".progress-bar").text(`${v.current}/${v.target}`);
      newPool.find(".progress-bar").css("width", `${v.percentage}%`);
    });
  }
  if (message.waves) {
    let waveIds = message.waves.map(p => p.chatter);
    $("#wave-list").children().each((i, v) => {
      if (!waveIds.includes($(v).attr("data-id"))) {
        $(v).remove();
      }
    });
    message.waves.forEach(v => {
      let newWave = $("#wave-list").find('[data-id="' + v.chatter + '"]');
      if (newWave.length === 0) {
        newWave = wave.clone();
        newWave.attr("data-id", v.chatter);
        $("#wave-list").append(newWave);
      }
      newWave.find(".repl-name").text(v.chatter);
      newWave.find(".progress-bar").text(`${v.current}/${v.target}`);
      newWave.find(".progress-bar").css("width", `${v.percentage}%`);
    });
  }

  if ($("#pool-list").children().length === 0) {
    let emptyMsg = $($("#empty-template").html());
    emptyMsg.attr("data-idx", "-1");
    emptyMsg.find(".repl-type").text("pool");
    emptyMsg.find(".repl-start-cmd").text("!t event <event name> <amount>");
    $("#pool-list").append(emptyMsg);
  }
  if ($("#wave-list").children().length === 0) {
    let emptyMsg = $($("#empty-template").html());
    emptyMsg.attr("data-idx", "-1");
    emptyMsg.find(".repl-type").text("wave");
    emptyMsg.find(".repl-start-cmd").text("!t wave start <target number>");
    $("#wave-list").append(emptyMsg);
  }
}

// callback called when context of an extension is fired 
twitch.onContext((context) => {
  if (context.theme === "light") {
    $("body").attr("data-bs-theme", "light");
    $("#extMain").attr("data-bs-theme", "light");
  } else {
    $("body").attr("data-bs-theme", "dark");
  }
});


// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  token = auth.token;  
  userId = auth.userId; 

  twitch.listen("broadcast", processMessage);
});

