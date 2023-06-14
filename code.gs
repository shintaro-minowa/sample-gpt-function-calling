const OPENAI_APIKEY = PropertiesService.getScriptProperties().getProperty('OPENAI_APIKEY');
const CHAT_GPT_URL = 'https://api.openai.com/v1/chat/completions';

function myFunction() {
  const userMessage = '東京の天気は？';

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
    const function_arguments = JSON.parse(response.choices[0].message.function_call.arguments);
    const location = function_arguments.location;
    const function_response = getCurrentWeather(location);
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
      "functions": [getFunctionDefinition()],
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
      "functions": [getFunctionDefinition()],
    })
  };
}

function getFunctionDefinition() {
  return {
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
  };
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
