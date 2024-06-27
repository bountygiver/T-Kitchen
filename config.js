var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

// onContext callback called when context of an extension is fired 
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

twitch.configuration.onChanged(function() {
  // Checks if configuration is defined
  if (twitch.configuration.broadcaster) {
    try {
      // Parsing the array saved in broadcaster content
      var config = JSON.parse(twitch.configuration.broadcaster.content);
      
      // Checking the content is an object
      if (typeof config === 'object' && config.port) {
        // Updating the value of the options array to be the content from config
        $("#portNumber").val(config.port);
      } else {
        console.log('Invalid config');
      }
    } catch (e) {
      console.log('Invalid config');
    }
  }
});

$(function() {
  $('#form').submit(function(e) {
    e.preventDefault();
    twitch.configuration.set('broadcaster', '1', JSON.stringify({ 'port': $("#portNumber").val() }));
  });
});
