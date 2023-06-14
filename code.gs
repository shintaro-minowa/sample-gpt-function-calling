const OPENAI_APIKEY = PropertiesService.getScriptProperties().getProperty('OPENAI_APIKEY');
const CHAT_GPT_URL = 'https://api.openai.com/v1/chat/completions';

function myFunction() {
  const userMessage = '東京から大阪までの距離を教えて。';

  try {
    const chatGptMessage = getChatGPTResponse(userMessage);
    console.log(chatGptMessage);
  } catch (error) {
    console.error(error);
  }
}

function getChatGPTResponse(userMessage) {
  const response = sendGptRequest(userMessage);
  if (response.choices[0].message.function_call) {
    const function_name = response.choices[0].message.function_call.name;
    console.log('function_name: ' + function_name);
    const function_arguments = JSON.parse(response.choices[0].message.function_call.arguments);
    let function_response;
    if (function_name === 'get_current_weather') {
      const location = function_arguments.location;
      function_response = getCurrentWeather(location);
    } else if (function_name === 'get_distance_between_locations') {
      const start_location = function_arguments.start_location;
      const end_location = function_arguments.end_location;
      function_response = getRoute(start_location, end_location);
    }
    return sendGptRequestWithFunction(userMessage, response.choices[0].message, function_name, function_response);
  } else {
    return response.choices[0].message.content.trim();
  }
}

function sendGptRequest(userMessage) {
  const requestOptions = createRequestOptions(userMessage);
  try {
    const response = UrlFetchApp.fetch(CHAT_GPT_URL, requestOptions);
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error(error);
    throw new Error('GPT API request failed.');
  }
}

function sendGptRequestWithFunction(userMessage, message, functionName, functionResponse) {
  const requestOptions = createRequestOptionsWithFunction(userMessage, message, functionName, functionResponse);
  try {
    const response = UrlFetchApp.fetch(CHAT_GPT_URL, requestOptions);
    return JSON.parse(response.getContentText()).choices[0].message.content.trim();
  } catch (error) {
    console.error(error);
    throw new Error('GPT API request with function failed.');
  }
}

function createRequestOptions(userMessage) {
  return {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENAI_APIKEY
    },
    "payload": JSON.stringify({
      "model": "gpt-3.5-turbo-0613",
      "messages": [{ "role": "user", "content": userMessage }],
      "functions": getFunctionDefinitions(),
    })
  };
}

function createRequestOptionsWithFunction(userMessage, message, functionName, functionResponse) {
  return {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENAI_APIKEY
    },
    "payload": JSON.stringify({
      "model": "gpt-3.5-turbo-0613",
      'messages': [
        { "role": "user", "content": userMessage },
        message,
        {
          "role": "function",
          "name": functionName,
          "content": functionResponse,
        },
      ],
      "functions": getFunctionDefinitions(),
    })
  };
}

function getFunctionDefinitions() {
  return [
    {
      "name": "get_current_weather",
      "description": "Get the current weather in a given location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"]
          }
        },
        "required": ["location"]
      }
    },
    {
      "name": "get_distance_between_locations",
      "description": "Get the distance between two locations using Google Maps API",
      "parameters": {
        "type": "object",
        "properties": {
          "start_location": {
            "type": "string",
            "description": "The starting location, e.g. Tokyo, Japan"
          },
          "end_location": {
            "type": "string",
            "description": "The ending location, e.g. Osaka, Japan"
          },
          "unit": {
            "type": "string",
            "enum": ["kilometers", "miles"],
            "description": "The unit of distance measurement"
          }
        },
        "required": ["start_location", "end_location"]
      }
    }
  ];
}

function getCurrentWeather(location, unit = "celsius") {
  var weatherInfo = {
    "location": location,
    "temperature": "33",
    "unit": unit,
    "forecast": ["sunny", "windy"]
  };
  return JSON.stringify(weatherInfo);
}

// getRoute関数は距離情報の取得を行います
function getRoute(start_location, end_location) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_APIKEY');
  var url = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + start_location + '&destination=' + end_location + '&key=' + apiKey;
  var options = {
    method: 'GET'
  };

  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());

  if (data.status != "OK") {
    Logger.log("Error: " + data.status);
    return;
  }

  var routes = data.routes;
  var distance_info = {};
  for (var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var legs = route.legs;
    for (var j = 0; j < legs.length; j++) {
      var leg = legs[j];
      distance_info = {
        "Start": leg.start_address,
        "End": leg.end_address,
        "Distance": leg.distance.text,
        "Duration": leg.duration.text
      }
    }
  }
  return JSON.stringify(distance_info);
}
