async function verify(providerInstance, body) {
  if (!body.application_no) {
    throw new Error('Parameter "application_no" is required.');
  }
  const latency = Math.floor(Math.random() * 180) + 100;
  return {
    success: true,
    latency,
    data: {
      status: 'DISPATCHED',
      response_code: 200,
      ack_no: `ACK${body.application_no.trim()}`,
      message: 'Your PAN card has been successfully processed and dispatched via Speed Post tracking number AWB9876543210.'
    }
  };
}
module.exports = { verify };
