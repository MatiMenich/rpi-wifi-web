var wpaSupplicantParser = require('./wpa_supplicant_service'),
    fileLocation = './wpa_supplicant.conf';

wpaSupplicantParser.addNetwork(fileLocation, { ssid: "Test", psk: "testtest"}, function(err, data) {
  console.log("addNetwork " + data);

  wpaSupplicantParser.updateNetwork(fileLocation, "Test", { psk: "testtest2", asd: "asd" }, function(err, data) {
    console.log("updateNetwork " + data);

    wpaSupplicantParser.removeNetwork(fileLocation, "Test", function(err, data) {
      console.log("removeNetwork " + data);

      wpaSupplicantParser.parse(fileLocation, function(err, data) {
        console.log(data);
      });
    });
  });
});


//exec = require('child_process').exec;
// exec( 'ls -a', function(err, stdout, stderr) {

//   if(err) console.error(err);

//   console.log(stdout);
// });