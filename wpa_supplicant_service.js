var fs = require('fs');

var regex = {
  ssid: /ssid\s*=\s*"(.*?)"/,
  psk: /psk\s*=\s*"(.*?)"/,
  param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
  comment: /^\s*;.*$/
};

/*
 * parses wpa_supplicant.conf
 * @param: {String} fileLocation, the location of the wpa_supplicant.conf file
 * @param: {Function} callback, the function that will be called when parsing is done
 * @return: none
 */
module.exports.parse = function (fileLocation, callback) {
  if(!callback) return;

  fs.readFile(fileLocation, 'utf8', function(err, data) {
    if(err)
      callback(err);
    else
      callback(null, parse(data));
  });
};

module.exports.parseSync = function(fileLocation) {
  return parse(fs.readFileSync(fileLocation, 'utf8'));
};

/*
 * add network module to wpa_supplicant.conf
 * @param: {String} fileLocation, the location of the wpa_supplicant.conf file
 * @param: {Object} newNetwork, the network object to be added
 * @param: {Function} callback, the function that will be called when parsing is done
 * @return: none
 */
module.exports.addNetwork = function(fileLocation, newNetwork, callback) {
  if(!callback) return;

  fs.readFile(fileLocation, 'utf8', function(err, data) {
    if(err) {
      callback(err);
    } else {
      var parsedData = parse(data);
      parsedData.networks.push(newNetwork);

      writeConfigFile(fileLocation, parsedData, callback);
    }
  });
};

/*
 * remove network module from wpa_supplicant.conf
 * @param: {String} fileLocation, the location of the wpa_supplicant.conf file
 * @param: {String} ssid, the name of the network's ssid to be deleted
 * @param: {Function} callback, the function that will be called when parsing is done
 * @return: none
 */
module.exports.removeNetwork = function(fileLocation, ssid, callback) {
  if(!callback) return;

  fs.readFile(fileLocation, 'utf8', function(err, data) {
    if(err) {
      callback(err);
    } else {
      var parsedData = parse(data);

      var deleteIndex = null;
      parsedData.networks.forEach(function(network, index) {
        if(network.ssid == ssid)
          deleteIndex = index;
      });

      if(deleteIndex !== null) {
        parsedData.networks.splice(deleteIndex, 1);
        writeConfigFile(fileLocation, parsedData, callback);
      } else {
        callback(new Error("SSID not found"));
      }
      
    }
  });
};

/*
 * update network module on wpa_supplicant.conf based on ssid
 * @param: {String} file, the location of the wpa_supplicant.conf file
 * @param: {String} ssid, the name of the network's ssid to be updated
 * @param: {Object} params, the parameters to update or add to the network. Use undefined to delete a param
 * @param: {Function} callback, the function that will be called when parsing is done
 * @return: none
 */
module.exports.updateNetwork = function(fileLocation, ssid, params, callback) {
  if(!callback) return;

  fs.readFile(fileLocation, 'utf8', function(err, data) {
    if(err) {
      callback(err);
    } else {
      var parsedData = parse(data);

      var updateIndex = null;
      parsedData.networks.forEach(function(network, index) {
        if(network.ssid == ssid)
          updateIndex = index;
      });

      if(updateIndex !== null) {
        for (var key in params) {
          if(params.hasOwnProperty(key)) {
            //If user is deleting a parameter from network
            if(params[key] === undefined && parsedData.networks[updateIndex].hasOwnProperty(key))
              delete parsedData.networks[updateIndex][key];
            else
              parsedData.networks[updateIndex][key] = params[key];
          }
        }

        writeConfigFile(fileLocation, parsedData, callback);
      } else {
        callback(new Error("SSID not found"));
      }
      
    }
  });
};

function parse(data) {
  var splitData = data.split("network");

  return {
    headers: parseHeaders(splitData[0]),
    networks: splitData.length > 1 ? parseNetworks(data.substring(data.indexOf("network"))) : []
  };
}


function parseHeaders(headerData) {
  var headers = [];
  var lines = headerData.split(/\r\n|\r|\n/);

  lines.forEach(function(line) {
    var match;
    if(regex.comment.test(line)) {
      return;

    } else if(regex.param.test(line)) {
      match = line.match(regex.param);
      headers.push({ name: match[1], value: match[2] });
    }
  });
  return headers;
}


//Todo <matimenich>: DRY Hacer metodo general (pico los fucking "")
function parseNetworks(networkData) {
  var networks = [],
      networkCounter = -1;

  var lines = networkData.split(/\r\n|\r|\n/);
  
  lines.forEach(function(line) {
    var ssid_match = line.match(regex.ssid);
    var password_match = line.match(regex.psk);

    if(regex.comment.test(line)) {
      return;

    } else if(ssid_match) {
      networks.push({ ssid: ssid_match[1] });
      ++networkCounter;

    } else if(password_match) {
      networks[networkCounter].psk = password_match[1];

    } else if(regex.param.test(line)) {
      var match = line.match(regex.param);
      if(match[1] != 'network')
        networks[networkCounter][match[1]] = match[2];
    }
  });

  return networks;
}

function writeConfigFile(file, data, cb) {

  var logStream = fs.createWriteStream(file, {'flags': 'w'});

  // Writing config headers
  for (var i = 0, length = data.headers.length; i < length; i++) {
    logStream.write(data.headers[i].name + '=' + data.headers[i].value + '\n');
  }

  // Writing networks
  for (i = 0, length = data.networks.length; i < length; i++) {
    logStream.write('\nnetwork={\n');

    //Looping through keys
    var keys = Object.keys(data.networks[i]);
    for(var j = 0, keysLength = keys.length; j < keysLength; j++) {
      if(keys[j] == 'ssid' || keys[j] == 'psk')
        logStream.write('\t' + keys[j] + '=\"' + data.networks[i][keys[j]] + '\"\n');
      else
        logStream.write('\t' + keys[j] + '=' + data.networks[i][keys[j]] + '\n');
    }

    logStream.write('}');
  }

  logStream.end('');

  logStream.on('finish', function() {
    cb(null, "ok");
  });
}
