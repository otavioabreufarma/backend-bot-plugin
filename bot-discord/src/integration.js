function bindBackendEventsToBot(backendEvents, botInstance) {
  backendEvents.on('bot.notify', (payload) => {
    botInstance.handleBackendEvent(payload);
  });
}

module.exports = { bindBackendEventsToBot };
