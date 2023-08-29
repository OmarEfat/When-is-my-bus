const axios = require('axios');
const Alexa = require('ask-sdk-core');
// This is my API key from Winnipeg Transit website
const API_KEY = ''; // API key deleted for security concerns

// The launch request that will be called when the user launch the request 
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    try {
        // schedule will try to fetch the bus schedule through the axios 
        // If the response is succsefful returned code 200, it will go for next line which is extracting the buses 
      const schedule = await fetchBusSchedule();
      const nextBuses = extractNextBuses(schedule, 5);

      if (nextBuses.length > 0) {
        const speakOutput = generateBusTimingsSpeech(nextBuses);
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
      } else {
        const speakOutput = 'Sorry, there are no upcoming Blue buses to downtown at the moment.';
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
      }
    } catch (error) {
      console.error('Error retrieving bus schedule:', error);

      const speakOutput = `Sorry, I couldn't retrieve the bus schedule due to an error: ${error.message}. Please try again later.`;
      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
  },
};

const fetchBusSchedule = async () => {
  const url = `https://api.winnipegtransit.com/v3/stops/61104/schedule.json?api-key=${API_KEY}`;
  const response = await axios.get(url);

  if (response.status === 200 && response.data) {
    return response.data;
  } else {
    throw new Error('Failed to retrieve bus schedule');
  }
};

const extractNextBuses = (schedule, count) => {
  const nextBuses = [];

  if (schedule && schedule['stop-schedule'] && schedule['stop-schedule']['route-schedules']) {
    const routeSchedules = schedule['stop-schedule']['route-schedules'];

    // Find the Blue route
    const blueRoute = routeSchedules.find(route => route.route.number === 'BLUE');

    if (blueRoute && blueRoute['scheduled-stops'] && blueRoute['scheduled-stops'].length > 0) {
      // Sort the scheduled stops by departure time
      const scheduledStops = blueRoute['scheduled-stops'].sort((a, b) => {
        const timeA = new Date(a.times.departure.scheduled);
        const timeB = new Date(b.times.departure.scheduled);
        return timeA - timeB;
      });

      // Get the next buses departure times
      for (let i = 0; i < Math.min(count, scheduledStops.length); i++) {
        const nextBus = scheduledStops[i];
        const departureTime = new Date(nextBus.times.departure.scheduled);
        nextBuses.push({ departureTime });
      }
    }
  }

  return nextBuses;
};

const generateBusTimingsSpeech = (nextBuses) => {
  let speakOutput = 'The next buses to downtown are scheduled as follows:';

  for (let i = 0; i < nextBuses.length; i++) {
    const bus = nextBuses[i];
    const departureTime = bus.departureTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    speakOutput += ` Bus ${i + 1} at ${departureTime}.`;
  }

  return speakOutput;
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Error occurred:', error);

    const speakOutput = 'Sorry, there was an error processing your request. Please try again later.';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(LaunchRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();
